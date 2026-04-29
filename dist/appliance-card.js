class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._config.sensors) this._config.sensors = { washing_machine: [], dishwasher: [], fridge: [] };
    if (!this._config.entities) this._config.entities = {};
    if (!this._config.appliance_type) this._config.appliance_type = 'washing_machine';
    this._render();
  }

  _render() {
    const type = this._config.appliance_type;
    this.innerHTML = `
      <div style="padding: 10px; color: white; background: #1c1c1c; font-family: sans-serif;">
        <p style="font-weight: bold; color: #7CFFB2;">CONFIGURATION : ${type.toUpperCase()}</p>
        
        <label>Entité d'état (Image) :</label><br>
        <input id="main_ent" style="width:100%; padding:10px; margin:5px 0; background:#000; color:#fff; border:1px solid #444;" 
               value="${this._config.entities[type] || ''}">

        <p style="margin: 15px 0 5px;">Ajouter un capteur de mesure :</p>
        <div style="display:flex; gap:5px;">
          <input id="new_sens" style="flex:1; padding:10px; background:#000; color:#fff; border:1px solid #444;" placeholder="sensor.nom_du_capteur">
          <button id="add_btn" style="padding:10px; background:#7CFFB2; border:none; font-weight:bold; cursor:pointer; border-radius:4px;">AJOUTER</button>
        </div>
        <div id="list_sens" style="margin-top:10px; border-top:1px solid #333; padding-top:10px;"></div>
      </div>
    `;

    const mainInput = this.querySelector('#main_ent');
    const addInput = this.querySelector('#new_sens');
    const stop = (e) => e.stopPropagation();
    [mainInput, addInput].forEach(i => { i.onkeydown = stop; i.oninput = stop; });

    mainInput.onchange = () => {
      this._config.entities[type] = mainInput.value.trim();
      this._save();
    };

    this.querySelector('#add_btn').onclick = () => {
      const val = addInput.value.trim();
      if (val.includes('.')) {
        // Initialisation si vide
        if (!Array.isArray(this._config.sensors[type])) this._config.sensors[type] = [];
        this._config.sensors[type] = [...this._config.sensors[type], val];
        addInput.value = "";
        this._save();
      }
    };

    const listDiv = this.querySelector('#list_sens');
    const currentSensors = this._config.sensors[type] || [];
    currentSensors.forEach((s, idx) => {
      const item = document.createElement('div');
      item.style = "background:#333; padding:8px; margin:4px 0; border-radius:4px; display:flex; justify-content:space-between; font-size:11px;";
      item.innerHTML = `<span>${s}</span><span style="color:#ff5252; cursor:pointer; font-weight:bold; padding-left:10px;">SUPPR</span>`;
      item.querySelector('span:last-child').onclick = () => {
        this._config.sensors[type].splice(idx, 1);
        this._config.sensors[type] = [...this._config.sensors[type]];
        this._save();
      };
      listDiv.appendChild(item);
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
  
  setConfig(config) {
    this.config = JSON.parse(JSON.stringify(config));
  }

  normalizeState(state) {
    if (!state) return 'enveille';
    const s = state.toLowerCase();
    const map = {
      'wash':'lavage','ai_wash':'lavage','pre_wash':'lavage','air_wash':'lavage','weight_sensing':'lavage',
      'filling':'remplissage','rinse':'rincage','ai_rinse':'rincage','spin':'essorage','ai_spin':'essorage',
      'finish':'findecycle','complete':'findecycle','done':'findecycle','cooling':'findecycle','drying':'findecycle',
      'wrinkle_prevent':'findecycle','pause':'pause','paused':'pause','none':'enveille','off':'enveille'
    };
    return map[s] || s;
  }

  _switchType(newType) {
    this.config.appliance_type = newType;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this.config }, bubbles: true, composed: true }));
  }

  set hass(hass) {
    const type = this.config.appliance_type || 'washing_machine';
    const mainEnt = (this.config.entities || {})[type];
    const entityState = hass.states[mainEnt];
    
    if (!this.card) {
      this.innerHTML = `
        <ha-card style="border-radius:15px; overflow:hidden; background:#111; color:white; border:1px solid #333; padding:15px;">
          <div style="display:flex; gap:8px; margin-bottom:15px;">
             <button id="btn_wash" style="flex:1; padding:8px; font-size:11px; border-radius:6px; border:none; cursor:pointer; font-weight:bold; transition: 0.3s;">LINGE</button>
             <button id="btn_dish" style="flex:1; padding:8px; font-size:11px; border-radius:6px; border:none; cursor:pointer; font-weight:bold; transition: 0.3s;">VAISSELLE</button>
             <button id="btn_fridge" style="flex:1; padding:8px; font-size:11px; border-radius:6px; border:none; cursor:pointer; font-weight:bold; transition: 0.3s;">FRIGO</button>
          </div>

          <div style="display: flex; align-items: center; gap: 20px;">
            <div style="flex: 1.1; display: flex; flex-direction: column; align-items: center;">
              <img id="img" style="width:100%; height:140px; object-fit:contain;">
              <div id="st" style="margin-top:10px; font-weight:bold; font-size:12px; text-align:center; text-transform:uppercase;"></div>
            </div>
            <div id="gr" style="flex: 1; display: flex; flex-direction: column; gap: 8px; min-height: 100px; justify-content: center;"></div>
          </div>
        </ha-card>`;
      this.card = this.querySelector('ha-card');
      this.img = this.querySelector('#img');
      this.st = this.querySelector('#st');
      this.gr = this.querySelector('#gr');
      
      this.querySelector('#btn_wash').onclick = () => this._switchType('washing_machine');
      this.querySelector('#btn_dish').onclick = () => this._switchType('dishwasher');
      this.querySelector('#btn_fridge').onclick = () => this._switchType('fridge');
    }

    // Update boutons
    const currentType = this.config.appliance_type || 'washing_machine';
    const btns = { washing_machine: '#btn_wash', dishwasher: '#btn_dish', fridge: '#btn_fridge' };
    Object.keys(btns).forEach(key => {
        const b = this.querySelector(btns[key]);
        if(b) {
          b.style.background = (currentType === key) ? '#7CFFB2' : '#2a2a2a';
          b.style.color = (currentType === key) ? '#000' : '#fff';
        }
    });

    // Update Image & Etat
    const raw = entityState ? entityState.state : 'none';
    const state = this.normalizeState(raw);
    const baseUrl = "https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/";
    
    if(this.img.src !== baseUrl + state + ".png") {
      this.img.src = baseUrl + state + ".png";
      this.img.onerror = () => { this.img.src = baseUrl + "enveille.png"; };
    }

    const color = { enveille:"#888", lavage:"#2980b9", rincage:"#1abc9c", essorage:"#9b59b6", findecycle:"#2ecc71", erreur:"#e74c3c", pause:"#f39c12" }[state] || "#7CFFB2";
    this.st.textContent = raw.replace('_',' ').toUpperCase();
    this.st.style.color = color;
    this.card.style.borderColor = color + "66";

    // --- LOGIQUE SENSORS (CORRIGÉE) ---
    const sensorList = (this.config.sensors && this.config.sensors[currentType]) ? this.config.sensors[currentType] : [];
    let html = "";
    
    sensorList.forEach(entityId => {
      const s = hass.states[entityId];
      if (s) {
        html += `
          <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:8px; border-left:4px solid ${color};">
            <div style="font-size:9px; opacity:0.6; text-transform:uppercase; white-space:nowrap; overflow:hidden;">${entityId.split('.').pop().replace('_',' ')}</div>
            <div style="font-size:12px; font-weight:bold;">${s.state} ${s.attributes.unit_of_measurement || ''}</div>
          </div>`;
      } else {
        // Aide au débogage si l'entité n'existe pas
        html += `<div style="font-size:9px; color:#ff5252; opacity:0.5;">! ${entityId.split('.').pop()} introuvable</div>`;
      }
    });

    this.gr.innerHTML = html || `<div style="font-size:11px; opacity:0.3; text-align:center;">Aucun capteur<br>configuré</div>`;
  }
}
customElements.define("appliance-card", ApplianceCard);
