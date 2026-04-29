class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  _render() {
    if (!this._config) return;
    const type = this._config.appliance_type || 'washing_machine';
    
    this.innerHTML = `
      <div style="padding: 10px; color: white; background: #222; font-family: sans-serif;">
        <div style="font-weight:bold; color:#7CFFB2; border-bottom:1px solid #444; padding-bottom:5px; margin-bottom:10px;">
          MODE : ${type.toUpperCase()}
        </div>
        
        <label>Entité État (sensor...) :</label><br>
        <input id="ent_input" style="width:100%; padding:8px; margin:5px 0;" value="${this._config.entities ? (this._config.entities[type] || '') : ''}">
        
        <p style="margin-top:15px;">Ajouter un Sensor de mesure :</p>
        <input id="sens_input" style="width:70%; padding:8px;" placeholder="sensor.puissance">
        <button id="add_btn" style="width:25%; padding:8px; background:#7CFFB2; border:none; font-weight:bold;">AJOUTER</button>
        
        <div id="list" style="margin-top:10px;"></div>
      </div>
    `;

    const entInp = this.querySelector('#ent_input');
    const sensInp = this.querySelector('#sens_input');
    const addBtn = this.querySelector('#add_btn');

    // Empêche HA de voler le focus
    [entInp, sensInp].forEach(i => {
      i.addEventListener('keydown', e => e.stopPropagation());
    });

    entInp.onchange = () => {
      const newConfig = JSON.parse(JSON.stringify(this._config));
      if (!newConfig.entities) newConfig.entities = {};
      newConfig.entities[type] = entInp.value;
      this._dispatch(newConfig);
    };

    addBtn.onclick = () => {
      const val = sensInp.value.trim();
      if (val.includes('.')) {
        const newConfig = JSON.parse(JSON.stringify(this._config));
        if (!newConfig.sensors) newConfig.sensors = { washing_machine: [], dishwasher: [], fridge: [] };
        if (!newConfig.sensors[type]) newConfig.sensors[type] = [];
        newConfig.sensors[type].push(val);
        this._dispatch(newConfig);
        sensInp.value = "";
      }
    };

    const list = this.querySelector('#list');
    const sensors = (this._config.sensors && this._config.sensors[type]) ? this._config.sensors[type] : [];
    sensors.forEach((s, i) => {
      const div = document.createElement('div');
      div.style = "background:#333; padding:5px; margin:2px 0; display:flex; justify-content:space-between; font-size:11px;";
      div.innerHTML = `<span>${s}</span><span style="color:red; cursor:pointer;">[X]</span>`;
      div.querySelector('span:last-child').onclick = () => {
        const newConfig = JSON.parse(JSON.stringify(this._config));
        newConfig.sensors[type].splice(i, 1);
        this._dispatch(newConfig);
      };
      list.appendChild(div);
    });
  }

  _dispatch(config) {
    this._config = config;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: config }, bubbles: true, composed: true }));
    this._render();
  }
}
customElements.define("appliance-card-editor", ApplianceCardEditor);

class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  
  setConfig(config) {
    this._config = config;
  }

  set hass(hass) {
    if (!this._config || !hass) return;
    const type = this._config.appliance_type || 'washing_machine';
    const mainEnt = (this._config.entities || {})[type];
    const stateObj = hass.states[mainEnt];
    
    if (!this._base) {
      this.innerHTML = `
        <ha-card style="padding:15px; background:#111; color:white; border-radius:15px; border:1px solid #333;">
          <div style="display:flex; gap:5px; margin-bottom:15px;">
             <button id="l_btn" style="flex:1; padding:10px; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">LINGE</button>
             <button id="v_btn" style="flex:1; padding:10px; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">VAISSELLE</button>
             <button id="f_btn" style="flex:1; padding:10px; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">FRIGO</button>
          </div>
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="flex: 1.2; text-align: center;">
              <img id="main_img" style="width:100%; height:140px; object-fit:contain;">
              <div id="state_txt" style="font-weight:bold; font-size:12px; margin-top:8px;"></div>
            </div>
            <div id="sensor_box" style="flex: 1; display: flex; flex-direction: column; gap: 8px;"></div>
          </div>
        </ha-card>`;
      this._base = this.querySelector('ha-card');
      
      this.querySelector('#l_btn').onclick = () => this._switch('washing_machine');
      this.querySelector('#v_btn').onclick = () => this._switch('dishwasher');
      this.querySelector('#f_btn').onclick = () => this._switch('fridge');
    }

    // Styles Boutons
    const btns = { washing_machine: '#l_btn', dishwasher: '#v_btn', fridge: '#f_btn' };
    Object.keys(btns).forEach(k => {
      const b = this.querySelector(btns[k]);
      b.style.background = (type === k) ? '#7CFFB2' : '#333';
      b.style.color = (type === k) ? '#000' : '#fff';
    });

    const rawState = stateObj ? stateObj.state : 'none';
    const cleanState = rawState.toLowerCase().replace('ai_', '').replace('_sensing', '');
    
    const img = this.querySelector('#main_img');
    img.src = `https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/${cleanState}.png`;
    img.onerror = () => { img.src = "https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/enveille.png"; };

    this.querySelector('#state_txt').textContent = rawState.toUpperCase();
    this.querySelector('#state_txt').style.color = "#7CFFB2";

    // Affichage des capteurs
    const sensorList = (this._config.sensors && this._config.sensors[type]) ? this._config.sensors[type] : [];
    let html = "";
    sensorList.forEach(sid => {
      const s = hass.states[sid];
      if (s) {
        html += `
          <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:8px; border-left:4px solid #7CFFB2;">
            <div style="font-size:9px; opacity:0.6; text-transform:uppercase;">${sid.split('.').pop()}</div>
            <div style="font-size:12px; font-weight:bold;">${s.state} ${s.attributes.unit_of_measurement || ''}</div>
          </div>`;
      }
    });
    this.querySelector('#sensor_box').innerHTML = html;
  }

  _switch(t) {
    const newConfig = JSON.parse(JSON.stringify(this._config));
    newConfig.appliance_type = t;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newConfig }, bubbles: true, composed: true }));
  }
}
customElements.define("appliance-card", ApplianceCard);
