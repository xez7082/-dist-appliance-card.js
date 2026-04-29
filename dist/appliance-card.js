class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this.innerHTML = `
      <div style="padding: 20px; background: #2c2c2c; color: #7CFFB2; border-radius: 10px;">
        <h3>🛠 CONFIGURATION ACTIVE</h3>
        <p>Si tu vois ce message, l'éditeur visuel fonctionne enfin.</p>
        <input id="test-input" placeholder="Tape ici pour tester le curseur" 
               style="width: 100%; padding: 10px; background: #000; color: #fff; border: 1px solid #7CFFB2;">
      </div>
    `;
    
    // Blocage brutal pour le curseur
    const input = this.querySelector('#test-input');
    input.addEventListener('input', (e) => e.stopPropagation());
    input.addEventListener('keydown', (e) => e.stopPropagation());
  }
}
customElements.define("appliance-card-editor", ApplianceCardEditor);

class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  setConfig(config) { this.config = config; }
  set hass(hass) {
    this.innerHTML = `<ha-card style="padding: 20px;">MODE TEST : L'éditeur doit être visible.</ha-card>`;
  }
}
customElements.define("appliance-card", ApplianceCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "appliance-card",
  name: "Appliance TEST",
  preview: true
});
