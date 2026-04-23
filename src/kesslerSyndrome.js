const DEFAULT_KESSLER_CONFIG = {
  safeFunctionalThreshold: 1,
  risePerFunctionalDeficit: 1.35,
  debrisPressureWeight: 0.015,
  naturalDecay: 4.25,
  elevatedAt: 30,
  criticalAt: 72,
  maxMeter: 100,
  minMeter: 0,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getFunctionalSatelliteCount(inputs) {
  const functionalSatellites = Number(inputs.functionalSatellites);
  if (Number.isFinite(functionalSatellites)) {
    return Math.max(0, functionalSatellites);
  }

  const totalSatellites = Number(inputs.totalSatellites);
  const unrepairedSatellites = Number(inputs.unrepairedSatellites);

  if (Number.isFinite(totalSatellites) && Number.isFinite(unrepairedSatellites)) {
    return Math.max(0, totalSatellites - unrepairedSatellites);
  }

  return null;
}

function getFunctionalDeficit(functionalSatellites, config) {
  if (!Number.isFinite(functionalSatellites)) {
    return 0;
  }

  return Math.max(0, config.safeFunctionalThreshold - functionalSatellites);
}

function getStatusForMeter(meter, config) {
  if (meter >= config.criticalAt) {
    return "critical";
  }

  if (meter >= config.elevatedAt) {
    return "elevated";
  }

  return "stable";
}

export function createKesslerSyndrome(userConfig = {}) {
  const config = {
    ...DEFAULT_KESSLER_CONFIG,
    ...userConfig,
  };

  return {
    config,
    meter: 0,
    pressure: 0,
    status: "stable",
    breachTime: 0,
    functionalSatellites: null,
    functionalDeficit: 0,
    lastRiseRate: 0,
    lastDecayRate: 0,
  };
}

export function resetKesslerSyndrome(system) {
  if (!system) return null;

  system.meter = 0;
  system.pressure = 0;
  system.status = "stable";
  system.breachTime = 0;
  system.functionalSatellites = null;
  system.functionalDeficit = 0;
  system.lastRiseRate = 0;
  system.lastDecayRate = 0;

  return system;
}

export function updateKesslerSyndrome(system, inputs = {}) {
  if (!system?.config) {
    return system;
  }

  const config = system.config;
  const dt = Math.max(0, Number(inputs.dt) || 0);
  const activeDebrisCount = Math.max(0, Number(inputs.activeDebrisCount) || 0);
  const functionalSatellites = getFunctionalSatelliteCount(inputs);
  const functionalDeficit = getFunctionalDeficit(functionalSatellites, config);

  system.functionalSatellites = functionalSatellites;
  system.functionalDeficit = functionalDeficit;
  system.lastRiseRate = 0;
  system.lastDecayRate = 0;

  if (functionalDeficit > 0) {
    const riseRate =
      functionalDeficit * config.risePerFunctionalDeficit +
      activeDebrisCount * config.debrisPressureWeight;

    system.meter += riseRate * dt;
    system.breachTime += dt;
    system.lastRiseRate = riseRate;
  } else {
    const decayRate = config.naturalDecay;
    system.meter -= decayRate * dt;
    system.breachTime = Math.max(0, system.breachTime - dt);
    system.lastDecayRate = decayRate;
  }

  system.meter = clamp(system.meter, config.minMeter, config.maxMeter);
  system.pressure = clamp(system.meter / config.maxMeter, 0, 1);
  system.status = getStatusForMeter(system.meter, config);

  return system;
}

export function applyKesslerImpulse(system, delta = 0) {
  if (!system?.config) {
    return system;
  }

  system.meter = clamp(
    system.meter + (Number(delta) || 0),
    system.config.minMeter,
    system.config.maxMeter,
  );
  system.pressure = clamp(system.meter / system.config.maxMeter, 0, 1);
  system.status = getStatusForMeter(system.meter, system.config);

  return system;
}

export function getFunctionalDeficitState(system) {
  return Math.max(0, system?.functionalDeficit || 0);
}

export function getKesslerPressure(system) {
  return clamp(system?.pressure || 0, 0, 1);
}

export function getKesslerMeter(system) {
  return clamp(system?.meter || 0, 0, system?.config?.maxMeter || 100);
}

export function getKesslerSpawnMultiplier(system) {
  const pressure = getKesslerPressure(system);
  return 1 + Math.pow(pressure, 2.35) * 1.15;
}

export function isKesslerElevated(system) {
  return (system?.status || "stable") === "elevated";
}

export function isKesslerCritical(system) {
  return (system?.status || "stable") === "critical";
}

export function getKesslerUIState(system) {
  return {
    meter: getKesslerMeter(system),
    pressure: getKesslerPressure(system),
    status: system?.status || "stable",
    breachTime: Math.max(0, system?.breachTime || 0),
    functionalSatellites:
      system?.functionalSatellites == null
        ? null
        : Math.max(0, system.functionalSatellites),
    functionalDeficit: getFunctionalDeficitState(system),
  };
}
