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
          <input type="text" id="sensor-field" placeholder="sensor.mon_entite">
          <button class="add-btn" id="btn-append">OK</button>
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

    // 🔒 Empêche fermeture de l’editor
    const input = this.shadowRoot.getElementById('sensor-field');
    input.addEventListener('mousedown', e => e.stopPropagation());
    input.addEventListener('click', e => e.stopPropagation());

    // Type
    this.shadowRoot.getElementById('type-wash').onclick = () => this._updateType('washing_machine');
    this.shadowRoot.getElementById('type-dish').onclick = () => this._updateType('dishwasher');
    this.shadowRoot.getElementById('type-fridge').onclick = () => this._updateType('fridge');

    // Ajout
    this.shadowRoot.getElementById('btn-append').onclick = (e) => {
      e.stopPropagation();
      const val = input.value.trim();

      if (val && val.includes('.')) {
        this._config.sensors = [...this._config.sensors, val];
        input.value = '';
        this.fireConfigChanged();
      }
    };

    // Suppression
    this.shadowRoot.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
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
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));

    this.render();
  }
}

customElements.define("ultra-appliance-card-editor", UltraApplianceCardEditor);
