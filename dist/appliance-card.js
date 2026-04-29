class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._config || this._rendered) return;
    this._rendered = true;

    const type = this._config.appliance_type || 'washing_machine';

    this.innerHTML = `
      <div style="padding: 10px; font-family: sans-serif; background: #1c1c1c; color: white; border-radius: 8px;">
        <label style="font-weight: bold; color: #7CFFB2; font-size: 11px;">TYPE D'APPAREIL</label>
        <div style="display: flex; gap: 5px; margin: 10px 0 20px;">
          <button class="type-btn" data-type="washing_machine" style="flex:1; padding:8px; cursor:pointer; border:none; border-radius:4px; font-weight:bold; background:${type === 'washing_machine' ? '#7CFFB2' : '#444'}; color:${type === 'washing_machine' ? '#000' : '#fff'};">LINGE</button>
          <button class="type-btn" data-type="dishwasher" style="flex:1; padding:8px; cursor:pointer; border:none; border-radius:4px; font-weight:bold; background:${type === 'dishwasher' ? '#7CFFB2' : '#444'}; color:${type === 'dishwasher' ? '#000' : '#fff'};">VAISSELLE</button>
          <button class="type-btn" data-type="fridge" style="flex:1; padding:8px; cursor:pointer; border:none; border-radius:4px; font-weight:bold; background:${type === 'fridge' ? '#7CFFB2' : '#444'}; color:${type === 'fridge' ? '#000' : '#fff'};">FRIGO</button>
        </div>

        <label style="font-weight: bold; color: #7CFFB2; font-size: 11px;">ENTITÉ D'ÉTAT (${type.toUpperCase()})</label>
        <input id="main-ent" type="text" style="width:100%; padding:10px; margin:8px 0 15px; background:#000; color:#fff; border:1px solid #444; border-radius:4px;" 
               value="${(this._config.entities && this._config.entities[type]) || ''}" placeholder="sensor.etat_cycle">

        <label style="font-weight: bold; color: #7CFFB2; font-size: 11px;">AJOUTER UN CAPTEUR</label>
        <div style="display: flex; gap: 5px; margin-top:8px;">
          <input id="new-sensor" type="text" style="flex: 1; padding: 10px; background:#000; color:#fff; border:1px solid #444; border-radius:4px;" placeholder="sensor.puissance">
          <button id="add-btn" style="padding: 0 15px; cursor: pointer; background: #7CFFB2; border: none; font-weight: bold; border-radius:4px;">+</button>
        </div>

        <div id="sensor-list" style="margin-top: 15px; display: flex; flex-direction: column; gap: 5px;">
          ${((this._config.sensors && this._config.sensors[type]) || []).map((s, i) => `
            <div style="display: flex; justify-content: space-between; background: #333; padding: 6px 10px; border-radius: 4px; align-items: center; border: 1px solid #444;">
              <span style="font-size: 11px; overflow: hidden; text-overflow: ellipsis;">${s}</span>
              <button class="remove-btn" data-index="${i}" style="background: #ff5252; color: white; border: none; border-radius: 3px; cursor: pointer; padding: 2px 6px; font-weight:bold;">X</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Événements Boutons de Type
    this.querySelectorAll('.type-btn').forEach(btn => {
      btn.onclick = () => {
        this._updateConfig({ appliance_type: btn.dataset.type });
      };
    });

    // Événement Entité Principale
    this.querySelector('#main-ent').onchange = (ev) => {
      const entities = { ...(this._config.entities || {}) };
      entities[type] = ev.target.value;
      this._updateConfig({ entities });
    };

    // Événement Ajouter Sensor
    this.querySelector('#add-btn').onclick = () => {
      const input = this.querySelector('#new-sensor');
      const value = input.value.trim();
      if (value) {
        const allSensors = { ...(this._config.sensors || {}) };
        const typeSensors = [...(allSensors[type] || [])];
        typeSensors.push(value);
        allSensors[type] = typeSensors;
        this._updateConfig({ sensors: allSensors });
        input.value = '';
      }
    };

    // Événement Supprimer Sensor
    this.querySelectorAll('.remove-btn').forEach(btn => {
      btn.onclick = (ev) => {
        const index = parseInt(ev.target.dataset.index);
        const allSensors = { ...(this._config.sensors || {}) };
        const typeSensors = [...(allSensors[type] || [])];
        typeSensors.splice(index, 1);
        allSensors[type] = typeSensors;
        this._updateConfig({ sensors: allSensors });
      };
    });

    this._rendered = false;
  }

  _updateConfig(newValues) {
    this._config = { ...this._config, ...newValues };
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
  }
}
customElements.define("appliance-card-editor", ApplianceCardEditor);

class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }

  setConfig(config) {
    this._config = config;
  }

  set hass(hass) {
    const type = this._config.appliance_type || 'washing_machine';
    const entities = this._config.entities || {};
    const mainEnt = entities[type];
    const stateObj = hass.states[mainEnt];
    const rawState = stateObj ? stateObj.state.toLowerCase() : 'enveille';

    // Normalisation pour les images
    const map = {
      'wash':'lavage', 'rinse':'rincage', 'spin':'essorage', 'finish':'findecycle', 'off':'enveille', 'none':'enveille'
    };
    const imgName = map[rawState] || rawState.replace('ai_', '');
    const url = `https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/${imgName}.png`;

    if (!this._base) {
      this.innerHTML = `
        <ha-card style="padding: 15px; background: #111; color: white; border-radius: 15px; border: 1px solid #333;">
          <div style="display: flex; gap: 5px; margin-bottom: 15px;">
            <button id="card-btn-wash" style="flex:1; padding:6px; font-size:10px; border-radius:4px; border:none; cursor:pointer; font-weight:bold;">LINGE</button>
            <button id="card-btn-dish" style="flex:1; padding:6px; font-size:10px; border-radius:4px; border:none; cursor:pointer; font-weight:bold;">VAISSELLE</button>
            <button id="card-btn-fridge" style="flex:1; padding:6px; font-size:10px; border-radius:4px; border:none; cursor:pointer; font-weight:bold;">FRIGO</button>
          </div>
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="flex: 1.2; text-align: center;">
              <img id="main-img" style="width: 100%; height: 140px; object-fit: contain;">
              <div id="state-text" style="font-weight: bold; margin-top: 8px; font-size: 12px; text-transform: uppercase;"></div>
            </div>
            <div id="sensor-container" style="flex: 1; display: flex; flex-direction: column; gap: 8px;"></div>
          </div>
        </ha-card>
      `;
      this._base = this.querySelector('ha-card');
      
      this.querySelector('#card-btn-wash').onclick = () => this._switch('washing_machine');
      this.querySelector('#card-btn-dish').onclick = () => this._switch('dishwasher');
      this.querySelector('#card-btn-fridge').onclick = () => this._switch('fridge');
    }

    // Update Styles Boutons Carte
    ['wash', 'dish', 'fridge'].forEach(k => {
      const fullKey = k === 'wash' ? 'washing_machine' : (k === 'dish' ? 'dishwasher' : 'fridge');
      const b = this.querySelector(`#card-btn-${k}`);
      b.style.background = (type === fullKey) ? '#7CFFB2' : '#333';
      b.style.color = (type === fullKey) ? '#000' : '#fff';
    });

    const img = this.querySelector('#main-img');
    img.src = url;
    img.onerror = () => img.src = "https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/enveille.png";
    
    const color = { lavage:"#2980b9", rincage:"#1abc9c", findecycle:"#2ecc71" }[imgName] || "#7CFFB2";
    this.querySelector('#state-text').textContent = stateObj ? stateObj.state : 'Déconnecté';
    this.querySelector('#state-text').style.color = color;

    const container = this.querySelector('#sensor-container');
    container.innerHTML = '';
    const sensors = (this._config.sensors && this._config.sensors[type]) || [];
    
    sensors.forEach(sid => {
      const s = hass.states[sid];
      if (s) {
        const div = document.createElement('div');
        div.style = `background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; border-left: 3px solid ${color};`;
        div.innerHTML = `
          <div style="font-size: 8px; opacity: 0.6; text-transform: uppercase;">${sid.split('.').pop().replace('_',' ')}</div>
          <div style="font-size: 11px; font-weight: bold;">${s.state} ${s.attributes.unit_of_measurement || ''}</div>
        `;
        container.appendChild(div);
      }
    });
  }

  _switch(t) {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: { ...this._config, appliance_type: t } },
      bubbles: true, composed: true
    }));
  }
}
customElements.define("appliance-card", ApplianceCard);
