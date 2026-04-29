// --- 1. L'ÉDITEUR ---
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
        .config-box { padding: 15px; font-family: sans-serif; background: #1c1c1c; color: white; border-radius: 10px; }
        label { font-weight: bold; display: block; margin-bottom: 5px; color: #7CFFB2; font-size: 12px; }
        select, input { 
          width: 100%; padding: 10px; background: #000; color: white; 
          border: 1px solid #444; border-radius: 8px; margin-bottom: 15px;
          box-sizing: border-box;
        }
        .btn-add { 
          width: 100%; background: #7CFFB2; border: none; padding: 10px; 
          border-radius: 8px; cursor: pointer; font-weight: bold; color: #111;
        }
        .sensor-tag { 
          display: inline-flex; align-items: center; background: #333; 
          padding: 5px 10px; border-radius: 15px; margin: 3px; font-size: 11px;
        }
        .del { color: #ff5252; margin-left: 8px; cursor: pointer; font-weight: bold; }
      </style>

      <div class="config-box">
        <label>Type d'appareil</label>
        <select id="type-select">
          <option value="washing_machine" ${this._config.appliance_type === 'washing_machine' ? 'selected' : ''}>Lave-Linge</option>
          <option value="dishwasher" ${this._config.appliance_type === 'dishwasher' ? 'selected' : ''}>Lave-Vaisselle</option>
          <option value="fridge" ${this._config.appliance_type === 'fridge' ? 'selected' : ''}>Frigo</option>
        </select>

        <label>Ajouter un Sensor</label>
        <input id="sensor-input" type="text" placeholder="sensor.votre_entite" spellcheck="false">
        <button class="btn-add" id="add-btn">AJOUTER</button>

        <div id="list-container" style="margin-top: 15px;">
          ${(this._config.sensors || []).map((s, i) => `
            <div class="sensor-tag">
              ${s} <span class="del" data-index="${i}">×</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const input = this.shadowRoot.getElementById('sensor-input');
    const select = this.shadowRoot.getElementById('type-select');
    const addBtn = this.shadowRoot.getElementById('add-btn');

    // --- BLOQUER LE "BUBBLING" ---
    // Ces lignes empêchent Home Assistant de savoir que tu tapes dedans
    input.addEventListener('input', (e) => e.stopPropagation());
    input.addEventListener('keydown', (e) => e.stopPropagation());
    input.addEventListener('mousedown', (e) => e.stopPropagation());

    select.onchange = (e) => {
      this._config.appliance_type = e.target.value;
      this._save();
    };

    addBtn.onclick = (e) => {
      e.stopPropagation();
      const val = input.value.trim();
      if (val.includes('.')) {
        // On met à jour la config SEULEMENT au clic
        this._config.sensors = [...(this._config.sensors || []), val];
        input.value = ""; 
        this._save();
        this.render(); // On redessine manuellement la liste
      }
    };

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
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
  }
}
customElements.define("appliance-card-editor", ApplianceCardEditor);

// --- 2. LA CARTE (Version Stable) ---
class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  static getStubConfig() { return { appliance_type: "washing_machine", sensors: [] }; }

  setConfig(config) {
    this.config = config;
  }

  set hass(hass) {
    if (!this.config || !hass) return;

    if (!this.content) {
      this.innerHTML = `<ha-card style="padding:16px; background:#111; color:white; border:1px solid #7CFFB2; border-radius:15px;"></ha-card>`;
      this.content = this.querySelector("ha-card");
    }

    const type = this.config.appliance_type || 'washing_machine';
    const icons = { washing_machine: "🧺", dishwasher: "🍽️", fridge: "❄️" };

    let sensorsHtml = "";
    (this.config.sensors || []).forEach(id => {
      const s = hass.states[id];
      if (s) {
        sensorsHtml += `
          <div style="background:#222; padding:10px; border-radius:8px; border-left:3px solid #7CFFB2;">
            <div style="font-size:10px; opacity:0.6;">${id.split('.').pop()}</div>
            <div style="font-weight:bold;">${s.state}</div>
          </div>`;
      }
    });

    this.content.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:15px;">
        <span style="font-size:30px;">${icons[type] || '❓'}</span>
        <span style="font-weight:bold; color:#7CFFB2;">${type.toUpperCase()}</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        ${sensorsHtml || '<div style="grid-column:span 2; opacity:0.3;">Aucun capteur</div>'}
      </div>
    `;
  }
}
customElements.define("appliance-card", ApplianceCard);

window.customCards = window.customCards || [];
window.customCards.push({ type: "appliance-card", name: "Appliance Card Pro", preview: true });
