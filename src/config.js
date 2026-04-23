

// =========================
// GLOBAL CONFIG
// =========================

export const CONFIG = {

  // =========================
  // PLAYER CONFIG
  // =========================
  player: {
    baseSpeed: 1.0,
    boostMultiplier: 1.6,
    rotationSensitivity: 1.0,
  },

  // =========================
  // FUEL CONFIG
  // =========================
  fuel: {
    max: 100,
    lowThreshold: 25,
    baseDrainPerSecond: 0.22,
    boostDrainPerSecond: 0.42,
  },

  // =========================
  // SATELLITE CONFIG
  // =========================
  satellites: {
    repairTime: 2.6,
    repairDistance: 3.9,
    repairAlignment: 0.8,

    // Rebreak timing (ms)
    rebreakMinMs: 60000,
    rebreakMaxMs: 300000,

    // Burst effects (ms)
    repairBurstMs: 450,
    ringBurstMs: 900,

    // Visual tuning
    beaconDamagedIntensity: 2.4,
    beaconRepairedIntensity: 1.65,
    ringLockOpacity: 0.9,
    ringBurstScale: 1.4,
  },

  // =========================
  // DEBRIS CONFIG
  // =========================
  debris: {
    spawnRate: 1.0,
    maxCount: 20,
  },

  // =========================
  // STATION CONFIG
  // =========================
  station: {
    triggerDistance: 10,
    rearmDistance: 20,
  },

  // =========================
  // HUD CONFIG
  // =========================
  hud: {
    fuelBarWidth: 120,
    fuelBarHeight: 10,
  },
};