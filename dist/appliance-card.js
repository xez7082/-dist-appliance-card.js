// --- DÉFINITION DE L'ÉDITEUR VISUEL ---
class UltraApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.render();
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .option { padding: 10px 0; border-bottom: 1px solid #eee; }
        select, input { width: 100%; padding: 8px; margin-top: 5px; }
        label { font-weight: bold; font-size: 14px; }
      </style>
      <div class="card-config">
        <div class="option">
          <label>Type d'appareil</label>
          <select id="appliance_type">
            <option value="washing_machine" ${this._config.appliance_type === 'washing_machine' ? 'selected' : ''}>Lave-linge</option>
            <option value="dishwasher" ${this._config.appliance_type === 'dishwasher' ? 'selected' : ''}>Lave-vaisselle</option>
            <option value="fridge" ${this._config.appliance_type === 'fridge' ? 'selected' : ''}>Réfrigérateur</option>
          </select>
        </div>
        <div class="option">
          <label>Nom de l'appareil</label>
          <input type="text" id="name" value="${this._config.name || ''}">
        </div>
        <p><i>Note : Configurez les entités restantes dans le YAML pour une précision totale.</i></p>
      </div>
    `;

    this.shadowRoot.querySelector('#appliance_type').addEventListener('change', (ev) => {
      this._config = { ...this._config, appliance_type: ev.target.value };
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config } }));
    });
  }
}
customElements.define("ultra-appliance-card-editor", UltraApplianceCardEditor);


// --- DÉFINITION DE LA CARTE PRINCIPALE ---
class UltraApplianceCard extends HTMLElement {
  
  static getConfigElement() {
    return document.createElement("ultra-appliance-card-editor");
  }

  static getStubConfig() {
    return {
      appliance_type: "washing_machine",
      name: "Mon Appareil",
      entity: "sensor.lave_linge_etat",
      power_entity: "sensor.lave_linge_power"
    };
  }

  setConfig(config) {
    this.config = config;
  }

  set hass(hass) {
    if (!this.content) {
      this.innerHTML = `
        <ha-card style="background: #111; border: 1px solid #7CFFB2; border-radius: 20px; padding: 20px; color: white;">
          <div id="header" style="text-align:center; color:#7CFFB2; letter-spacing:2px; font-weight:bold; margin-bottom:15px; font-size: 1.2em;"></div>
          <div id="main-display" style="display: flex; justify-content: space-around; align-items: center; margin-bottom: 20px;">
            <div id="viz"></div>
            <div id="quick-stats" style="font-size: 0.9em; line-height: 1.8;"></div>
          </div>
          <div id="sensor-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 0.85em; border-top: 1px solid #333; pt: 10px;"></div>
        </ha-card>
      `;
      this.content = this.querySelector("#content");
    }

    const config = this.config;
    const type = config.appliance_type || 'washing_machine';
    
    // Titre
    this.querySelector("#header").textContent = config.name || "Appareil";

    // Calcul de la progression (ex: 50%)
    const prog = hass.states[config.progress_entity]?.state || 0;
    const level = 100 - prog;

    // Rendu de la vague SVG
    this.querySelector("#viz").innerHTML = `
      <svg viewBox="0 0 100 100" style="width:100px; height:100px; border-radius:50%; border: 2px solid #7CFFB2; background:#051515;">
        <path d="M 0,${level} C 25,${level-5} 75,${level+5} 100,${level} L 100,100 L 0,100 Z" fill="#7CFFB2" opacity="0.6">
          <animate attributeName="d" dur="2s" repeatCount="indefinite" values="M 0,${level} C 25,${level-5} 75,${level+5} 100,${level} L 100,100 L 0,100 Z; M 0,${level} C 25,${level+5} 75,${level-5} 100,${level} L 100,100 L 0,100 Z; M 0,${level} C 25,${level-5} 75,${level+5} 100,${level} L 100,100 L 0,100 Z" />
        </path>
        <text x="50" y="55" text-anchor="middle" fill="white" font-size="16" font-weight="bold">${prog}%</text>
      </svg>
    `;

    // Grille de 10 sensors selon le type
    let sensorsHTML = '';
    const sensorList = this._getSensorsForType(type, config);
    
    sensorList.forEach(s => {
      const val = hass.states[s.id]?.state || '--';
      const unit = hass.states[s.id]?.attributes.unit_of_measurement || '';
      sensorsHTML += `<div>${s.icon} ${s.label}: <b>${val}${unit}</b></div>`;
    });
    
    this.querySelector("#sensor-grid").innerHTML = sensorsHTML;
  }

  _getSensorsForType(type, config) {
    // Liste de 10 capteurs par défaut pour chaque catégorie
    const mapping = {
      washing_machine: [
        { label: "État", id: config.entity, icon: "🔄" },
        { label: "Puissance", id: config.power_entity, icon: "⚡" },
        { label: "Énergie", id: config.energy_entity, icon: "📊" },
        { label: "Température", id: config.temp_entity, icon: "🌡️" },
        { label: "Essorage", id: config.spin_entity, icon: "🌀" },
        { label: "Porte", id: config.door_entity, icon: "🚪" },
        { label: "Eau", id: config.water_entity, icon: "💧" },
        { label: "Fin", id: config.end_entity, icon: "⏰" },
        { label: "Tambour", id: config.drum_entity, icon: "📦" },
        { label: "Mode", id: config.mode_entity, icon: "⚙️" }
      ],
      dishwasher: [
        { label: "État", id: config.entity, icon: "🔄" },
        { label: "Puissance", id: config.power_entity, icon: "⚡" },
        { label: "Sel", id: config.salt_entity, icon: "🧂" },
        { label: "Rinçage", id: config.rinse_entity, icon: "✨" },
        { label: "Prog", id: config.prog_entity, icon: "📋" },
        { label: "Porte", id: config.door_entity, icon: "🚪" },
        { label: "Eau", id: config.water_entity, icon: "💧" },
        { label: "Énergie", id: config.energy_entity, icon: "📊" },
        { label: "Temp", id: config.temp_entity, icon: "🌡️" },
        { label: "Fin", id: config.end_entity, icon: "⏰" }
      ],
      fridge: [
        { label: "Temp Frigo", id: config.entity, icon: "🌡️" },
        { label: "Temp Congélo", id: config.freezer_temp_entity, icon: "❄️" },
        { label: "Puissance", id: config.power_entity, icon: "⚡" },
        { label: "Porte", id: config.door_entity, icon: "🚪" },
        { label: "Humidité", id: config.hum_entity, icon: "💧" },
        { label: "Énergie", id: config.energy_entity, icon: "📊" },
        { label: "Alerte", id: config.alert_entity, icon: "⚠️" },
        { label: "Mode Eco", id: config.eco_entity, icon: "🍃" },
        { label: "Filtre", id: config.filter_entity, icon: "🚰" },
        { label: "Lumière", id: config.light_entity, icon: "💡" }
      ]
    };
    return mapping[type] || [];
  }

  getCardSize() { return 5; }
}

customElements.define("ultra-appliance-card", UltraApplianceCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ultra-appliance-card",
  name: "Ultra Appliance Card",
  description: "Éditeur visuel pour Lave-linge, Lave-vaisselle et Frigo.",
  preview: true,
});
