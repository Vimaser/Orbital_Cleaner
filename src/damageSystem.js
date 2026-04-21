const DEFAULT_DAMAGE_STATE = {
  crashes: 0,
  atmosphereExposureSeconds: 0,
  fuelDepleted: false,
  towedThisShift: false,
}

export function createDamageState() {
  return { ...DEFAULT_DAMAGE_STATE }
}

export function resetDamageState(damageState) {
  if (!damageState) return createDamageState()

  damageState.crashes = 0
  damageState.atmosphereExposureSeconds = 0
  damageState.fuelDepleted = false
  damageState.towedThisShift = false
  return damageState
}

export function registerCrash(damageState, count = 1) {
  if (!damageState) return null
  damageState.crashes += Math.max(0, count)
  return damageState.crashes
}

export function trackAtmosphereExposure(damageState, dt, isExposed) {
  if (!damageState || !isExposed) return damageState?.atmosphereExposureSeconds ?? 0

  damageState.atmosphereExposureSeconds += Math.max(0, dt || 0)
  return damageState.atmosphereExposureSeconds
}

export function markFuelDepleted(damageState) {
  if (!damageState) return false
  damageState.fuelDepleted = true
  damageState.towedThisShift = true
  return true
}

export function clearFuelEmergency(damageState) {
  if (!damageState) return false
  damageState.fuelDepleted = false
  return true
}

export function buildDamageReport(damageState) {
  const state = damageState || DEFAULT_DAMAGE_STATE

  const crashCost = state.crashes * 120
  const atmosphereCost = Math.round(state.atmosphereExposureSeconds * 3)
  const towCost = state.towedThisShift ? 900 : 0
  const totalDamageCost = crashCost + atmosphereCost + towCost

  return {
    crashes: state.crashes,
    atmosphereExposureSeconds: state.atmosphereExposureSeconds,
    fuelDepleted: state.fuelDepleted,
    towedThisShift: state.towedThisShift,
    crashCost,
    atmosphereCost,
    towCost,
    totalDamageCost,
  }
}