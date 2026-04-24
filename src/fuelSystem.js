export const FUEL_TOW_COST = 900;
export const FUEL_EMERGENCY_MAINTENANCE_COST = Math.round(FUEL_TOW_COST * 0.25);

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
    emergencyPower: false,
    depletionHandled: false,
    emergencyRecovered: false,
    towRequested: false,
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

  const wasEmpty = fuelState.empty;
  fuelState.empty = fuelState.current <= 0;
  fuelState.low = fuelState.current <= fuelState.lowThreshold;

  if (fuelState.empty && !wasEmpty) {
    enterEmergencyPower(fuelState);
  }
}

export function enterEmergencyPower(fuelState) {
  if (!fuelState) return;

  fuelState.current = 0;
  fuelState.empty = true;
  fuelState.low = true;
  fuelState.emergencyPower = true;
  fuelState.emergencyRecovered = false;
  fuelState.towRequested = false;
}

export function isEmergencyPowerActive(fuelState) {
  return Boolean(fuelState?.emergencyPower);
}

export function requestEmergencyTow(fuelState) {
  if (!fuelState) return 0;

  fuelState.towRequested = true;
  fuelState.emergencyPower = false;
  fuelState.emergencyRecovered = false;
  fuelState.depletionHandled = true;

  return FUEL_TOW_COST;
}

export function markEmergencyRecovery(fuelState) {
  if (!fuelState) return 0;

  fuelState.emergencyRecovered = true;
  fuelState.emergencyPower = false;
  fuelState.towRequested = false;
  fuelState.depletionHandled = true;

  return FUEL_EMERGENCY_MAINTENANCE_COST;
}

export function getFuelRecoveryCost(fuelState) {
  if (!fuelState) return 0;

  if (fuelState.towRequested) {
    return FUEL_TOW_COST;
  }

  if (fuelState.emergencyRecovered) {
    return FUEL_EMERGENCY_MAINTENANCE_COST;
  }

  return 0;
}

export function canBoost(fuelState) {
  if (!fuelState) return false;
  return !fuelState.empty && !fuelState.emergencyPower;
}

export function refuelFuelState(fuelState) {
  if (!fuelState) return;

  fuelState.current = fuelState.max;
  fuelState.used = 0;
  fuelState.empty = false;
  fuelState.low = false;
  fuelState.emergencyPower = false;
  fuelState.depletionHandled = false;
  fuelState.emergencyRecovered = false;
  fuelState.towRequested = false;
}