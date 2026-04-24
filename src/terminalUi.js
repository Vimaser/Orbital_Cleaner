import {
  playMenuMoveSound,
  playMenuSelectSound,
  playMenuBackSound,
} from "./sound.js";
let terminalRoot = null;
let terminalPanel = null;
let terminalContent = null;
let activeFooterLine = null;
let terminalInteractionBound = false;
let activeTerminalMode = "summary";
let activeTerminalData = null;
let selectedUpgradeIndex = 0;
const TERMINAL_FOOTER_LINES = [
  "Thank you for your continued service.",
  "All deductions processed automatically.",
  "Your performance has been noted.",
  "All deductions are final.",
];
const DEFAULT_UPGRADE_OPTIONS = [
  {
    key: "1",
    label: "THRUSTER EFFICIENCY",
    description: "+10% thrust response",
    requiredNet: 250,
  },
  {
    key: "2",
    label: "REPAIR SPEED",
    description: "+10% repair speed",
    requiredNet: 500,
  },
  {
    key: "3",
    label: "HEAT TOLERANCE",
    description: "+10% heat tolerance",
    requiredNet: 750,
  },
];

const CONTINUE_UPGRADE_OPTION = {
  key: "C",
  label: "CONTINUE SHIFT REPORT",
  description: "Skip upgrade allocation and close the terminal.",
  terminalAction: "continue",
};

const DEFAULT_UPGRADE_REQUIREMENT_STEPS = [0, 200, 450, 700, 1000, 1350];

function getUpgradeRequirementSteps(terminalData) {
  return Array.isArray(terminalData?.upgradeRequirementSteps) &&
    terminalData.upgradeRequirementSteps.length > 0
    ? terminalData.upgradeRequirementSteps
    : DEFAULT_UPGRADE_REQUIREMENT_STEPS;
}

function getUpgradeCurrentNet(terminalData) {
  return Number(terminalData?.currentNet ?? 0);
}

function getUpgradeCount(terminalData) {
  return Math.max(0, Number(terminalData?.upgradeCount ?? 0));
}

function getUpgradeRequiredNet(option, terminalData) {
  const baseRequiredNet = Math.max(0, Number(option?.requiredNet ?? 0));
  const upgradeCount = getUpgradeCount(terminalData);
  const steps = getUpgradeRequirementSteps(terminalData);
  const stepIndex = Math.min(upgradeCount, steps.length - 1);
  const scalingRequirement = stepIndex >= 0 ? Number(steps[stepIndex] ?? 0) : 0;
  return baseRequiredNet + scalingRequirement;
}

function isUpgradeUnlocked(option, terminalData) {
  if (option?.terminalAction === "continue") {
    return true;
  }

  return (
    getUpgradeCurrentNet(terminalData) >=
    getUpgradeRequiredNet(option, terminalData)
  );
}

const SYSTEM_DEDUCTION_LABELS = new Set([
  "Unstable Orbit Liability Fee",
  "Orbital Hazard Premium",
  "Kessler Risk Adjustment",
  "Debris Field Handling Fee",
]);

function formatDeductionLines(deductions) {
  if (!Array.isArray(deductions) || deductions.length === 0) {
    return ["No deductions recorded."];
  }

  return deductions.map(
    (deduction) =>
      `${(deduction.label || "Unnamed Deduction").padEnd(30, " ")} -${deduction.value ?? 0} CR`,
  );
}

function getUpgradeOptions(terminalData) {
  const baseOptions = Array.isArray(terminalData?.upgradeOptions)
    ? terminalData.upgradeOptions.slice(0, 3)
    : DEFAULT_UPGRADE_OPTIONS;

  return [...baseOptions, CONTINUE_UPGRADE_OPTION];
}

function getSelectedUpgradeOption() {
  const options = getUpgradeOptions(activeTerminalData);
  return options[selectedUpgradeIndex] || options[0] || null;
}

export function moveTerminalSelection(delta = 0) {
  if (activeTerminalMode !== "upgrade") {
    if (terminalPanel) {
      terminalPanel.scrollTop += Number(delta) * 56;
      playMenuMoveSound();
    }
    return;
  }

  const options = getUpgradeOptions(activeTerminalData);
  if (!options.length) {
    return;
  }
  const previousIndex = selectedUpgradeIndex;
  selectedUpgradeIndex =
    (selectedUpgradeIndex + Number(delta) + options.length) % options.length;

  if (selectedUpgradeIndex !== previousIndex) {
    playMenuMoveSound();
  }

  if (terminalContent && activeTerminalData) {
    renderUpgradeContent(activeTerminalData);
  }
}

export function confirmTerminalAction() {
  if (!activeTerminalData) {
    return;
  }

  if (activeTerminalMode === "upgrade") {
    const option = getSelectedUpgradeOption();

    if (option?.terminalAction === "continue") {
      playMenuBackSound();
      if (typeof activeTerminalData?.onContinue === "function") {
        activeTerminalData.onContinue();
      }
      return;
    }

    if (
      option &&
      isUpgradeUnlocked(option, activeTerminalData) &&
      typeof activeTerminalData?.onUpgradeSelect === "function"
    ) {
      playMenuSelectSound();
      activeTerminalData.onUpgradeSelect(option, selectedUpgradeIndex);
    }
    return;
  }

  if (!isTerminalTypewriterComplete()) {
    skipTerminalTypewriter();
    return;
  }

  if (typeof activeTerminalData?.onContinue === "function") {
    playMenuSelectSound();
    activeTerminalData.onContinue();
  }
}

function bindTerminalInteractions() {
  if (terminalInteractionBound) {
    return;
  }

  terminalInteractionBound = true;

  window.addEventListener("keydown", (event) => {
    if (!terminalRoot || terminalRoot.style.display !== "flex") {
      return;
    }

    if (activeTerminalMode === "upgrade") {
      const options = getUpgradeOptions(activeTerminalData);
      if (!options.length) {
        return;
      }

      if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
        event.preventDefault();
        const previousIndex = selectedUpgradeIndex;
        selectedUpgradeIndex =
          (selectedUpgradeIndex - 1 + options.length) % options.length;
        if (selectedUpgradeIndex !== previousIndex) {
          playMenuMoveSound();
        }
        renderUpgradeContent(activeTerminalData);
        return;
      }

      if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
        event.preventDefault();
        const previousIndex = selectedUpgradeIndex;
        selectedUpgradeIndex = (selectedUpgradeIndex + 1) % options.length;
        if (selectedUpgradeIndex !== previousIndex) {
          playMenuMoveSound();
        }
        renderUpgradeContent(activeTerminalData);
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        confirmTerminalAction();
        return;
      }

      return;
    }

    if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
      event.preventDefault();
      moveTerminalSelection(-1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
      event.preventDefault();
      moveTerminalSelection(1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      confirmTerminalAction();
    }
  });
}

function renderUpgradeContent(terminalData) {
  const options = getUpgradeOptions(terminalData);
  const introText = [
    "ORBITAL SERVICE TERMINAL",
    "UPGRADE ALLOCATION AVAILABLE",
    "",
    "SELECT ONE PERFORMANCE MODIFIER",
    ...(activeFooterLine ? ["", activeFooterLine] : []),
  ].join("\n");

  terminalContent.innerHTML = "";

  const intro = document.createElement("div");
  intro.style.whiteSpace = "pre-wrap";
  intro.textContent = introText;
  terminalContent.appendChild(intro);

  const optionList = document.createElement("div");
  optionList.style.display = "flex";
  optionList.style.flexDirection = "column";
  optionList.style.gap = "10px";
  optionList.style.marginTop = "18px";

  options.forEach((option, index) => {
    const key = option?.key || `${index + 1}`;
    const label = option?.label || "UNNAMED UPGRADE";
    const description = option?.description || "No description available.";
    const isSelected = index === selectedUpgradeIndex;
    const isContinueOption = option?.terminalAction === "continue";
    const requiredNet = getUpgradeRequiredNet(option, terminalData);
    const currentNet = getUpgradeCurrentNet(terminalData);
    const unlocked = isUpgradeUnlocked(option, terminalData);
    const statusLine = isContinueOption
      ? "AVAILABLE"
      : unlocked
        ? "AUTHORIZED"
        : `LOCKED — REQUIRES ${requiredNet} CR (CURRENT: ${currentNet} CR)`;

    const button = document.createElement("button");
    button.type = "button";
    button.style.width = "100%";
    button.style.textAlign = "left";
    button.style.padding = "12px 14px";
    button.style.border = isSelected
      ? "1px solid rgba(140, 220, 255, 0.9)"
      : "1px solid rgba(120, 180, 220, 0.32)";
    button.style.background = isSelected
      ? "rgba(18, 36, 56, 0.9)"
      : "rgba(8, 16, 28, 0.82)";
    button.style.color = "rgba(235, 245, 255, 0.96)";
    button.style.fontFamily = "monospace";
    button.style.fontSize = "14px";
    button.style.lineHeight = "1.45";
    button.style.cursor = unlocked || isContinueOption ? "pointer" : "not-allowed";
    button.style.boxShadow = isSelected
      ? "0 0 0 1px rgba(120, 180, 220, 0.25) inset"
      : "none";
    button.innerHTML = `<div>[${key}] ${label}</div><div style="opacity:0.82; margin-top:4px;">${description}</div><div style="opacity:${unlocked ? "0.9" : "0.72"}; margin-top:6px;">${statusLine}</div>`;

    button.addEventListener("mouseenter", () => {
      if (selectedUpgradeIndex !== index) {
        playMenuMoveSound();
      }
      selectedUpgradeIndex = index;
    });

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectedUpgradeIndex = index;

      if (option?.terminalAction === "continue") {
        playMenuBackSound();
        if (typeof terminalData?.onContinue === "function") {
          terminalData.onContinue();
        }
        return;
      }

      if (!isUpgradeUnlocked(option, terminalData)) {
        renderUpgradeContent(terminalData);
        return;
      }

      playMenuSelectSound();
      if (typeof terminalData?.onUpgradeSelect === "function") {
        terminalData.onUpgradeSelect(option, index);
      }
    });

    optionList.appendChild(button);
  });

  terminalContent.appendChild(optionList);

  const footer = document.createElement("div");
  footer.style.whiteSpace = "pre-wrap";
  footer.style.marginTop = "18px";
  footer.textContent =
    "CLICK OR PRESS [ENTER] TO APPLY AUTHORIZED UPGRADE OR CONTINUE\nW/S, ARROWS, OR CONTROLLER TO CHANGE SELECTION";
  terminalContent.appendChild(footer);
}

let typeTargetText = "";
let typeDisplayedLength = 0;
let typeLastUpdate = 0;
const TYPE_SPEED = 120; // chars per second
let typePauseUntil = 0;
let typePauseConsumed = false;
const TYPE_PAUSE_BEFORE_NET_PAY_MS = 850;
let typeSkipRequested = false;

function ensureTerminalElements() {
  if (terminalRoot && terminalPanel && terminalContent) {
    return { terminalRoot, terminalPanel, terminalContent };
  }

  terminalRoot = document.createElement("div");
  terminalRoot.style.position = "fixed";
  terminalRoot.style.inset = "0";
  terminalRoot.style.display = "none";
  terminalRoot.style.alignItems = "center";
  terminalRoot.style.justifyContent = "center";
  terminalRoot.style.background = "rgba(0, 0, 0, 0.38)";
  terminalRoot.style.pointerEvents = "none";
  terminalRoot.style.zIndex = "9999";

  terminalPanel = document.createElement("div");
  terminalPanel.style.width = "560px";
  terminalPanel.style.minHeight = "420px";
  terminalPanel.style.boxSizing = "border-box";
  terminalPanel.style.padding = "28px";
  terminalPanel.style.background = "rgba(6, 12, 20, 0.92)";
  terminalPanel.style.border = "2px solid rgba(120, 180, 220, 0.72)";
  terminalPanel.style.boxShadow = "0 0 0 1px rgba(120, 180, 220, 0.28) inset";
  terminalPanel.style.fontFamily = "monospace";
  terminalPanel.style.fontSize = "14px";
  terminalPanel.style.color = "rgba(235, 245, 255, 0.96)";
  terminalPanel.style.whiteSpace = "pre-wrap";
  terminalPanel.style.lineHeight = "1.5";
  terminalPanel.style.maxHeight = "80vh";
  terminalPanel.style.overflowY = "auto";
  terminalPanel.style.pointerEvents = "auto";
  terminalPanel.style.cursor = "pointer";

  terminalContent = document.createElement("div");
  terminalPanel.appendChild(terminalContent);
  terminalRoot.appendChild(terminalPanel);
  document.body.appendChild(terminalRoot);

  terminalPanel.addEventListener("click", () => {
    confirmTerminalAction();
  });

  bindTerminalInteractions();

  return { terminalRoot, terminalPanel, terminalContent };
}

function formatUpgradeScreen(terminalData) {
  const options = getUpgradeOptions(terminalData);

  const optionLines = options
    .map((option, index) => {
      const key = option?.key || `${index + 1}`;
      const label = option?.label || "UNNAMED UPGRADE";
      const description = option?.description || "No description available.";
      const isContinueOption = option?.terminalAction === "continue";
      const requiredNet = getUpgradeRequiredNet(option, terminalData);
      const currentNet = getUpgradeCurrentNet(terminalData);
      const unlocked = isUpgradeUnlocked(option, terminalData);
      const statusLine = isContinueOption
        ? "AVAILABLE"
        : unlocked
          ? "AUTHORIZED"
          : `LOCKED — REQUIRES ${requiredNet} CR (CURRENT: ${currentNet} CR)`;
      return `[${key}] ${label}\n    ${description}\n    ${statusLine}`;
    })
    .join("\n\n");

  return [
    "ORBITAL SERVICE TERMINAL",
    "UPGRADE ALLOCATION AVAILABLE",
    "",
    "SELECT ONE PERFORMANCE MODIFIER",
    optionLines,
    ...(activeFooterLine ? ["", activeFooterLine] : []),
    "",
    "CLICK OR PRESS [ENTER] TO APPLY AUTHORIZED UPGRADE OR CONTINUE",
  ].join("\n");
}

function formatSummary(terminalData) {
  const deductions = Array.isArray(terminalData.deductions)
    ? [...terminalData.deductions].sort(
        (a, b) => (b?.value || 0) - (a?.value || 0),
      )
    : [];

  const systemDeductions = deductions.filter((deduction) =>
    SYSTEM_DEDUCTION_LABELS.has(deduction?.label),
  );
  const administrativeDeductions = deductions.filter(
    (deduction) => !SYSTEM_DEDUCTION_LABELS.has(deduction?.label),
  );

  const damage = terminalData.damageReport || null;
  const bonusPay = terminalData.bonusPay ?? 0;

  let damageSection = [];

  if (damage) {
    damageSection = [
      "",
      "SHIP DAMAGE REPORT",
      `Crashes                         ${damage.crashes ?? 0}`,
      `Atmospheric Exposure           ${Math.round(damage.atmosphereExposureSeconds ?? 0)}s`,
      `Fuel System Status            ${damage.emergencyMaintenanceThisShift ? "LIMP RECOVERY" : damage.towedThisShift ? "TOWED" : "NOMINAL"}`,
      "",
      "DAMAGE COST",
      `Crash Damage                   -${damage.crashCost ?? 0} CR`,
      `Stress Damage                  -${damage.atmosphereCost ?? 0} CR`,
      `Emergency Tow Fee              -${damage.towCost ?? 0} CR`,
      `Emergency Maintenance Fee      -${damage.maintenanceCost ?? 0} CR`,
      `Limp Systems Recovery          ${damage.emergencyMaintenanceThisShift ? "SUCCESS" : "N/A"}`,
      `Total Damage                   -${damage.totalDamageCost ?? 0} CR`,
    ];
  }

  return [
    "ORBITAL SERVICE TERMINAL",
    "AUTOMATED SHIFT DEBRIEF",
    "",
    "SHIFT SUMMARY",
    `Repairs Completed               ${terminalData.repairsCompleted ?? 0}`,
    `Debris Cleared                  ${terminalData.debrisCleared ?? 0}`,
    `Gross Pay                       ${terminalData.grossPay ?? 0} CR`,
    "",
    "OPERATIONAL DEDUCTIONS",
    ...formatDeductionLines(systemDeductions),
    "",
    "ADMINISTRATIVE DEDUCTIONS",
    ...formatDeductionLines(administrativeDeductions),
    ...damageSection,
    "",
    "PERFORMANCE BONUS",
    `Bonus Issued                   ${bonusPay} CR`,
    "",
    "NET PAY",
    `Shift Settlement                ${terminalData.netPay ?? 0} CR`,
    ...(activeFooterLine ? ["", activeFooterLine] : []),
    "",
    "PRESS [ENTER] TO CONTINUE SHIFT",
  ].join("\n");
}

export function skipTerminalTypewriter() {
  typeSkipRequested = true;
}

export function drawTerminalUi(_hud, data) {
  if (!data) return;

  const { terminalOpen, terminalData, terminalMode = "summary" } = data;
  activeTerminalMode = terminalMode;
  activeTerminalData = terminalData;
  const { terminalRoot, terminalContent } = ensureTerminalElements();

  if (!terminalOpen || !terminalData) {
    clearTerminalUi();
    return;
  }

  if (activeFooterLine === null) {
    activeFooterLine =
      Math.random() < 0.4
        ? TERMINAL_FOOTER_LINES[
            Math.floor(Math.random() * TERMINAL_FOOTER_LINES.length)
          ]
        : null;
  }

  terminalRoot.style.display = "flex";

  if (terminalMode === "upgrade") {
    const options = getUpgradeOptions(terminalData);
    selectedUpgradeIndex = Math.max(
      0,
      Math.min(selectedUpgradeIndex, Math.max(0, options.length - 1)),
    );
    renderUpgradeContent(terminalData);
    return;
  }

  const fullText =
    terminalMode === "upgrade"
      ? formatUpgradeScreen(terminalData)
      : formatSummary(terminalData);

  if (fullText !== typeTargetText) {
    typeTargetText = fullText;
    typeDisplayedLength = 0;
    typeLastUpdate = performance.now();
    typePauseUntil = 0;
    typePauseConsumed = false;
  }

  if (typeSkipRequested) {
    typeDisplayedLength = typeTargetText.length;
    typePauseUntil = 0;
    typePauseConsumed = true;
    typeSkipRequested = false;
    terminalContent.textContent = typeTargetText;
    return;
  }

  const now = performance.now();
  const dt = (now - typeLastUpdate) / 1000;
  typeLastUpdate = now;

  const netPayMarker = "\nNET PAY\n";
  const netPayIndex = typeTargetText.indexOf(netPayMarker);

  if (typePauseUntil > now) {
    terminalContent.textContent = typeTargetText.slice(0, typeDisplayedLength);
    return;
  }

  const nextDisplayedLength = Math.min(
    typeTargetText.length,
    typeDisplayedLength + Math.max(1, Math.floor(TYPE_SPEED * dt)),
  );

  if (
    !typePauseConsumed &&
    netPayIndex >= 0 &&
    typeDisplayedLength < netPayIndex &&
    nextDisplayedLength >= netPayIndex
  ) {
    typeDisplayedLength = netPayIndex;
    typePauseUntil = now + TYPE_PAUSE_BEFORE_NET_PAY_MS;
    typePauseConsumed = true;
    terminalContent.textContent = typeTargetText.slice(0, typeDisplayedLength);
    return;
  }

  typeDisplayedLength = nextDisplayedLength;
  terminalContent.textContent = typeTargetText.slice(0, typeDisplayedLength);
}

export function buildUpgradeTerminalData({
  upgradeOptions,
  currentNet = 0,
  upgradeCount = 0,
  upgradeRequirementSteps = DEFAULT_UPGRADE_REQUIREMENT_STEPS,
} = {}) {
  return {
    upgradeOptions:
      Array.isArray(upgradeOptions) && upgradeOptions.length > 0
        ? upgradeOptions.slice(0, 3)
        : DEFAULT_UPGRADE_OPTIONS,
    currentNet: Math.max(0, Number(currentNet || 0)),
    upgradeCount: Math.max(0, Number(upgradeCount || 0)),
    upgradeRequirementSteps:
      Array.isArray(upgradeRequirementSteps) &&
      upgradeRequirementSteps.length > 0
        ? upgradeRequirementSteps
        : DEFAULT_UPGRADE_REQUIREMENT_STEPS,
  };
}

export function clearTerminalUi() {
  const { terminalRoot, terminalContent } = ensureTerminalElements();
  terminalRoot.style.display = "none";
  terminalContent.textContent = "";
  activeFooterLine = null;
  activeTerminalMode = "summary";
  activeTerminalData = null;
  selectedUpgradeIndex = 0;
  typeTargetText = "";
  typeDisplayedLength = 0;
  typeLastUpdate = 0;
  typePauseUntil = 0;
  typePauseConsumed = false;
  typeSkipRequested = false;
}

export function isTerminalTypewriterComplete() {
  return (
    typeTargetText.length > 0 && typeDisplayedLength >= typeTargetText.length
  );
}
