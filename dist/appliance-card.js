// --- 1. L'ÉDITEUR ---
class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    // On structure la config pour séparer les sensors par type
    this._config = { 
        appliance_type: 'washing_machine', 
        state_sensors: {}, // { washing_machine: '...', dishwasher: '...' }
        sensors_list: { washing_machine: [], dishwasher: [], fridge: [] },
        ...config 
    };
    this._render();
  }

  _render() {
    const type = this._config.appliance_type;
    this.innerHTML = `
      <div style="padding: 15px; font-family: sans-serif; background: #1c1c1c; color: white; border-radius: 10px;">
        <label style="font-weight: bold; color: #7CFFB2; font-size: 11px;">CHOISIR L'APPAREIL À CONFIGURER</label>
        <div style="display: flex; gap: 5px; margin: 10px 0 20px;">
          <button class="type-btn" data-type="washing_machine" style="flex:1; padding:10px; cursor:pointer; background:#222; color:#888; border:1px solid #444; border-radius:5px; font-size:10px;">LAVE LINGE</button>
          <button class="type-btn" data-type="dishwasher" style="flex:1; padding:10px; cursor:pointer; background:#222; color:#888; border:1px solid #444; border-radius:5px; font-size:10px;">VAISSELLE</button>
          <button class="type-btn" data-type="fridge" style="flex:1; padding:10px; cursor:pointer; background:#222; color:#888; border:1px solid #444; border-radius:5px; font-size:10px;">FRIGO</button>
        </div>

        <div id="config-zone">
            <label style="font-weight: bold; color: #7CFFB2; font-size: 11px;">CAPTEUR D'ÉTAT (ANIMATION ${type.toUpperCase()})</label>
            <input id="state-input" placeholder="sensor.etat_machine" value="${this._config.state_sensors[type] || ''}"
                   style="width: 100%; padding: 10px; background: #000; color: #fff; border: 1px solid #444; border-radius: 5px; margin: 10px 0; box-sizing: border-box;">

            <label style="font-weight: bold; color: #7CFFB2; font-size: 11px;">AUTRES CAPTEURS POUR ${type.toUpperCase()}</label>
            <div style="display: flex; gap: 5px; margin-top: 10px;">
              <input id="s-input" placeholder="sensor.mesure" style="flex: 1; padding: 10px; background: #000; color: #fff; border: 1px solid #444; border-radius: 5px;">
              <button id="add-btn" style="background: #7CFFB2; border: none; padding: 0 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">OK</button>
            </div>
            <div id="tag-container" style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 5px;"></div>
        </div>
      </div>
    `;

    const stateInput = this.querySelector('#state-input');
    const input = this.querySelector('#s-input');

    // Stop propagation pour le curseur
    [stateInput, input].forEach(el => {
        el.oninput = (e) => e.stopPropagation();
        el.onkeydown = (e) => e.stopPropagation();
    });

    stateInput.onchange = () => {
        this._config.state_sensors[type] = stateInput.value.trim();
        this._save();
    };

    this.querySelectorAll('.type-btn').forEach(btn => {
      if (btn.dataset.type === type) btn.style.borderColor = '#7CFFB2';
      btn.onclick = () => {
        this._config.appliance_type = btn.dataset.type;
        this._render(); // On redessine pour changer de contexte
        this._save();
      };
    });

    this.querySelector('#add-btn').onclick = () => {
      if (input.value.includes('.')) {
        if (!this._config.sensors_list[type]) this._config.sensors_list[type] = [];
        this._config.sensors_list[type].push(input.value.trim());
        input.value = "";
        this._renderTags();
        this._save();
      }
    };
    this._renderTags();
  }

  _renderTags() {
    const type = this._config.appliance_type;
    const container = this.querySelector('#tag-container');
    const list = this._config.sensors_list[type] || [];
    container.innerHTML = list.map((s, i) => `
      <div style="background: #333; padding: 5px 10px; border-radius: 15px; font-size: 10px;">
        ${s.split('.').pop()} <span class="del" data-i="${i}" style="color:red; cursor:pointer; margin-left:5px;">×</span>
      </div>
    `).join('');
    container.querySelectorAll('.del').forEach(d => {
      d.onclick = () => {
        this._config.sensors_list[type].splice(d.dataset.i, 1);
        this._renderTags();
        this._save();
      };
    });
  }

  _save() { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })); }
}
customElements.define("appliance-card-editor", ApplianceCardEditor);

// --- 2. LA CARTE ---
class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  
  setConfig(config) { this.config = config; }

  set hass(hass) {
    if (!this.config || !hass) return;
    if (!this.content) {
      this.innerHTML = `
        <ha-card style="overflow: hidden; border-radius: 20px; background: #111; color: white; border: 1px solid #333;">
          <style>
            @keyframes spin { 100% { transform: rotate(360deg); } }
            @keyframes pulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.1); opacity: 1; } }
            .is-spinning { animation: spin 2.5s linear infinite; }
            .is-pulsing { animation: pulse 1.5s infinite alternate; }
          </style>
          <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div id="viz" style="position:relative; width: 60px; height: 60px; border-radius: 50%; border: 2px solid #444; display: flex; align-items: center; justify-content: center; transition: 0.5s;"></div>
              <div style="text-align: right;">
                <div id="title" style="color: #7CFFB2; font-weight: bold; text-transform: uppercase;"></div>
                <div id="stat-text" style="font-size: 10px; opacity: 0.5;"></div>
              </div>
            </div>
            <div id="grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px;"></div>
          </div>
        </ha-card>`;
      this.content = this.querySelector("#grid");
    }

    const type = this.config.appliance_type || 'washing_machine';
    const stateSensor = (this.config.state_sensors || {})[type];
    const stateObj = hass.states[stateSensor];
    const isActive = stateObj && ['run', 'wash', 'active', 'on', 'busy', 'working'].includes(stateObj.state.toLowerCase());

    const viz = this.querySelector("#viz");
    viz.style.borderColor = isActive ? "#7CFFB2" : "#444";
    
    if (type === 'washing_machine') {
      viz.innerHTML = `<span style="font-size:30px;" class="${isActive ? 'is-spinning' : ''}">🧺</span>`;
    } else if (type === 'dishwasher') {
      viz.innerHTML = `<span style="font-size:30px;" class="${isActive ? 'is-pulsing' : ''}">🍽️</span>`;
    } else {
      viz.innerHTML = `<span style="font-size:30px;">❄️</span>`;
    }

    this.querySelector("#title").textContent = {washing_machine: "Lave-Linge", dishwasher: "Vaisselle", fridge: "Frigo"}[type];
    this.querySelector("#stat-text").textContent = stateObj ? stateObj.state.toUpperCase() : "OFF";

    // On affiche uniquement les sensors de l'appareil sélectionné
    const list = (this.config.sensors_list || {})[type] || [];
    let html = "";
    list.forEach(id => {
      const s = hass.states[id];
      if (s) html += `
        <div style="background:#222; padding:8px; border-radius:10px; border-left:2px solid #7CFFB2;">
          <div style="font-size:9px; opacity:0.5; text-transform:uppercase;">${id.split('.').pop()}</div>
          <div style="font-weight:bold; font-size:12px;">${s.state} ${s.attributes.unit_of_measurement || ''}</div>
        </div>`;
    });
    this.content.innerHTML = html;
  }
}
customElements.define("appliance-card", ApplianceCard);

window.customCards = window.customCards || [];
window.customCards.push({ type: "appliance-card", name: "Appliance Card Multi", preview: true });
