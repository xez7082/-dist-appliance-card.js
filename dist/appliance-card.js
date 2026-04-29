// ------------------ ÉDITEUR VISUEL ------------------
class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    // Sécurité : on initialise une config par défaut si vide
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
      <style>
        .container { font-family: sans-serif; color: white; padding: 15px; background: #1c1c1c; border-radius: 12px; }
        .label { font-weight: bold; color: #7CFFB2; margin: 15px 0 8px; text-transform: uppercase; font-size: 11px; display: block; }
        .type-selector { display: flex; gap: 8px; margin-bottom: 20px; }
        .btn-type { flex: 1; padding: 10px; cursor: pointer; border: 1px solid #444; background: #222; color: #888; border-radius: 8px; text-align: center; font-size: 10px; }
        .btn-type.active { border-color: #7CFFB2; color: #7CFFB2; background: rgba(124, 255, 178, 0.1); }
        .input-row { display: flex; gap: 8px; }
        input { flex: 1; padding: 10px; background: #000; color: white; border: 1px solid #444; border-radius: 8px; outline: none; }
        button { background: #7CFFB2; border: none; padding: 0 16px; border-radius: 8px; cursor: pointer; font-weight: bold; }
        .sensor-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }
        .tag { background: #333; padding: 6px 12px; border-radius: 15px; font-size: 11px; display: flex; align-items: center; border: 1px solid #444; }
        .del { color: #ff5252; margin-left: 8px; cursor: pointer; font-weight: bold; }
      </style>

      <div class="container">
        <div class="label">Appareil</div>
        <div class="type-selector">
          <div class="btn-type ${this._config.appliance_type === 'washing_machine' ? 'active' : ''}" id="wash">LAVE</div>
          <div class="btn-type ${this._config.appliance_type === 'dishwasher' ? 'active' : ''}" id="dish">VAISSELLE</div>
          <div class="btn-type ${this._config.appliance_type === 'fridge' ? 'active' : ''}" id="fridge">FRIGO</div>
        </div>

        <div class="label">Ajouter un sensor</div>
        <div class="input-row">
          <input id="input-sensor" placeholder="sensor.mon_entite">
          <button id="add-btn">OK</button>
        </div>

        <div class="sensor-list">
          ${this._config.sensors.map((s, i) => `
            <div class="tag">${s.split('.').pop()}<span class="del" data-i="${i}">×</span></div>
          `).join('')}
        </div>
      </div>
    `;

    // Empêcher l'effacement pendant la saisie
    const input = this.shadowRoot.getElementById("input-sensor");
    input.addEventListener("input", e => e.stopPropagation());
    input.addEventListener("keydown", e => e.stopPropagation());

    // Boutons
    this.shadowRoot.getElementById("wash").onclick = () => this._updateConfig("washing_machine");
    this.shadowRoot.getElementById("dish").onclick = () => this._updateConfig("dishwasher");
    this.shadowRoot.getElementById("fridge").onclick = () => this._updateConfig("fridge");

    this.shadowRoot.getElementById("add-btn").onclick = (e) => {
      e.stopPropagation();
      const val = input.value.trim();
      if (val && val.includes(".")) {
        this._config.sensors = [...this._config.sensors, val];
        input.value = "";
        this._save();
      }
    };

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
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
    this.render();
  }
}
customElements.define("appliance-card-editor", ApplianceCardEditor);


// ------------------ CARTE PRINCIPALE ------------------
class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  
  static getStubConfig() { return { appliance_type: "washing_machine", sensors: [] }; }

  setConfig(config) {
    this.config = config;
  }

  set hass(hass) {
    // PROTECTION CRUCIALE : Si config n'est pas encore chargée, on n'affiche rien
    if (!this.config || !hass) return;

    if (!this.content) {
      this.innerHTML = `
        <ha-card style="background: #111; border: 1px solid #7CFFB2; border-radius: 20px; padding: 20px; color: white;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
             <div id="icon-box" style="font-size: 35px; background: #222; padding: 10px; border-radius: 12px; border: 1px solid #444;"></div>
             <div style="text-align: right;">
                <div id="title" style="font-weight: bold; color: #7CFFB2; text-transform: uppercase; letter-spacing: 1px;"></div>
             </div>
          </div>
          <div id="grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;"></div>
        </ha-card>
      `;
      this.content = this.querySelector("#grid");
    }

    const type = this.config.appliance_type || 'washing_machine';
    const icons = { washing_machine: '🧺', dishwasher: '🍽️', fridge: '❄️' };
    const titles = { washing_machine: 'Lave-Linge', dishwasher: 'Lave-Vaisselle', fridge: 'Réfrigérateur' };

    this.querySelector("#icon-box").textContent = icons[type];
    this.querySelector("#title").textContent = titles[type];

    let html = '';
    this.config.sensors.forEach(eid => {
      const state = hass.states[eid];
      if (state) {
        html += `
          <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; border-left: 3px solid #7CFFB2;">
            <div style="font-size: 9px; opacity: 0.6; text-transform: uppercase;">${state.attributes.friendly_name || eid.split('.').pop()}</div>
            <div style="font-weight: bold;">${state.state} ${state.attributes.unit_of_measurement || ''}</div>
          </div>
        `;
      }
    });
    this.content.innerHTML = html || "<div style='grid-column: span 2; opacity: 0.3;'>Aucun capteur</div>";
  }
}
customElements.define("appliance-card", ApplianceCard);

// ------------------ ENREGISTREMENT ------------------
window.customCards = window.customCards || [];
window.customCards.push({
  type: "appliance-card",
  name: "Appliance Card Pro",
  description: "Boutons et Sensors personnalisables",
  preview: true
});
