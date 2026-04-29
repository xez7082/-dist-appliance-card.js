// ==========================
// 🎛️ ÉDITEUR VISUEL (MULTI-APPAREILS)
// ==========================
class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { 
        appliance_type: 'washing_machine',
        entities: { washing_machine: '', dishwasher: '', fridge: '' },
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
          <button class="tab-btn" data-type="washing_machine" style="flex:1; padding:10px; cursor:pointer; background:${type === 'washing_machine' ? '#7CFFB2' : '#333'}; color:${type === 'washing_machine' ? '#000' : '#fff'}; border:none; border-radius:5px; font-weight:bold;">LINGE</button>
          <button class="tab-btn" data-type="dishwasher" style="flex:1; padding:10px; cursor:pointer; background:${type === 'dishwasher' ? '#7CFFB2' : '#333'}; color:${type === 'dishwasher' ? '#000' : '#fff'}; border:none; border-radius:5px; font-weight:bold;">VAISSELLE</button>
          <button class="tab-btn" data-type="fridge" style="flex:1; padding:10px; cursor:pointer; background:${type === 'fridge' ? '#7CFFB2' : '#333'}; color:${type === 'fridge' ? '#000' : '#fff'}; border:none; border-radius:5px; font-weight:bold;">FRIGO</button>
        </div>

        <label style="font-weight: bold; font-size: 11px; color: #7CFFB2;">CAPTEUR D'ÉTAT (${type.toUpperCase()})</label>
        <input id="main-entity" placeholder="sensor.lave_linge_etat_du_cycle" value="${this._config.entities[type] || ''}"
               style="width: 100%; padding: 10px; background: #000; color: #fff; border: 1px solid #444; border-radius: 5px; margin: 8px 0 15px; box-sizing: border-box; outline:none;">

        <label style="font-weight: bold; font-size: 11px; color: #7CFFB2;">CAPTEURS SUPPLÉMENTAIRES (MAX 10)</label>
        <div style="display: flex; gap: 5px; margin: 8px 0;">
          <input id="new-sensor" placeholder="sensor.consommation" style="flex: 1; padding: 10px; background: #000; color: #fff; border: 1px solid #444; border-radius: 5px; outline:none;">
          <button id="add-sensor" style="background: #7CFFB2; border: none; padding: 0 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">+</button>
        </div>
        <div id="sensor-list" style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px;"></div>
      </div>
    `;

    this.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => { this._config.appliance_type = btn.dataset.type; this._render(); this._save(); };
    });

    const mainInput = this.querySelector('#main-entity');
    const stop = (e) => e.stopPropagation();
    mainInput.addEventListener('input', stop);
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
      <div style="background: #333; padding: 5px 10px; border-radius: 15px; font-size: 10px; display:flex; align-items:center; border:1px solid #444;">
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
// 🧺 LA CARTE (MAPPING SAMSUNG/LG)
// ==========================
class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  setConfig(config) { this.config = config; }

  normalizeState(state) {
    if (!state) return 'enveille';
    const s = state.toLowerCase();
    const map = {
      // Lavage
      'wash': 'lavage', 'ai_wash': 'lavage', 'pre_wash': 'lavage', 'air_wash': 'lavage', 'weight_sensing': 'lavage',
      // Remplissage / Eau
      'filling': 'remplissage', 
      // Rinçage
      'rinse': 'rincage', 'ai_rinse': 'rincage',
      // Essorage
      'spin': 'essorage', 'ai_spin': 'essorage',
      // Fin / Séchage
      'finish': 'findecycle', 'complete': 'findecycle', 'done': 'findecycle', 'cooling': 'findecycle', 'drying': 'findecycle', 'wrinkle_prevent': 'findecycle',
      // Pause / Veille
      'pause': 'pause', 'paused': 'pause', 'none': 'enveille', 'delay_wash': 'enveille', 'freeze_protection': 'erreur',
      'off': 'enveille', 'idle': 'enveille', 'error': 'erreur'
    };
    return map[s] || s;
  }

  set hass(hass) {
    const type = this.config.appliance_type || 'washing_machine';
    const mainEntity = (this.config.entities || {})[type];
    const entityState = hass.states[mainEntity];
    
    if (!this._baseCard) {
      this.innerHTML = `
        <ha-card style="border-radius:24px; overflow:hidden; background:#111; color:white; border:1px solid #333; transition: border-color 0.5s;">
          <div id="header" style="padding:15px; text-align:center; background:rgba(255,255,255,0.03); color:#7CFFB2; font-weight:bold; text-transform:uppercase; letter-spacing:1px; font-size:14px;"></div>
          <div style="padding:20px; display:flex; align-items:center; justify-content:center; min-height:220px;">
            <img id="main-img" style="width:85%; max-height:200px; object-fit:contain; filter: drop-shadow(0 0 8px rgba(0,0,0,0.5));">
          </div>
          <div id="state-text" style="text-align:center; padding:12px; font-weight:bold; letter-spacing:2px; background:rgba(0,0,0,0.4); font-size:13px; transition: color 0.5s;"></div>
          <div id="sensor-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; padding:15px;"></div>
        </ha-card>`;
      this._baseCard = this.querySelector('ha-card');
      this._img = this.querySelector('#main-img');
      this._stateBox = this.querySelector('#state-text');
      this._grid = this.querySelector('#sensor-grid');
      this._head = this.querySelector('#header');
    }

    const rawState = entityState ? entityState.state : 'none';
    const state = this.normalizeState(rawState);
    const baseUrl = "https://raw.githubusercontent.com/xez7082/-dist-appliance-card.js/main/img/";
    
    // --- MISE À JOUR IMAGE ---
    const newSrc = `${baseUrl}${state}.png`;
    if (this._lastImage !== newSrc) {
        this._img.src = newSrc;
        this._lastImage = newSrc;
    }

    // --- DESIGN ---
    const colors = { enveille:"#888", lavage:"#2980b9", rincage:"#1abc9c", essorage:"#9b59b6", findecycle:"#2ecc71", erreur:"#e74c3c", pause:"#f39c12" };
    const color = colors[state] || "#7CFFB2";
    
    const titles = { washing_machine: "Lave-Linge", dishwasher: "Lave-Vaisselle", fridge: "Réfrigérateur" };
    this._head.textContent = titles[type];
    
    this._stateBox.textContent = rawState.replace('_', ' ').toUpperCase();
    this._stateBox.style.color = color;
    this._baseCard.style.borderColor = `${color}66`;
    this._img.style.filter = `drop-shadow(0 0 10px ${color}44)`;

    // --- CAPTEURS ---
    const sensors = (this.config.sensors || {})[type] || [];
    let html = "";
    sensors.forEach(id => {
      const s = hass.states[id];
      if (s) {
        html += `
          <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:12px; border:1px solid #222; border-left:3px solid ${color};">
            <div style="font-size:9px; opacity:0.5; text-transform:uppercase; white-space:nowrap; overflow:hidden;">${id.split('.').pop().replace('_',' ')}</div>
            <div style="font-weight:bold; font-size:12px;">${s.state} <span style="font-size:10px; opacity:0.7;">${s.attributes.unit_of_measurement || ''}</span></div>
          </div>`;
      }
    });
    this._grid.innerHTML = html;
  }
}
customElements.define("appliance-card", ApplianceCard);

window.customCards = window.customCards || [];
window.customCards.push({ type: "appliance-card", name: "Appliance Samsung/LG Pro", preview: true });
