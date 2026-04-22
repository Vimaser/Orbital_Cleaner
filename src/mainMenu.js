let menuRoot = null;
let stylesTag = null;
let currentOptions = null;
let menuButtons = [];
let selectedIndex = 0;
let keyHandlerAttached = false;

const MENU_BUTTONS = ["START", "SETTINGS", "CREDITS"];

function injectStyles() {
  if (stylesTag) return;

  stylesTag = document.createElement("style");
  stylesTag.id = "orbital-cleaner-main-menu-styles";
  stylesTag.textContent = `
    .oc-main-menu-root {
      position: fixed;
      inset: 0;
      z-index: 5000;
      overflow: hidden;
      background: radial-gradient(circle at center, rgba(4, 10, 18, 0.12) 0%, rgba(2, 6, 12, 0.24) 68%, rgba(0, 0, 0, 0.44) 100%);
      font-family: monospace;
      color: rgba(235, 245, 255, 0.96);
      user-select: none;
      pointer-events: none;
    }

    .oc-main-menu-vignette {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle at center, transparent 35%, rgba(0, 0, 0, 0.35) 72%, rgba(0, 0, 0, 0.68) 100%);
    }

    .oc-main-menu-panel {
      position: absolute;
      right: clamp(28px, 7vw, 120px);
      top: 50%;
      width: min(420px, calc(100vw - 56px));
      transform: translateY(-50%);
      padding: 28px 26px 24px;
      border: 2px solid rgba(120, 180, 220, 0.72);
      background: linear-gradient(180deg, rgba(6, 12, 20, 0.8), rgba(4, 9, 15, 0.9));
      box-shadow:
        0 0 0 1px rgba(120, 180, 220, 0.22) inset,
        0 0 20px rgba(50, 115, 168, 0.11),
        0 16px 36px rgba(0, 0, 0, 0.34);
      backdrop-filter: blur(4px);
      border-radius: 16px;
      pointer-events: auto;
    }

    .oc-main-menu-kicker {
      margin: 0 0 6px;
      font-size: 12px;
      letter-spacing: 0.42em;
      text-transform: uppercase;
      color: rgba(120, 190, 230, 0.88);
    }

    .oc-main-menu-brand-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .oc-main-menu-badge {
      width: 28px;
      height: 28px;
      object-fit: contain;
      filter: drop-shadow(0 0 7px rgba(115, 220, 255, 0.16));
      opacity: 0.9;
    }

    .oc-main-menu-logo {
      display: block;
      width: min(100%, 480px);
      max-height: 164px;
      margin: 0 auto 10px;
      object-fit: contain;
      filter:
        drop-shadow(0 0 14px rgba(115, 220, 255, 0.18))
        drop-shadow(0 0 26px rgba(68, 142, 200, 0.08));
      user-select: none;
      pointer-events: none;
    }

    .oc-main-menu-title {
      margin: 0;
      text-align: center;
      color: rgba(225, 247, 255, 0.97);
      text-shadow:
        0 0 14px rgba(115, 220, 255, 0.22),
        0 0 26px rgba(68, 142, 200, 0.12);
      font-size: clamp(34px, 5vw, 58px);
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      line-height: 0.95;
      transform: perspective(600px) rotateX(12deg);
    }

    .oc-main-menu-subtitle {
      margin: 8px 0 24px;
      text-align: center;
      font-size: 13px;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: rgba(168, 204, 220, 0.76);
    }

    .oc-main-menu-button-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .oc-main-menu-button {
      width: 100%;
      padding: 14px 16px;
      border-radius: 12px;
      border: 1px solid rgba(106, 165, 206, 0.42);
      background: linear-gradient(180deg, rgba(8, 16, 28, 0.94), rgba(6, 11, 18, 0.96));
      color: rgba(225, 242, 255, 0.94);
      font-family: monospace;
      font-size: 18px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      cursor: pointer;
      transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease, background 120ms ease;
    }

    .oc-main-menu-button:hover,
    .oc-main-menu-button.is-selected {
      transform: translateY(-1px);
      border-color: rgba(138, 222, 255, 0.86);
      background: linear-gradient(180deg, rgba(16, 32, 48, 0.97), rgba(8, 17, 27, 0.98));
      box-shadow:
        0 0 0 1px rgba(132, 215, 255, 0.25) inset,
        0 0 18px rgba(82, 180, 225, 0.16);
      color: rgba(240, 250, 255, 0.98);
    }

    .oc-main-menu-footer {
      margin-top: 18px;
      text-align: center;
      font-size: 11px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: rgba(138, 173, 192, 0.64);
    }

    .oc-main-menu-hidden {
      display: none !important;
    }

    @media (max-width: 900px) {
      .oc-main-menu-panel {
        top: auto;
        bottom: 26px;
        right: 50%;
        transform: translateX(50%);
      }
    }

    @media (max-width: 640px) {
      .oc-main-menu-panel {
        width: calc(100vw - 28px);
        bottom: 14px;
        padding: 22px 18px 18px;
      }

      .oc-main-menu-title {
        font-size: clamp(28px, 10vw, 42px);
      }

      .oc-main-menu-logo {
        max-height: 108px;
        margin-bottom: 8px;
      }

      .oc-main-menu-badge {
        width: 24px;
        height: 24px;
      }

      .oc-main-menu-subtitle {
        font-size: 11px;
        letter-spacing: 0.16em;
      }

      .oc-main-menu-button {
        font-size: 16px;
        padding: 13px 14px;
      }
    }
  `;

  document.head.appendChild(stylesTag);
}

function updateSelectedButton(nextIndex) {
  if (!menuButtons.length) return;

  selectedIndex = (nextIndex + menuButtons.length) % menuButtons.length;

  menuButtons.forEach((button, index) => {
    const isSelected = index === selectedIndex;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-selected", isSelected ? "true" : "false");
  });
}

function triggerSelectedButton(index = selectedIndex) {
  const label = MENU_BUTTONS[index];
  if (!label) return;

  if (label === "START" && typeof currentOptions?.onStart === "function") {
    currentOptions.onStart();
    return;
  }

  if (label === "SETTINGS" && typeof currentOptions?.onSettings === "function") {
    currentOptions.onSettings();
    return;
  }

  if (label === "CREDITS" && typeof currentOptions?.onCredits === "function") {
    currentOptions.onCredits();
  }
}

function handleKeyDown(event) {
  if (!menuRoot || menuRoot.classList.contains("oc-main-menu-hidden")) return;

  if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
    event.preventDefault();
    updateSelectedButton(selectedIndex - 1);
    return;
  }

  if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
    event.preventDefault();
    updateSelectedButton(selectedIndex + 1);
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    triggerSelectedButton();
  }
}

function attachKeyHandler() {
  if (keyHandlerAttached) return;
  window.addEventListener("keydown", handleKeyDown);
  keyHandlerAttached = true;
}

function detachKeyHandler() {
  if (!keyHandlerAttached) return;
  window.removeEventListener("keydown", handleKeyDown);
  keyHandlerAttached = false;
}

function startAnimationLoop() {}

function stopAnimationLoop() {}

export function createMainMenu(options = {}) {
  currentOptions = options;

  if (menuRoot) {
    updateSelectedButton(0);
    return menuRoot;
  }

  injectStyles();

  menuRoot = document.createElement("div");
  menuRoot.className = "oc-main-menu-root oc-main-menu-hidden";
  menuRoot.setAttribute("role", "dialog");
  menuRoot.setAttribute("aria-label", "Orbital Cleaner main menu");

  const panel = document.createElement("div");
  panel.className = "oc-main-menu-panel";

  const kicker = document.createElement("p");
  kicker.className = "oc-main-menu-kicker";
  kicker.textContent = options.kickerText || "Low Orbit Sanitation Division";

  const brandRow = document.createElement("div");
  brandRow.className = "oc-main-menu-brand-row";

  let badge = null;
  if (options.badgeSrc) {
    badge = document.createElement("img");
    badge.className = "oc-main-menu-badge";
    badge.src = options.badgeSrc;
    badge.alt = options.badgeAlt || "Orbital Cleaner badge";
    brandRow.appendChild(badge);
  }

  let logo = null;
  if (options.logoSrc) {
    logo = document.createElement("img");
    logo.className = "oc-main-menu-logo";
    logo.src = options.logoSrc;
    logo.alt = options.logoAlt || "Orbital Cleaner";
  }

  const title = document.createElement("h1");
  title.className = "oc-main-menu-title";
  title.textContent = options.titleText || "Orbital Cleaner";

  const subtitle = document.createElement("p");
  subtitle.className = "oc-main-menu-subtitle";
  subtitle.textContent = options.subtitleText || "Return to shift and restore low orbit";

  const buttonList = document.createElement("div");
  buttonList.className = "oc-main-menu-button-list";

  menuButtons = MENU_BUTTONS.map((label, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "oc-main-menu-button";
    button.textContent = label;
    button.setAttribute("role", "menuitem");

    button.addEventListener("mouseenter", () => {
      updateSelectedButton(index);
    });

    button.addEventListener("click", () => {
      updateSelectedButton(index);
      triggerSelectedButton(index);
    });

    buttonList.appendChild(button);
    return button;
  });

  const footer = document.createElement("div");
  footer.className = "oc-main-menu-footer";
  footer.textContent = options.footerText || "Navigate: Arrows / W S   Select: Enter";

  panel.appendChild(kicker);

  if (badge) {
    panel.appendChild(brandRow);
  }

  if (logo) {
    panel.appendChild(logo);
  } else {
    panel.appendChild(title);
  }

  panel.appendChild(subtitle);
  panel.appendChild(buttonList);
  panel.appendChild(footer);

  const vignette = document.createElement("div");
  vignette.className = "oc-main-menu-vignette";

  menuRoot.appendChild(panel);
  menuRoot.appendChild(vignette);

  document.body.appendChild(menuRoot);

  updateSelectedButton(0);
  return menuRoot;
}

export function showMainMenu(options = {}) {
  if (!menuRoot) {
    createMainMenu(options);
  } else if (Object.keys(options).length > 0) {
    currentOptions = { ...currentOptions, ...options };
  }

  if (!menuRoot) return;

  menuRoot.classList.remove("oc-main-menu-hidden");
  attachKeyHandler();
  updateSelectedButton(selectedIndex);
  startAnimationLoop();
}

export function hideMainMenu() {
  if (!menuRoot) return;
  menuRoot.classList.add("oc-main-menu-hidden");
  detachKeyHandler();
  stopAnimationLoop();
}

export function destroyMainMenu() {
  hideMainMenu();

  if (menuRoot?.parentNode) {
    menuRoot.parentNode.removeChild(menuRoot);
  }

  menuRoot = null;
  menuButtons = [];
  currentOptions = null;
  selectedIndex = 0;
}

export function isMainMenuVisible() {
  return !!menuRoot && !menuRoot.classList.contains("oc-main-menu-hidden");
}