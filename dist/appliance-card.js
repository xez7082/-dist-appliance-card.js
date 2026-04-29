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

    this.innerHTML = `
      <div style="padding: 10px; font-family: sans-serif;">
        <div style="margin-bottom: 15px;">
          <label style="font-weight: bold; display: block; margin-bottom: 5px;">Entité Principale (État)</label>
          <input id="main-ent" type="text" style="width: 100%; padding: 8px; box-sizing: border-box;" 
                 value="${this._config.entity || ''}" placeholder="sensor.lave_linge_cycle">
        </div>

        <div style="margin-bottom: 15px;">
          <label style="font-weight: bold; display: block; margin-bottom: 5px;">Ajouter un capteur (Mesures)</label>
          <div style="display: flex; gap: 5px;">
            <input id="new-sensor" type="text" style="flex: 1; padding: 8px;" placeholder="sensor.puissance">
            <button id="add-btn" style="padding: 8px; cursor: pointer; background: #7CFFB2; border: none; font-weight: bold;">+</button>
          </div>
        </div>

        <div id="sensor-list" style="display: flex; flex-direction: column; gap: 5px;">
          ${(this._config.sensors || []).map((s, i) => `
            <div style="display: flex; justify-content: space-between; background: #eee; padding: 5px 10px; border-radius: 4px; color: #000; align-items: center;">
              <span style="font-size: 12px;">${s}</span>
              <button class="remove-btn" data-index="${i}" style="background: #ff5252; color: white; border: none; border-radius: 3px; cursor: pointer; padding: 2px 6px;">X</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Événement Entité Principale
    this.querySelector('#main-ent').addEventListener('change', (ev) => {
      this._updateConfig({ entity: ev.target.value });
    });

    // Événement Ajouter Sensor
    this.querySelector('#add-btn').addEventListener('click', () => {
      const input = this.querySelector('#new-sensor');
      const value = input.value.trim();
      if (value) {
        const sensors = [...(this._config.sensors || [])];
        sensors.push(value);
        this._updateConfig({ sensors: sensors });
        input.value = '';
      }
    });

    // Événement Supprimer Sensor
    this.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const index = parseInt(ev.target.dataset.index);
        const sensors = [...(this._config.sensors || [])];
        sensors.splice(index, 1);
        this._updateConfig({ sensors: sensors });
      });
    });
    
    this._rendered = false; // Permet de re-render après update
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
  static getConfigElement() {
    return document.createElement("appliance-card-editor");
  }

  static getStubConfig() {
    return { entity: "", sensors: [] };
  }

  setConfig(config) {
    this._config = config;
  }

  set hass(hass) {
    const entityId = this._config.entity;
    const stateObj = hass.states[entityId];
    const state = stateObj ? stateObj.state.toLowerCase() : 'enveille';

    // Nettoyage de l'état pour l'image
    const map = {
      'wash': 'lavage', 'ai_wash': 'lavage', 'pre_wash': 'lavage', 'weight_sensing': 'lavage',
      'rinse': 'rincage', 'spin': 'essorage', 'finish': 'findecycle', 'none': 'enveille'
    };
    const imgName = map[state] || state;
    const url = `https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/${imgName}.png`;

    if (!this._base) {
      this.innerHTML = `
        <ha-card style="padding: 16px; background: #111; color: white; border-radius: 12px; border: 1px solid #333;">
          <div style="display: flex; align-items: center; gap: 20px;">
            <div style="flex: 1.2; text-align: center;">
              <img id="main-img" style="width: 100%; height: 150px; object-fit: contain;">
              <div id="state-text" style="font-weight: bold; margin-top: 10px; color: #7CFFB2; text-transform: uppercase;"></div>
            </div>
            <div id="sensor-container" style="flex: 1; display: flex; flex-direction: column; gap: 8px;"></div>
          </div>
        </ha-card>
      `;
      this._base = this.querySelector('ha-card');
    }

    const img = this.querySelector('#main-img');
    img.src = url;
    img.onerror = () => img.src = "https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/enveille.png";
    
    this.querySelector('#state-text').textContent = stateObj ? stateObj.state : 'Inconnu';

    const container = this.querySelector('#sensor-container');
    container.innerHTML = '';
    
    if (this._config.sensors) {
      this._config.sensors.forEach(sid => {
        const s = hass.states[sid];
        if (s) {
          const div = document.createElement('div');
          div.style = "background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; border-left: 3px solid #7CFFB2;";
          div.innerHTML = `
            <div style="font-size: 9px; opacity: 0.6; text-transform: uppercase;">${sid.split('.').pop()}</div>
            <div style="font-size: 12px; font-weight: bold;">${s.state} ${s.attributes.unit_of_measurement || ''}</div>
          `;
          container.appendChild(div);
        }
      });
    }
  }
}

customElements.define("appliance-card", ApplianceCard);
