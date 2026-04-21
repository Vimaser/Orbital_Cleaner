

// fuelSystem.js

export function createFuelState(config = {}) {
  const {
    max = 100,
    lowThreshold = 25,
  } = config;

  return {
    current: max,
    max,
    lowThreshold,
    empty: false,
    low: false,
    used: 0,
  };
}

export function updateFuelSystem(fuelState, dt, isBoosting, config = {}) {
  const {
    baseDrainPerSecond = 2,
    boostDrainPerSecond = 8,
  } = config;

  if (!fuelState) return;

  const drainRate = isBoosting
    ? baseDrainPerSecond + boostDrainPerSecond
    : baseDrainPerSecond;

  const drainAmount = drainRate * dt;

  fuelState.current = Math.max(0, fuelState.current - drainAmount);
  fuelState.used = fuelState.max - fuelState.current;

  fuelState.empty = fuelState.current <= 0;
  fuelState.low = fuelState.current <= fuelState.lowThreshold;
}

export function canBoost(fuelState) {
  if (!fuelState) return false;
  return !fuelState.empty;
}

export function refuelFuelState(fuelState) {
  if (!fuelState) return;

  fuelState.current = fuelState.max;
  fuelState.used = 0;
  fuelState.empty = false;
  fuelState.low = false;
}