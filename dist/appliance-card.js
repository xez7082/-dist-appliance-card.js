class ApplianceCard extends HTMLElement {
  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }

    this.config = {
      name: "Machine",
      show_state: true,
      ...config
    };
  }

  // Normalisation des états
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
}

customElements.define("appliance-card", ApplianceCard);
