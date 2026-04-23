const DEDUCTION_POOL = [
  { label: "Mandatory Pizza Party Fund", type: "flat", amount: 45, weight: 8, tier: "small" },
  { label: "Docking Bay Sanitation Fee", type: "flat", amount: 28, weight: 7, tier: "small" },
  { label: "Orbital Maintenance Contribution", type: "flat", amount: 36, weight: 7, tier: "small" },
  { label: "Crew Hydration Initiative", type: "flat", amount: 18, weight: 6, tier: "small" },
  { label: "Station Air Recycling Tax", type: "flat", amount: 34, weight: 6, tier: "small" },
  { label: "Tool Calibration Charge", type: "flat", amount: 24, weight: 6, tier: "small" },
  { label: "Coffee Budget Contribution", type: "flat", amount: 12, weight: 5, tier: "small" },
  { label: "Morale Enhancement Program", type: "flat", amount: 16, weight: 5, tier: "small" },
  { label: "Breakroom Restocking Fee", type: "flat", amount: 14, weight: 5, tier: "small" },

  { label: "Efficiency Adjustment Fee", type: "flat", amount: 92, weight: 6, tier: "medium" },
  { label: "Performance Variance Penalty", type: "flat", amount: 76, weight: 5, tier: "medium" },
  { label: "Alignment Deviation Charge", type: "flat", amount: 64, weight: 5, tier: "medium" },
  { label: "Suboptimal Routing Deduction", type: "flat", amount: 58, weight: 5, tier: "medium" },
  { label: "AI Oversight Subscription Fee", type: "flat", amount: 88, weight: 5, tier: "medium" },
  { label: "Predictive Risk Modeling Charge", type: "flat", amount: 72, weight: 4, tier: "medium" },
  { label: "Autonomous Compliance Audit Fee", type: "flat", amount: 96, weight: 4, tier: "medium" },
  { label: "Behavioral Pattern Analysis Cost", type: "flat", amount: 52, weight: 4, tier: "medium" },
  { label: '"Optimization Engine" Usage Fee', type: "flat", amount: 68, weight: 4, tier: "medium" },

  { label: "Mandatory 15% Management Tip", type: "percent", amount: 0.15, weight: 3, tier: "heavy" },
  { label: "Executive Bonus Allocation", type: "percent", amount: 0.12, weight: 2, tier: "heavy" },
  { label: "Unexpected Orbital Congestion Fine", type: "flat", amount: 135, weight: 2, tier: "heavy" },
  { label: "Debris Mishandling Liability Claim", type: "flat", amount: 155, weight: 2, tier: "heavy" },
  { label: "Corporate Liability Coverage Fee", type: "flat", amount: 118, weight: 2, tier: "heavy" },
  { label: '"Operational Discrepancy" Charge', type: "flat", amount: 142, weight: 2, tier: "heavy" },
];

const DEFAULT_UPGRADE_STATE = {
  thrustLevel: 0,
  repairLevel: 0,
  heatLevel: 0,
};

function weightedPick(pool) {
  const totalWeight = pool.reduce((sum, item) => sum + (item.weight || 1), 0);
  let roll = Math.random() * totalWeight;

  for (const item of pool) {
    roll -= item.weight || 1;
    if (roll <= 0) {
      return item;
    }
  }

  return pool[pool.length - 1];
}

function removePickedByLabel(pool, picked) {
  const pickedIndex = pool.findIndex((item) => item.label === picked.label);
  if (pickedIndex >= 0) {
    pool.splice(pickedIndex, 1);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resolveRunPressureContext(sessionStats) {
  const runContext = sessionStats?.runContext || {};
  const kesslerMeter = clamp(Number(runContext.kesslerMeter) || 0, 0, 100);
  const activeDebrisCount = Math.max(0, Number(runContext.activeDebrisCount) || 0);

  return {
    kesslerMeter,
    activeDebrisCount,
  };
}

function buildSystemPressureDeductions(sessionStats, grossPay) {
  const { kesslerMeter, activeDebrisCount } = resolveRunPressureContext(sessionStats);
  const deductions = [];

  if (kesslerMeter >= 75) {
    deductions.push({
      label: "Kessler Risk Adjustment",
      value: Math.max(160, Math.round(grossPay * 0.16)),
    });
  } else if (kesslerMeter >= 50) {
    deductions.push({
      label: "Orbital Hazard Premium",
      value: Math.max(96, Math.round(grossPay * 0.10)),
    });
  } else if (kesslerMeter >= 25) {
    deductions.push({
      label: "Unstable Orbit Liability Fee",
      value: Math.max(52, Math.round(grossPay * 0.05)),
    });
  }

  if (activeDebrisCount > 3) {
    const excessDebris = activeDebrisCount - 3;
    let congestionValue = 0;

    if (activeDebrisCount <= 6) {
      congestionValue = excessDebris * 16;
    } else if (activeDebrisCount <= 9) {
      congestionValue = 48 + (activeDebrisCount - 6) * 26;
    } else if (activeDebrisCount <= 13) {
      congestionValue = 126 + (activeDebrisCount - 9) * 36;
    } else {
      congestionValue = 270 + (activeDebrisCount - 13) * 52;
    }

    deductions.push({
      label: "Debris Field Handling Fee",
      value: congestionValue,
    });
  }

  return deductions;
}

function buildPerformanceDeductions(sessionStats, grossPay) {
  const repairsCompleted = sessionStats?.repairsCompleted || 0;
  const debrisCleared = sessionStats?.debrisCleared || 0;
  const totalTasks = repairsCompleted + debrisCleared;
  const performanceDeductions = [];

  if (totalTasks === 0) {
    performanceDeductions.push({
      label: "Idle Time Compensation Fee",
      value: 85,
    });
  } else if (totalTasks <= 2) {
    performanceDeductions.push({
      label: "Underperformance Adjustment",
      value: 55,
    });
  }

  if (repairsCompleted >= 5 || debrisCleared >= 4 || grossPay >= 1400) {
    performanceDeductions.push({
      label: "High Output Adjustment",
      value: Math.max(48, Math.round(grossPay * 0.08)),
    });
  }

  if (debrisCleared >= 3 && debrisCleared > repairsCompleted) {
    performanceDeductions.push({
      label: "Hazard Processing Surcharge",
      value: 42 + debrisCleared * 12,
    });
  }

  return performanceDeductions;
}

function mergeDeductions(baseDeductions, performanceDeductions) {
  return [...baseDeductions, ...performanceDeductions];
}

function buildDynamicDeductions(sessionStats, grossPay) {
  const available = [...DEDUCTION_POOL];
  const deductions = [];

  const smallPool = available.filter((item) => item.tier === "small");
  const mediumPool = available.filter((item) => item.tier === "medium");
  const heavyPool = available.filter((item) => item.tier === "heavy");

  if (smallPool.length > 0) {
    const smallPick = weightedPick(smallPool);
    deductions.push(smallPick);
    removePickedByLabel(available, smallPick);
  }

  if (mediumPool.length > 0) {
    const mediumPick = weightedPick(mediumPool);
    deductions.push(mediumPick);
    removePickedByLabel(available, mediumPick);
  }

  const extraRoll = Math.random();
  if (extraRoll < 0.7 && available.length > 0) {
    let wildcardPool = [...available];
    const alreadyHasPercent = deductions.some((item) => item.type === "percent");

    if (alreadyHasPercent) {
      wildcardPool = wildcardPool.filter((item) => item.type !== "percent");
    }

    if (wildcardPool.length > 0) {
      const wildcardPick = weightedPick(wildcardPool);
      deductions.push(wildcardPick);
      removePickedByLabel(available, wildcardPick);
    }
  }

  if (Math.random() < 0.12) {
    let brutalPool = heavyPool.filter(
      (item) => !deductions.some((picked) => picked.label === item.label),
    );

    const alreadyHasPercent = deductions.some((item) => item.type === "percent");
    if (alreadyHasPercent) {
      brutalPool = brutalPool.filter((item) => item.type !== "percent");
    }

    if (brutalPool.length > 0) {
      const brutalPick = weightedPick(brutalPool);
      deductions.push(brutalPick);
    }
  }

  const baseDeductions = deductions.map((entry) => {
    const value = entry.type === "percent"
      ? Math.round(grossPay * entry.amount)
      : entry.amount;

    return {
      label: entry.label,
      value,
    };
  });

  const performanceDeductions = buildPerformanceDeductions(sessionStats, grossPay);
  const systemPressureDeductions = buildSystemPressureDeductions(
    sessionStats,
    grossPay,
  );

  return mergeDeductions(
    mergeDeductions(baseDeductions, performanceDeductions),
    systemPressureDeductions,
  );
}

export function buildShiftSummary(sessionStats) {
  const repairsCompleted = sessionStats?.repairsCompleted || 0;
  const debrisCleared = sessionStats?.debrisCleared || 0;
  const grossPay = repairsCompleted * 180 + debrisCleared * 320;
  const deductions = buildDynamicDeductions(sessionStats, grossPay);
  const totalDeductions = deductions.reduce((sum, item) => sum + item.value, 0);
  const netPay = Math.max(0, grossPay - totalDeductions);

  return {
    repairsCompleted,
    debrisCleared,
    grossPay,
    deductions,
    totalDeductions,
    netPay,
  };
}

export function createSessionStats() {
  return {
    repairsCompleted: 0,
    debrisCleared: 0,
    runContext: {
      kesslerMeter: 0,
      activeDebrisCount: 0,
    },
  };
}

export function resetSessionStats(sessionStats) {
  sessionStats.repairsCompleted = 0;
  sessionStats.debrisCleared = 0;
  sessionStats.runContext = {
    kesslerMeter: 0,
    activeDebrisCount: 0,
  };
  return sessionStats;
}

export function updateSessionRunContext(sessionStats, runContext = {}) {
  if (!sessionStats) return sessionStats;

  sessionStats.runContext = {
    ...(sessionStats.runContext || {
      kesslerMeter: 0,
      activeDebrisCount: 0,
    }),
    ...runContext,
  };

  return sessionStats;
}

export function createShiftState() {
  return {
    terminalOpen: false,
    terminalData: null,
    stationTerminalRearm: true,
    terminalMode: "summary",
  };
}

export function createUpgradeState() {
  return { ...DEFAULT_UPGRADE_STATE };
}

export function buildUpgradeOptions(upgradeState) {
  const state = upgradeState || DEFAULT_UPGRADE_STATE;

  return [
    {
      key: "1",
      label: `THRUSTER EFFICIENCY MK.${state.thrustLevel + 1}`,
      description: "+10% thrust response",
      type: "thrust",
    },
    {
      key: "2",
      label: `REPAIR SPEED MK.${state.repairLevel + 1}`,
      description: "+10% repair speed",
      type: "repair",
    },
    {
      key: "3",
      label: `HEAT TOLERANCE MK.${state.heatLevel + 1}`,
      description: "+10% heat tolerance",
      type: "heat",
    },
  ];
}

export function setTerminalMode(shiftState, mode) {
  if (!shiftState) return shiftState;
  shiftState.terminalMode = mode;
  return shiftState;
}

export function applyShiftUpgrade({
  key,
  upgradeState,
  playerConfig,
  playerHeatState,
  playerHeatConfig,
  satellites,
}) {
  if (!upgradeState) return null;

  if (key === "1") {
    upgradeState.thrustLevel += 1;
    if (playerConfig) {
      playerConfig.baseForwardSpeed *= 1.08;
      playerConfig.maxForwardSpeed *= 1.08;
      playerConfig.boostMultiplier *= 1.03;
    }
    return { type: "thrust", level: upgradeState.thrustLevel };
  }

  if (key === "2") {
    upgradeState.repairLevel += 1;
    const repairMultiplier = Math.pow(0.9, upgradeState.repairLevel);

    if (Array.isArray(satellites)) {
      for (const satellite of satellites) {
        if (!satellite?.userData) continue;
        const baseRepairTime =
          satellite.userData.baseRepairTime || satellite.userData.repairTime || 2.6;
        satellite.userData.baseRepairTime = baseRepairTime;
        satellite.userData.repairTime = Math.max(0.9, baseRepairTime * repairMultiplier);
      }
    }

    return { type: "repair", level: upgradeState.repairLevel };
  }

  if (key === "3") {
    upgradeState.heatLevel += 1;
    if (playerHeatState) {
      playerHeatState.maxHeat *= 1.12;
    }
    if (playerHeatConfig) {
      playerHeatConfig.heatGainPerSecond *= 0.94;
    }
    return { type: "heat", level: upgradeState.heatLevel };
  }

  return null;
}

export function tryApplyTerminalUpgrade({
  key,
  shiftState,
  upgradeState,
  playerConfig,
  playerHeatState,
  playerHeatConfig,
  satellites,
}) {
  if (!shiftState?.terminalOpen || shiftState.terminalMode !== "upgrade") {
    return null;
  }

  return applyShiftUpgrade({
    key,
    upgradeState,
    playerConfig,
    playerHeatState,
    playerHeatConfig,
    satellites,
  });
}

export function updateStationTerminalState({
  shiftState,
  stationDistance,
  triggerDistance,
  rearmDistance,
  sessionStats,
  buildSummary,
}) {
  if (!shiftState) return shiftState;

  if (
    !shiftState.terminalOpen &&
    !shiftState.stationTerminalRearm &&
    stationDistance > rearmDistance
  ) {
    shiftState.stationTerminalRearm = true;
  }

  if (
    !shiftState.terminalOpen &&
    shiftState.stationTerminalRearm &&
    stationDistance <= triggerDistance
  ) {
    shiftState.terminalData = buildSummary(sessionStats);
    shiftState.terminalOpen = true;
  }

  return shiftState;
}

export function closeShiftTerminal({
  shiftState,
  sessionStats,
  refuel,
  clearTerminalUi,
}) {
  if (!shiftState?.terminalOpen) return false;

  shiftState.terminalOpen = false;
  shiftState.terminalData = null;
  shiftState.stationTerminalRearm = false;

  if (typeof refuel === "function") {
    refuel();
  }

  if (sessionStats) {
    resetSessionStats(sessionStats);
  }

  if (typeof clearTerminalUi === "function") {
    clearTerminalUi();
  }

  return true;
}