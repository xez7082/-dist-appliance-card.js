// ==========================
// 🎛️ ÉDITEUR VISUEL (STABLE)
// ==========================
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
        <h3 style="color: #7CFFB2; margin: 0 0 15px 0; font-size: 18px;">Configuration Appliance</h3>
        
        <label style="font-weight: bold; font-size: 11px; color: #888;">ENTITÉ (sensor.lave_linge_job_state)</label>
        <input id="entity-input" placeholder="sensor.votre_entite" value="${this._config.entity}"
               style="width: 100%; padding: 12px; background: #000; color: #fff; border: 1px solid #444; border-radius: 8px; margin: 8px 0 15px; box-sizing: border-box; outline: none;">

        <label style="font-weight: bold; font-size: 11px; color: #888;">NOM DE L'APPAREIL</label>
        <input id="name-input" placeholder="Ex: Lave-Linge" value="${this._config.name}"
               style="width: 100%; padding: 12px; background: #000; color: #fff; border: 1px solid #444; border-radius: 8px; margin: 8px 0 15px; box-sizing: border-box; outline: none;">

        <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
            <input type="checkbox" id="show-state" ${this._config.show_state ? 'checked' : ''} style="cursor: pointer;">
            <label for="show-state" style="font-size: 13px; cursor: pointer;">Afficher l'état sous l'image</label>
        </div>
      </div>
    `;

    const entityInput = this.querySelector('#entity-input');
    const nameInput = this.querySelector('#name-input');
    const showCheck = this.querySelector('#show-state');

    // --- BLOQUAGE DU CURSEUR (Anti-jump) ---
    const stop = (e) => e.stopPropagation();
    [entityInput, nameInput].forEach(el => {
        el.addEventListener('input', stop);
        el.addEventListener('keydown', stop);
        el.addEventListener('mousedown', stop);
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


// ==========================
// 🧺 LA CARTE (ANTI-SCINTILLEMENT)
// ==========================
class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  
  setConfig(config) {
    if (!config.entity) throw new Error("L'entité est obligatoire.");
    this.config = config;
  }

  // Conversion des états vers les noms de tes fichiers GitHub
  normalizeState(state) {
    if (!state) return 'enveille';
    const s = state.toLowerCase();
    const map = {
      'on': 'lavage', 'washing': 'lavage', 'running': 'lavage', 'lavage': 'lavage',
      'filling': 'remplissage', 'remplissage': 'remplissage',
      'rinsing': 'rincage', 'rincage': 'rincage',
      'spinning': 'essorage', 'essorage': 'essorage',
      'paused': 'pause', 'pause': 'pause',
      'complete': 'findecycle', 'done': 'findecycle', 'end': 'findecycle', 'fin': 'findecycle',
      'idle': 'enveille', 'off': 'enveille', 'en veille': 'enveille',
      'error': 'erreur', 'fault': 'erreur', 'erreur': 'erreur'
    };
    return map[s] || s;
  }

  set hass(hass) {
    const entity = hass.states[this.config.entity];
    if (!entity) return;

    const state = this.normalizeState(entity.state);
    const baseUrl = "https://raw.githubusercontent.com/xez7082/-dist-appliance-card.js/main/img/";
    
    const colors = {
      enveille: "#888", remplissage: "#3498db", lavage: "#2980b9",
      rincage: "#1abc9c", essorage: "#9b59b6", findecycle: "#2ecc71",
      pause: "#f39c12", erreur: "#e74c3c"
    };
    const color = colors[state] || "#7CFFB2";

    // --- CONSTRUCTION INITIALE (UNE SEULE FOIS) ---
    if (!this._baseCard) {
      this.innerHTML = `
        <ha-card style="border-radius:24px; overflow:hidden; text-align:center; background:#111; color:white; border:1px solid #333; transition: all 0.5s ease-in-out;">
          <div style="padding:18px; background:rgba(255,255,255,0.03); border-bottom:1px solid #222;">
            <h3 id="card-title" style="margin:0; font-size:16px; color:#7CFFB2; text-transform:uppercase; letter-spacing:1px;"></h3>
          </div>
          <div style="padding:25px; display:flex; align-items:center; justify-content:center; min-height:220px; position:relative;">
            <img id="appliance-img" style="width:85%; max-height:200px; object-fit:contain; transition: filter 0.8s ease, transform 0.3s ease;">
          </div>
          <div id="state-box" style="padding:15px; font-weight:bold; text-transform:uppercase; font-size:13px; background:rgba(0,0,0,0.4); letter-spacing:2px; transition:color 0.5s ease;"></div>
        </ha-card>
      `;
      this._baseCard = this.querySelector('ha-card');
      this._img = this.querySelector('#appliance-img');
      this._stateBox = this.querySelector('#state-box');
      this._title = this.querySelector('#card-title');
    }

    // --- MISE À JOUR CHIRURGICALE (Uniquement si l'état change) ---
    if (this._lastState !== state) {
      const newSrc = `${baseUrl}${state}.png`;
      
      // Préchargement pour éviter le flash blanc de l'image
      const imgPreload = new Image();
      imgPreload.src = newSrc;
      imgPreload.onload = () => {
          this._img.src = newSrc;
      };

      this._img.style.filter = `drop-shadow(0 0 12px ${color}55)`;
      this._stateBox.style.color = color;
      this._stateBox.textContent = state.replace('findecycle', 'FIN DE CYCLE').replace('enveille', 'EN VEILLE');
      
      // Effet de bordure néon si actif
      this._baseCard.style.boxShadow = (state !== "enveille") ? `0 0 20px ${color}33` : "none";
      this._baseCard.style.borderColor = (state !== "enveille") ? `${color}55` : "#333";
      
      this._lastState = state;
    }

    // Mise à jour constante des paramètres éditeur
    if (this._title.textContent !== this.config.name) {
        this._title.textContent = this.config.name;
    }
    this._stateBox.style.display = this.config.show_state ? 'block' : 'none';
  }

  getCardSize() { return 4; }
}

customElements.define("appliance-card", ApplianceCard);

// --- ENREGISTREMENT DANS HA ---
window.customCards = window.customCards || [];
window.customCards.push({
  type: "appliance-card",
  name: "Appliance Card Pro",
  description: "Carte animée avec suivi d'état par images GitHub.",
  preview: true
});
