set hass(hass) {
    if (!this.config || !hass) return;
    if (!this.content) {
      this.innerHTML = `
        <ha-card style="overflow: hidden; border-radius: 20px; background: #111; color: white; border: 1px solid #333;">
          <style>
            /* Keyframes restent identiques */
            @keyframes spin { 100% { transform: rotate(360deg); } }
            @keyframes bubbles {
              0% { transform: translateY(0) scale(1); opacity: 0; }
              10% { opacity: 1; }
              100% { transform: translateY(-40px) scale(1.5); opacity: 0; }
            }
            @keyframes wash { 
              0%, 100% { transform: translate(0, 0) rotate(0); }
              25% { transform: translate(1px, 1px) rotate(1deg); }
              50% { transform: translate(-1px, -1px) rotate(-1deg); }
            }
            @keyframes drip {
              0% { transform: translateY(-10px); opacity: 0; }
              50% { opacity: 1; }
              100% { transform: translateY(15px); opacity: 0; }
            }

            /* Classes d'animation conditionnelles */
            .is-spinning { animation: spin 3s linear infinite; }
            .is-washing { animation: wash 0.8s infinite alternate; }
            .is-bubbling .bubble { animation: bubbles 2s infinite ease-out; }
            .is-dripping .drop { animation: drip 1s infinite linear; }
            
            .bubbling, .dripping { position: absolute; width: 40px; height: 40px; pointer-events: none; }
            .bubble { position: absolute; background: rgba(124, 255, 178, 0.4); border-radius: 50%; opacity: 0; bottom: 0; }
            .dripping { top: 5px; left: 50%; transform: translateX(-50%); }
            .drop { position: absolute; background: #7CFFB2; width: 3px; height: 6px; border-radius: 3px; opacity: 0; }
          </style>
          
          <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #222; padding-bottom:15px;">
              <div id="visual-zone" style="position: relative; width: 60px; height: 60px; background: #000; border-radius: 50%; border: 2px solid #444; display: flex; align-items: center; justify-content: center; transition: all 0.5s ease;">
              </div>
              <div style="text-align: right;">
                <div id="title" style="font-weight: bold; color: #7CFFB2; text-transform: uppercase; letter-spacing: 1px; font-size: 14px;"></div>
                <div id="status" style="font-size: 10px; opacity: 0.6; margin-top: 2px;"></div>
              </div>
            </div>
            <div id="grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;"></div>
          </div>
        </ha-card>
      `;
      this.content = this.querySelector("#grid");
    }

    const type = this.config.appliance_type || 'washing_machine';
    
    // --- LOGIQUE D'ÉTAT ---
    // On regarde le premier capteur de la liste (souvent la puissance W)
    const stateObj = hass.states[this.config.sensors[0]];
    const value = stateObj ? parseFloat(stateObj.state) : 0;
    
    // Seuil d'activation : plus de 5 Watts ou état "on" / "running"
    const isActive = value > 5 || (stateObj && ['on', 'running', 'active'].includes(stateObj.state.toLowerCase()));

    const viz = this.querySelector("#visual-zone");
    const statusTxt = this.querySelector("#status");
    
    // Mise à jour de l'apparence selon l'état
    statusTxt.textContent = isActive ? "EN FONCTIONNEMENT" : "ARRÊTÉ";
    statusTxt.style.color = isActive ? "#7CFFB2" : "inherit";
    viz.style.borderColor = isActive ? "#7CFFB2" : "#444";
    viz.style.boxShadow = isActive ? "0 0 20px rgba(124, 255, 178, 0.4)" : "none";

    // --- RENDU ANIMÉ CONDITIONNEL ---
    if (type === 'washing_machine') {
      viz.innerHTML = `
        <div style="font-size: 30px;" class="${isActive ? 'is-spinning' : ''}">🧺</div>
        <div class="bubbling ${isActive ? 'is-bubbling' : ''}" style="bottom: 10px; left: 50%; transform: translateX(-50%);">
          <div class="bubble" style="width:8px; height:8px; left:5px; animation-delay: 0s;"></div>
          <div class="bubble" style="width:5px; height:5px; left:20px; animation-delay: 0.5s;"></div>
          <div class="bubble" style="width:7px; height:7px; left:30px; animation-delay: 1.2s;"></div>
        </div>
      `;
    } else if (type === 'dishwasher') {
      viz.innerHTML = `
        <div style="font-size: 30px;" class="${isActive ? 'is-washing' : ''}">🍽️</div>
        <div class="dripping ${isActive ? 'is-dripping' : ''}">
          <div class="drop" style="left:-10px; animation-delay: 0s;"></div>
          <div class="drop" style="left:0px; animation-delay: 0.4s;"></div>
          <div class="drop" style="left:10px; animation-delay: 0.8s;"></div>
        </div>
      `;
    } else {
      viz.innerHTML = `<div style="font-size: 30px;">❄️</div>`;
    }

    this.querySelector("#title").textContent = {washing_machine:"Lave-Linge", dishwasher:"Vaisselle", fridge:"Frigo"}[type];

    // Rendu des capteurs
    let html = "";
    (this.config.sensors || []).forEach(id => {
      const s = hass.states[id];
      if (s) {
        html += `
          <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 10px; border: 1px solid #222;">
            <div style="font-size: 9px; opacity: 0.5; text-transform: uppercase;">${id.split('.').pop()}</div>
            <div style="font-weight: bold; font-size: 14px;">${s.state} ${s.attributes.unit_of_measurement || ''}</div>
          </div>`;
      }
    });
    this.content.innerHTML = html;
  }
