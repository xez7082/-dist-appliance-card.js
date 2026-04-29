// --- ÉDITEUR VISUEL SÉCURISÉ ---
class UltraApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    if (!this._config.sensors) this._config.sensors = [];
    this._tempSensor = ""; // Variable pour stocker la saisie sans rafraîchir la carte
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
        .container { font-family: sans-serif; color: white; padding: 10px; background: #1c1c1c; border-radius: 12px; }
        .label { font-weight: bold; color: #7CFFB2; margin: 15px 0 8px 0; display: block; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; }
        
        .type-selector { display: flex; gap: 8px; margin-bottom: 20px; }
        .btn-type { 
          flex: 1; padding: 12px 5px; cursor: pointer; border: 1px solid #444; 
          background: #222; color: #888; border-radius: 8px; text-align: center;
          transition: all 0.2s ease; font-size: 10px; font-weight: bold;
        }
        .btn-type.active { border-color: #7CFFB2; color: #7CFFB2; background: rgba(124, 255, 178, 0.1); box-shadow: 0 0 8px rgba(124, 255, 178, 0.2); }

        .input-row { display: flex; gap: 8px; margin-bottom: 10px; }
        input { 
          flex: 1; padding: 12px; background: #000; color: white; 
          border: 1px solid #444; border-radius: 8px; outline: none; font-size: 13px;
        }
        input:focus { border-color: #7CFFB2; }
        
        .add-btn { 
          background: #7CFFB2; color: #111; border: none; padding: 0 20px; 
          border-radius: 8px; cursor: pointer; font-weight: bold; transition: opacity 0.2s;
        }
        .add-btn:active { opacity: 0.7; }

        .sensor-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }
        .sensor-tag { 
          background: #333; padding: 6px 12px; border-radius: 20px; 
          font-size: 11px; display: flex; align-items: center; gap: 8px; border: 1px solid #555;
        }
        .delete-btn { color: #ff5252; cursor: pointer; font-size: 16px; line-height: 1; }
      </style>

      <div class="container">
        <span class="label">Sélectionner l'appareil</span>
        <div class="type-selector">
          <div class="btn-type ${this._config.appliance_type === 'washing_machine' ? 'active' : ''}" data-type="washing_machine">LAVE-LINGE</div>
          <div class="btn-type ${this._config.appliance_type === 'dishwasher' ? 'active' : ''}" data-type="dishwasher">VAISSELLE</div>
          <div class="btn-type ${this._config.appliance_type === 'fridge' ? 'active' : ''}" data-type="fridge">FRIGO</div>
        </div>

        <span class="label">Ajouter une entité sensor</span>
        <div class="input-row">
          <input type="text" id="new-sensor" placeholder="ex: sensor.lave_linge_power" value="${this._tempSensor}">
          <button class="add-btn" id="add-btn" type="button">AJOUTER</button>
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

    // --- GESTION DES ÉVÉNEMENTS ---

    const input = this.shadowRoot.querySelector('#new-sensor');

    // On stocke la saisie localement sans déclencher "config-changed"
    input.addEventListener('input', (ev) => {
      this._tempSensor = ev.target.value;
    });

    // Clic sur AJOUTER
    this.shadowRoot.querySelector('#add-btn').addEventListener('click', (ev) => {
      ev.stopPropagation();
      const val = this._tempSensor.trim();
      if (val && val.includes('.')) {
        this._config.sensors = [...this._config.sensors, val];
        this._tempSensor = ""; // On vide après ajout
        this.fireConfigChanged();
      }
    });

    // Clic sur les types d'appareil
    this.shadowRoot.querySelectorAll('.btn-type').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this._config.appliance_type = btn.dataset.type;
        this.fireConfigChanged();
      });
    });

    // Clic sur supprimer
    this.shadowRoot.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
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
  static getStubConfig() { return { appliance_type: "washing_machine", sensors: [] }; }

  setConfig(config) { this.config = config; }

  set hass(hass) {
    if (!this.config || !hass) return;

    if (!this.content) {
      this.innerHTML = `
        <ha-card style="background: #111; border: 1px solid #7CFFB2; border-radius: 24px; padding: 20px; color: white;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
             <div id="icon-display" style="font-size: 32px; color: #7CFFB2;"></div>
             <div id="viz"></div>
          </div>
          <div id="sensor-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;"></div>
        </ha-card>
      `;
      this.content = this.querySelector("#sensor-grid");
    }

    const type = this.config.appliance_type || 'washing_machine';
    const icons = { washing_machine: '🧺', dishwasher: '🍽️', fridge: '❄️' };
    this.querySelector("#icon-display").textContent = icons[type];

    // Animation Hublot
    const firstVal = parseFloat(hass.states[this.config.sensors[0]]?.state) || 0;
    const level = 100 - (firstVal % 101);
    this.querySelector("#viz").innerHTML = `
      <svg viewBox="0 0 100 100" style="width:60px; height:60px; border-radius:50%; border: 2px solid #7CFFB2; background:#051515;">
        <path d="M 0,${level} C 25,${level-5} 75,${level+5} 100,${level} L 100,100 L 0,100 Z" fill="#7CFFB2" opacity="0.4">
          <animate attributeName="d" dur="3s" repeatCount="indefinite" values="M 0,${level} C 25,${level-5} 75,${level+5} 100,${level} L 100,100 L 0,100 Z; M 0,${level} C 25,${level+5} 75,${level-5} 100,${level} L 100,100 L 0,100 Z; M 0,${level} C 25,${level-5} 75,${level+5} 100,${level} L 100,100 L 0,100 Z" />
        </path>
      </svg>
    `;

    let html = '';
    this.config.sensors.forEach(eid => {
      const state = hass.states[eid];
      if (state) {
        html += `
          <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 12px; border-left: 3px solid #7CFFB2;">
            <div style="font-size: 9px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px;">${state.attributes.friendly_name || eid.split('.')[1]}</div>
            <div style="font-weight: bold; font-size: 14px;">${state.state}${state.attributes.unit_of_measurement || ''}</div>
          </div>
        `;
      }
    });
    this.content.innerHTML = html;
  }
}
customElements.define("ultra-appliance-card", UltraApplianceCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ultra-appliance-card",
  name: "Ultra Appliance Card (Fix)",
  description: "Boutons interactifs avec système d'ajout d'entités corrigé.",
  preview: true,
});
