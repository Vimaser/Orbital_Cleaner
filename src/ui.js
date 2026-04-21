export const UI_STATE = {
  MENU: "menu",
  GAME: "game",
  PAUSED: "paused",
};

let currentUIState = UI_STATE.GAME;
let overlayRoot = null;
let overlayPanel = null;
let overlayTitle = null;
let overlaySubtitle = null;

function ensureOverlay() {
  if (overlayRoot && overlayPanel && overlayTitle && overlaySubtitle) {
    return { overlayRoot, overlayPanel, overlayTitle, overlaySubtitle };
  }

  overlayRoot = document.createElement("div");
  overlayRoot.style.position = "fixed";
  overlayRoot.style.inset = "0";
  overlayRoot.style.display = "none";
  overlayRoot.style.alignItems = "center";
  overlayRoot.style.justifyContent = "center";
  overlayRoot.style.background = "rgba(0, 0, 0, 0.38)";
  overlayRoot.style.pointerEvents = "none";
  overlayRoot.style.zIndex = "9998";

  overlayPanel = document.createElement("div");
  overlayPanel.style.minWidth = "320px";
  overlayPanel.style.padding = "22px 28px";
  overlayPanel.style.boxSizing = "border-box";
  overlayPanel.style.background = "rgba(6, 12, 20, 0.88)";
  overlayPanel.style.border = "2px solid rgba(120, 180, 220, 0.72)";
  overlayPanel.style.boxShadow = "0 0 0 1px rgba(120, 180, 220, 0.28) inset";
  overlayPanel.style.fontFamily = "monospace";
  overlayPanel.style.textAlign = "center";
  overlayPanel.style.color = "rgba(235, 245, 255, 0.96)";

  overlayTitle = document.createElement("div");
  overlayTitle.style.fontSize = "28px";
  overlayTitle.style.marginBottom = "12px";
  overlayTitle.textContent = "PAUSED";

  overlaySubtitle = document.createElement("div");
  overlaySubtitle.style.fontSize = "14px";
  overlaySubtitle.style.color = "rgba(160, 210, 235, 0.74)";
  overlaySubtitle.textContent = "Press ESC to resume";

  overlayPanel.appendChild(overlayTitle);
  overlayPanel.appendChild(overlaySubtitle);
  overlayRoot.appendChild(overlayPanel);
  document.body.appendChild(overlayRoot);

  return { overlayRoot, overlayPanel, overlayTitle, overlaySubtitle };
}

export function setUIState(state) {
  currentUIState = state;
  return currentUIState;
}

export function getUIState() {
  return currentUIState;
}

export function drawUI(state = currentUIState) {
  const { overlayRoot, overlayTitle, overlaySubtitle } = ensureOverlay();

  currentUIState = state;

  if (state === UI_STATE.PAUSED) {
    overlayTitle.textContent = "PAUSED";
    overlaySubtitle.textContent = "Press ESC to resume";
    overlayRoot.style.display = "flex";
    return;
  }

  overlayRoot.style.display = "none";
}

export function clearUI() {
  if (!overlayRoot) return;
  overlayRoot.style.display = "none";
}
