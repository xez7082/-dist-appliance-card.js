// --- 1. L'ÉDITEUR ---
class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { 
        entity: '', 
        name: 'Appliance', 
        show_state: true, 
        ...config 
    };
    this._render();
  }

  _render() {
    this.innerHTML = `
      <div style="padding: 15px; font-family: sans-serif; background: #1c1c1c; color: white; border-radius: 10px;">
        <h3 style="color: #7CFFB2; margin-top: 0;">Configuration Appliance</h3>
        
        <label style="font-weight: bold; font-size: 11px;">ENTITÉ (sensor.lave_linge_job_state)</label>
        <input id="entity-input" placeholder="sensor.xxxx" value="${this._config.entity}"
               style="width: 100%; padding: 10px; background: #000; color: #fff; border: 1px solid #444; border-radius: 5px; margin: 10px 0; box-sizing: border-box;">

        <label style="font-weight: bold; font-size: 11px;">NOM DE L'APPAREIL</label>
        <input id="name-input" placeholder="Lave-Linge" value="${this._config.name}"
               style="width: 100%; padding: 10px; background: #000; color: #fff; border: 1px solid #444; border-radius: 5px; margin: 10px 0; box-sizing: border-box;">

        <div style="margin-top: 10px;">
            <input type="checkbox" id="show-state" ${this._config.show_state ? 'checked' : ''}>
            <label style="font-size: 12px; margin-left: 5px;">Afficher l'état textuel</label>
        </div>
      </div>
    `;

    const entityInput = this.querySelector('#entity-input');
    const nameInput = this.querySelector('#name-input');
    const showCheck = this.querySelector('#show-state');

    // --- BLOQUAGE DU CURSEUR ---
    [entityInput, nameInput].forEach(el => {
        el.addEventListener('input', (e) => e.stopPropagation());
        el.addEventListener('keydown', (e) => e.stopPropagation());
    });

    entityInput.onchange = () => { this._config.entity = entityInput.value.trim(); this._save(); };
    nameInput.onchange = () => { this._config.name = nameInput.value.trim(); this._save(); };
    showCheck.onchange = () => { this._config.show_state = showCheck.checked; this._save(); };
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

// --- 2. LA CARTE ---
class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  
  setConfig(config) {
    if (!config.entity) throw new Error("Une entité est requise");
    this.config = config;
  }

  // Traduction des états HA vers tes noms de fichiers GitHub
  normalizeState(state) {
    const s = state.toLowerCase();
    const map = {
      'on': 'lavage',
      'washing': 'lavage',
      'running': 'lavage',
      'filling': 'remplissage',
      'rinsing': 'rincage',
      'spinning': 'essorage',
      'paused': 'pause',
      'pause': 'pause',
      'complete': 'findecycle',
      'done': 'findecycle',
      'end': 'findecycle',
      'idle': 'enveille',
      'off': 'enveille',
      'error': 'erreur',
      'fault': 'erreur'
    };
    return map[s] || s;
  }

  set hass(hass) {
    const entity = hass.states[this.config.entity];
    if (!entity) return;

    const state = this.normalizeState(entity.state);
    
    // Liens directs vers tes images GitHub
    const baseUrl = "https://raw.githubusercontent.com/xez7082/-dist-appliance-card.js/main/img/";
    const image = `${baseUrl}${state}.png`;

    const colors = {
      enveille: "#888",
      remplissage: "#3498db",
      lavage: "#2980b9",
      rincage: "#1abc9c",
      essorage: "#9b59b6",
      findecycle: "#2ecc71",
      pause: "#f39c12",
      erreur: "#e74c3c"
    };

    const color = colors[state] || "#7CFFB2";
    const glow = state === "findecycle" || state === "erreur";

    this.innerHTML = `
      <ha-card style="
        border-radius:20px;
        overflow:hidden;
        text-align:center;
        background: #111;
        color: white;
        box-shadow: ${glow ? `0 0 20px ${color}66` : "0 4px 10px rgba(0,0,0,0.5)"};
        border: 1px solid ${color}44;
        transition: all 0.5s ease;
      ">
        <div style="padding:15px; background: rgba(255,255,255,0.03); border-bottom: 1px solid #222;">
          <h3 style="margin:0; font-size: 16px; letter-spacing: 1px; color: #7CFFB2; text-transform: uppercase;">${this.config.name}</h3>
        </div>

        <div style="padding: 20px; display: flex; align-items: center; justify-content: center; min-height: 200px;">
            <img src="${image}" 
                 onerror="this.src='${baseUrl}enveille.png';"
                 style="width: 80%; max-height: 180px; object-fit: contain; filter: drop-shadow(0 0 10px ${color}44);">
        </div>

        ${this.config.show_state ? `
            <div style="
                padding:15px;
                font-weight:bold;
                color:${color};
                text-transform:uppercase;
                font-size: 14px;
                background: rgba(0,0,0,0.3);
                letter-spacing: 2px;
              ">
                ${state.replace('findecycle', 'FIN DE CYCLE')}
            </div>` : ""
        }
      </ha-card>
    `;
  }

  getCardSize() { return 4; }
}

customElements.define("appliance-card", ApplianceCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "appliance-card",
  name: "Appliance Card Visual",
  preview: true
});
