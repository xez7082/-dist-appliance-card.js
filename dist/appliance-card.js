class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { appliance_type: 'washing_machine', sensors: [], ...config };
    this._render();
  }

  // On crée l'interface une seule fois
  _render() {
    this.innerHTML = `
      <div style="padding: 15px; font-family: sans-serif; background: #1c1c1c; color: white; border-radius: 10px;">
        <label style="font-weight: bold; color: #7CFFB2; font-size: 12px;">APPAREIL</label>
        <div style="display: flex; gap: 5px; margin: 10px 0 20px;">
          <button class="type-btn" data-type="washing_machine" style="flex:1; padding:10px; cursor:pointer;">LAVE</button>
          <button class="type-btn" data-type="dishwasher" style="flex:1; padding:10px; cursor:pointer;">VAISSELLE</button>
          <button class="type-btn" data-type="fridge" style="flex:1; padding:10px; cursor:pointer;">FRIGO</button>
        </div>

        <label style="font-weight: bold; color: #7CFFB2; font-size: 12px;">AJOUTER UN CAPTEUR</label>
        <div style="display: flex; gap: 5px; margin-top: 10px;">
          <input id="s-input" placeholder="sensor.puissance" 
                 style="flex: 1; padding: 10px; background: #000; color: #fff; border: 1px solid #444; border-radius: 5px;">
          <button id="add-btn" style="background: #7CFFB2; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold;">OK</button>
        </div>
        <div id="tag-container" style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 5px;"></div>
      </div>
    `;

    const input = this.querySelector('#s-input');
    
    // --- PROTECTION DU CURSEUR ---
    input.addEventListener('input', (e) => e.stopPropagation());
    input.addEventListener('keydown', (e) => e.stopPropagation());
    input.addEventListener('mousedown', (e) => e.stopPropagation());

    // Gestion des boutons de type
    this.querySelectorAll('.type-btn').forEach(btn => {
      btn.onclick = () => {
        this._config.appliance_type = btn.dataset.type;
        this._save();
      };
    });

    // Gestion de l'ajout
    this.querySelector('#add-btn').onclick = () => {
      if (input.value.includes('.')) {
        this._config.sensors = [...this._config.sensors, input.value.trim()];
        input.value = "";
        this._renderTags();
        this._save();
      }
    };

    this._renderTags();
  }

  _renderTags() {
    const container = this.querySelector('#tag-container');
    container.innerHTML = this._config.sensors.map((s, i) => `
      <div style="background: #333; padding: 5px 10px; border-radius: 15px; font-size: 11px;">
        ${s.split('.').pop()} <span class="del" data-i="${i}" style="color:red; cursor:pointer; margin-left:5px;">×</span>
      </div>
    `).join('');

    container.querySelectorAll('.del').forEach(d => {
      d.onclick = () => {
        this._config.sensors.splice(d.dataset.i, 1);
        this._renderTags();
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

class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  static getStubConfig() { return { appliance_type: "washing_machine", sensors: [] }; }
  
  setConfig(config) { this.config = config; }

  set hass(hass) {
    if (!this.config || !hass) return;
    if (!this.content) {
      this.innerHTML = `<ha-card style="padding: 16px; background: #111; color: white; border: 1px solid #7CFFB2; border-radius: 15px;"></ha-card>`;
      this.content = this.querySelector("ha-card");
    }

    const type = this.config.appliance_type || 'washing_machine';
    const icons = { washing_machine: "🧺", dishwasher: "🍽️", fridge: "❄️" };
    
    let html = `<div style="font-size: 30px; margin-bottom: 10px;">${icons[type]}</div>`;
    html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">`;
    
    (this.config.sensors || []).forEach(id => {
      const s = hass.states[id];
      if (s) html += `<div style="background:#222; padding:8px; border-radius:8px; border-left:3px solid #7CFFB2;">
        <div style="font-size:10px; opacity:0.5;">${id.split('.').pop()}</div>
        <div style="font-weight:bold;">${s.state}</div>
      </div>`;
    });

    this.content.innerHTML = html + `</div>`;
  }
}
customElements.define("appliance-card", ApplianceCard);

window.customCards = window.customCards || [];
window.customCards.push({ type: "appliance-card", name: "Appliance Pro", preview: true });
