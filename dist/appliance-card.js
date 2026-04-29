class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._rendered = false; // forcer le re-render si la config change
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    // Ne pas re-render si déjà rendu, ou si un input est en cours d'édition
    if (!this._config || this._rendered || this._blockRender) return;
    this._rendered = true;

    const type = this._config.appliance_type || 'washing_machine';

    this.innerHTML = `
      <div style="padding: 10px; font-family: sans-serif; background: #1c1c1c; color: white;">
        <label style="font-weight: bold; color: #7CFFB2; font-size: 11px;">TYPE D'APPAREIL</label>
        <div style="display: flex; gap: 5px; margin: 10px 0;">
          <button class="type-btn" data-type="washing_machine" style="flex:1; padding:8px; cursor:pointer; background:${type === 'washing_machine' ? '#7CFFB2' : '#444'}; color:${type === 'washing_machine' ? '#000' : '#fff'}; border:none; border-radius:4px;">LINGE</button>
          <button class="type-btn" data-type="dishwasher"      style="flex:1; padding:8px; cursor:pointer; background:${type === 'dishwasher'      ? '#7CFFB2' : '#444'}; color:${type === 'dishwasher'      ? '#000' : '#fff'}; border:none; border-radius:4px;">VAISSELLE</button>
          <button class="type-btn" data-type="fridge"          style="flex:1; padding:8px; cursor:pointer; background:${type === 'fridge'          ? '#7CFFB2' : '#444'}; color:${type === 'fridge'          ? '#000' : '#fff'}; border:none; border-radius:4px;">FRIGO</button>
        </div>

        <label style="font-weight: bold; color: #7CFFB2; font-size: 11px;">ENTITÉ D'ÉTAT</label>
        <input id="main-ent" type="text"
               style="width:100%; padding:10px; margin:8px 0; background:#000; color:#fff; border:1px solid #444; box-sizing:border-box;"
               value="${(this._config.entities && this._config.entities[type]) || ''}">

        <label style="font-weight: bold; color: #7CFFB2; font-size: 11px;">AJOUTER UN CAPTEUR</label>
        <div style="display: flex; gap: 5px; margin-top:8px;">
          <input id="new-sensor" type="text"
                 style="flex: 1; padding: 10px; background:#000; color:#fff; border:1px solid #444;"
                 placeholder="sensor.puissance">
          <button id="add-btn" style="padding: 0 15px; background: #7CFFB2; border: none; font-weight: bold; cursor:pointer;">+</button>
        </div>

        <div id="sensor-list" style="margin-top: 15px; display: flex; flex-direction: column; gap: 8px;">
          ${((this._config.sensors && this._config.sensors[type]) || []).map((s, i) => `
            <div style="background: #333; padding: 8px; border-radius: 4px; border: 1px solid #444;">
              <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span style="font-size: 10px; color:#aaa;">${s.entity}</span>
                <button class="remove-btn" data-index="${i}"
                        style="background:none; color:#ff5252; border:none; cursor:pointer; font-weight:bold;">
                  Supprimer
                </button>
              </div>
              <input class="name-edit" data-index="${i}" type="text"
                     style="width:100%; background:#222; color:#fff; border:1px solid #555; padding:5px; font-size:11px; box-sizing:border-box;"
                     value="${s.name || ''}" placeholder="Titre personnalisé (ex: Consommation)">
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Bloquer le re-render tant qu'un input est focalisé
    this.querySelectorAll('input').forEach(input => {
      input.addEventListener('focus', () => { this._blockRender = true; });
      input.addEventListener('blur',  () => { this._blockRender = false; });
      input.addEventListener('keydown', (e) => e.stopPropagation());
    });

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
      const val = input.value.trim();
      if (val) {
        const allSensors = { ...(this._config.sensors || {}) };
        allSensors[type] = [...(allSensors[type] || []), { entity: val, name: '' }];
        this._updateConfig({ sensors: allSensors });
        input.value = '';
      }
    };

    this.querySelectorAll('.name-edit').forEach(input => {
      input.onchange = (ev) => {
        const idx = parseInt(ev.target.dataset.index);
        const allSensors = JSON.parse(JSON.stringify(this._config.sensors || {}));
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
    this._rendered = false; // autoriser le prochain re-render
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }
}
customElements.define('appliance-card-editor', ApplianceCardEditor);

// ---------------------------------------------------------------------------

class ApplianceCard extends HTMLElement {
  static getConfigElement() { return document.createElement('appliance-card-editor'); }

  setConfig(config) {
    this._config = config;
    // Si le type de config change, mettre à jour le type actif
    this._type = config.appliance_type || 'washing_machine';
    if (this._hass) this._update();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._type) this._type = this._config.appliance_type || 'washing_machine';
    this._update();
  }

  _update() {
    const type    = this._type;
    const mainEnt = (this._config.entities || {})[type];
    const stateObj = this._hass.states[mainEnt];
    const rawState = stateObj ? stateObj.state.toLowerCase() : 'off';

    const stateMap = {
      wash: 'lavage', rinse: 'rincage', spin: 'essorage',
      finish: 'findecycle', off: 'enveille', none: 'enveille',
    };
    const imgName = stateMap[rawState] || rawState.replace(/^ai_/, '');
    const imgUrl  = `https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/${imgName}.png`;
    const color   = { lavage: '#2980b9', rincage: '#1abc9c', findecycle: '#2ecc71' }[imgName] || '#7CFFB2';

    // Créer le DOM une seule fois
    if (!this._base) {
      this.innerHTML = `
        <ha-card style="padding: 15px; background: #111; color: white; border-radius: 15px; border: 1px solid #333;">
          <div style="display: flex; gap: 5px; margin-bottom: 15px;">
            <button id="card-btn-washing_machine" data-type="washing_machine"
                    style="flex:1; padding:6px; font-size:10px; border-radius:4px; border:none; cursor:pointer; font-weight:bold;">
              LINGE
            </button>
            <button id="card-btn-dishwasher" data-type="dishwasher"
                    style="flex:1; padding:6px; font-size:10px; border-radius:4px; border:none; cursor:pointer; font-weight:bold;">
              VAISSELLE
            </button>
            <button id="card-btn-fridge" data-type="fridge"
                    style="flex:1; padding:6px; font-size:10px; border-radius:4px; border:none; cursor:pointer; font-weight:bold;">
              FRIGO
            </button>
          </div>
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="flex: 1.2; text-align: center;">
              <img id="main-img" style="width: 100%; height: 140px; object-fit: contain;">
              <div id="state-text" style="font-weight: bold; margin-top: 8px; font-size: 12px; text-transform: uppercase;"></div>
            </div>
            <div id="sensor-container" style="flex: 1; display: flex; flex-direction: column; gap: 8px;"></div>
          </div>
        </ha-card>`;

      this._base = this.querySelector('ha-card');

      this.querySelectorAll('[data-type]').forEach(btn => {
        btn.onclick = () => this._switch(btn.dataset.type);
      });
    }

    // Mettre en évidence le bouton actif
    this.querySelectorAll('[data-type]').forEach(btn => {
      const active = btn.dataset.type === type;
      btn.style.background = active ? '#7CFFB2' : '#444';
      btn.style.color      = active ? '#000'    : '#fff';
    });

    // Image principale
    const img = this.querySelector('#main-img');
    img.src     = imgUrl;
    img.onerror = () => { img.src = 'https://cdn.statically.io/gh/xez7082/-dist-appliance-card.js/main/img/enveille.png'; };

    // Texte d'état
    const stateText = this.querySelector('#state-text');
    stateText.textContent = stateObj ? stateObj.state : 'OFF';
    stateText.style.color = color;

    // Capteurs
    const container = this.querySelector('#sensor-container');
    container.innerHTML = '';
    const sensors = (this._config.sensors && this._config.sensors[type]) || [];

    sensors.forEach(s => {
      const state = this._hass.states[s.entity];
      if (!state) return;
      const div   = document.createElement('div');
      div.style.cssText = `background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; border-left: 3px solid ${color};`;
      const title = s.name || s.entity.split('.').pop().replace(/_/g, ' ');
      div.innerHTML = `
        <div style="font-size: 8px; opacity: 0.6; text-transform: uppercase;">${title}</div>
        <div style="font-size: 11px; font-weight: bold;">
          ${state.state} ${state.attributes.unit_of_measurement || ''}
        </div>`;
      container.appendChild(div);
    });
  }

  // Changement de vue interne — pas de config-changed pour ne pas déclencher une sauvegarde HA
  _switch(type) {
    this._type = type;
    this._update();
  }
}
customElements.define('appliance-card', ApplianceCard);
