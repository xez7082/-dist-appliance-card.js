// --- ÉDITEUR ---
class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { appliance_type: 'washing_machine', sensors: [], ...config };
    this._render();
  }

  _render() {
    this.innerHTML = `
      <div style="padding: 15px; font-family: sans-serif; background: #1c1c1c; color: white; border-radius: 10px;">
        <label style="font-weight: bold; color: #7CFFB2; font-size: 11px;">TYPE D'APPAREIL</label>
        <div style="display: flex; gap: 5px; margin: 10px 0 20px;">
          <button class="type-btn" data-type="washing_machine" style="flex:1; padding:10px; cursor:pointer; background:#222; color:#888; border:1px solid #444; border-radius:5px;">LAVE</button>
          <button class="type-btn" data-type="dishwasher" style="flex:1; padding:10px; cursor:pointer; background:#222; color:#888; border:1px solid #444; border-radius:5px;">VAISSELLE</button>
          <button class="type-btn" data-type="fridge" style="flex:1; padding:10px; cursor:pointer; background:#222; color:#888; border:1px solid #444; border-radius:5px;">FRIGO</button>
        </div>
        <label style="font-weight: bold; color: #7CFFB2; font-size: 11px;">AJOUTER UN CAPTEUR (PUISSANCE EN PREMIER)</label>
        <div style="display: flex; gap: 5px; margin-top: 10px;">
          <input id="s-input" placeholder="sensor.puissance" style="flex: 1; padding: 10px; background: #000; color: #fff; border: 1px solid #444; border-radius: 5px; outline:none;">
          <button id="add-btn" style="background: #7CFFB2; border: none; padding: 0 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">OK</button>
        </div>
        <div id="tag-container" style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 5px;"></div>
      </div>
    `;

    const input = this.querySelector('#s-input');
    input.addEventListener('input', (e) => e.stopPropagation());
    input.addEventListener('keydown', (e) => e.stopPropagation());

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

// --- CARTE ---
class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement("appliance-card-editor"); }
  static getStubConfig() { return { appliance_type: "washing_machine", sensors: [] }; }
  setConfig(config) { this.config = config; }

  set hass(hass) {
    if (!this.config || !hass) return;
    if (!this.content) {
      this.innerHTML = `
        <ha-card style="overflow: hidden; border-radius: 20px; background: #111; color: white; border: 1px solid #333;">
          <style>
            @keyframes spin { 100% { transform: rotate(360deg); } }
            @keyframes bubbles { 0% { transform: translateY(0); opacity: 0; } 100% { transform: translateY(-30px); opacity: 0; } }
            @keyframes wash { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(2deg); } }
            .is-spinning { animation: spin 2s linear infinite; }
            .is-washing { animation: wash 0.5s infinite; }
          </style>
          <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div id="viz" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #444; display: flex; align-items: center; justify-content: center; transition: 0.5s;"></div>
              <div style="text-align: right;"><div id="title" style="color: #7CFFB2; font-weight: bold; font-size: 14px;"></div><div id="stat" style="font-size: 10px; opacity: 0.5;"></div></div>
            </div>
            <div id="grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px;"></div>
          </div>
        </ha-card>`;
      this.content = this.querySelector("#grid");
    }

    const type = this.config.appliance_type || 'washing_machine';
    const stateObj = hass.states[this.config.sensors[0]];
    const isActive = stateObj && (parseFloat(stateObj.state) > 5 || stateObj.state === 'on');

    const viz = this.querySelector("#viz");
    viz.style.borderColor = isActive ? "#7CFFB2" : "#444";
    viz.style.boxShadow = isActive ? "0 0 15px #7CFFB244" : "none";
    
    if (type === 'washing_machine') viz.innerHTML = `<span style="font-size:25px;" class="${isActive ? 'is-spinning' : ''}">🧺</span>`;
    else if (type === 'dishwasher') viz.innerHTML = `<span style="font-size:25px;" class="${isActive ? 'is-washing' : ''}">🍽️</span>`;
    else viz.innerHTML = `<span style="font-size:25px;">❄️</span>`;

    this.querySelector("#title").textContent = type.toUpperCase().replace('_', ' ');
    this.querySelector("#stat").textContent = isActive ? "EN COURS" : "ARRÊTÉ";

    let html = "";
    (this.config.sensors || []).forEach(id => {
      const s = hass.states[id];
      if (s) html += `<div style="background:#222; padding:8px; border-radius:8px; border-left:2px solid #7CFFB2;"><div style="font-size:9px; opacity:0.5;">${id.split('.').pop()}</div><div>${s.state}</div></div>`;
    });
    this.content.innerHTML = html;
  }
}
customElements.define("appliance-card", ApplianceCard);

window.customCards = window.customCards || [];
window.customCards.push({ type: "appliance-card", name: "Appliance Card", preview: true });
