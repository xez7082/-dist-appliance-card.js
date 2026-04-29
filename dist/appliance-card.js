// -----------------------------------------------------------
// 1. L'ÉDITEUR (Interface de configuration)
// -----------------------------------------------------------
class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    // On force une configuration par défaut si elle est vide
    this._config = { 
      appliance_type: 'washing_machine', 
      sensors: [], 
      ...config 
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this.render();
  }

  render() {
    if (!this._config) return; // Sécurité anti-crash

    this.shadowRoot.innerHTML = `
      <style>
        .card-config { font-family: sans-serif; padding: 10px; color: var(--primary-text-color); }
        .label { display: block; font-weight: bold; margin-bottom: 8px; color: #7CFFB2; font-size: 11px; }
        .type-btns { display: flex; gap: 8px; margin-bottom: 20px; }
        .btn { 
          flex: 1; padding: 10px; cursor: pointer; border-radius: 8px; 
          border: 1px solid #444; background: #222; color: #888; text-align: center; font-size: 10px;
        }
        .btn.active { border-color: #7CFFB2; color: #7CFFB2; background: rgba(124, 255, 178, 0.1); }
        .input-box { display: flex; gap: 8px; margin-bottom: 15px; }
        input { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #444; background: #000; color: white; outline: none; }
        .add-btn { background: #7CFFB2; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold; }
        .tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .tag { background: #333; padding: 6px 10px; border-radius: 20px; font-size: 11px; display: flex; align-items: center; border: 1px solid #555; }
        .del { color: #ff5252; margin-left: 8px; cursor: pointer; font-weight: bold; font-size: 14px; }
      </style>

      <div class="card-config">
        <span class="label">APPAREIL</span>
        <div class="type-btns">
          <div class="btn ${this._config.appliance_type === 'washing_machine' ? 'active' : ''}" id="wash">LAVE</div>
          <div class="btn ${this._config.appliance_type === 'dishwasher' ? 'active' : ''}" id="dish">VAISSELLE</div>
          <div class="btn ${this._config.appliance_type === 'fridge' ? 'active' : ''}" id="fridge">FRIGO</div>
        </div>

        <span class="label">ENTITÉS (SENSORS)</span>
        <div class="input-box">
          <input id="input-sensor" placeholder="sensor.votre_entite" spellcheck="false">
          <button class="add-btn" id="add-btn">OK</button>
        </div>

        <div class="tags">
          ${(this._config.sensors || []).map((s, i) => `
            <div class="tag"><span>${s}</span><span class="del" data-i="${i}">×</span></div>
          `).join('')}
        </div>
      </div>
    `;

    // Empêcher Lovelace de voler le focus pendant la saisie
    const input = this.shadowRoot.getElementById('input-sensor');
    if (input) {
      input.onmousedown = (e) => e.stopPropagation();
      input.onclick = (e) => e.stopPropagation();
    }

    // Gestion des clics sur les types
    const setupType = (id, val) => {
      const el = this.shadowRoot.getElementById(id);
      if (el) el.onclick = () => { this._config.appliance_type = val; this._save(); };
    };
    setupType('wash', 'washing_machine');
    setupType('dish', 'dishwasher');
    setupType('fridge', 'fridge');

    // Ajouter un sensor
    const addBtn = this.shadowRoot.getElementById('add-btn');
    if (addBtn) {
      addBtn.onclick = (e) => {
        e.stopPropagation();
        const val = input.value.trim();
        if (val && val.includes('.')) {
          this._config.sensors = [...(this._config.sensors || []), val];
          input.value = "";
          this._save();
        }
      };
    }

    // Supprimer un sensor
    this.shadowRoot.querySelectorAll('.del').forEach(b => {
      b.onclick = (e) => {
        e.stopPropagation();
        const index = parseInt(b.dataset.i);
        this._config.sensors.splice(index, 1);
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
    this.render(); // Force la mise à jour visuelle immédiate de l'éditeur
  }
}
customElements.define("appliance-card-editor", ApplianceCardEditor);


// -----------------------------------------------------------
// 2. LA CARTE (Affichage)
// -----------------------------------------------------------
class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  
  static getStubConfig() { 
    return { appliance_type: "washing_machine", sensors: [] }; 
  }

  setConfig(config) {
    if (!config) throw new Error("Configuration invalide");
    this.config = config;
  }

  set hass(hass) {
    // PROTECTION : Si la config ou hass n'est pas prêt, on arrête tout
    if (!this.config || !hass) return;

    if (!this.content) {
      this.innerHTML = `
        <ha-card style="padding:20px; background:#111; color:white; border-radius:20px; border:1px solid #7CFFB2;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <div id="icon-display" style="font-size:35px;"></div>
            <div id="appliance-title" style="font-weight:bold; color:#7CFFB2; text-transform:uppercase;"></div>
          </div>
          <div id="sensor-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;"></div>
        </ha-card>
      `;
      this.content = this.querySelector("#sensor-grid");
    }

    // On récupère les valeurs avec des garde-fous (default values)
    const type = this.config.appliance_type || 'washing_machine';
    const sensors = this.config.sensors || [];

    const icons = { washing_machine: "🧺", dishwasher: "🍽️", fridge: "❄️" };
    const titles = { washing_machine: "Lave-Linge", dishwasher: "Vaisselle", fridge: "Frigo" };

    this.querySelector("#icon-display").textContent = icons[type] || "❓";
    this.querySelector("#appliance-title").textContent = titles[type] || "Appareil";

    let html = "";
    sensors.forEach(id => {
      const stateObj = hass.states[id];
      if (stateObj) {
        html += `
          <div style="background:#1c1c1c; padding:10px; border-radius:10px; border-left:3px solid #7CFFB2;">
            <div style="font-size:9px; opacity:0.6; text-transform:uppercase;">${id.split('.').pop().replace(/_/g, ' ')}</div>
            <div style="font-weight:bold; font-size:14px;">${stateObj.state} ${stateObj.attributes.unit_of_measurement || ''}</div>
          </div>`;
      }
    });

    this.content.innerHTML = html || "<div style='grid-column:span 2; opacity:0.3; font-size:12px;'>Aucun sensor configuré</div>";
  }
}
customElements.define("appliance-card", ApplianceCard);

// 3. ENREGISTREMENT DANS LOVELACE
window.customCards = window.customCards || [];
window.customCards.push({
  type: "appliance-card",
  name: "Appliance Card Pro",
  preview: true
});
