// --- 1. L'ÉDITEUR ---
class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { appliance_type: 'washing_machine', state_sensor: '', sensors: [], ...config };
    this._render();
  }

  _render() {
    this.innerHTML = `
      <div style="padding: 15px; font-family: sans-serif; background: #1c1c1c; color: white; border-radius: 10px;">
        <label style="font-weight: bold; color: #7CFFB2; font-size: 11px;">TYPE D'APPAREIL</label>
        <div style="display: flex; gap: 5px; margin: 10px 0 20px;">
          <button class="type-btn" data-type="washing_machine" style="flex:1; padding:10px; cursor:pointer; background:#222; color:#888; border:1px solid #444; border-radius:5px;">LAVE</button>
          <button class="type-btn" data-type="dishwasher" style="flex:1; padding:10px; cursor:pointer; background:#222; color:#888; border:1px solid #444; border-radius:5px;">VAISSELLE</button>
        </div>

        <label style="font-weight: bold; color: #7CFFB2; font-size: 11px;">CAPTEUR D'ÉTAT (POUR L'ANIMATION)</label>
        <input id="state-input" placeholder="sensor.lave_linge_job_state" value="${this._config.state_sensor || ''}"
               style="width: 100%; padding: 10px; background: #000; color: #fff; border: 1px solid #444; border-radius: 5px; margin: 10px 0; box-sizing: border-box;">

        <label style="font-weight: bold; color: #7CFFB2; font-size: 11px;">AUTRES CAPTEURS (LISTE)</label>
        <div style="display: flex; gap: 5px; margin-top: 10px;">
          <input id="s-input" placeholder="sensor.puissance" style="flex: 1; padding: 10px; background: #000; color: #fff; border: 1px solid #444; border-radius: 5px;">
          <button id="add-btn" style="background: #7CFFB2; border: none; padding: 0 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">OK</button>
        </div>
        <div id="tag-container" style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 5px;"></div>
      </div>
    `;

    const stateInput = this.querySelector('#state-input');
    const input = this.querySelector('#s-input');

    // Protection curseur
    [stateInput, input].forEach(el => {
        el.addEventListener('input', (e) => e.stopPropagation());
        el.addEventListener('keydown', (e) => e.stopPropagation());
    });

    // Sauvegarde auto du capteur d'état
    stateInput.onchange = () => {
        this._config.state_sensor = stateInput.value.trim();
        this._save();
    };

    this.querySelectorAll('.type-btn').forEach(btn => {
      if (btn.dataset.type === this._config.appliance_type) btn.style.borderColor = '#7CFFB2';
      btn.onclick = () => { this._config.appliance_type = btn.dataset.type; this._save(); };
    });

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
      <div style="background: #333; padding: 5px 10px; border-radius: 15px; font-size: 10px;">
        ${s.split('.').pop()} <span class="del" data-i="${i}" style="color:red; cursor:pointer; margin-left:5px;">×</span>
      </div>
    `).join('');
    container.querySelectorAll('.del').forEach(d => {
      d.onclick = () => { this._config.sensors.splice(d.dataset.i, 1); this._renderTags(); this._save(); };
    });
  }

  _save() { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })); }
}
customElements.define("appliance-card-editor", ApplianceCardEditor);

// --- 2. LA CARTE ---
class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  static getStubConfig() { return { appliance_type: "washing_machine", state_sensor: "", sensors: [] }; }
  
  setConfig(config) { this.config = config; }

  set hass(hass) {
    if (!this.config || !hass) return;
    if (!this.content) {
      this.innerHTML = `
        <ha-card style="overflow: hidden; border-radius: 20px; background: #111; color: white; border: 1px solid #333;">
          <style>
            @keyframes spin { 100% { transform: rotate(360deg); } }
            @keyframes bubbles { 0% { transform: translateY(0) scale(1); opacity: 0; } 100% { transform: translateY(-30px) scale(1.2); opacity: 0; } }
            .is-spinning { animation: spin 2.5s linear infinite; }
            .bubble { position: absolute; background: rgba(124, 255, 178, 0.4); border-radius: 50%; opacity: 0; }
            .is-bubbling .bubble { animation: bubbles 2s infinite ease-out; }
          </style>
          <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div id="viz" style="position:relative; width: 60px; height: 60px; border-radius: 50%; border: 2px solid #444; display: flex; align-items: center; justify-content: center; transition: 0.5s;"></div>
              <div style="text-align: right;">
                <div id="title" style="color: #7CFFB2; font-weight: bold; text-transform: uppercase;"></div>
                <div id="stat-text" style="font-size: 10px; opacity: 0.5;"></div>
              </div>
            </div>
            <div id="grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px;"></div>
          </div>
        </ha-card>`;
      this.content = this.querySelector("#grid");
    }

    const type = this.config.appliance_type || 'washing_machine';
    
    // --- LOGIQUE D'ANIMATION ---
    const stateObj = hass.states[this.config.state_sensor];
    const rawState = stateObj ? stateObj.state.toLowerCase() : 'unknown';
    
    // On définit ici les états qui activent l'animation (ex: 'run', 'wash', 'active')
    const activeStates = ['run', 'wash', 'active', 'on', 'busy', 'working', 'delicate', 'heavy_duty'];
    const isActive = activeStates.includes(rawState);

    const viz = this.querySelector("#viz");
    viz.style.borderColor = isActive ? "#7CFFB2" : "#444";
    viz.style.boxShadow = isActive ? "0 0 15px rgba(124, 255, 178, 0.3)" : "none";
    
    if (type === 'washing_machine') {
      viz.innerHTML = `
        <span style="font-size:30px; display:block;" class="${isActive ? 'is-spinning' : ''}">🧺</span>
        <div class="${isActive ? 'is-bubbling' : ''}" style="position:absolute; bottom:5px; width:100%; height:20px;">
            <div class="bubble" style="width:6px; height:6px; left:20%; animation-delay:0s;"></div>
            <div class="bubble" style="width:4px; height:4px; left:50%; animation-delay:0.5s;"></div>
            <div class="bubble" style="width:5px; height:5px; left:80%; animation-delay:1s;"></div>
        </div>
      `;
    } else {
      viz.innerHTML = `<span style="font-size:30px;">🍽️</span>`;
    }

    this.querySelector("#title").textContent = type === 'washing_machine' ? "Lave-Linge" : "Vaisselle";
    this.querySelector("#stat-text").textContent = stateObj ? stateObj.state.toUpperCase() : "INCONNU";

    // Rendu des autres capteurs (puissance, temps restant, etc.)
    let html = "";
    (this.config.sensors || []).forEach(id => {
      const s = hass.states[id];
      if (s) {
        html += `<div style="background:#222; padding:8px; border-radius:10px; border-left:2px solid #7CFFB2;">
          <div style="font-size:9px; opacity:0.5; text-transform:uppercase;">${id.split('.').pop().replace('_', ' ')}</div>
          <div style="font-weight:bold; font-size:13px;">${s.state} ${s.attributes.unit_of_measurement || ''}</div>
        </div>`;
      }
    });
    this.content.innerHTML = html;
  }
}
customElements.define("appliance-card", ApplianceCard);

window.customCards = window.customCards || [];
window.customCards.push({ type: "appliance-card", name: "Appliance Card Pro State", preview: true });
