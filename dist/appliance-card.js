class ApplianceCard extends HTMLElement {
  set hass(hass) {
    if (!this.content) {
      this.innerHTML = `
        <ha-card style="background: #111; border: 1px solid #7CFFB2; border-radius: 20px; padding: 15px; color: white;">
          <div id="container">
            <div id="header" style="text-align:center; color:#7CFFB2; letter-spacing:3px; font-weight:bold; margin-bottom:10px;">
               ÉLECTROMÉNAGERS
            </div>
            <div id="content"></div>
          </div>
        </ha-card>
      `;
      this.content = this.querySelector("#content");
    }

    // Ici, on récupère les états des entités définies dans la config
    const entityId = this.config.entity;
    const state = hass.states[entityId];
    const power = hass.states[this.config.power_entity];

    this.content.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-size: 16px;">${this.config.name || 'Appareil'}</div>
          <div style="color: #7CFFB2; font-size: 12px;">${state ? state.state : 'off'}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 14px; color: #amber;">⚡ ${power ? power.state : '0'} W</div>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 15px;">
        <svg viewBox="0 0 100 100" style="width:80px; height:80px; border-radius:50%; border: 2px solid #7CFFB2; background:#051515;">
          <path d="M 0,50 C 25,45 75,55 100,50 L 100,100 L 0,100 Z" fill="#7CFFB2" opacity="0.6">
            <animate attributeName="d" dur="2s" repeatCount="indefinite" 
              values="M 0,50 C 25,45 75,55 100,50 L 100,100 L 0,100 Z; 
                      M 0,50 C 25,55 75,45 100,50 L 100,100 L 0,100 Z; 
                      M 0,50 C 25,45 75,55 100,50 L 100,100 L 0,100 Z" />
          </path>
        </svg>
      </div>
    `;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Vous devez définir une entité");
    }
    this.config = config;
  }

  getCardSize() {
    return 3;
  }
}

customElements.define("appliance-card", ApplianceCard);

// Cette partie permet à Home Assistant d'afficher la carte dans l'interface "Ajouter au tableau de bord"
window.customCards = window.customCards || [];
window.customCards.push({
  type: "ultra-appliance-card",
  name: "Ultra Appliance Card",
  description: "Une carte animée pour vos appareils électroménagers.",
  preview: true,
});
