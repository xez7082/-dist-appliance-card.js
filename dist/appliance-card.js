class ApplianceCard extends HTMLElement {
  setConfig(config) {
    if (!config.entity) {
      throw new Error("Entity is required");
    }

    this.config = {
      name: "Appliance",
      show_state: true,
      ...config
    };
  }

  normalizeState(state) {
    const map = {
      on: "washing",
      off: "idle",
      running: "washing",
      paused: "pause",
      complete: "done"
    };
    return map[state] || state;
  }

  set hass(hass) {
    const entity = hass.states[this.config.entity];
    if (!entity) return;

    let state = this.normalizeState(entity.state);

    const defaultImages = {
      idle: "/local/washing_machine/idle.png",
      filling: "/local/washing_machine/filling.png",
      washing: "/local/washing_machine/washing.png",
      rinsing: "/local/washing_machine/rinsing.png",
      spinning: "/local/washing_machine/spinning.gif",
      done: "/local/washing_machine/done.png",
      pause: "/local/washing_machine/pause.png",
      error: "/local/washing_machine/error.png"
    };

    const images = {
      ...defaultImages,
      ...(this.config.images || {})
    };

    const image = images[state] || images.idle;

    const colors = {
      idle: "#888",
      filling: "#3498db",
      washing: "#2980b9",
      rinsing: "#1abc9c",
      spinning: "#9b59b6",
      done: "#2ecc71",
      pause: "#f39c12",
      error: "#e74c3c"
    };

    const color = colors[state] || "#666";
    const glow = state === "done" || state === "error";

    this.innerHTML = `
      <ha-card style="
        border-radius:16px;
        overflow:hidden;
        text-align:center;
        box-shadow: ${glow ? `0 0 15px ${color}` : "none"};
        transition: all 0.3s ease;
      ">
        <div style="padding:10px;">
          <h3 style="margin:0;">${this.config.name}</h3>
        </div>

        <img src="${image}" style="
          width:100%;
          max-height:220px;
          object-fit:contain;
        ">

        ${
          this.config.show_state
            ? `<div style="
                padding:10px;
                font-weight:bold;
                color:${color};
                text-transform:capitalize;
              ">
                ${state}
              </div>`
            : ""
        }
      </ha-card>
    `;
  }

  getCardSize() {
    return 3;
  }

  // 🔥 ACTIVE L'ÉDITEUR VISUEL
  static getConfigElement() {
    return document.createElement("appliance-card-editor");
  }
}

customElements.define("appliance-card", ApplianceCard);





// ==========================
// 🎛️ ÉDITEUR VISUEL
// ==========================

class ApplianceCardEditor extends HTMLElement {
  setConfig(config) {
    this.config = config;

    this.innerHTML = `
      <div style="padding:16px;">
        <h3>Appliance Card</h3>

        <label>Entity</label><br>
        <input id="entity" style="width:100%;" value="${config.entity || ""}"><br><br>

        <label>Name</label><br>
        <input id="name" style="width:100%;" value="${config.name || ""}"><br><br>

        <label>Show state</label>
        <input type="checkbox" id="show_state" ${
          config.show_state !== false ? "checked" : ""
        }><br><br>
      </div>
    `;

    this.querySelector("#entity").addEventListener("change", (e) => {
      this.config.entity = e.target.value;
      this._update();
    });

    this.querySelector("#name").addEventListener("change", (e) => {
      this.config.name = e.target.value;
      this._update();
    });

    this.querySelector("#show_state").addEventListener("change", (e) => {
      this.config.show_state = e.target.checked;
      this._update();
    });
  }

  _update() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this.config }
      })
    );
  }
}

customElements.define("appliance-card-editor", ApplianceCardEditor);
