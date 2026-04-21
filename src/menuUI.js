let menuRoot = null;
let menuPanel = null;
let menuTitle = null;
let radioStatusLine = null;
let hintLine = null;
let stateLine = null;

const menuState = {
  visible: false,
  radioEnabled: true,
  currentRadioTrack: "coolSolarWinds",
  currentSpaceTrack: "deepSpace",
};

function ensureMenu() {
  if (menuRoot && menuPanel && menuTitle && radioStatusLine && hintLine && stateLine) {
    return {
      menuRoot,
      menuPanel,
      menuTitle,
      radioStatusLine,
      hintLine,
      stateLine,
    };
  }

  menuRoot = document.createElement("div");
  menuRoot.style.position = "fixed";
  menuRoot.style.right = "18px";
  menuRoot.style.top = "18px";
  menuRoot.style.display = "none";
  menuRoot.style.zIndex = "9997";
  menuRoot.style.pointerEvents = "none";

  menuPanel = document.createElement("div");
  menuPanel.style.minWidth = "260px";
  menuPanel.style.padding = "16px 18px";
  menuPanel.style.boxSizing = "border-box";
  menuPanel.style.background = "rgba(6, 12, 20, 0.88)";
  menuPanel.style.border = "2px solid rgba(120, 180, 220, 0.72)";
  menuPanel.style.boxShadow = "0 0 0 1px rgba(120, 180, 220, 0.28) inset";
  menuPanel.style.fontFamily = "monospace";
  menuPanel.style.color = "rgba(235, 245, 255, 0.96)";
  menuPanel.style.lineHeight = "1.5";

  menuTitle = document.createElement("div");
  menuTitle.style.fontSize = "18px";
  menuTitle.style.marginBottom = "10px";
  menuTitle.textContent = "SHIP SYSTEMS";

  stateLine = document.createElement("div");
  stateLine.style.fontSize = "13px";
  stateLine.style.color = "rgba(160, 210, 235, 0.78)";
  stateLine.style.marginBottom = "8px";

  radioStatusLine = document.createElement("div");
  radioStatusLine.style.fontSize = "14px";
  radioStatusLine.style.marginBottom = "8px";

  hintLine = document.createElement("div");
  hintLine.style.fontSize = "12px";
  hintLine.style.color = "rgba(160, 210, 235, 0.74)";
  hintLine.textContent = "R: Toggle Radio";

  menuPanel.appendChild(menuTitle);
  menuPanel.appendChild(stateLine);
  menuPanel.appendChild(radioStatusLine);
  menuPanel.appendChild(hintLine);
  menuRoot.appendChild(menuPanel);
  document.body.appendChild(menuRoot);

  return {
    menuRoot,
    menuPanel,
    menuTitle,
    radioStatusLine,
    hintLine,
    stateLine,
  };
}

function updateMenuText() {
  const { stateLine, radioStatusLine } = ensureMenu();

  stateLine.textContent = menuState.visible ? "SYSTEM PANEL OPEN" : "SYSTEM PANEL CLOSED";

  if (menuState.radioEnabled) {
    radioStatusLine.textContent = `RADIO: ON  |  TRACK: ${menuState.currentRadioTrack}`;
    radioStatusLine.style.color = "rgba(190, 230, 255, 0.92)";
  } else {
    radioStatusLine.textContent = `RADIO: OFF |  SPACE BED: ${menuState.currentSpaceTrack}`;
    radioStatusLine.style.color = "rgba(255, 210, 120, 0.94)";
  }
}

export function createMenuUI(initial = {}) {
  Object.assign(menuState, initial);
  ensureMenu();
  updateMenuText();
  return { ...menuState };
}

export function setMenuVisible(visible) {
  menuState.visible = !!visible;
  const { menuRoot } = ensureMenu();
  updateMenuText();
  menuRoot.style.display = menuState.visible ? "block" : "none";
  return menuState.visible;
}

export function toggleMenuVisible() {
  return setMenuVisible(!menuState.visible);
}

export function setRadioState({ enabled, radioTrack, spaceTrack } = {}) {
  if (typeof enabled === "boolean") {
    menuState.radioEnabled = enabled;
  }
  if (typeof radioTrack === "string" && radioTrack) {
    menuState.currentRadioTrack = radioTrack;
  }
  if (typeof spaceTrack === "string" && spaceTrack) {
    menuState.currentSpaceTrack = spaceTrack;
  }
  updateMenuText();
  return { ...menuState };
}

export function getMenuState() {
  return { ...menuState };
}

export function clearMenuUI() {
  if (!menuRoot) return;
  menuRoot.style.display = "none";
  menuState.visible = false;
  updateMenuText();
}
