export function updateScan({
  debrisList,
  player,
  playerState,
  station,
  scanRadius,
  dt,
  setDebrisTracked,
  updateDebrisTracking,
  updateDebrisInterceptChance,
  updateDebrisThreatLevel,
}) {
  if (!debrisList?.length) return

  for (const debris of debrisList) {
    if (!debris?.userData?.active) continue

    const distance = player.position.distanceTo(debris.position)

    if (distance <= scanRadius && !debris.userData.tracked) {
      setDebrisTracked(debris)
    }

    updateDebrisTracking(debris, dt)
    updateDebrisInterceptChance(
      debris,
      player.position,
      playerState.forward,
      playerState.radiusCurrent,
    )
    updateDebrisThreatLevel(debris, station.position)

    if (debris.material) {
      if (debris.userData.tracked) {
        debris.material.opacity = 1
        debris.material.emissiveIntensity = 1.8
      } else {
        debris.material.opacity = 0.22
        debris.material.emissiveIntensity = 0.5
      }
    }
  }
}

export function selectPrimaryDebris({
  debrisList,
  player,
  playerState,
  previousTarget,
}) {
  if (!debrisList?.length || !player || !playerState?.forward) return null

  // Always prioritize an attached debris so burn / stability HUD stays on the object
  // the player is currently towing.
  const attachedDebris = debrisList.find(
    (debris) => debris?.userData?.active && debris?.userData?.attached,
  )
  if (attachedDebris) {
    return attachedDebris
  }

  const scoreDebris = (debris) => {
    if (!debris?.userData?.active) return -Infinity
    if (!debris?.userData?.tracked) return -Infinity

    const toDebris = debris.position.clone().sub(player.position)
    const distance = toDebris.length()
    if (distance <= 0.0001) return -Infinity

    const directionToDebris = toDebris.clone().normalize()
    const forwardAlignment = directionToDebris.dot(playerState.forward)

    // Ignore debris well outside the player view / capture cone.
    if (forwardAlignment < 0.08) return -Infinity

    let score = forwardAlignment * 2.8 - distance * 0.03

    // Sticky target bonus so the target does not jump around constantly.
    if (debris === previousTarget) {
      score += 0.45
    }

    return score
  }

  let best = null
  let bestScore = -Infinity

  for (const debris of debrisList) {
    const score = scoreDebris(debris)
    if (score > bestScore) {
      best = debris
      bestScore = score
    }
  }

  if (
    previousTarget?.userData?.active &&
    previousTarget?.userData?.tracked &&
    !previousTarget?.userData?.attached
  ) {
    const previousScore = scoreDebris(previousTarget)

    // Keep the previous target unless a new target is meaningfully better.
    if (previousScore > -Infinity && best && best !== previousTarget) {
      if (bestScore - previousScore < 0.28) {
        return previousTarget
      }
    }

    if (previousScore > -Infinity && (!best || bestScore <= previousScore)) {
      return previousTarget
    }
  }

  return best
}
