// -----------------------------------------------------------
// 1. L'ÉDITEUR (L'interface visuelle de configuration)
// -----------------------------------------------------------
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
    this.shadowRoot.innerHTML = `
      <style>
        .card-config { font-family: sans-serif; color: var(--primary-text-color); padding: 10px; }
        .label { display: block; font-weight: bold; margin-bottom: 8px; color: #7CFFB2; }
        .type-btns { display: flex; gap: 8px; margin-bottom: 20px; }
        .btn { 
          flex: 1; padding: 12px; cursor: pointer; border-radius: 8px; 
          border: 1px solid #444; background: #222; color: #888; text-align: center;
        }
        .btn.active { border-color: #7CFFB2; color: #7CFFB2; background: rgba(124, 255, 178, 0.1); }
        .input-box { display: flex; gap: 8px; margin-bottom: 15px; }
        input { flex: 1; padding: 10px; border-radius: 4px; border: 1px solid #444; background: #000; color: white; }
        .add-btn { background: #7CFFB2; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; }
        .tags { display: flex; flex-wrap: wrap; gap: 5px; }
        .tag { background: #333; padding: 5px 10px; border-radius: 12px; font-size: 12px; display: flex; align-items: center; }
        .del { color: #ff5252; margin-left: 8px; cursor: pointer; font-weight: bold; }
      </style>

      <div class="card-config">
        <span class="label">APPAREIL</span>
        <div class="type-btns">
          <div class="btn ${this._config.appliance_type === 'washing_machine' ? 'active' : ''}" id="wash">LAVE</div>
          <div class="btn ${this._config.appliance_type === 'dishwasher' ? 'active' : ''}" id="dish">VAISSELLE</div>
          <div class="btn ${this._config.appliance_type === 'fridge' ? 'active' : ''}" id="fridge">FRIGO</div>
        </div>

        <span class="label">CAPTEURS</span>
        <div class="input-box">
          <input id="input-sensor" placeholder="sensor.mon_entite">
          <button class="add-btn" id="add-btn">AJOUTER</button>
        </div>

        <div class="tags">
          ${this._config.sensors.map((s, i) => `
            <div class="tag">${s}<span class="del" data-i="${i}">×</span></div>
          `).join('')}
        </div>
      </div>
    `;

    // Empêcher Lovelace de voler le focus
    const input = this.shadowRoot.getElementById('input-sensor');
    input.onclick = (e) => e.stopPropagation();
    input.onmousedown = (e) => e.stopPropagation();

    // Logique des boutons
    this.shadowRoot.getElementById('wash').onclick = () => this._update('washing_machine');
    this.shadowRoot.getElementById('dish').onclick = () => this._update('dishwasher');
    this.shadowRoot.getElementById('fridge').onclick = () => this._update('fridge');

    this.shadowRoot.getElementById('add-btn').onclick = () => {
      if (input.value.includes('.')) {
        this._config.sensors = [...this._config.sensors, input.value.trim()];
        input.value = "";
        this._save();
      }
    };

    this.shadowRoot.querySelectorAll('.del').forEach(b => {
      b.onclick = () => {
        this._config.sensors.splice(parseInt(b.dataset.i), 1);
        this._save();
      };
    });
  }

  _update(val) {
    this._config.appliance_type = val;
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

// -----------------------------------------------------------
// 2. LA CARTE (L'affichage sur le tableau de bord)
// -----------------------------------------------------------
class ApplianceCard extends HTMLElement {
  // Cette fonction lie la carte à son éditeur
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
      this.innerHTML = `
        <ha-card style="padding:16px; background:#111; color:white; border-radius:15px; border:1px solid #7CFFB2;">
          <div id="icon-container" style="font-size:35px; margin-bottom:15px;"></div>
          <div id="grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;"></div>
        </ha-card>
      `;
      this.content = this.querySelector("#grid");
    }

    const icons = { washing_machine: "🧺", dishwasher: "🍽️", fridge: "❄️" };
    this.querySelector("#icon-container").textContent = icons[this.config.appliance_type] || "❓";

    let html = "";
    this.config.sensors.forEach(id => {
      const s = hass.states[id];
      if (s) {
        html += `
          <div style="background:#1c1c1c; padding:10px; border-radius:8px; border-left:3px solid #7CFFB2;">
            <div style="font-size:10px; opacity:0.6;">${id.split('.').pop()}</div>
            <div style="font-weight:bold;">${s.state}</div>
          </div>`;
      }
    });
    this.content.innerHTML = html || "Ouvrez l'éditeur pour ajouter des capteurs";
  }
}
customElements.define("appliance-card", ApplianceCard);

// 3. ENREGISTREMENT
window.customCards = window.customCards || [];
window.customCards.push({
  type: "appliance-card",
  name: "Appliance Card",
  preview: true
});
