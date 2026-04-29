class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    // Initialisation forcée des structures de données
    if (!this._config.entities) this._config.entities = {};
    if (!this._config.sensors) this._config.sensors = { washing_machine: [], dishwasher: [], fridge: [] };
    if (!this._config.appliance_type) this._config.appliance_type = 'washing_machine';
    this._render();
  }

  _render() {
    const type = this._config.appliance_type;
    this.innerHTML = `
      <div style="padding: 10px; color: white; background: #1c1c1c; font-family: sans-serif;">
        <p style="font-weight: bold; color: #7CFFB2; margin-bottom: 5px;">1. CHOISIR L'APPAREIL</p>
        <div style="display: flex; gap: 5px; margin-bottom: 20px;">
          <button class="t-btn" data-val="washing_machine" style="flex:1; padding:10px; cursor:pointer; background:${type === 'washing_machine' ? '#7CFFB2' : '#444'}; color:${type === 'washing_machine' ? '#000' : '#fff'}; border:none; border-radius:5px; font-weight:bold;">LINGE</button>
          <button class="t-btn" data-val="dishwasher" style="flex:1; padding:10px; cursor:pointer; background:${type === 'dishwasher' ? '#7CFFB2' : '#444'}; color:${type === 'dishwasher' ? '#000' : '#fff'}; border:none; border-radius:5px; font-weight:bold;">VAISSELLE</button>
          <button class="t-btn" data-val="fridge" style="flex:1; padding:10px; cursor:pointer; background:${type === 'fridge' ? '#7CFFB2' : '#444'}; color:${type === 'fridge' ? '#000' : '#fff'}; border:none; border-radius:5px; font-weight:bold;">FRIGO</button>
        </div>

        <p style="font-weight: bold; color: #7CFFB2; margin-bottom: 5px;">2. ENTITÉ D'ÉTAT</p>
        <input id="main_ent" style="width:100%; padding:10px; background:#000; color:#fff; border:1px solid #666; border-radius:5px;" 
               placeholder="sensor.lave_linge_etat" value="${this._config.entities[type] || ''}">

        <p style="font-weight: bold; color: #7CFFB2; margin: 15px 0 5px;">3. SENSORS À CÔTÉ (MAX 10)</p>
        <div style="display:flex; gap:5px;">
          <input id="new_sens" style="flex:1; padding:10px; background:#000; color:#fff; border:1px solid #666; border-radius:5px;" placeholder="sensor.puissance">
          <button id="add_btn" style="padding:10px; background:#7CFFB2; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">AJOUTER</button>
        </div>
        
        <div id="list_sens" style="margin-top:10px;"></div>
      </div>
    `;

    // Événements boutons types
    this.querySelectorAll('.t-btn').forEach(btn => {
      btn.onclick = () => {
        this._config.appliance_type = btn.dataset.val;
        this._save();
      };
    });

    // Sauvegarde entité principale
    const mainInput = this.querySelector('#main_ent');
    mainInput.onchange = () => {
      this._config.entities[type] = mainInput.value;
      this._save();
    };

    // Ajout sensor
    const addInput = this.querySelector('#new_sens');
    this.querySelector('#add_btn').onclick = () => {
      const val = addInput.value.trim();
      if (val.includes('.')) {
        if (!this._config.sensors[type]) this._config.sensors[type] = [];
        this._config.sensors[type] = [...this._config.sensors[type], val]; // Force HA à voir le changement
        addInput.value = "";
        this._save();
      }
    };

    // Affichage et suppression
    const listDiv = this.querySelector('#list_sens');
    const currentSensors = this._config.sensors[type] || [];
    currentSensors.forEach((s, idx) => {
      const item = document.createElement('div');
      item.style = "background:#333; padding:5px 10px; margin:3px 0; border-radius:5px; display:flex; justify-content:space-between; font-size:11px;";
      item.innerHTML = `<span>${s}</span><span style="color:#ff5252; cursor:pointer; font-weight:bold;">X</span>`;
      item.querySelector('span:last-child').onclick = () => {
        this._config.sensors[type].splice(idx, 1);
        this._config.sensors[type] = [...this._config.sensors[type]]; // Re-création du tableau pour HA
        this._save();
      };
      listDiv.appendChild(item);
    });

    // Bloquer la propagation pour que le clavier fonctionne dans HA
    this.querySelectorAll('input').forEach(i => {
      i.onkeydown = (e) => e.stopPropagation();
    });
  }

  _save() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config }, bubbles: true, composed: true
    }));
    this._render(); // Re-render pour mettre à jour l'interface
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
      'pause':'pause','paused':'pause','none':'enveille','off':'enveille','idle':'enveille'
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
          <div id="h" style="text-align:left; color:#7CFFB2; font-weight:bold; font-size:12px; margin-bottom:12px; text-transform:uppercase;"></div>
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="flex: 1.2; display: flex; flex-direction: column; align-items: center;">
              <img id="img" style="width:100%; height:160px; object-fit:contain; filter: drop-shadow(0 0 8px rgba(124,255,178,0.1));">
              <div id="st" style="margin-top:8px; font-weight:bold; font-size:11px; letter-spacing:1px;"></div>
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
    const url = `https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/${state}.png`;
    
    if(this.img.src !== url) {
      this.img.src = url;
      this.img.onerror = () => { this.img.src = "https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/enveille.png"; };
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
