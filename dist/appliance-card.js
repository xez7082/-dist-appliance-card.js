// --- 1. L'ÉDITEUR ---
class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { appliance_type: 'washing_machine', sensors: [], ...config };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.render(); // On ne render qu'une seule fois à l'initialisation
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .config-box { padding: 10px; font-family: sans-serif; color: var(--primary-text-color); }
        .row { margin-bottom: 15px; }
        label { font-weight: bold; display: block; margin-bottom: 5px; color: #7CFFB2; }
        select, input { 
          width: 100%; padding: 10px; box-sizing: border-box; 
          background: #000; color: white; border: 1px solid #444; border-radius: 8px;
        }
        .input-group { display: flex; gap: 5px; margin-top: 10px; }
        .btn-add { background: #7CFFB2; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; }
        .tag-list { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
        .tag { background: #333; padding: 5px 10px; border-radius: 15px; font-size: 12px; display: flex; align-items: center; }
        .del { color: #ff5252; margin-left: 8px; cursor: pointer; font-weight: bold; font-size: 16px; }
      </style>

      <div class="config-box">
        <div class="row">
          <label>Type d'appareil</label>
          <select id="type-select">
            <option value="washing_machine" ${this._config.appliance_type === 'washing_machine' ? 'selected' : ''}>Lave-Linge</option>
            <option value="dishwasher" ${this._config.appliance_type === 'dishwasher' ? 'selected' : ''}>Lave-Vaisselle</option>
            <option value="fridge" ${this._config.appliance_type === 'fridge' ? 'selected' : ''}>Frigo</option>
          </select>
        </div>

        <div class="row">
          <label>Ajouter un Sensor (ex: sensor.puissance)</label>
          <div class="input-group">
            <input id="sensor-input" type="text" placeholder="sensor.xxxx" spellcheck="false">
            <button class="btn-add" id="add-btn">AJOUTER</button>
          </div>
        </div>

        <div class="tag-list" id="tag-container">
          ${this._config.sensors.map((s, i) => `
            <div class="tag">
              <span>${s}</span>
              <span class="del" data-index="${i}">×</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const input = this.shadowRoot.getElementById('sensor-input');
    const select = this.shadowRoot.getElementById('type-select');
    const addBtn = this.shadowRoot.getElementById('add-btn');

    // --- VERROUILLAGE DU CURSEUR ---
    // On bloque TOUS les événements qui font remonter l'info à Home Assistant
    const blocker = (e) => e.stopPropagation();
    input.addEventListener('input', blocker);
    input.addEventListener('keydown', blocker);
    input.addEventListener('mousedown', blocker);
    input.addEventListener('click', blocker);

    // Changement de type
    select.onchange = (e) => {
      this._config.appliance_type = e.target.value;
      this._save();
    };

    // Clic sur Ajouter
    addBtn.onclick = (e) => {
      e.stopPropagation();
      const val = input.value.trim();
      if (val.includes('.')) {
        this._config.sensors = [...this._config.sensors, val];
        input.value = ""; // On vide manuellement
        this._save();
        this.render(); // On redessine uniquement au clic
      }
    };

    // Suppression
    this.shadowRoot.querySelectorAll('.del').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        this._config.sensors.splice(btn.dataset.index, 1);
        this._save();
        this.render();
      };
    });
  }

  _save() {
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}
customElements.define("appliance-card-editor", ApplianceCardEditor);

// --- 2. LA CARTE ---
class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  static getStubConfig() { return { appliance_type: "washing_machine", sensors: [] }; }
  setConfig(config) { this.config = config; }

  set hass(hass) {
    if (!this.config || !hass) return;
    if (!this.content) {
      this.innerHTML = `<ha-card style="padding:16px; background:#111; color:white; border:1px solid #7CFFB2; border-radius:15px;"></ha-card>`;
      this.content = this.querySelector("ha-card");
    }

    const icons = { washing_machine: "🧺", dishwasher: "🍽️", fridge: "❄️" };
    let html = `<div style="display:flex; align-items:center; gap:10px; font-size:25px; margin-bottom:10px;">
      ${icons[this.config.appliance_type]} <span style="font-size:16px; font-weight:bold;">${this.config.appliance_type.toUpperCase()}</span>
    </div><div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">`;

    (this.config.sensors || []).forEach(id => {
      const s = hass.states[id];
      if (s) html += `<div style="background:#222; padding:8px; border-radius:8px; border-left:3px solid #7CFFB2;">
        <div style="font-size:10px; opacity:0.6;">${id.split('.').pop()}</div>
        <div style="font-weight:bold;">${s.state}</div>
      </div>`;
    });
    this.content.innerHTML = html + `</div>`;
  }
}
customElements.define("appliance-card", ApplianceCard);

window.customCards = window.customCards || [];
window.customCards.push({ type: "appliance-card", name: "Appliance Card Pro", preview: true });
