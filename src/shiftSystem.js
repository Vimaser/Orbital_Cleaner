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

const PERFORMANCE_EVALUATION_ELIGIBLE_SHIFTS = 3;
const PERFORMANCE_EVALUATION_MANDATORY_SHIFTS = 6;

const PERFORMANCE_RANKS = [
  {
    label: "Catastrophic Expense Center",
    minScore: -999999,
    note: "Your shift has been classified as a teachable financial event.",
  },
  {
    label: "Asset Recovery Scenario",
    minScore: -3600,
    note: "Corporate is currently determining whether the ship or employee is easier to replace.",
  },
  {
    label: "Executive Apology Generator",
    minScore: -3000,
    note: "Your performance has created work for people with better chairs.",
  },
  {
    label: "Corporate Liability",
    minScore: -2400,
    note: "Your employment continues only because replacement costs exceeded projections.",
  },
  {
    label: "Insurance Event",
    minScore: -1600,
    note: "Your file has been forwarded to Risk Containment for motivational review.",
  },
  {
    label: "Negative Value Asset",
    minScore: -900,
    note: "Corporate has determined your output was technically measurable.",
  },
  {
    label: "Payroll Incident",
    minScore: -300,
    note: "Your continued compensation has raised several questions.",
  },
  {
    label: "Probationary Contractor",
    minScore: 0,
    note: "Continued employment authorized. Expectations remain low.",
  },
  {
    label: "Break Even Adjacent",
    minScore: 120,
    note: "You approached profitability closely enough to confuse Accounting.",
  },
  {
    label: "Barely Billable Operator",
    minScore: 250,
    note: "You produced enough value to justify additional monitoring.",
  },
  {
    label: "Acceptable Docking Hazard",
    minScore: 380,
    note: "Your presence near company property has been conditionally approved.",
  },
  {
    label: "Certified Orbital Custodian",
    minScore: 500,
    note: "Output meets minimum sanitation standards.",
  },
  {
    label: "Low Orbit Task Sponge",
    minScore: 650,
    note: "You absorbed assignments at a rate considered useful by management.",
  },
  {
    label: "Reliable Debris Associate",
    minScore: 800,
    note: "You have demonstrated basic usefulness under unsafe conditions.",
  },
  {
    label: "Shift Quota Survivor",
    minScore: 950,
    note: "You completed enough tasks to delay the performance conversation.",
  },
  {
    label: "Productive Asset",
    minScore: 1100,
    note: "Corporate recognizes your temporary usefulness.",
  },
  {
    label: "Approved Overtime Target",
    minScore: 1325,
    note: "Your efficiency suggests you may safely be assigned more work.",
  },
  {
    label: "Senior Sanitation Operator",
    minScore: 1550,
    note: "Performance exceeds standard contract projections.",
  },
  {
    label: "Revenue Positive Human Unit",
    minScore: 1750,
    note: "Your biological overhead was offset by measurable output.",
  },
  {
    label: "Orbital Revenue Specialist",
    minScore: 1950,
    note: "Your output has become difficult to ignore and easy to tax.",
  },
  {
    label: "Shareholder Mood Stabilizer",
    minScore: 2175,
    note: "Your numbers were briefly mentioned in a meeting without disappointment.",
  },
  {
    label: "Corporate Efficiency Threat",
    minScore: 2400,
    note: "Your results have been flagged for management review.",
  },
  {
    label: "Unpaid Training Example",
    minScore: 2700,
    note: "Your performance may be shown to new hires without compensation.",
  },
  {
    label: "Executive Concern",
    minScore: 3000,
    note: "Your productivity is beginning to affect quarterly excuses.",
  },
  {
    label: "Promotion Risk Candidate",
    minScore: 3350,
    note: "Management is concerned you may ask for a title change.",
  },
  {
    label: "Window Office Candidate",
    minScore: 3700,
    note: "A window may be considered after additional deductions.",
  },
  {
    label: "Almost Salaried",
    minScore: 4150,
    note: "Corporate has identified you as vulnerable to prestige-based compensation.",
  },
  {
    label: "Potential Middle Management Material",
    minScore: 4600,
    note: "You may one day supervise people who work harder than you.",
  },
  {
    label: "Corner Office Simulation Eligible",
    minScore: 5200,
    note: "A virtual window has been provisionally approved pending budget review.",
  },
  {
    label: "Golden Parachute Adjacent",
    minScore: 6000,
    note: "Your value is high enough that failure may eventually become rewarded.",
  },
];

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

function getPerformanceRank(score) {
  let rank = PERFORMANCE_RANKS[0];

  for (const candidate of PERFORMANCE_RANKS) {
    if (score >= candidate.minScore) {
      rank = candidate;
    }
  }

  return rank;
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
  const netPay = grossPay - totalDeductions;

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
    crashes: 0,
    towFees: 0,
    runContext: {
      kesslerMeter: 0,
      activeDebrisCount: 0,
    },
  };
}

export function createContractStats() {
  return {
    shiftsCompleted: 0,
    grossPay: 0,
    netPay: 0,
    totalDeductions: 0,
    repairsCompleted: 0,
    debrisCleared: 0,
    crashes: 0,
    towFees: 0,
    bestNetShift: 0,
    highestKesslerMeter: 0,
  };
}

export function resetContractStats(contractStats) {
  if (!contractStats) return createContractStats();

  const freshStats = createContractStats();
  Object.assign(contractStats, freshStats);
  return contractStats;
}

export function updateContractStatsFromSummary(contractStats, summary = {}, sessionStats = {}) {
  if (!contractStats) return contractStats;

  const runContext = sessionStats?.runContext || {};

  contractStats.shiftsCompleted += 1;
  contractStats.grossPay += Math.max(0, Number(summary.grossPay) || 0);
  contractStats.netPay += Math.max(0, Number(summary.netPay) || 0);
  contractStats.totalDeductions += Math.max(0, Number(summary.totalDeductions) || 0);
  contractStats.repairsCompleted += Math.max(0, Number(summary.repairsCompleted) || 0);
  contractStats.debrisCleared += Math.max(0, Number(summary.debrisCleared) || 0);
  contractStats.crashes += Math.max(0, Number(sessionStats?.crashes) || 0);
  contractStats.towFees += Math.max(0, Number(sessionStats?.towFees) || 0);
  contractStats.bestNetShift = Math.max(
    contractStats.bestNetShift,
    Math.max(0, Number(summary.netPay) || 0),
  );
  contractStats.highestKesslerMeter = Math.max(
    contractStats.highestKesslerMeter,
    Math.max(0, Number(runContext.kesslerMeter) || 0),
  );

  return contractStats;
}

export function createPerformanceEvaluationState() {
  return {
    shiftsSinceEvaluation: 0,
    totalEvaluations: 0,
    lastEvaluation: null,
  };
}

export function recordCompletedShiftForEvaluation(evaluationState) {
  if (!evaluationState) return evaluationState;

  evaluationState.shiftsSinceEvaluation += 1;
  return evaluationState;
}

export function isPerformanceEvaluationEligible(evaluationState) {
  return (
    Math.max(0, Number(evaluationState?.shiftsSinceEvaluation) || 0) >=
    PERFORMANCE_EVALUATION_ELIGIBLE_SHIFTS
  );
}

export function isPerformanceEvaluationMandatory(evaluationState) {
  return (
    Math.max(0, Number(evaluationState?.shiftsSinceEvaluation) || 0) >=
    PERFORMANCE_EVALUATION_MANDATORY_SHIFTS
  );
}

export function buildPerformanceEvaluation(contractStats = createContractStats()) {
  const shiftsCompleted = Math.max(0, Number(contractStats.shiftsCompleted) || 0);
  const repairsCompleted = Math.max(0, Number(contractStats.repairsCompleted) || 0);
  const debrisCleared = Math.max(0, Number(contractStats.debrisCleared) || 0);
  const grossPay = Math.max(0, Number(contractStats.grossPay) || 0);
  const netPay = Math.max(0, Number(contractStats.netPay) || 0);
  const totalDeductions = Math.max(0, Number(contractStats.totalDeductions) || 0);
  const crashes = Math.max(0, Number(contractStats.crashes) || 0);
  const towFees = Math.max(0, Number(contractStats.towFees) || 0);
  const highestKesslerMeter = clamp(
    Number(contractStats.highestKesslerMeter) || 0,
    0,
    100,
  );

  const companyValue = grossPay + totalDeductions;
  const taskScore = repairsCompleted * 120 + debrisCleared * 145;
  const payScore = Math.round(netPay * 0.55 + companyValue * 0.18);
  const stabilityScore = Math.round((100 - highestKesslerMeter) * 4);
  const penaltyScore = crashes * 220 + towFees;
  const finalScore = taskScore + payScore + stabilityScore - penaltyScore;
  const rank = getPerformanceRank(finalScore);

  return {
    shiftsCompleted,
    repairsCompleted,
    debrisCleared,
    grossPay,
    netPay,
    totalDeductions,
    companyValue,
    crashes,
    towFees,
    bestNetShift: Math.max(0, Number(contractStats.bestNetShift) || 0),
    highestKesslerMeter,
    finalScore,
    rankLabel: rank.label,
    rankNote: rank.note,
  };
}

export function completePerformanceEvaluation({
  evaluationState,
  contractStats,
  upgradeState,
}) {
  const evaluation = buildPerformanceEvaluation(contractStats);

  if (evaluationState) {
    evaluationState.shiftsSinceEvaluation = 0;
    evaluationState.totalEvaluations += 1;
    evaluationState.lastEvaluation = evaluation;
  }

  if (contractStats) {
    resetContractStats(contractStats);
  }

  if (upgradeState) {
    resetUpgradeState(upgradeState);
  }

  return evaluation;
}

export function resetSessionStats(sessionStats) {
  sessionStats.repairsCompleted = 0;
  sessionStats.debrisCleared = 0;
  sessionStats.crashes = 0;
  sessionStats.towFees = 0;
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

export function resetUpgradeState(upgradeState) {
  if (!upgradeState) return createUpgradeState();

  upgradeState.thrustLevel = 0;
  upgradeState.repairLevel = 0;
  upgradeState.heatLevel = 0;
  return upgradeState;
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