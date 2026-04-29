class UltraApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    if (!this._config.sensors) this._config.sensors = [];
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.render();
    }
  }

  render() {
    if (!this._config) return;

    this.shadowRoot.innerHTML = `
      <style>
        .container { font-family: sans-serif; color: white; padding: 15px; background: #1c1c1c; border-radius: 12px; }
        .label { font-weight: bold; color: #7CFFB2; margin: 15px 0 8px 0; display: block; text-transform: uppercase; font-size: 11px; }
        
        .type-selector { display: flex; gap: 8px; margin-bottom: 20px; }
        .btn-type { 
          flex: 1; padding: 12px 5px; cursor: pointer; border: 1px solid #444; 
          background: #222; color: #888; border-radius: 8px; text-align: center;
          transition: all 0.2s ease; font-size: 10px; font-weight: bold;
        }
        .btn-type.active { border-color: #7CFFB2; color: #7CFFB2; background: rgba(124, 255, 178, 0.1); }

        .input-row { display: flex; gap: 8px; }
        input { 
          flex: 1; padding: 12px; background: #000; color: white; 
          border: 1px solid #444; border-radius: 8px; outline: none;
        }
        .add-btn { 
          background: #7CFFB2; color: #111; border: none; padding: 0 15px; 
          border-radius: 8px; cursor: pointer; font-weight: bold;
        }

        .sensor-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }
        .sensor-tag { 
          background: #333; padding: 6px 12px; border-radius: 20px; 
          font-size: 11px; display: flex; align-items: center; gap: 8px; border: 1px solid #555;
        }
        .delete-btn { color: #ff5252; cursor: pointer; font-size: 18px; line-height: 1; }
      </style>

      <div class="container">
        <span class="label">Type d'appareil</span>
        <div class="type-selector">
          <div class="btn-type ${this._config.appliance_type === 'washing_machine' ? 'active' : ''}" id="type-wash">LAVE-LINGE</div>
          <div class="btn-type ${this._config.appliance_type === 'dishwasher' ? 'active' : ''}" id="type-dish">VAISSELLE</div>
          <div class="btn-type ${this._config.appliance_type === 'fridge' ? 'active' : ''}" id="type-fridge">FRIGO</div>
        </div>

        <span class="label">Ajouter une entité</span>
        <div class="input-row">
          <input type="text" id="sensor-field" placeholder="sensor.mon_entite" @click="${e => e.stopPropagation()}">
          <button class="add-btn" id="btn-append">OK</button>
        </div>

        <div class="sensor-list" id="tag-container">
          ${this._config.sensors.map((s, index) => `
            <div class="sensor-tag">
              <span>${s}</span>
              <span class="delete-btn" data-index="${index}">×</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // --- LOGIQUE DE CLIC ---
    
    // Boutons de type
    this.shadowRoot.getElementById('type-wash').onclick = () => this._updateType('washing_machine');
    this.shadowRoot.getElementById('type-dish').onclick = () => this._updateType('dishwasher');
    this.shadowRoot.getElementById('type-fridge').onclick = () => this._updateType('fridge');

    // Bouton ajouter
    this.shadowRoot.getElementById('btn-append').onclick = (e) => {
      e.stopPropagation();
      const input = this.shadowRoot.getElementById('sensor-field');
      const val = input.value.trim();
      if (val && val.includes('.')) {
        this._config.sensors = [...this._config.sensors, val];
        this.fireConfigChanged();
      }
    };

    // Suppression
    this.shadowRoot.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = btn.dataset.index;
        this._config.sensors.splice(idx, 1);
        this.fireConfigChanged();
      };
    });
  }

  _updateType(type) {
    this._config.appliance_type = type;
    this.fireConfigChanged();
  }

  fireConfigChanged() {
    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
    this.render(); // On force le re-rendu local
  }
}
customElements.define("ultra-appliance-card-editor", UltraApplianceCardEditor);


// --- CARTE PRINCIPALE ---
class UltraApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("ultra-appliance-card-editor"); }
  static getStubConfig() { return { appliance_type: "washing_machine", sensors: [] }; }

  setConfig(config) { this.config = config; }

  set hass(hass) {
    if (!this.config || !hass) return;

    if (!this.content) {
      this.innerHTML = `
        <ha-card style="background: #111; border: 1px solid #7CFFB2; border-radius: 20px; padding: 20px; color: white;">
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
          <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; border-left: 3px solid #7CFFB2;">
            <div style="font-size: 9px; opacity: 0.6; text-transform: uppercase;">${state.attributes.friendly_name || eid.split('.')[1]}</div>
            <div style="font-weight: bold;">${state.state}${state.attributes.unit_of_measurement || ''}</div>
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
  name: "Ultra Appliance Card",
  description: "Boutons interactifs avec système d'ajout d'entités corrigé.",
  preview: true,
});
