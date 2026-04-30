class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._rendered = false;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._config || this._rendered || this._blockRender) return;
    this._rendered = true;

    const type = this._config.appliance_type || 'washing_machine';

    this.innerHTML = `
      <div style="padding: 10px; font-family: sans-serif; background: #1c1c1c; color: white;">
        <label style="font-weight: bold; color: #7CFFB2; font-size: 11px;">TYPE D'APPAREIL</label>
        <div style="display: flex; gap: 5px; margin: 10px 0;">
          <button class="type-btn" data-type="washing_machine" style="flex:1; padding:8px; cursor:pointer; background:${type === 'washing_machine' ? '#7CFFB2' : '#444'}; color:${type === 'washing_machine' ? '#000' : '#fff'}; border:none; border-radius:4px;">LINGE</button>
          <button class="type-btn" data-type="dishwasher" style="flex:1; padding:8px; cursor:pointer; background:${type === 'dishwasher' ? '#7CFFB2' : '#444'}; color:${type === 'dishwasher' ? '#000' : '#fff'}; border:none; border-radius:4px;">VAISSELLE</button>
          <button class="type-btn" data-type="fridge" style="flex:1; padding:8px; cursor:pointer; background:${type === 'fridge' ? '#7CFFB2' : '#444'}; color:${type === 'fridge' ? '#000' : '#fff'}; border:none; border-radius:4px;">FRIGO</button>
        </div>

        <label style="font-weight: bold; color: #7CFFB2; font-size: 11px;">ENTITÉ PRINCIPALE</label>
        <input id="main-ent" type="text"
               style="width:100%; padding:10px; margin:8px 0; background:#000; color:#fff; border:1px solid #444; box-sizing:border-box;"
               value="${(this._config.entities && this._config.entities[type]) || ''}">

        <label style="font-weight: bold; color: #7CFFB2; font-size: 11px;">AJOUTER UN CAPTEUR</label>
        <div style="display: flex; gap: 5px; margin-top:8px;">
          <input id="new-sensor" type="text"
                 style="flex: 1; padding: 10px; background:#000; color:#fff; border:1px solid #444;"
                 placeholder="Ex: sensor.energie">
          <button id="add-btn" style="padding: 0 15px; background: #7CFFB2; border: none; font-weight: bold; cursor:pointer;">+</button>
        </div>

        <div id="sensor-list" style="margin-top: 15px; display: flex; flex-direction: column; gap: 8px;">
          ${((this._config.sensors && this._config.sensors[type]) || []).map((s, i) => `
            <div style="background: #333; padding: 8px; border-radius: 4px; border: 1px solid #444;">
              <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span style="font-size: 10px; color:#aaa;">${s.entity}</span>
                <button class="remove-btn" data-index="${i}"
                        style="background:none; color:#ff5252; border:none; cursor:pointer; font-weight:bold;">Supprimer</button>
              </div>
              <input class="name-edit" data-index="${i}" type="text"
                     style="width:100%; background:#222; color:#fff; border:1px solid #555; padding:5px; font-size:11px; box-sizing:border-box;"
                     value="${s.name || ''}" placeholder="Label">
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.querySelectorAll('.type-btn').forEach(btn => {
      btn.onclick = () => this._updateConfig({ appliance_type: btn.dataset.type });
    });

    this.querySelector('#main-ent').onchange = (ev) => {
      const entities = { ...(this._config.entities || {}) };
      entities[type] = ev.target.value;
      this._updateConfig({ entities });
    };

    this.querySelector('#add-btn').onclick = () => {
      const input = this.querySelector('#new-sensor');
      if (input.value.trim()) {
        const allSensors = { ...(this._config.sensors || {}) };
        allSensors[type] = [...(allSensors[type] || []), { entity: input.value.trim(), name: '' }];
        this._updateConfig({ sensors: allSensors });
        input.value = '';
      }
    };

    this.querySelectorAll('.name-edit').forEach(input => {
      input.onblur = (ev) => {
        const idx = parseInt(ev.target.dataset.index);
        const allSensors = JSON.parse(JSON.stringify(this._config.sensors || {}));
        if(!allSensors[type]) allSensors[type] = [];
        allSensors[type][idx].name = ev.target.value;
        this._updateConfig({ sensors: allSensors });
      };
    });

    this.querySelectorAll('.remove-btn').forEach(btn => {
      btn.onclick = () => {
        const index = parseInt(btn.dataset.index);
        const allSensors = JSON.parse(JSON.stringify(this._config.sensors || {}));
        allSensors[type].splice(index, 1);
        this._updateConfig({ sensors: allSensors });
      };
    });
  }

  _updateConfig(newValues) {
    this._config = { ...this._config, ...newValues };
    this._rendered = false;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}
customElements.define('appliance-card-editor', ApplianceCardEditor);

// ---------------------------------------------------------------------------

class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement('appliance-card-editor'); }

  setConfig(config) {
    this._config = config;
    this._type = config.appliance_type || 'washing_machine';
    if (this._hass) this._update();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._type) this._type = this._config.appliance_type || 'washing_machine';
    this._update();
  }

  _update() {
    if (!this._hass || !this._config) return;

    const type = this._type;
    const entities = this._config.entities || {};
    const mainEnt = entities[type];
    const stateObj = this._hass.states[mainEnt];
    
    // Normalisation de l'état (Source 1 : Home Connect)[cite: 1]
    const rawState = stateObj ? stateObj.state.toLowerCase().trim() : 'unavailable';

    let imgName = 'inactif';
    let color = '#7CFFB2'; 

    if (type === 'dishwasher') {
      if (['run', 'running', 'on', 'active', 'washing'].includes(rawState)) {
        imgName = 'enmarche';
        color = '#2ecc71';
      } else if (['finished', 'completed', 'terminé'].includes(rawState)) {
        imgName = 'terminer';
        color = '#2ecc71';
      } else if (['ready', 'prêt'].includes(rawState)) {
        imgName = 'pret';
        color = '#2ecc71';
      } else {
        imgName = 'inactif';
      }
    } else if (type === 'fridge') {
      const isOpen = ['on', 'open', 'ouvert', 'true'].includes(rawState);
      imgName = isOpen ? 'porteouverte' : 'portefermee';
      color = isOpen ? '#ff5252' : '#2ecc71';
    } else {
      const washingMap = { 'run': 'lavage', 'wash': 'lavage', 'finished': 'findecycle' };
      imgName = washingMap[rawState] || 'enveille';
      color = (imgName === 'findecycle') ? '#2ecc71' : '#7CFFB2';
    }

    const imgUrl = `https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/${imgName}.png?v=${Date.now()}`;

    if (!this._base) {
      this.innerHTML = `
        <ha-card style="padding: 15px; background: #111; color: white; border-radius: 15px; border: 1px solid #333;">
          <div style="display: flex; gap: 5px; margin-bottom: 20px;">
            <button class="nav-btn" data-type="washing_machine">LINGE</button>
            <button class="nav-btn" data-type="dishwasher">VAISSELLE</button>
            <button class="nav-btn" data-type="fridge">FRIGO</button>
          </div>
          <div style="display: flex; align-items: center; gap: 20px;">
            <!-- PARTIE IMAGE AGRANDIE (Flex 2) -->
            <div style="flex: 2; text-align: center;">
              <img id="main-img" style="width: 100%; height: 220px; object-fit: contain;">
              <div id="state-text" style="font-weight: bold; margin-top: 10px; font-size: 14px; text-transform: uppercase;"></div>
            </div>
            <!-- PARTIE CAPTEURS (Flex 1) -->
            <div id="sensor-container" style="flex: 1; display: flex; flex-direction: column; gap: 10px;"></div>
          </div>
          <style>
            .nav-btn { flex:1; padding:8px; font-size:11px; border-radius:6px; border:none; cursor:pointer; font-weight:bold; }
          </style>
        </ha-card>`;
      this._base = this.querySelector('ha-card');
      this.querySelectorAll('.nav-btn').forEach(btn => {
        btn.onclick = () => this._switch(btn.dataset.type);
      });
    }

    this.querySelectorAll('.nav-btn').forEach(btn => {
      const active = btn.dataset.type === type;
      btn.style.background = active ? '#7CFFB2' : '#444';
      btn.style.color = active ? '#000' : '#fff';
    });

    const img = this.querySelector('#main-img');
    img.src = imgUrl;
    img.onerror = () => { img.src = 'https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/inactif.png'; };

    const stateText = this.querySelector('#state-text');
    stateText.textContent = stateObj ? stateObj.state : 'OFFLINE';
    stateText.style.color = color;

    const container = this.querySelector('#sensor-container');
    container.innerHTML = '';
    const sensors = (this._config.sensors && this._config.sensors[type]) || [];

    sensors.forEach(s => {
      const state = this._hass.states[s.entity];
      if (!state) return;
      const div = document.createElement('div');
      div.style.cssText = `background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border-left: 4px solid ${color};`;
      div.innerHTML = `
        <div style="font-size: 9px; opacity: 0.6; text-transform: uppercase;">${s.name || s.entity.split('.').pop()}</div>
        <div style="font-size: 12px; font-weight: bold;">${state.state.toUpperCase()} ${state.attributes.unit_of_measurement || ''}</div>
      `;
      container.appendChild(div);
    });
  }

  _switch(type) {
    this._type = type;
    this._update();
  }
}
customElements.define('appliance-card', ApplianceCard);
