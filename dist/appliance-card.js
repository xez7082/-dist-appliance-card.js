class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._config.sensors) this._config.sensors = { washing_machine: [], dishwasher: [], fridge: [] };
    if (!this._config.entities) this._config.entities = { washing_machine: '', dishwasher: '', fridge: '' };
    this._render();
  }

  _render() {
    const type = this._config.appliance_type || 'washing_machine';
    this.innerHTML = `
      <div style="padding: 10px; color: white; background: #1c1c1c; font-family: sans-serif;">
        <div style="margin-bottom: 15px;">
          <button class="type-btn" data-val="washing_machine">LINGE</button>
          <button class="type-btn" data-val="dishwasher">VAISSELLE</button>
          <button class="type-btn" data-val="fridge">FRIGO</button>
        </div>

        <label>Capteur d'état (Principal):</label><br>
        <input id="ent" style="width:100%; padding:8px; margin:5px 0;" value="${this._config.entities[type] || ''}"><br><br>

        <label>Ajouter un capteur de mesure:</label><br>
        <input id="add-val" style="width:70%; padding:8px;" placeholder="sensor.puissance">
        <button id="add-btn" style="width:25%; padding:8px; background:#7CFFB2; border:none; font-weight:bold;">OK</button>
        
        <div id="list" style="margin-top:15px; display:flex; flex-wrap:wrap; gap:5px;"></div>
      </div>
    `;

    this.querySelectorAll('.type-btn').forEach(b => {
      if(b.dataset.val === type) b.style.border = "2px solid #7CFFB2";
      b.onclick = () => { this._config.appliance_type = b.dataset.val; this._save(); };
    });

    const entInput = this.querySelector('#ent');
    const addInput = this.querySelector('#add-val');
    const stop = (e) => e.stopPropagation();

    [entInput, addInput].forEach(i => {
      i.oninput = stop;
      i.onkeydown = stop;
    });

    entInput.onchange = () => { 
      this._config.entities[type] = entInput.value; 
      this._save(); 
    };

    this.querySelector('#add-btn').onclick = () => {
      const val = addInput.value.trim();
      if (val.includes('.')) {
        if (!Array.isArray(this._config.sensors[type])) this._config.sensors[type] = [];
        this._config.sensors[type].push(val);
        this._save();
      }
    };

    const list = this.querySelector('#list');
    (this._config.sensors[type] || []).forEach((s, i) => {
      const tag = document.createElement('div');
      tag.innerHTML = `${s.split('.').pop()} <span style="color:red;cursor:pointer">X</span>`;
      tag.style = "background:#333; padding:5px; border-radius:5px; font-size:10px;";
      tag.onclick = () => { this._config.sensors[type].splice(i, 1); this._save(); };
      list.appendChild(tag);
    });
  }

  _save() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config }, bubbles: true, composed: true
    }));
    this._render();
  }
}
customElements.define("appliance-card-editor", ApplianceCardEditor);

class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  setConfig(config) { this.config = config; }
  
  normalizeState(state) {
    if (!state) return 'enveille';
    const s = state.toLowerCase();
    const map = {
      'wash':'lavage','ai_wash':'lavage','pre_wash':'lavage','air_wash':'lavage','weight_sensing':'lavage',
      'filling':'remplissage','rinse':'rincage','ai_rinse':'rincage','spin':'essorage','ai_spin':'essorage',
      'finish':'findecycle','complete':'findecycle','done':'findecycle','cooling':'findecycle',
      'drying':'findecycle','wrinkle_prevent':'findecycle','pause':'pause','paused':'pause',
      'none':'enveille','delay_wash':'enveille','off':'enveille','idle':'enveille','error':'erreur'
    };
    return map[s] || s;
  }

  set hass(hass) {
    const type = this.config.appliance_type || 'washing_machine';
    const mainEnt = (this.config.entities || {})[type];
    const entityState = hass.states[mainEnt];
    
    if (!this.card) {
      this.innerHTML = `
        <ha-card style="border-radius:20px; overflow:hidden; background:#111; color:white; border:1px solid #333;">
          <div id="h" style="padding:10px; text-align:center; color:#7CFFB2; font-weight:bold; border-bottom:1px solid #222;"></div>
          <div style="padding:20px; text-align:center;"><img id="img" style="width:80%; max-height:180px; transition:0.5s;"></div>
          <div id="st" style="text-align:center; padding:10px; font-weight:bold; letter-spacing:1px; background:rgba(0,0,0,0.3);"></div>
          <div id="gr" style="display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:15px;"></div>
        </ha-card>`;
      this.card = this.querySelector('ha-card');
      this.img = this.querySelector('#img');
      this.st = this.querySelector('#st');
      this.gr = this.querySelector('#gr');
      this.h = this.querySelector('#h');
    }

    const raw = entityState ? entityState.state : 'none';
    const state = this.normalizeState(raw);
    const url = `https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/${state}.png`;
    
    if(this.img.src !== url) {
        this.img.src = url;
        this.img.onerror = () => { this.img.src = `https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/enveille.png`; };
    }

    const color = { enveille:"#888", lavage:"#2980b9", rincage:"#1abc9c", essorage:"#9b59b6", findecycle:"#2ecc71", erreur:"#e74c3c", pause:"#f39c12" }[state] || "#7CFFB2";
    
    this.h.textContent = {washing_machine:"LAVE-LINGE", dishwasher:"VAISSELLE", fridge:"FRIGO"}[type];
    this.st.textContent = raw.replace('_',' ').toUpperCase();
    this.st.style.color = color;
    this.card.style.borderColor = color + "44";

    const sens = (this.config.sensors || {})[type] || [];
    let html = "";
    sens.forEach(id => {
      const s = hass.states[id];
      if (s) html += `<div style="background:#1a1a1a; padding:8px; border-radius:10px; border-left:3px solid ${color};">
          <div style="font-size:8px; opacity:0.5;">${id.split('.').pop()}</div>
          <div style="font-size:11px; font-weight:bold;">${s.state} ${s.attributes.unit_of_measurement || ''}</div>
        </div>`;
    });
    this.gr.innerHTML = html;
  }
}
customElements.define("appliance-card", ApplianceCard);
