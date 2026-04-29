// 1. L'ÉDITEUR VISUEL
class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    if (!this._config.sensors) this._config.sensors = [];
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <div style="padding: 20px; background: #2c2c2c; color: white; border-radius: 10px;">
        <h2 style="color: #7CFFB2; margin-top: 0;">Configuration</h2>
        
        <label>Type d'appareil :</label>
        <select id="type-select" style="width: 100%; padding: 10px; margin: 10px 0;">
          <option value="washing_machine" ${this._config.appliance_type === 'washing_machine' ? 'selected' : ''}>Lave-Linge</option>
          <option value="dishwasher" ${this._config.appliance_type === 'dishwasher' ? 'selected' : ''}>Lave-Vaisselle</option>
          <option value="fridge" ${this._config.appliance_type === 'fridge' ? 'selected' : ''}>Frigo</option>
        </select>

        <label>Ajouter un sensor (ex: sensor.power) :</label>
        <div style="display: flex; gap: 5px; margin-top: 10px;">
          <input id="input-sensor" type="text" style="flex: 1; padding: 10px;">
          <button id="add-btn" style="background: #7CFFB2; border: none; padding: 10px; cursor: pointer;">+</button>
        </div>

        <div style="margin-top: 15px;">
          ${this._config.sensors.map((s, i) => `
            <div style="display: inline-block; background: #444; padding: 5px 10px; margin: 2px; border-radius: 5px;">
              ${s} <span style="color: red; cursor: pointer;" data-index="${i}" class="del">×</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Events
    this.shadowRoot.getElementById('type-select').onchange = (e) => {
      this._config.appliance_type = e.target.value;
      this._save();
    };

    this.shadowRoot.getElementById('add-btn').onclick = () => {
      const input = this.shadowRoot.getElementById('input-sensor');
      if (input.value.includes('.')) {
        this._config.sensors.push(input.value);
        this._save();
      }
    };

    this.shadowRoot.querySelectorAll('.del').forEach(btn => {
      btn.onclick = () => {
        this._config.sensors.splice(btn.dataset.index, 1);
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

// 2. LA CARTE
class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  static getStubConfig() { return { appliance_type: "washing_machine", sensors: [] }; }

  setConfig(config) { this.config = config; }

  set hass(hass) {
    if (!this.content) {
      this.innerHTML = `<ha-card style="padding: 20px; text-align: center; background: #111; color: white; border: 1px solid #7CFFB2;">
        <div id="icon" style="font-size: 40px; margin-bottom: 10px;"></div>
        <div id="sensors" style="text-align: left;"></div>
      </ha-card>`;
      this.content = this.querySelector("#sensors");
    }

    const icons = { washing_machine: "🧺", dishwasher: "🍽️", fridge: "❄️" };
    this.querySelector("#icon").textContent = icons[this.config.appliance_type] || "❓";

    let html = "";
    (this.config.sensors || []).forEach(id => {
      const state = hass.states[id];
      if (state) html += `<div><b>${id.split('.')[1]}:</b> ${state.state}</div>`;
    });
    this.content.innerHTML = html;
  }
}
customElements.define("appliance-card", ApplianceCard);

// 3. ENREGISTREMENT
window.customCards = window.customCards || [];
window.customCards.push({
  type: "appliance-card",
  name: "Appliance Card Pro",
  preview: true
});
