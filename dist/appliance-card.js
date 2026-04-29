class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { appliance_type: 'washing_machine', sensors: [], ...config };
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
        .container { font-family: sans-serif; padding: 15px; background: #1c1c1c; color: white; border-radius: 12px; }
        .label { font-weight: bold; color: #7CFFB2; margin: 15px 0 8px; text-transform: uppercase; font-size: 11px; display: block; }
        .input-row { display: flex; gap: 8px; margin-top: 10px; }
        
        /* Style critique pour l'input */
        input { 
          flex: 1; padding: 12px; background: #000; color: white; 
          border: 1px solid #444; border-radius: 8px; outline: none;
          font-size: 13px;
        }
        input:focus { border-color: #7CFFB2; }
        
        button { background: #7CFFB2; border: none; padding: 0 20px; border-radius: 8px; cursor: pointer; font-weight: bold; color: #111; }
        
        .type-selector { display: flex; gap: 8px; margin-bottom: 15px; }
        .btn-type { flex: 1; padding: 10px; cursor: pointer; border: 1px solid #444; background: #222; border-radius: 8px; text-align: center; font-size: 10px; color: #888; }
        .btn-type.active { border-color: #7CFFB2; color: #7CFFB2; background: rgba(124, 255, 178, 0.1); }
        
        .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }
        .tag { background: #333; padding: 6px 12px; border-radius: 20px; font-size: 11px; border: 1px solid #555; display: flex; align-items: center; }
        .del { color: #ff5252; margin-left: 10px; cursor: pointer; font-weight: bold; font-size: 16px; }
      </style>

      <div class="container">
        <span class="label">Appareil</span>
        <div class="type-selector">
          <div class="btn-type ${this._config.appliance_type === 'washing_machine' ? 'active' : ''}" id="t-wash">LAVE</div>
          <div class="btn-type ${this._config.appliance_type === 'dishwasher' ? 'active' : ''}" id="t-dish">VAISSELLE</div>
          <div class="btn-type ${this._config.appliance_type === 'fridge' ? 'active' : ''}" id="t-fridge">FRIGO</div>
        </div>

        <span class="label">Entité (Sensor)</span>
        <div class="input-row">
          <input id="new-sensor-input" placeholder="sensor.mon_entite" spellcheck="false" autocomplete="off">
          <button id="add-btn-action">OK</button>
        </div>

        <div class="tags">
          ${(this._config.sensors || []).map((s, i) => `
            <div class="tag"><span>${s}</span><span class="del" data-i="${i}">×</span></div>
          `).join('')}
        </div>
      </div>
    `;

    const input = this.shadowRoot.getElementById("new-sensor-input");

    // --- BLOCAGE DES INTERFÉRENCES ---
    // On empêche Home Assistant de voir qu'on interagit avec l'input
    const stop = (e) => e.stopPropagation();
    input.onpointerdown = stop;
    input.onmousedown = stop;
    input.onclick = stop;
    input.onkeydown = stop;

    // Gestion du clic sur OK
    this.shadowRoot.getElementById("add-btn-action").onclick = (e) => {
      e.stopPropagation();
      const val = input.value.trim();
      if (val && val.includes(".")) {
        this._config.sensors = [...this._config.sensors, val];
        input.value = ""; // On vide manuellement
        this._save();
      }
    };

    // Gestion des types
    const bindType = (id, val) => {
      this.shadowRoot.getElementById(id).onclick = (e) => {
        e.stopPropagation();
        this._config.appliance_type = val;
        this._save();
      };
    };
    bindType("t-wash", "washing_machine");
    bindType("t-dish", "dishwasher");
    bindType("t-fridge", "fridge");

    // Suppression
    this.shadowRoot.querySelectorAll(".del").forEach(b => {
      b.onclick = (e) => {
        e.stopPropagation();
        this._config.sensors.splice(parseInt(b.dataset.i), 1);
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
    this.render();
  }
}
customElements.define("appliance-card-editor", ApplianceCardEditor);

// --- CARTE ---
class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  setConfig(config) { this.config = config; }
  set hass(hass) {
    if (!this.config || !hass) return;
    if (!this.content) {
      this.innerHTML = `<ha-card style="padding:20px; background:#111; color:white; border-radius:15px; border:1px solid #7CFFB2;">
        <div id="icon" style="font-size:35px; margin-bottom:10px;"></div>
        <div id="grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;"></div>
      </ha-card>`;
      this.content = this.querySelector("#grid");
    }
    const icons = { washing_machine: "🧺", dishwasher: "🍽️", fridge: "❄️" };
    this.querySelector("#icon").textContent = icons[this.config.appliance_type] || "❓";
    let html = "";
    (this.config.sensors || []).forEach(id => {
      const s = hass.states[id];
      if (s) html += `<div style="background:#1c1c1c; padding:10px; border-radius:8px; border-left:3px solid #7CFFB2;">
        <div style="font-size:10px; opacity:0.6;">${id.split('.').pop()}</div>
        <div style="font-weight:bold;">${s.state}</div>
      </div>`;
    });
    this.content.innerHTML = html || "Éditez pour ajouter des capteurs";
  }
}
customElements.define("appliance-card", ApplianceCard);

window.customCards = window.customCards || [];
window.customCards.push({ type: "appliance-card", name: "Appliance Card", preview: true });
