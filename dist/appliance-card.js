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
        <div style="display: flex; gap: 5px; margin-bottom: 15px;">
          <button class="type-btn" data-val="washing_machine" style="flex:1; padding:8px; cursor:pointer; background:${type === 'washing_machine' ? '#7CFFB2' : '#333'}; color:${type === 'washing_machine' ? '#000' : '#fff'}; border:none; border-radius:5px;">LINGE</button>
          <button class="type-btn" data-val="dishwasher" style="flex:1; padding:8px; cursor:pointer; background:${type === 'dishwasher' ? '#7CFFB2' : '#333'}; color:${type === 'dishwasher' ? '#000' : '#fff'}; border:none; border-radius:5px;">VAISSELLE</button>
          <button class="type-btn" data-val="fridge" style="flex:1; padding:8px; cursor:pointer; background:${type === 'fridge' ? '#7CFFB2' : '#333'}; color:${type === 'fridge' ? '#000' : '#fff'}; border:none; border-radius:5px;">FRIGO</button>
        </div>

        <label style="font-size:11px; color:#7CFFB2;">ENTITÉ D'ÉTAT PRINCIPALE</label><br>
        <input id="ent" style="width:100%; padding:10px; margin:5px 0; background:#000; color:#fff; border:1px solid #444; border-radius:5px;" value="${this._config.entities[type] || ''}"><br><br>

        <label style="font-size:11px; color:#7CFFB2;">AJOUTER CAPTEUR (CÔTÉ IMAGE)</label><br>
        <div style="display:flex; gap:5px; margin-top:5px;">
            <input id="add-val" style="flex:1; padding:10px; background:#000; color:#fff; border:1px solid #444; border-radius:5px;" placeholder="sensor.exemple">
            <button id="add-btn" style="padding:0 15px; background:#7CFFB2; border:none; border-radius:5px; font-weight:bold;">OK</button>
        </div>
        
        <div id="list" style="margin-top:15px; display:flex; flex-direction:column; gap:5px;"></div>
      </div>
    `;

    this.querySelectorAll('.type-btn').forEach(b => {
      b.onclick = () => { this._config.appliance_type = b.dataset.val; this._save(); };
    });

    const entInput = this.querySelector('#ent');
    const addInput = this.querySelector('#add-val');
    const stop = (e) => e.stopPropagation();

    [entInput, addInput].forEach(i => {
      i.oninput = stop; i.onkeydown = stop;
    });

    entInput.onchange = () => { this._config.entities[type] = entInput.value; this._save(); };

    this.querySelector('#add-btn').onclick = () => {
      const val = addInput.value.trim();
      if (val.includes('.') && this._config.sensors[type].length < 10) {
        this._config.sensors[type].push(val);
        addInput.value = "";
        this._save();
      }
    };

    const list = this.querySelector('#list');
    (this._config.sensors[type] || []).forEach((s, i) => {
      const tag = document.createElement('div');
      tag.style = "background:#333; padding:8px; border-radius:5px; font-size:10px; display:flex; justify-content:space-between;";
      tag.innerHTML = `<span>${s}</span><span style="color:#ff5252; cursor:pointer; font-weight:bold;">Suppr</span>`;
      tag.querySelector('span:last-child').onclick = () => { this._config.sensors[type].splice(i, 1); this._save(); };
      list.appendChild(tag);
    });
  }

  _save() {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
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
      'filling':'remplissage','rinse':'rincage','ai_rinse':'rincage','spin':'essorage',
      'ai_spin':'essorage','finish':'findecycle','complete':'findecycle','done':'findecycle',
      'cooling':'findecycle','drying':'findecycle','wrinkle_prevent':'findecycle',
      'pause':'pause','paused':'pause','none':'enveille','off':'enveille','error':'erreur'
    };
    return map[s] || s;
  }

  set hass(hass) {
    const type = this.config.appliance_type || 'washing_machine';
    const mainEnt = (this.config.entities || {})[type];
    const entityState = hass.states[mainEnt];
    
    if (!this.card) {
      this.innerHTML = `
        <ha-card style="border-radius:15px; overflow:hidden; background:#111; color:white; border:1px solid #333; padding:15px;">
          <div id="h" style="text-align:left; color:#7CFFB2; font-weight:bold; font-size:12px; margin-bottom:10px; text-transform:uppercase; letter-spacing:1px;"></div>
          
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="flex: 1.2; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <img id="img" style="width:100%; height:160px; object-fit:contain; filter: drop-shadow(0 0 10px rgba(124, 255, 178, 0.2));">
              <div id="st" style="margin-top:10px; font-weight:bold; font-size:11px; letter-spacing:1px; text-align:center;"></div>
            </div>
            
            <div id="gr" style="flex: 1; display: flex; flex-direction: column; gap: 8px;"></div>
          </div>
        </ha-card>`;
      this.card = this.querySelector('ha-card');
      this.img = this.querySelector('#img');
      this.st = this.querySelector('#st');
      this.gr = this.querySelector('#gr');
      this.h = this.querySelector('#h');
    }

    const raw = entityState ? entityState.state : 'none';
    const state = this.normalizeState(raw);
    
    // Logique de dossier pour GitHub (washing_machine, dishwasher, fridge)
    const baseUrl = `https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/`;
    const url = `${baseUrl}${state}.png`;
    
    if(this.img.src !== url) {
        this.img.src = url;
        this.img.onerror = () => { this.img.src = `${baseUrl}enveille.png`; };
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
      if (s) html += `
        <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:8px; border-left:3px solid ${color};">
          <div style="font-size:8px; opacity:0.6; text-transform:uppercase;">${id.split('.').pop().replace('_',' ')}</div>
          <div style="font-size:11px; font-weight:bold;">${s.state} ${s.attributes.unit_of_measurement || ''}</div>
        </div>`;
    });
    this.gr.innerHTML = html;
  }
}
customElements.define("appliance-card", ApplianceCard);
