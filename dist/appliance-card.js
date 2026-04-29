// --- 1. L'ÉDITEUR ---
class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { appliance_type: 'washing_machine', sensors: [], ...config };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this.render();
  }

  render() {
    if (!this._config) return;

    this.shadowRoot.innerHTML = `
      <div style="padding: 10px; font-family: sans-serif;">
        <div style="margin-bottom: 15px;">
          <label style="font-weight: bold; display: block; margin-bottom: 5px;">Type d'appareil :</label>
          <select id="type-select" style="width: 100%; padding: 8px;">
            <option value="washing_machine" ${this._config.appliance_type === 'washing_machine' ? 'selected' : ''}>Lave-Linge</option>
            <option value="dishwasher" ${this._config.appliance_type === 'dishwasher' ? 'selected' : ''}>Lave-Vaisselle</option>
            <option value="fridge" ${this._config.appliance_type === 'fridge' ? 'selected' : ''}>Frigo</option>
          </select>
        </div>

        <div style="margin-bottom: 15px;">
          <label style="font-weight: bold; display: block; margin-bottom: 5px;">Ajouter un Sensor :</label>
          <div style="display: flex; gap: 5px;">
            <input id="sensor-input" type="text" placeholder="sensor.mon_entite" style="flex: 1; padding: 8px;">
            <button id="add-btn" style="padding: 8px 15px; cursor: pointer;">OK</button>
          </div>
        </div>

        <div id="sensor-list">
          ${this._config.sensors.map((s, i) => `
            <div style="background: #eee; color: #333; padding: 5px 10px; border-radius: 15px; display: inline-block; margin: 2px; font-size: 12px;">
              ${s} <span style="color: red; cursor: pointer; font-weight: bold; margin-left: 5px;" data-index="${i}" class="del">×</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Bloquer les interférences pour permettre la saisie
    const input = this.shadowRoot.getElementById('sensor-input');
    input.onmousedown = (e) => e.stopPropagation();
    input.onkeydown = (e) => e.stopPropagation();

    // Actions
    this.shadowRoot.getElementById('type-select').onchange = (e) => {
      this._config.appliance_type = e.target.value;
      this._save();
    };

    this.shadowRoot.getElementById('add-btn').onclick = (e) => {
      e.stopPropagation();
      const val = input.value.trim();
      if (val.includes('.')) {
        this._config.sensors = [...this._config.sensors, val];
        input.value = "";
        this._save();
      }
    };

    this.shadowRoot.querySelectorAll('.del').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = btn.dataset.index;
        this._config.sensors.splice(idx, 1);
        this._save();
      };
    });
  }

  _save() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
  }
}
customElements.define("appliance-card-editor", ApplianceCardEditor);

// --- 2. LA CARTE ---
class ApplianceCard extends HTMLElement {
  static getConfigElement() { 
    return document.createElement("appliance-card-editor"); 
  }

  static getStubConfig() { 
    return { appliance_type: "washing_machine", sensors: [] }; 
  }

  setConfig(config) {
    this.config = config;
  }

  set hass(hass) {
    if (!this.config || !hass) return;

    if (!this.content) {
      this.innerHTML = `<ha-card style="padding: 16px;"></ha-card>`;
      this.content = this.querySelector("ha-card");
    }

    const type = this.config.appliance_type || 'washing_machine';
    const icons = { washing_machine: "🧺", dishwasher: "🍽️", fridge: "❄️" };

    let sensorsHtml = "";
    (this.config.sensors || []).forEach(id => {
      const s = hass.states[id];
      if (s) sensorsHtml += `<div>${id.split('.').pop()}: <b>${s.state}</b></div>`;
    });

    this.content.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <span style="font-size: 30px;">${icons[type]}</span>
        <span style="font-weight: bold; text-transform: uppercase;">${type.replace('_', ' ')}</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        ${sensorsHtml || "<i>Aucun capteur</i>"}
      </div>
    `;
  }
}
customElements.define("appliance-card", ApplianceCard);

// --- 3. ENREGISTREMENT ---
window.customCards = window.customCards || [];
window.customCards.push({
  type: "appliance-card",
  name: "Appliance Card Pro",
  preview: true
});
