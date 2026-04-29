class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    if (!this._config.sensors) this._config.sensors = [];
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.render();
    }
  }

  render() {
    if (!this._config) return;

    this.shadowRoot.innerHTML = `
      <style>
        .container { font-family: sans-serif; color: white; padding: 15px; background: #1c1c1c; border-radius: 12px; }
        .label { font-weight: bold; color: #7CFFB2; margin: 15px 0 8px; text-transform: uppercase; font-size: 11px; }
        
        .type-selector { display: flex; gap: 8px; margin-bottom: 20px; }
        .btn-type { 
          flex: 1; padding: 12px 5px; cursor: pointer; border: 1px solid #444; 
          background: #222; color: #888; border-radius: 8px; text-align: center;
          font-size: 10px; font-weight: bold;
        }
        .btn-type.active { border-color: #7CFFB2; color: #7CFFB2; background: rgba(124,255,178,0.1); }

        .input-row { display: flex; gap: 8px; }
        input { flex: 1; padding: 12px; background: #000; color: white; border: 1px solid #444; border-radius: 8px; }
        .add-btn { background: #7CFFB2; color: #111; border: none; padding: 0 15px; border-radius: 8px; cursor: pointer; }

        .sensor-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }
        .sensor-tag { background: #333; padding: 6px 12px; border-radius: 20px; font-size: 11px; display: flex; gap: 8px; }
        .delete-btn { color: #ff5252; cursor: pointer; font-size: 16px; }
      </style>

      <div class="container">
        <div class="label">Type d'appareil</div>
        <div class="type-selector">
          <div class="btn-type ${this._config.appliance_type === 'washing_machine' ? 'active' : ''}" id="wash">LAVE-LINGE</div>
          <div class="btn-type ${this._config.appliance_type === 'dishwasher' ? 'active' : ''}" id="dish">VAISSELLE</div>
          <div class="btn-type ${this._config.appliance_type === 'fridge' ? 'active' : ''}" id="fridge">FRIGO</div>
        </div>

        <div class="label">Ajouter une entité</div>
        <div class="input-row">
          <input id="input" placeholder="sensor.xxx">
          <button class="add-btn" id="add">OK</button>
        </div>

        <div class="sensor-list">
          ${this._config.sensors.map((s,i)=>`
            <div class="sensor-tag">
              ${s}
              <span class="delete-btn" data-i="${i}">×</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const input = this.shadowRoot.getElementById("input");

    // bloque fermeture editor
    input.addEventListener("mousedown", e => e.stopPropagation());

    this.shadowRoot.getElementById("wash").onclick = () => this._setType("washing_machine");
    this.shadowRoot.getElementById("dish").onclick = () => this._setType("dishwasher");
    this.shadowRoot.getElementById("fridge").onclick = () => this._setType("fridge");

    this.shadowRoot.getElementById("add").onclick = (e) => {
      e.stopPropagation();
      const val = input.value.trim();
      if (val && val.includes(".")) {
        this._config.sensors.push(val);
        input.value = "";
        this._save();
      }
    };

    this.shadowRoot.querySelectorAll(".delete-btn").forEach(btn=>{
      btn.onclick = (e)=>{
        e.stopPropagation();
        const i = parseInt(btn.dataset.i);
        this._config.sensors.splice(i,1);
        this._save();
      };
    });
  }

  _setType(t){
    this._config.appliance_type = t;
    this._save();
  }

  _save(){
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
    this.render();
  }
}

customElements.define("appliance-card-editor", ApplianceCardEditor);


// ------------------ CARD ------------------

class ApplianceCard extends HTMLElement {

  static getConfigElement(){
    return document.createElement("appliance-card-editor");
  }

  static getStubConfig(){
    return { appliance_type: "washing_machine", sensors: [] };
  }

  setConfig(config){
    this.config = config;
  }

  set hass(hass){
    if(!this.config || !hass) return;

    if(!this.content){
      this.innerHTML = `
        <ha-card style="background:#111;border-radius:20px;padding:20px;color:white;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <div id="icon" style="font-size:32px;color:#7CFFB2;"></div>
            <div id="viz"></div>
          </div>
          <div id="grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"></div>
        </ha-card>
      `;
      this.content = this.querySelector("#grid");
    }

    const icons = {
      washing_machine:"🧺",
      dishwasher:"🍽️",
      fridge:"❄️"
    };

    const type = this.config.appliance_type || "washing_machine";
    this.querySelector("#icon").textContent = icons[type];

    const s0 = this.config.sensors?.[0];
    const v = s0 ? parseFloat(hass.states[s0]?.state) || 0 : 0;
    const level = 100 - (v % 101);

    this.querySelector("#viz").innerHTML = `
      <svg viewBox="0 0 100 100" style="width:60px;height:60px;border-radius:50%;border:2px solid #7CFFB2;">
        <path d="M0,${level} C25,${level-5} 75,${level+5} 100,${level} L100,100 L0,100 Z" fill="#7CFFB2" opacity="0.4"/>
      </svg>
    `;

    let html="";
    this.config.sensors.forEach(id=>{
      const s = hass.states[id];
      if(s){
        html += `
          <div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:10px;">
            <div style="font-size:10px;opacity:0.6;">${s.attributes.friendly_name || id}</div>
            <div style="font-weight:bold;">${s.state} ${s.attributes.unit_of_measurement || ""}</div>
          </div>
        `;
      }
    });

    this.content.innerHTML = html;
  }
}

customElements.define("appliance-card", ApplianceCard);


// ------------------ REGISTER ------------------

window.customCards = window.customCards || [];
window.customCards.push({
  type: "appliance-card",
  name: "Appliance Card",
  description: "Carte appareil personnalisée",
  preview: true
});

console.log("appliance-card loaded");
