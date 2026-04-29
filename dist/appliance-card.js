// ==========================
// 🎛️ ÉDITEUR VISUEL (3 APPAREILS / 10 SENSORS)
// ==========================
class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { 
        appliance_type: 'washing_machine',
        entities: { washing_machine: '', dishwasher: '', fridge: '' },
        names: { washing_machine: 'Lave-Linge', dishwasher: 'Lave-Vaisselle', fridge: 'Réfrigérateur' },
        sensors: { washing_machine: [], dishwasher: [], fridge: [] },
        ...config 
    };
    this._render();
  }

  _render() {
    const type = this._config.appliance_type;
    this.innerHTML = `
      <div style="padding: 15px; font-family: sans-serif; background: #1c1c1c; color: white; border-radius: 12px;">
        <div style="display: flex; gap: 5px; margin-bottom: 20px;">
          <button class="tab-btn" data-type="washing_machine" style="flex:1; padding:8px; cursor:pointer; background:${type === 'washing_machine' ? '#7CFFB2' : '#333'}; color:${type === 'washing_machine' ? '#000' : '#fff'}; border:none; border-radius:5px; font-weight:bold;">LINGE</button>
          <button class="tab-btn" data-type="dishwasher" style="flex:1; padding:8px; cursor:pointer; background:${type === 'dishwasher' ? '#7CFFB2' : '#333'}; color:${type === 'dishwasher' ? '#000' : '#fff'}; border:none; border-radius:5px; font-weight:bold;">VAISSELLE</button>
          <button class="tab-btn" data-type="fridge" style="flex:1; padding:8px; cursor:pointer; background:${type === 'fridge' ? '#7CFFB2' : '#333'}; color:${type === 'fridge' ? '#000' : '#fff'}; border:none; border-radius:5px; font-weight:bold;">FRIGO</button>
        </div>

        <label style="font-weight: bold; font-size: 11px; color: #7CFFB2;">CAPTEUR D'ÉTAT (IMAGE)</label>
        <input id="main-entity" placeholder="sensor.job_state" value="${this._config.entities[type] || ''}"
               style="width: 100%; padding: 10px; background: #000; color: #fff; border: 1px solid #444; border-radius: 5px; margin: 8px 0 15px; box-sizing: border-box;">

        <label style="font-weight: bold; font-size: 11px; color: #7CFFB2;">LISTE DES CAPTEURS (MAX 10)</label>
        <div style="display: flex; gap: 5px; margin: 8px 0;">
          <input id="new-sensor" placeholder="sensor.mesure" style="flex: 1; padding: 10px; background: #000; color: #fff; border: 1px solid #444; border-radius: 5px;">
          <button id="add-sensor" style="background: #7CFFB2; border: none; padding: 0 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">+</button>
        </div>
        <div id="sensor-list" style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px;"></div>
      </div>
    `;

    // --- LOGIQUE ÉDITEUR ---
    this.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => { this._config.appliance_type = btn.dataset.type; this._render(); this._save(); };
    });

    const mainInput = this.querySelector('#main-entity');
    mainInput.onchange = () => { this._config.entities[type] = mainInput.value.trim(); this._save(); };

    this.querySelector('#add-sensor').onclick = () => {
      const sInput = this.querySelector('#new-sensor');
      if (sInput.value.includes('.') && this._config.sensors[type].length < 10) {
        this._config.sensors[type].push(sInput.value.trim());
        sInput.value = "";
        this._renderSensors();
        this._save();
      }
    };
    this._renderSensors();
  }

  _renderSensors() {
    const type = this._config.appliance_type;
    const container = this.querySelector('#sensor-list');
    container.innerHTML = (this._config.sensors[type] || []).map((s, i) => `
      <div style="background: #333; padding: 5px 10px; border-radius: 15px; font-size: 10px; display:flex; align-items:center;">
        ${s.split('.').pop()} <span class="del" data-i="${i}" style="color:#ff5252; cursor:pointer; margin-left:8px; font-weight:bold;">×</span>
      </div>
    `).join('');

    container.querySelectorAll('.del').forEach(d => {
      d.onclick = () => { this._config.sensors[type].splice(d.dataset.i, 1); this._renderSensors(); this._save(); };
    });
  }

  _save() { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })); }
}
customElements.define("appliance-card-editor", ApplianceCardEditor);

// ==========================
// 🧺 LA CARTE (FIX IMAGE & MULTI-SENSORS)
// ==========================
class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  
  setConfig(config) { this.config = config; }

  normalizeState(state) {
    if (!state) return 'enveille';
    const s = state.toLowerCase();
    const map = {
      'on':'lavage','washing':'lavage','running':'lavage',
      'filling':'remplissage','rinsing':'rincage','spinning':'essorage',
      'paused':'pause','pause':'pause','complete':'findecycle','done':'findecycle',
      'idle':'enveille','off':'enveille','error':'erreur'
    };
    return map[s] || s;
  }

  set hass(hass) {
    const type = this.config.appliance_type || 'washing_machine';
    const mainEntity = (this.config.entities || {})[type];
    const entityState = hass.states[mainEntity];
    
    if (!this._baseCard) {
      this.innerHTML = `
        <ha-card style="border-radius:24px; overflow:hidden; background:#111; color:white; border:1px solid #333;">
          <div id="header" style="padding:15px; text-align:center; background:rgba(255,255,255,0.03); color:#7CFFB2; font-weight:bold; text-transform:uppercase;"></div>
          <div style="padding:20px; display:flex; align-items:center; justify-content:center; min-height:200px;">
            <img id="main-img" style="width:80%; max-height:180px; object-fit:contain; transition: all 0.5s ease;">
          </div>
          <div id="state-text" style="text-align:center; padding:10px; font-weight:bold; letter-spacing:2px; background:rgba(0,0,0,0.3);"></div>
          <div id="sensor-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; padding:15px;"></div>
        </ha-card>`;
      this._baseCard = this.querySelector('ha-card');
      this._img = this.querySelector('#main-img');
      this._stateBox = this.querySelector('#state-text');
      this._grid = this.querySelector('#sensor-grid');
      this._head = this.querySelector('#header');
    }

    const state = entityState ? this.normalizeState(entityState.state) : 'enveille';
    const baseUrl = "https://raw.githubusercontent.com/xez7082/-dist-appliance-card.js/main/img/";
    
    // --- MISE À JOUR IMAGE (SI CHANGEMENT) ---
    const newSrc = `${baseUrl}${state}.png`;
    if (this._lastImage !== newSrc) {
        this._img.src = newSrc;
        this._lastImage = newSrc;
    }

    // --- MISE À JOUR DESIGN ---
    const colorMap = { enveille:"#888", lavage:"#2980b9", findecycle:"#2ecc71", erreur:"#e74c3c" };
    const color = colorMap[state] || "#7CFFB2";
    
    this._head.textContent = (this.config.names || {})[type];
    this._stateBox.textContent = state.toUpperCase();
    this._stateBox.style.color = color;
    this._baseCard.style.borderColor = `${color}44`;

    // --- RENDU DES 10 SENSORS ---
    const sensors = (this.config.sensors || {})[type] || [];
    let html = "";
    sensors.forEach(id => {
      const s = hass.states[id];
      if (s) {
        html += `
          <div style="background:#1a1a1a; padding:8px; border-radius:10px; border-left:3px solid ${color};">
            <div style="font-size:9px; opacity:0.5; text-transform:uppercase; overflow:hidden; white-space:nowrap;">${id.split('.').pop().replace('_',' ')}</div>
            <div style="font-weight:bold; font-size:12px;">${s.state} <span style="font-size:10px; opacity:0.7;">${s.attributes.unit_of_measurement || ''}</span></div>
          </div>`;
      }
    });
    this._grid.innerHTML = html;
  }
}
customElements.define("appliance-card", ApplianceCard);

window.customCards = window.customCards || [];
window.customCards.push({ type: "appliance-card", name: "Appliance Card Ultimate", preview: true });
