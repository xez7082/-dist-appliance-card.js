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
        .btn-type { flex: 1; padding: 10px; cursor: pointer; border: 1px solid #444; background: #222; color: #888; border-radius: 8px; text-align: center; font-size: 10px; }
        .btn-type.active { border-color: #7CFFB2; color: #7CFFB2; background: rgba(124, 255, 178, 0.1); }
        
        .input-row { display: flex; gap: 8px; }
        input { 
          flex: 1; padding: 10px; background: #000; color: white; 
          border: 1px solid #444; border-radius: 8px; outline: none; 
          pointer-events: auto !important;
        }
        input:focus { border-color: #7CFFB2; }
        button { background: #7CFFB2; border: none; padding: 0 16px; border-radius: 8px; cursor: pointer; font-weight: bold; }
        
        .sensor-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }
        .tag { background: #333; padding: 6px 12px; border-radius: 15px; font-size: 11px; display: flex; align-items: center; border: 1px solid #444; }
        .del { color: #ff5252; margin-left: 8px; cursor: pointer; font-weight: bold; }
      </style>

      <div class="container">
        <div class="label">Type d'appareil</div>
        <div class="type-selector">
          <div class="btn-type ${this._config.appliance_type === 'washing_machine' ? 'active' : ''}" id="wash">LAVE</div>
          <div class="btn-type ${this._config.appliance_type === 'dishwasher' ? 'active' : ''}" id="dish">VAISSELLE</div>
          <div class="btn-type ${this._config.appliance_type === 'fridge' ? 'active' : ''}" id="fridge">FRIGO</div>
        </div>

        <div class="label">Ajouter un sensor</div>
        <div class="input-row">
          <input id="input-sensor" placeholder="sensor.mon_entite" spellcheck="false">
          <button id="add-btn">OK</button>
        </div>

        <div class="sensor-list">
          ${this._config.sensors.map((s, i) => `
            <div class="tag"><span>${s}</span><span class="del" data-i="${i}">×</span></div>
          `).join('')}
        </div>
      </div>
    `;

    const input = this.shadowRoot.getElementById("input-sensor");

    // --- LE SECRET : Bloquer les événements qui volent le focus ---
    input.addEventListener("focus", (e) => e.stopPropagation());
    input.addEventListener("mousedown", (e) => e.stopPropagation());
    input.addEventListener("click", (e) => {
        e.stopPropagation();
        input.focus(); // On force le focus au clic
    });

    // Boutons de type
    this.shadowRoot.getElementById("wash").onclick = () => this._updateConfig("washing_machine");
    this.shadowRoot.getElementById("dish").onclick = () => this._updateConfig("dishwasher");
    this.shadowRoot.getElementById("fridge").onclick = () => this._updateConfig("fridge");

    // Bouton ajouter
    this.shadowRoot.getElementById("add-btn").onclick = (e) => {
      e.stopPropagation();
      const val = input.value.trim();
      if (val && val.includes(".")) {
        this._config.sensors = [...this._config.sensors, val];
        this._save();
      }
    };

    // Supprimer
    this.shadowRoot.querySelectorAll(".del").forEach(b => {
      b.onclick = (e) => {
        e.stopPropagation();
        this._config.sensors.splice(parseInt(b.dataset.i), 1);
        this._save();
      };
    });
  }

  _updateConfig(type) {
    this._config.appliance_type = type;
    this._save();
  }

  _save() {
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
    this.render();
  }
}

customElements.define("appliance-card-editor", ApplianceCardEditor);

// ------------------ CARD ------------------

class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  static getStubConfig() { return { appliance_type: "washing_machine", sensors: [] }; }

  setConfig(config) { this.config = config; }

  set hass(hass) {
    if (!this.config || !hass) return;
    if (!this.content) {
      this.innerHTML = `<ha-card style="padding:16px; background:#111; color:white; border-radius:15px; border:1px solid #7CFFB2;">
        <div id="icon" style="font-size:32px; margin-bottom:10px;"></div>
        <div id="grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;"></div>
      </ha-card>`;
      this.content = this.querySelector("#grid");
    }

    const icons = { washing_machine: "🧺", dishwasher: "🍽️", fridge: "❄️" };
    this.querySelector("#icon").textContent = icons[this.config.appliance_type] || "❓";

    let html = "";
    this.config.sensors.forEach(id => {
      const s = hass.states[id];
      if (s) html += `<div style="background:#1c1c1c; padding:8px; border-radius:8px; border-left:3px solid #7CFFB2;">
        <div style="font-size:10px; opacity:0.6;">${id.split('.').pop()}</div>
        <div style="font-weight:bold;">${s.state}</div>
      </div>`;
    });
    this.content.innerHTML = html || "Ajoutez des sensors dans l'éditeur";
  }
}

customElements.define("appliance-card", ApplianceCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "appliance-card",
  name: "Appliance Card",
  preview: true
});
