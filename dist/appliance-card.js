// --- ÉDITEUR VISUEL AVEC BOUTONS ET SENSORS DYNAMIQUES ---
class UltraApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    if (!this._config.sensors) this._config.sensors = [];
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this.render();
  }

  render() {
    if (!this._config) return;

    this.shadowRoot.innerHTML = `
      <style>
        .container { font-family: var(--paper-font-body1_-_font-family); color: white; padding: 10px; }
        .label { font-weight: bold; color: #7CFFB2; margin-bottom: 10px; display: block; text-transform: uppercase; font-size: 12px; }
        
        /* Sélecteur de type avec boutons */
        .type-selector { display: flex; gap: 10px; margin-bottom: 20px; }
        .btn-type { 
          flex: 1; padding: 12px 8px; cursor: pointer; border: 1px solid #7CFFB2; 
          background: #1a1a1a; color: white; border-radius: 12px; text-align: center;
          transition: all 0.3s ease; display: flex; flex-direction: column; align-items: center; gap: 5px;
        }
        .btn-type.active { background: #7CFFB2; color: #111; box-shadow: 0 0 10px #7CFFB2; }
        .btn-type ha-icon { --mdc-icon-size: 24px; }

        /* Input et Tags */
        .sensor-input-group { display: flex; gap: 8px; margin-top: 10px; }
        input { 
          flex: 1; padding: 10px; background: #222; color: white; 
          border: 1px solid #444; border-radius: 8px;
        }
        .add-btn { 
          background: #7CFFB2; color: #111; border: none; padding: 0 15px; 
          border-radius: 8px; cursor: pointer; font-weight: bold; 
        }
        .sensor-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }
        .sensor-tag { 
          background: #333; padding: 6px 12px; border-radius: 20px; 
          font-size: 11px; display: flex; align-items: center; gap: 8px; border: 1px solid #444;
        }
        .delete-btn { color: #ff5252; cursor: pointer; font-weight: bold; font-size: 14px; }
      </style>

      <div class="container">
        <span class="label">Choisir l'appareil</span>
        <div class="type-selector">
          <div class="btn-type ${this._config.appliance_type === 'washing_machine' ? 'active' : ''}" data-type="washing_machine">
            <ha-icon icon="mdi:washing-machine"></ha-icon>
            <span>Lave-linge</span>
          </div>
          <div class="btn-type ${this._config.appliance_type === 'dishwasher' ? 'active' : ''}" data-type="dishwasher">
            <ha-icon icon="mdi:dishwasher"></ha-icon>
            <span>Vaisselle</span>
          </div>
          <div class="btn-type ${this._config.appliance_type === 'fridge' ? 'active' : ''}" data-type="fridge">
            <ha-icon icon="mdi:fridge"></ha-icon>
            <span>Frigo</span>
          </div>
        </div>

        <span class="label">Ajouter des Sensors (Entités)</span>
        <div class="sensor-input-group">
          <input type="text" id="new-sensor" placeholder="ex: sensor.lave_linge_power">
          <button class="add-btn" id="add-btn">AJOUTER</button>
        </div>

        <div class="sensor-list">
          ${this._config.sensors.map((s, index) => `
            <div class="sensor-tag">
              <span>${s}</span>
              <span class="delete-btn" data-index="${index}">×</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Events pour les boutons de type
    this.shadowRoot.querySelectorAll('.btn-type').forEach(btn => {
      btn.addEventListener('click', () => {
        this._config.appliance_type = btn.dataset.type;
        this.fireConfigChanged();
      });
    });

    // Event pour ajouter un sensor
    this.shadowRoot.querySelector('#add-btn').addEventListener('click', () => {
      const input = this.shadowRoot.querySelector('#new-sensor');
      if (input.value && input.value.includes('.')) {
        this._config.sensors.push(input.value);
        input.value = '';
        this.fireConfigChanged();
      }
    });

    // Event pour supprimer un sensor
    this.shadowRoot.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.index;
        this._config.sensors.splice(idx, 1);
        this.fireConfigChanged();
      });
    });
  }

  fireConfigChanged() {
    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}
customElements.define("ultra-appliance-card-editor", UltraApplianceCardEditor);


// --- LA CARTE PRINCIPALE ---
class UltraApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("ultra-appliance-card-editor"); }

  static getStubConfig() {
    return { appliance_type: "washing_machine", sensors: [] };
  }

  setConfig(config) {
    this.config = config;
  }

  set hass(hass) {
    if (!this.config || !hass) return;

    if (!this.content) {
      this.innerHTML = `
        <ha-card style="background: #111; border: 1px solid #7CFFB2; border-radius: 24px; padding: 20px; color: white; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
            <div id="icon-container" style="background: #1a1a1a; padding: 12px; border-radius: 15px; border: 1px solid #333;">
              <ha-icon id="main-icon" icon="mdi:washing-machine" style="color: #7CFFB2; --mdc-icon-size: 32px;"></ha-icon>
            </div>
            <div id="wave-container"></div>
          </div>
          <div id="sensor-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;"></div>
        </ha-card>
      `;
      this.content = this.querySelector("#sensor-grid");
    }

    // Mise à jour de l'icône selon le type
    const icons = { washing_machine: 'mdi:washing-machine', dishwasher: 'mdi:dishwasher', fridge: 'mdi:fridge' };
    this.querySelector("#main-icon").icon = icons[this.config.appliance_type] || 'mdi:help-circle';

    // Animation de vague (basée sur le premier sensor si c'est un % ou fixe à 50%)
    let level = 50;
    const firstSensor = hass.states[this.config.sensors[0]];
    if (firstSensor && !isNaN(parseFloat(firstSensor.state))) {
        level = 100 - (parseFloat(firstSensor.state) % 101);
    }

    this.querySelector("#wave-container").innerHTML = `
      <svg viewBox="0 0 100 100" style="width:70px; height:70px; border-radius:50%; border: 2px solid #7CFFB2; background:#051515; box-shadow: 0 0 15px rgba(124, 255, 178, 0.2);">
        <path d="M 0,${level} C 25,${level-5} 75,${level+5} 100,${level} L 100,100 L 0,100 Z" fill="#7CFFB2" opacity="0.5">
          <animate attributeName="d" dur="3s" repeatCount="indefinite" values="M 0,${level} C 25,${level-5} 75,${level+5} 100,${level} L 100,100 L 0,100 Z; M 0,${level} C 25,${level+5} 75,${level-5} 100,${level} L 100,100 L 0,100 Z; M 0,${level} C 25,${level-5} 75,${level+5} 100,${level} L 100,100 L 0,100 Z" />
        </path>
      </svg>
    `;

    // Génération de la grille des sensors
    let html = '';
    this.config.sensors.forEach(entityId => {
      const stateObj = hass.states[entityId];
      if (stateObj) {
        const name = stateObj.attributes.friendly_name || entityId.split('.')[1];
        const unit = stateObj.attributes.unit_of_measurement || '';
        html += `
          <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 10px; color: #7CFFB2; text-transform: uppercase; opacity: 0.8; letter-spacing: 1px; margin-bottom: 4px;">${name}</div>
            <div style="font-size: 15px; font-weight: bold;">${stateObj.state} <span style="font-size: 10px; opacity: 0.6;">${unit}</span></div>
          </div>
        `;
      }
    });
    this.content.innerHTML = html;
  }

  getCardSize() { return 4; }
}

customElements.define("ultra-appliance-card", UltraApplianceCard);

// Enregistrement HACS
window.customCards = window.customCards || [];
window.customCards.push({
  type: "ultra-appliance-card",
  name: "Ultra Appliance Card (Custom)",
  description: "Dashboard avec sélecteur d'appareil et ajout dynamique de sensors.",
  preview: true,
});
