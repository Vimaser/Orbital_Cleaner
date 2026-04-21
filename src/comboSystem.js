const DEFAULT_CONFIG = {
  chainWindow: 10,
  comboStartWindowMultiplier: 1.75,
  bonusPerStep: 0.15,
  maxMultiplier: 2.5,
  labels: [
    "On Schedule",
    "In the Groove",
    "Chain Reaction",
    "Hot Shift",
    "Orbital Roll",
    "Unreasonably Efficient",
  ],
};

let config = { ...DEFAULT_CONFIG };

let comboState = {
  chainCount: 0,
  timerRemaining: 0,
  multiplier: 1,
  lastBonus: 0,
  lastEventType: null,
  expired: false,
  lastPenalty: 0,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getComboLabel(chainCount) {
  if (chainCount <= 1) return config.labels[0];

  const labelIndex = clamp(chainCount - 1, 0, config.labels.length - 1);
  return config.labels[labelIndex];
}

function recalculateMultiplier() {
  const nextMultiplier = 1 + Math.max(0, comboState.chainCount - 1) * config.bonusPerStep;
  comboState.multiplier = clamp(nextMultiplier, 1, config.maxMultiplier);
}

function getNextComboWindow() {
  const isStartingCombo = comboState.chainCount <= 1;
  const baseWindow = config.chainWindow;

  if (isStartingCombo) {
    return baseWindow * config.comboStartWindowMultiplier;
  }

  return baseWindow;
}

export function configureComboSystem(nextConfig = {}) {
  config = {
    ...config,
    ...nextConfig,
  };
}

export function updateComboSystem(deltaTime) {
  if (comboState.chainCount <= 0 || comboState.timerRemaining <= 0) {
    return false;
  }
  comboState.timerRemaining = Math.max(0, comboState.timerRemaining - deltaTime);

  if (comboState.timerRemaining <= 0) {
    comboState.timerRemaining = 0;
    comboState.expired = true;
    return true;
  }

  return false;
}

export function registerComboEvent(eventType, baseReward = 0) {
  const continuedChain = comboState.chainCount > 0 && comboState.timerRemaining > 0;

  comboState.chainCount = continuedChain ? comboState.chainCount + 1 : 1;
  comboState.timerRemaining = getNextComboWindow();
  comboState.lastEventType = eventType;
  comboState.expired = false;
  comboState.lastPenalty = 0;

  recalculateMultiplier();

  const bonus = Math.round(baseReward * (comboState.multiplier - 1));
  comboState.lastBonus = bonus;

  return {
    chainCount: comboState.chainCount,
    timerRemaining: comboState.timerRemaining,
    multiplier: comboState.multiplier,
    bonus,
    label: getComboLabel(comboState.chainCount),
    eventType,
    continuedChain,
  };
}

export function penalizeComboTimer(penaltySeconds = 3, minimumRemaining = 2) {
  if (comboState.chainCount <= 0 || comboState.timerRemaining <= 0) {
    return {
      penalized: false,
      timerRemaining: comboState.timerRemaining,
      penaltyApplied: 0,
      expired: comboState.expired,
    };
  }

  const safeMinimumRemaining = Math.max(0, minimumRemaining);
  const targetRemaining = Math.max(
    safeMinimumRemaining,
    comboState.timerRemaining - penaltySeconds,
  );
  const penaltyApplied = comboState.timerRemaining - targetRemaining;

  comboState.timerRemaining = targetRemaining;
  comboState.lastPenalty = penaltyApplied;

  return {
    penalized: penaltyApplied > 0,
    timerRemaining: comboState.timerRemaining,
    penaltyApplied,
    expired: false,
  };
}

export function resetComboSystem() {
  comboState = {
    chainCount: 0,
    timerRemaining: 0,
    multiplier: 1,
    lastBonus: 0,
    lastEventType: null,
    expired: false,
    lastPenalty: 0,
  };
}

export function consumeComboExpiredFlag() {
  const didExpire = comboState.expired;
  comboState.expired = false;
  return didExpire;
}

export function getComboState() {
  return {
    ...comboState,
    label: getComboLabel(comboState.chainCount),
  };
}

export function getComboBonusPreview(baseReward = 0) {
  return Math.round(baseReward * (comboState.multiplier - 1));
}