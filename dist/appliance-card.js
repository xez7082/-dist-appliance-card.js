class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    // On travaille sur une copie profonde pour éviter les conflits de mémoire
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._config.sensors) this._config.sensors = { washing_machine: [], dishwasher: [], fridge: [] };
    if (!this._config.entities) this._config.entities = {};
    if (!this._config.appliance_type) this._config.appliance_type = 'washing_machine';
    this._render();
  }

  _render() {
    const type = this._config.appliance_type;
    this.innerHTML = `
      <div style="padding: 10px; color: white; background: #1c1c1c;">
        <div style="background:#7CFFB2; color:#000; padding:5px; font-weight:bold; margin-bottom:10px; text-align:center;">
            CONFIGURATION : ${type.toUpperCase()}
        </div>
        
        <label>Entité d'état (Image) :</label><br>
        <input id="main_ent" style="width:100%; padding:10px; margin:5px 0;" value="${this._config.entities[type] || ''}">

        <p>Ajouter un capteur (ex: sensor.puissance) :</p>
        <div style="display:flex; gap:5px;">
          <input id="new_sens" style="flex:1; padding:10px;" placeholder="sensor.xxxx">
          <button id="add_btn" style="padding:10px; background:#7CFFB2; border:none; font-weight:bold;">AJOUTER</button>
        </div>
        <div id="list_sens" style="margin-top:10px; border-top:1px solid #444;"></div>
      </div>
    `;

    const mainInput = this.querySelector('#main_ent');
    const addInput = this.querySelector('#new_sens');
    
    // Empêche HA de fermer l'éditeur quand on tape
    const stop = (e) => e.stopPropagation();
    mainInput.onkeydown = stop;
    addInput.onkeydown = stop;

    mainInput.onchange = () => {
      this._config.entities[type] = mainInput.value.trim();
      this._fireConfig();
    };

    this.querySelector('#add_btn').onclick = () => {
      const val = addInput.value.trim();
      if (val !== "") {
        if (!Array.isArray(this._config.sensors[type])) this._config.sensors[type] = [];
        this._config.sensors[type].push(val);
        addInput.value = "";
        this._fireConfig();
      }
    };

    const listDiv = this.querySelector('#list_sens');
    (this._config.sensors[type] || []).forEach((s, idx) => {
      const item = document.createElement('div');
      item.style = "background:#333; padding:5px; margin:3px 0; display:flex; justify-content:space-between; font-size:11px;";
      item.innerHTML = `<span>${s}</span><b style="color:red; cursor:pointer;">[X]</b>`;
      item.querySelector('b').onclick = () => {
        this._config.sensors[type].splice(idx, 1);
        this._fireConfig();
      };
      listDiv.appendChild(item);
    });
  }

  _fireConfig() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
    this._render();
  }
}
customElements.define("appliance-card-editor", ApplianceCardEditor);

class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  setConfig(config) { this.config = config; }

  set hass(hass) {
    const config = this.config;
    const type = config.appliance_type || 'washing_machine';
    const mainEnt = (config.entities || {})[type];
    const stateObj = hass.states[mainEnt];
    
    if (!this.card) {
      this.innerHTML = `
        <ha-card style="padding:15px; background:#111; color:white; border-radius:15px; border:1px solid #333;">
          <div style="display:flex; gap:5px; margin-bottom:15px;">
             <button id="b1" style="flex:1; padding:8px; border:none; cursor:pointer;">LINGE</button>
             <button id="b2" style="flex:1; padding:8px; border:none; cursor:pointer;">VAISSELLE</button>
             <button id="b3" style="flex:1; padding:8px; border:none; cursor:pointer;">FRIGO</button>
          </div>
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="flex: 1; text-align: center;">
              <img id="img" style="width:100%; height:130px; object-fit:contain;">
              <div id="st" style="font-weight:bold; font-size:12px; margin-top:5px;"></div>
            </div>
            <div id="gr" style="flex: 1; display: flex; flex-direction: column; gap: 5px;"></div>
          </div>
        </ha-card>`;
      this.card = this.querySelector('ha-card');
      this.img = this.querySelector('#img');
      this.st = this.querySelector('#st');
      this.gr = this.querySelector('#gr');

      this.querySelector('#b1').onclick = () => this._up('washing_machine');
      this.querySelector('#b2').onclick = () => this._up('dishwasher');
      this.querySelector('#b3').onclick = () => this._up('fridge');
    }

    const currentType = config.appliance_type || 'washing_machine';
    ['b1','b2','b3'].forEach((id, i) => {
        const types = ['washing_machine','dishwasher','fridge'];
        const b = this.querySelector('#'+id);
        b.style.background = (currentType === types[i]) ? '#7CFFB2' : '#2a2a2a';
        b.style.color = (currentType === types[i]) ? '#000' : '#fff';
    });

    const raw = stateObj ? stateObj.state : 'none';
    const map = {'wash':'lavage','ai_wash':'lavage','pre_wash':'lavage','air_wash':'lavage','weight_sensing':'lavage','rinse':'rincage','spin':'essorage','finish':'findecycle','none':'enveille','off':'enveille'};
    const state = map[raw.toLowerCase()] || raw.toLowerCase();
    
    this.img.src = `https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/${state}.png`;
    this.img.onerror = () => { this.img.src = "https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/enveille.png"; };
    
    this.st.textContent = raw.toUpperCase();
    this.st.style.color = "#7CFFB2";

    // --- AFFICHAGE DES SENSORS ---
    const sensorList = (config.sensors && config.sensors[currentType]) ? config.sensors[currentType] : [];
    let html = "";
    sensorList.forEach(sid => {
      const s = hass.states[sid];
      if (s) {
        html += `<div style="background:#1a1a1a; padding:6px; border-left:3px solid #7CFFB2; border-radius:4px;">
          <div style="font-size:8px; opacity:0.6;">${sid.split('.').pop()}</div>
          <div style="font-size:11px; font-weight:bold;">${s.state} ${s.attributes.unit_of_measurement || ''}</div>
        </div>`;
      }
    });
    this.gr.innerHTML = html || "<div style='font-size:10px;opacity:0.3;'>Vide</div>";
  }

  _up(t) {
    this.config.appliance_type = t;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this.config }, bubbles: true, composed: true }));
  }
}
customElements.define("appliance-card", ApplianceCard);
