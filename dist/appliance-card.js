// ------------------ EDITOR ------------------

class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    if (!config) throw new Error("Invalid config");
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
        .btn-type { flex: 1; padding: 10px; cursor: pointer; border: 1px solid #444; background: #222; color: #888; border-radius: 8px; text-align: center; font-size: 10px; }
        .btn-type.active { border-color: #7CFFB2; color: #7CFFB2; }

        .input-row { display: flex; gap: 8px; }
        input { flex: 1; padding: 10px; background: #000; color: white; border: 1px solid #444; border-radius: 8px; }
        button { background: #7CFFB2; border: none; padding: 0 12px; border-radius: 8px; cursor: pointer; }

        .sensor-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .tag { background: #333; padding: 5px 10px; border-radius: 15px; font-size: 11px; }
        .del { color: red; margin-left: 6px; cursor: pointer; }
      </style>

      <div class="container">
        <div class="label">Type</div>
        <div class="type-selector">
          <div class="btn-type ${this._config.appliance_type==='washing_machine'?'active':''}" id="wash">LAVE</div>
          <div class="btn-type ${this._config.appliance_type==='dishwasher'?'active':''}" id="dish">VAISSELLE</div>
          <div class="btn-type ${this._config.appliance_type==='fridge'?'active':''}" id="fridge">FRIGO</div>
        </div>

        <div class="label">Capteurs</div>
        <div class="input-row">
          <input id="input" placeholder="sensor.xxx">
          <button id="add">+</button>
        </div>

        <div class="sensor-list">
          ${this._config.sensors.map((s,i)=>`
            <div class="tag">${s}<span class="del" data-i="${i}">×</span></div>
          `).join('')}
        </div>
      </div>
    `;

    const input = this.shadowRoot.getElementById("input");
    input.addEventListener("mousedown", e => e.stopPropagation());

    this.shadowRoot.getElementById("wash").onclick = ()=>this._setType("washing_machine");
    this.shadowRoot.getElementById("dish").onclick = ()=>this._setType("dishwasher");
    this.shadowRoot.getElementById("fridge").onclick = ()=>this._setType("fridge");

    this.shadowRoot.getElementById("add").onclick = (e)=>{
      e.stopPropagation();
      const v = input.value.trim();
      if(v && v.includes(".")){
        this._config.sensors.push(v);
        input.value="";
        this._save();
      }
    };

    this.shadowRoot.querySelectorAll(".del").forEach(b=>{
      b.onclick = (e)=>{
        e.stopPropagation();
        this._config.sensors.splice(parseInt(b.dataset.i),1);
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
      detail:{config:this._config},
      bubbles:true,
      composed:true
    }));
    this.render();
  }
}

// ⚠️ IMPORTANT : définir AVANT la carte
customElements.define("appliance-card-editor", ApplianceCardEditor);


// ------------------ CARD ------------------

class ApplianceCard extends HTMLElement {

  static async getConfigElement() {
    await customElements.whenDefined("appliance-card-editor");
    return document.createElement("appliance-card-editor");
  }

  static getStubConfig() {
    return {
      appliance_type: "washing_machine",
      sensors: []
    };
  }

  setConfig(config){
    this.config = config;
  }

  set hass(hass){
    if(!this.config || !hass) return;

    if(!this.content){
      this.innerHTML = `
        <ha-card style="padding:16px;">
          <div id="icon" style="font-size:30px;"></div>
          <div id="grid"></div>
        </ha-card>
      `;
      this.content = this.querySelector("#grid");
    }

    const icons = {
      washing_machine:"🧺",
      dishwasher:"🍽️",
      fridge:"❄️"
    };

    this.querySelector("#icon").textContent = icons[this.config.appliance_type];

    let html="";
    this.config.sensors.forEach(id=>{
      const s = hass.states[id];
      if(s){
        html += `<div>${s.attributes.friendly_name || id}: ${s.state}</div>`;
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
  description: "Carte appareil avec éditeur visuel",
  preview: true
});

console.log("appliance-card loaded");
