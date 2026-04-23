let terminalRoot = null;
let terminalPanel = null;
let terminalContent = null;
let activeFooterLine = null;
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
  },
  {
    key: "2",
    label: "REPAIR SPEED",
    description: "+10% repair speed",
  },
  {
    key: "3",
    label: "HEAT TOLERANCE",
    description: "+10% heat tolerance",
  },
];

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

  terminalContent = document.createElement("div");
  terminalPanel.appendChild(terminalContent);
  terminalRoot.appendChild(terminalPanel);
  document.body.appendChild(terminalRoot);

  return { terminalRoot, terminalPanel, terminalContent };
}

function formatUpgradeScreen(terminalData) {
  const options = Array.isArray(terminalData.upgradeOptions)
    ? terminalData.upgradeOptions.slice(0, 3)
    : DEFAULT_UPGRADE_OPTIONS;

  const optionLines = options
    .map((option, index) => {
      const key = option?.key || `${index + 1}`;
      const label = option?.label || "UNNAMED UPGRADE";
      const description = option?.description || "No description available.";
      return `[${key}] ${label}\n    ${description}`;
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
    "PRESS [1], [2], OR [3] TO APPLY UPGRADE",
  ].join("\n");
}

function formatSummary(terminalData) {
  const deductions = Array.isArray(terminalData.deductions)
    ? [...terminalData.deductions].sort((a, b) => (b?.value || 0) - (a?.value || 0))
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
      `Emergency Tow                  ${damage.towedThisShift ? "YES" : "NO"}`,
      "",
      "DAMAGE COST",
      `Crash Damage                   -${damage.crashCost ?? 0} CR`,
      `Stress Damage                  -${damage.atmosphereCost ?? 0} CR`,
      `Tow Charge                     -${damage.towCost ?? 0} CR`,
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

export function buildUpgradeTerminalData(upgradeOptions) {
  return {
    upgradeOptions: Array.isArray(upgradeOptions) && upgradeOptions.length > 0
      ? upgradeOptions.slice(0, 3)
      : DEFAULT_UPGRADE_OPTIONS,
  };
}

export function clearTerminalUi() {
  const { terminalRoot, terminalContent } = ensureTerminalElements();
  terminalRoot.style.display = "none";
  terminalContent.textContent = "";
  activeFooterLine = null;
  typeTargetText = "";
  typeDisplayedLength = 0;
  typeLastUpdate = 0;
  typePauseUntil = 0;
  typePauseConsumed = false;
  typeSkipRequested = false;
}

export function isTerminalTypewriterComplete() {
  return typeTargetText.length > 0 && typeDisplayedLength >= typeTargetText.length;
}