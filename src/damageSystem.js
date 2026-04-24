export const FULL_TOW_COST = 900;
export const EMERGENCY_MAINTENANCE_COST = Math.round(FULL_TOW_COST * 0.25);

const DEFAULT_DAMAGE_STATE = {
  crashes: 0,
  atmosphereExposureSeconds: 0,
  fuelDepleted: false,
  towedThisShift: false,
  emergencyMaintenanceThisShift: false,
  towCost: 0,
  maintenanceCost: 0,
};

export function createDamageState() {
  return { ...DEFAULT_DAMAGE_STATE };
}

export function resetDamageState(damageState) {
  if (!damageState) return createDamageState();

  damageState.crashes = 0;
  damageState.atmosphereExposureSeconds = 0;
  damageState.fuelDepleted = false;
  damageState.towedThisShift = false;
  damageState.emergencyMaintenanceThisShift = false;
  damageState.towCost = 0;
  damageState.maintenanceCost = 0;
  return damageState;
}

export function registerCrash(damageState, count = 1) {
  if (!damageState) return null;
  damageState.crashes += Math.max(0, count);
  return damageState.crashes;
}

export function trackAtmosphereExposure(damageState, dt, isExposed) {
  if (!damageState || !isExposed) {
    return damageState?.atmosphereExposureSeconds ?? 0;
  }

  damageState.atmosphereExposureSeconds += Math.max(0, dt || 0);
  return damageState.atmosphereExposureSeconds;
}

// Full tow (player chose tow or forced tow)
export function markFuelDepleted(damageState, towCostOverride = FULL_TOW_COST) {
  if (!damageState) return false;

  damageState.fuelDepleted = true;
  damageState.towedThisShift = true;
  damageState.emergencyMaintenanceThisShift = false;
  damageState.towCost = Math.max(0, Number(towCostOverride ?? FULL_TOW_COST));
  damageState.maintenanceCost = 0;
  return true;
}

// Successful limp-home recovery (reduced fee)
export function markEmergencyMaintenance(
  damageState,
  maintenanceCostOverride = EMERGENCY_MAINTENANCE_COST,
) {
  if (!damageState) return false;

  damageState.fuelDepleted = true;
  damageState.towedThisShift = false;
  damageState.emergencyMaintenanceThisShift = true;
  damageState.towCost = 0;
  damageState.maintenanceCost = Math.max(
    0,
    Number(maintenanceCostOverride ?? EMERGENCY_MAINTENANCE_COST),
  );
  return true;
}

export function clearFuelEmergency(damageState) {
  if (!damageState) return false;
  damageState.fuelDepleted = false;
  return true;
}

export function buildDamageReport(damageState) {
  const state = damageState || DEFAULT_DAMAGE_STATE;

  const crashCost = state.crashes * 120;
  const atmosphereCost = Math.round(state.atmosphereExposureSeconds * 3);
  const towCost = Math.max(0, Number(state.towCost ?? 0));
  const maintenanceCost = Math.max(0, Number(state.maintenanceCost ?? 0));
  const fuelServiceCost = towCost + maintenanceCost;
  const totalDamageCost = crashCost + atmosphereCost + fuelServiceCost;

  return {
    crashes: state.crashes,
    atmosphereExposureSeconds: state.atmosphereExposureSeconds,
    fuelDepleted: state.fuelDepleted,
    towedThisShift: state.towedThisShift,
    emergencyMaintenanceThisShift: state.emergencyMaintenanceThisShift,
    crashCost,
    atmosphereCost,
    towCost,
    maintenanceCost,
    fuelServiceCost,
    totalDamageCost,
  };
}