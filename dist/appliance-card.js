// ------------------ EDITOR ------------------

class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    if (!this._config.sensors) this._config.sensors = [];
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.render();
    }
  }

  render() {
    if (!this._config) return;

    this.shadowRoot.innerHTML = `
      <style>
        .container { font-family: sans-serif; color: white; padding: 15px; background: #1c1c1c; border-radius: 12px; }
        .label { font-weight: bold; color: #7CFFB2; margin: 15px 0 8px; text-transform: uppercase; font-size: 11px; display: block; }
        
        .type-selector { display: flex; gap: 8px; margin-bottom: 20px; }
        .btn-type { flex: 1; padding: 10px; cursor: pointer; border: 1px solid #444; background: #222; color: #888; border-radius: 8px; text-align: center; font-size: 10px; transition: 0.3s; }
        .btn-type.active { border-color: #7CFFB2; color: #7CFFB2; background: rgba(124, 255, 178, 0.1); }

        .input-row { display: flex; gap: 8px; }
        input { flex: 1; padding: 10px; background: #000; color: white; border: 1px solid #444; border-radius: 8px; outline: none; }
        input:focus { border-color: #7CFFB2; }
        button { background: #7CFFB2; border: none; padding: 0 16px; border-radius: 8px; cursor: pointer; font-weight: bold; }

        .sensor-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }
        .tag { background: #333; padding: 6px 12px; border-radius: 15px; font-size: 11px; display: flex; align-items: center; border: 1px solid #444; }
        .del { color: #ff5252; margin-left: 8px; cursor: pointer; font-weight: bold; font-size: 14px; }
      </style>

      <div class="container">
        <div class="label">Type d'appareil</div>
        <div class="type-selector">
          <div class="btn-type ${this._config.appliance_type === 'washing_machine' ? 'active' : ''}" id="wash">LAVE</div>
          <div class="btn-type ${this._config.appliance_type === 'dishwasher' ? 'active' : ''}" id="dish">VAISSELLE</div>
          <div class="btn-type ${this._config.appliance_type === 'fridge' ? 'active' : ''}" id="fridge">FRIGO</div>
        </div>

        <div class="label">Ajouter un capteur</div>
        <div class="input-row">
          <input id="input" placeholder="ex: sensor.lave_linge_power" autocomplete="off">
          <button id="add">OK</button>
        </div>

        <div class="sensor-list">
          ${this._config.sensors.map((s, i) => `
            <div class="tag">
              <span>${s.split('.').pop()}</span>
              <span class="del" data-i="${i}">×</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const input = this.shadowRoot.getElementById("input");

    // Empêcher l'éditeur de perdre le focus ou de s'effacer
    input.addEventListener("keydown", e => e.stopPropagation());
    input.addEventListener("input", e => e.stopPropagation());

    // Switch de type
    this.shadowRoot.getElementById("wash").onclick = () => this._setType("washing_machine");
    this.shadowRoot.getElementById("dish").onclick = () => this._setType("dishwasher");
    this.shadowRoot.getElementById("fridge").onclick = () => this._setType("fridge");

    // Ajouter un sensor
    this.shadowRoot.getElementById("add").onclick = (e) => {
      e.stopPropagation();
      const v = input.value.trim();
      if (v && v.includes(".")) {
        this._config.sensors = [...this._config.sensors, v];
        input.value = "";
        this._save();
      }
    };

    // Supprimer un sensor
    this.shadowRoot.querySelectorAll(".del").forEach(b => {
      b.onclick = (e) => {
        e.stopPropagation();
        const index = parseInt(b.dataset.i);
        this._config.sensors.splice(index, 1);
        this._save();
      };
    });
  }

  _setType(t) {
    this._config.appliance_type = t;
    this._save();
  }

  _save() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
    this.render();
  }
}

customElements.define("appliance-card-editor", ApplianceCardEditor);


// ------------------ CARD ------------------

class ApplianceCard extends HTMLElement {
  static async getConfigElement() {
    return document.createElement("appliance-card-editor");
  }

  static getStubConfig() {
    return {
      appliance_type: "washing_machine",
      sensors: []
    };
  }

  setConfig(config) {
    this.config = config;
  }

  set hass(hass) {
    if (!this.config || !hass) return;

    if (!this.content) {
      this.innerHTML = `
        <ha-card style="padding:16px; background: #111; color: white; border-radius: 15px; border: 1px solid #333;">
          <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
            <div id="icon" style="font-size:32px; background: #222; padding: 10px; border-radius: 12px; border: 1px solid #7CFFB2;"></div>
            <div style="font-weight: bold; text-transform: uppercase; color: #7CFFB2; letter-spacing: 1px;">Équipement</div>
          </div>
          <div id="grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;"></div>
        </ha-card>
      `;
      this.content = this.querySelector("#grid");
    }

    const icons = {
      washing_machine: "🧺",
      dishwasher: "🍽️",
      fridge: "❄️"
    };

    this.querySelector("#icon").textContent = icons[this.config.appliance_type] || "❓";

    let html = "";
    this.config.sensors.forEach(id => {
      const s = hass.states[id];
      if (s) {
        const name = s.attributes.friendly_name || id.split('.').pop();
        html += `
          <div style="background: #1c1c1c; padding: 8px; border-radius: 8px; border-left: 3px solid #7CFFB2;">
            <div style="font-size: 10px; opacity: 0.6; margin-bottom: 2px;">${name}</div>
            <div style="font-weight: bold; font-size: 13px;">${s.state} ${s.attributes.unit_of_measurement || ''}</div>
          </div>
        `;
      }
    });

    this.content.innerHTML = html || "<div style='grid-column: span 2; opacity: 0.5;'>Aucun capteur configuré</div>";
  }

  getCardSize() {
    return 3;
  }
}

customElements.define("appliance-card", ApplianceCard);


// ------------------ REGISTER ------------------

window.customCards = window.customCards || [];
window.customCards.push({
  type: "appliance-card",
  name: "Appliance Card",
  description: "Carte appareil interactive avec éditeur visuel",
  preview: true
});
