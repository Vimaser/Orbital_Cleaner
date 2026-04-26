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
  overlayRoot.style.pointerEvents = "auto";
  overlayRoot.style.zIndex = "9998";

  overlayPanel = document.createElement("div");
  overlayPanel.style.width = "min(360px, calc(100vw - 28px))";
  overlayPanel.style.maxHeight = "calc(100vh - 28px)";
  overlayPanel.style.overflowY = "auto";
  overlayPanel.style.padding = "clamp(16px, 4vw, 22px) clamp(18px, 5vw, 28px)";
  overlayPanel.style.boxSizing = "border-box";
  overlayPanel.style.background = "rgba(6, 12, 20, 0.88)";
  overlayPanel.style.border = "2px solid rgba(120, 180, 220, 0.72)";
  overlayPanel.style.boxShadow = "0 0 0 1px rgba(120, 180, 220, 0.28) inset";
  overlayPanel.style.borderRadius = "14px";
  overlayPanel.style.fontFamily = "monospace";
  overlayPanel.style.textAlign = "center";
  overlayPanel.style.color = "rgba(235, 245, 255, 0.96)";

  overlayTitle = document.createElement("div");
  overlayTitle.style.fontSize = "clamp(22px, 7vw, 28px)";
  overlayTitle.style.marginBottom = "10px";
  overlayTitle.style.letterSpacing = "0.08em";
  overlayTitle.textContent = "PAUSED";

  overlaySubtitle = document.createElement("div");
  overlaySubtitle.style.fontSize = "clamp(11px, 3.2vw, 14px)";
  overlaySubtitle.style.color = "rgba(160, 210, 235, 0.74)";
  overlaySubtitle.textContent = "Press ESC to resume";

  const mainMenuButton = document.createElement("button");
  mainMenuButton.textContent = "RETURN TO MAIN MENU";
  mainMenuButton.style.width = "100%";
  mainMenuButton.style.marginTop = "16px";
  mainMenuButton.style.padding = "clamp(10px, 3.2vw, 12px) 14px";
  mainMenuButton.style.fontFamily = "inherit";
  mainMenuButton.style.fontSize = "clamp(12px, 3.4vw, 14px)";
  mainMenuButton.style.letterSpacing = "0.08em";
  mainMenuButton.style.cursor = "pointer";
  mainMenuButton.style.border = "1px solid rgba(120, 180, 220, 0.72)";
  mainMenuButton.style.background = "rgba(8, 16, 28, 0.94)";
  mainMenuButton.style.color = "rgba(235, 245, 255, 0.96)";
  mainMenuButton.style.borderRadius = "8px";
  mainMenuButton.style.touchAction = "manipulation";

  mainMenuButton.addEventListener("click", () => {
    window.dispatchEvent(new Event("returnToMainMenu"));
  });

  overlayPanel.appendChild(overlayTitle);
  overlayPanel.appendChild(overlaySubtitle);
  overlayPanel.appendChild(mainMenuButton);
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
