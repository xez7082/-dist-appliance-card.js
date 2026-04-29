class UltraApplianceCard extends HTMLElement {
  // Configurer la carte via l'interface YAML
  setConfig(config) {
    if (!config.entity) {
      throw new Error("Vous devez définir une entité");
    }
    this.config = config;
  }

  // Appelé quand l'état change
  set hass(hass) {
    const entityId = this.config.entity;
    const state = hass.states[entityId];
    const power = hass.states[this.config.power_entity];
    
    // Si la carte n'est pas encore créée, on l'initialise
    if (!this.content) {
      this.innerHTML = `
        <ha-card style="background: #111; border: 1px solid #7CFFB2; border-radius: 20px; padding: 15px; color: white;">
          <div id="container">
            <div id="header" style="text-align:center; color:#7CFFB2; letter-spacing:3px; font-weight:bold; margin-bottom:10px; text-transform: uppercase;">
               ${this.config.name || 'Électroménager'}
            </div>
            <div id="content"></div>
          </div>
        </ha-card>
      `;
      this.content = this.querySelector("#content");
    }

    // Sécurité si l'entité est introuvable
    if (!state) {
      this.content.innerHTML = `<div style="color: red;">Entité introuvable : ${entityId}</div>`;
      return;
    }

    // Mise à jour du contenu
    this.content.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-size: 14px; opacity: 0.8;">Statut</div>
          <div style="color: #7CFFB2; font-size: 16px; font-weight: bold;">${state.state}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 18px; color: amber;">⚡ ${power ? power.state : '0'} W</div>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 15px;">
        <svg viewBox="0 0 100 100" style="width:100px; height:100px; border-radius:50%; border: 2.5px solid #7CFFB2; background:#051515;">
          <path d="M 0,50 C 25,45 75,55 100,50 L 100,100 L 0,100 Z" fill="#7CFFB2" opacity="0.6">
            <animate attributeName="d" dur="2s" repeatCount="indefinite" 
              values="M 0,50 C 25,45 75,55 100,50 L 100,100 L 0,100 Z; 
                      M 0,50 C 25,55 75,45 100,50 L 100,100 L 0,100 Z; 
                      M 0,50 C 25,45 75,55 100,50 L 100,100 L 0,100 Z" />
          </path>
          <text x="50" y="55" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${state.state === 'off' ? 'OFF' : 'ON'}</text>
        </svg>
      </div>
    `;
  }

  getCardSize() {
    return 3;
  }
}

// Enregistrement de la carte
customElements.define("ultra-appliance-card", UltraApplianceCard);

// Configuration pour l'aperçu HACS / Sélecteur de carte
window.customCards = window.customCards || [];
window.customCards.push({
  type: "ultra-appliance-card",
  name: "Ultra Appliance Card",
  description: "Une carte animée et stylisée pour vos appareils électroménagers.",
  preview: true,
});
