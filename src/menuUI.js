import {
  playMenuMoveSound,
  playMenuSelectSound,
} from "./sound.js";

let menuRoot = null;
let menuPanel = null;
let menuTitle = null;
let radioStatusLine = null;
let performanceStatusLine = null;
let hintLine = null;
let stateLine = null;

let selectedMenuIndex = 0;
const MENU_ACTIONS = ["radio", "performance"];

const menuState = {
  visible: false,
  radioEnabled: true,
  currentRadioTrack: "coolSolarWinds",
  currentSpaceTrack: "deepSpace",
  shiftsSinceEvaluation: 0,
  evaluationEligible: false,
  evaluationMandatory: false,
  currentRankLabel: "UNREVIEWED",
};

function ensureMenu() {
  if (
    menuRoot &&
    menuPanel &&
    menuTitle &&
    radioStatusLine &&
    performanceStatusLine &&
    hintLine &&
    stateLine
  ) {
    return {
      menuRoot,
      menuPanel,
      menuTitle,
      radioStatusLine,
      performanceStatusLine,
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
  menuRoot.style.pointerEvents = "auto";

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

  radioStatusLine = document.createElement("button");
  radioStatusLine.type = "button";
  radioStatusLine.style.display = "block";
  radioStatusLine.style.width = "100%";
  radioStatusLine.style.textAlign = "left";
  radioStatusLine.style.padding = "8px 10px";
  radioStatusLine.style.marginBottom = "8px";
  radioStatusLine.style.border = "1px solid rgba(120, 180, 220, 0.32)";
  radioStatusLine.style.background = "rgba(8, 16, 28, 0.62)";
  radioStatusLine.style.fontFamily = "monospace";
  radioStatusLine.style.fontSize = "14px";
  radioStatusLine.style.cursor = "pointer";
  radioStatusLine.addEventListener("click", () => {
    playMenuSelectSound();
    window.dispatchEvent(new Event("radioToggleRequested"));
  });

  performanceStatusLine = document.createElement("button");
  performanceStatusLine.type = "button";
  performanceStatusLine.style.display = "block";
  performanceStatusLine.style.width = "100%";
  performanceStatusLine.style.textAlign = "left";
  performanceStatusLine.style.whiteSpace = "pre-wrap";
  performanceStatusLine.style.padding = "8px 10px";
  performanceStatusLine.style.marginBottom = "8px";
  performanceStatusLine.style.border = "1px solid rgba(120, 180, 220, 0.32)";
  performanceStatusLine.style.background = "rgba(8, 16, 28, 0.62)";
  performanceStatusLine.style.fontFamily = "monospace";
  performanceStatusLine.style.fontSize = "13px";
  performanceStatusLine.style.color = "rgba(160, 210, 235, 0.78)";
  performanceStatusLine.style.cursor = "pointer";
  performanceStatusLine.addEventListener("click", () => {
    if (menuState.evaluationEligible || menuState.evaluationMandatory) {
      playMenuSelectSound();
      window.dispatchEvent(new Event("performanceReviewRequested"));
    }
  });

  hintLine = document.createElement("div");
  hintLine.style.fontSize = "12px";
  hintLine.style.color = "rgba(160, 210, 235, 0.74)";
  hintLine.textContent = "R: Toggle Radio";

  menuPanel.appendChild(menuTitle);
  menuPanel.appendChild(stateLine);
  menuPanel.appendChild(radioStatusLine);
  menuPanel.appendChild(performanceStatusLine);
  menuPanel.appendChild(hintLine);
  menuRoot.appendChild(menuPanel);
  document.body.appendChild(menuRoot);

  return {
    menuRoot,
    menuPanel,
    menuTitle,
    radioStatusLine,
    performanceStatusLine,
    hintLine,
    stateLine,
  };
}

function isMenuActionEnabled(action) {
  if (action === "performance") {
    return menuState.evaluationEligible || menuState.evaluationMandatory;
  }

  return true;
}

function styleMenuButton(button, index, enabled = true) {
  const selected = menuState.visible && selectedMenuIndex === index;

  button.disabled = !enabled;
  button.style.opacity = enabled ? "1" : "0.58";
  button.style.cursor = enabled ? "pointer" : "not-allowed";
  button.style.border = selected
    ? "1px solid rgba(170, 230, 255, 0.95)"
    : "1px solid rgba(120, 180, 220, 0.32)";
  button.style.background = selected
    ? "rgba(22, 48, 72, 0.92)"
    : "rgba(8, 16, 28, 0.62)";
  button.style.boxShadow = selected
    ? "0 0 14px rgba(120, 220, 255, 0.22)"
    : "none";
}

function dispatchMenuAction(action) {
  if (action === "radio") {
    playMenuSelectSound();
    window.dispatchEvent(new Event("radioToggleRequested"));
    return true;
  }

  if (action === "performance") {
    if (menuState.evaluationEligible || menuState.evaluationMandatory) {
      playMenuSelectSound();
      window.dispatchEvent(new Event("performanceReviewRequested"));
      return true;
    }
  }

  return false;
}

function updateMenuText() {
  const { stateLine, radioStatusLine, performanceStatusLine, hintLine } = ensureMenu();

  stateLine.textContent = menuState.visible ? "SYSTEM PANEL OPEN" : "SYSTEM PANEL CLOSED";

  if (menuState.radioEnabled) {
    radioStatusLine.textContent = `RADIO: ON  |  TRACK: ${menuState.currentRadioTrack}`;
    radioStatusLine.style.color = "rgba(190, 230, 255, 0.92)";
  } else {
    radioStatusLine.textContent = `RADIO: OFF |  SPACE BED: ${menuState.currentSpaceTrack}`;
    radioStatusLine.style.color = "rgba(255, 210, 120, 0.94)";
  }

  const shiftsSinceEvaluation = Math.max(
    0,
    Number(menuState.shiftsSinceEvaluation) || 0,
  );

  const rankLabel = menuState.currentRankLabel || "UNREVIEWED";

  if (menuState.evaluationMandatory) {
    performanceStatusLine.textContent = `PERFORMANCE REVIEW: MANDATORY\nCURRENT RANK: ${rankLabel}`;
    performanceStatusLine.style.color = "rgba(255, 140, 120, 0.96)";
    performanceStatusLine.style.textDecoration = "underline";
  } else if (menuState.evaluationEligible) {
    performanceStatusLine.textContent = `PERFORMANCE REVIEW: AVAILABLE\nCURRENT RANK: ${rankLabel}`;
    performanceStatusLine.style.color = "rgba(170, 232, 120, 0.94)";
    performanceStatusLine.style.textDecoration = "underline";
  } else {
    performanceStatusLine.textContent = `PERFORMANCE REVIEW: ${shiftsSinceEvaluation}/3 SHIFTS\nCURRENT RANK: ${rankLabel}`;
    performanceStatusLine.style.color = "rgba(160, 210, 235, 0.78)";
    performanceStatusLine.style.textDecoration = "none";
  }

  hintLine.textContent = menuState.evaluationEligible || menuState.evaluationMandatory
    ? "R: Toggle Radio  |  E: Performance Review"
    : "R: Toggle Radio";

  styleMenuButton(radioStatusLine, 0, true);
  styleMenuButton(
    performanceStatusLine,
    1,
    menuState.evaluationEligible || menuState.evaluationMandatory,
  );
}

export function createMenuUI(initial = {}) {
  Object.assign(menuState, initial);
  ensureMenu();
  updateMenuText();
  return { ...menuState };
}

export function setMenuVisible(visible) {
  menuState.visible = !!visible;
  if (menuState.visible) {
    selectedMenuIndex = 0;
  }
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

export function setPerformanceReviewState({
  shiftsSinceEvaluation,
  evaluationEligible,
  evaluationMandatory,
  currentRankLabel,
} = {}) {
  if (typeof shiftsSinceEvaluation === "number") {
    menuState.shiftsSinceEvaluation = Math.max(0, shiftsSinceEvaluation);
  }

  if (typeof evaluationEligible === "boolean") {
    menuState.evaluationEligible = evaluationEligible;
  }

  if (typeof evaluationMandatory === "boolean") {
    menuState.evaluationMandatory = evaluationMandatory;
  }

  if (typeof currentRankLabel === "string" && currentRankLabel) {
    menuState.currentRankLabel = currentRankLabel;
  }

  updateMenuText();
  return { ...menuState };
}

export function moveMenuSelection(delta = 0) {
  ensureMenu();

  const previousIndex = selectedMenuIndex;
  const direction = Number(delta) >= 0 ? 1 : -1;
  let attempts = 0;

  do {
    selectedMenuIndex =
      (selectedMenuIndex + direction + MENU_ACTIONS.length) % MENU_ACTIONS.length;
    attempts += 1;
  } while (
    attempts < MENU_ACTIONS.length &&
    !isMenuActionEnabled(MENU_ACTIONS[selectedMenuIndex])
  );

  if (selectedMenuIndex !== previousIndex) {
    playMenuMoveSound();
  }

  updateMenuText();
  return selectedMenuIndex;
}

export function confirmMenuSelection() {
  ensureMenu();
  return dispatchMenuAction(MENU_ACTIONS[selectedMenuIndex]);
}