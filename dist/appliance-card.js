// --- DÉFINITION DE L'ÉDITEUR (INTERFACE DE CONFIGURATION) ---
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
    if (!this._config) return;

    this.shadowRoot.innerHTML = `
      <style>
        .card-config { padding: 10px; font-family: sans-serif; }
        .option { padding: 12px 0; border-bottom: 1px solid #444; }
        label { font-weight: bold; color: #7CFFB2; display: block; margin-bottom: 5px; }
        select, input { 
          width: 100%; padding: 10px; background: #222; color: white; 
          border: 1px solid #444; border-radius: 4px; box-sizing: border-box;
        }
        select:focus, input:focus { border-color: #7CFFB2; outline: none; }
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
          <label>Nom de l'affichage</label>
          <input type="text" id="name" value="${this._config.name || ''}" placeholder="Ex: Lave-linge Cuisine">
        </div>
        <div class="option">
          <label>Entité Principale (État)</label>
          <input type="text" id="entity" value="${this._config.entity || ''}" placeholder="sensor.mon_appareil_etat">
        </div>
        <p style="color: #888; font-size: 0.8em;">Configurez les autres capteurs (power, energy, etc.) dans l'éditeur YAML pour plus de précision.</p>
      </div>
    `;

    this.shadowRoot.querySelectorAll('select, input').forEach(el => {
      el.addEventListener('change', (ev) => {
        const target = ev.target;
        this._config = { ...this._config, [target.id]: target.value };
        const event = new CustomEvent('config-changed', {
          detail: { config: this._config },
          bubbles: true,
          composed: true
        });
        this.dispatchEvent(event);
      });
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
      entity: "none",
      power_entity: "none"
    };
  }

  setConfig(config) {
    this.config = config;
  }

  set hass(hass) {
    if (!this.config || !hass) return;

    const config = this.config;
    const type = config.appliance_type || 'washing_machine';
    const mainState = hass.states[config.entity];

    if (!this.content) {
      this.innerHTML = `
        <ha-card style="background: #111; border: 1px solid #7CFFB2; border-radius: 20px; padding: 20px; color: white;">
          <div id="header" style="text-align:center; color:#7CFFB2; letter-spacing:2px; font-weight:bold; margin-bottom:15px; font-size: 1.2em; text-transform: uppercase;"></div>
          <div style="display: flex; justify-content: space-around; align-items: center; margin-bottom: 20px;">
            <div id="viz-container"></div>
            <div id="status-text" style="text-align: center;">
                <div style="font-size: 0.8em; opacity: 0.6;">STATUT ACTUEL</div>
                <div id="state-val" style="font-size: 1.2em; font-weight: bold; color: #7CFFB2;"></div>
            </div>
          </div>
          <div id="sensor-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 0.85em; border-top: 1px solid #333; padding-top: 15px;"></div>
        </ha-card>
      `;
      this.content = this.querySelector("#sensor-grid");
    }

    // Mise à jour du Titre et État
    this.querySelector("#header").textContent = config.name || "Appareil";
    this.querySelector("#state-val").textContent = mainState ? mainState.state : "Inconnu";

    // Calcul Progression
    const prog = parseFloat(hass.states[config.progress_entity]?.state) || 0;
    const level = 100 - prog;

    // Rendu du Hublot Animé
    this.querySelector("#viz-container").innerHTML = `
      <svg viewBox="0 0 100 100" style="width:100px; height:100px; border-radius:50%; border: 2.5px solid #7CFFB2; background:#051515; overflow:hidden;">
        <path d="M 0,${level} C 25,${level-5} 75,${level+5} 100,${level} L 100,100 L 0,100 Z" fill="#7CFFB2" opacity="0.6">
          <animate attributeName="d" dur="3s" repeatCount="indefinite" values="M 0,${level} C 25,${level-5} 75,${level+5} 100,${level} L 100,100 L 0,100 Z; M 0,${level} C 25,${level+5} 75,${level-5} 100,${level} L 100,100 L 0,100 Z; M 0,${level} C 25,${level-5} 75,${level+5} 100,${level} L 100,100 L 0,100 Z" />
        </path>
        <text x="50" y="55" text-anchor="middle" fill="white" font-size="18" font-weight="bold">${prog}%</text>
      </svg>
    `;

    // Génération des 10 Capteurs
    let sensorsHTML = '';
    const sensorList = this._getSensorsForType(type, config);
    
    sensorList.forEach(s => {
      const entityState = hass.states[s.id];
      const val = entityState ? entityState.state : '--';
      const unit = (entityState && entityState.attributes.unit_of_measurement) ? entityState.attributes.unit_of_measurement : '';
      sensorsHTML += `<div style="display:flex; align-items:center; gap:8px;">
        <span>${s.icon}</span> 
        <span style="opacity:0.7;">${s.label}:</span> 
        <span style="font-weight:bold; margin-left:auto;">${val}${unit}</span>
      </div>`;
    });
    
    this.content.innerHTML = sensorsHTML;
  }

  _getSensorsForType(type, config) {
    const common = [
      { label: "Puissance", id: config.power_entity, icon: "⚡" },
      { label: "Énergie", id: config.energy_entity, icon: "📊" },
      { label: "Porte", id: config.door_entity, icon: "🚪" }
    ];

    const mapping = {
      washing_machine: [
        ...common,
        { label: "Temp.", id: config.temp_entity, icon: "🌡️" },
        { label: "Essorage", id: config.spin_entity, icon: "🌀" },
        { label: "Fin", id: config.end_entity, icon: "⏰" },
        { label: "Eau", id: config.water_entity, icon: "💧" },
        { label: "Mode", id: config.mode_entity, icon: "⚙️" },
        { label: "Tambour", id: config.drum_entity, icon: "📦" },
        { label: "Vitesse", id: config.speed_entity, icon: "🚀" }
      ],
      dishwasher: [
        ...common,
        { label: "Sel", id: config.salt_entity, icon: "🧂" },
        { label: "Rinçage", id: config.rinse_entity, icon: "✨" },
        { label: "Programme", id: config.prog_entity, icon: "📋" },
        { label: "Temp.", id: config.temp_entity, icon: "🌡️" },
        { label: "Eau", id: config.water_entity, icon: "💧" },
        { label: "Fin", id: config.end_entity, icon: "⏰" },
        { label: "Séchage", id: config.dry_entity, icon: "🌬️" }
      ],
      fridge: [
        { label: "Temp Frigo", id: config.entity, icon: "🌡️" },
        { label: "Temp Congél", id: config.freezer_temp_entity, icon: "❄️" },
        ...common,
        { label: "Humidité", id: config.hum_entity, icon: "💧" },
        { label: "Alerte", id: config.alert_entity, icon: "⚠️" },
        { label: "Eco", id: config.eco_entity, icon: "🍃" },
        { label: "Filtre", id: config.filter_entity, icon: "🚰" },
        { label: "Lumière", id: config.light_entity, icon: "💡" }
      ]
    };
    return mapping[type] || [];
  }

  getCardSize() { return 6; }
}

customElements.define("ultra-appliance-card", UltraApplianceCard);

// Configuration pour le sélecteur de cartes Lovelace
window.customCards = window.customCards || [];
window.customCards.push({
  type: "ultra-appliance-card",
  name: "Ultra Appliance Card",
  description: "Dashboard pro pour Lave-linge, Lave-vaisselle et Frigo avec éditeur visuel.",
  preview: true,
});
