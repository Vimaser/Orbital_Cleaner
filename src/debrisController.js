import * as THREE from 'three'
import { spawnBurnupExplosion } from './effects.js'
export const DEBRIS_CONTROLLER_TUNING = {
  captureDistance: 2.9,
  captureAlignment: 0.74,
  captureInterceptChance: 50,
  captureHoldTime: 0.55,
  targetingVisibleDistance: 7.5,
  targetingFullLockAlignment: 0.9,
  targetingVerticalScale: 0.35,
  targetingHorizontalScale: 0.35,
  attachGraceDuration: 0.45,
  attachGraceStrainMultiplier: 0.25,
  headingChangeDeadzone: 0.006,
  headingChangeWeight: 5.4,
  speedChangeDeadzone: 0.03,
  speedChangeWeight: 2.1,
  calmRecoveryRate: 0.12,
  stabilityRecoveryAlignment: 0.9,
  stabilityRecoveryRate: 0.08,
  stabilityRecoveryHeatSafeRatio: 0.45,
  stabilityRecoveryTowLagSafeRatio: 0.18,
  stabilityRecoveryTurnSafeThreshold: 0.12,
  targetingRingVisibleDistance: 6.5,
  targetingRingScaleMin: 0.85,
  targetingRingScaleMax: 1.85,
  towLagMaxDistance: 2.4,
  towLagDeadzoneRatio: 0.38,
  towLagInstabilityWeight: 0.8,
  headingInstabilityWeight: 0.35,
  burnDisposalAlignment: 0.84,
  burnDisposalTurnDamping: 0.45,
  burnDisposalRecoveryRate: 0.12,
  burnDisposalHeatMinRatio: 0.3,
  satelliteCollisionDistance: 3.2,
  cascadeSpawnLimit: 1,
  cascadeRiskIncrease: 12,
}


function getNextDebrisSize(size) {
  const normalized = String(size ?? '').toUpperCase()
  if (normalized === 'LARGE') return 'MEDIUM'
  if (normalized === 'MEDIUM') return 'SMALL'
  return null
}

function getDebrisSizeFeel(size) {
  const normalized = String(size ?? 'MEDIUM').toUpperCase()

  if (normalized === 'SMALL') {
    return {
      captureDistanceBonus: 0.18,
      captureAlignmentBonus: -0.03,
      captureRateMultiplier: 1.12,
      towLagMultiplier: 0.82,
      turnInstabilityMultiplier: 0.84,
      recoveryMultiplier: 1.12,
    }
  }

  if (normalized === 'LARGE') {
    return {
      captureDistanceBonus: 0.32,
      captureAlignmentBonus: 0.035,
      captureRateMultiplier: 0.88,
      towLagMultiplier: 1.22,
      turnInstabilityMultiplier: 1.22,
      recoveryMultiplier: 0.82,
    }
  }

  return {
    captureDistanceBonus: 0.18,
    captureAlignmentBonus: 0,
    captureRateMultiplier: 1,
    towLagMultiplier: 1,
    turnInstabilityMultiplier: 1,
    recoveryMultiplier: 1,
  }
}

function updateDebrisRingPair({
  debris,
  player,
  distance,
  alignment,
  captureWindowOpen,
  dt,
}) {
  const debrisRing = debris?.userData?.targetRing;
  const playerRing = player?.userData?.playerTargetRing;
  const isPrimaryTarget = player?.userData?.primaryTargetDebris === debris;

  if (!debrisRing || !playerRing) return;

  const visible =
    debris.userData.active &&
    debris.userData.tracked &&
    !debris.userData.attached &&
    distance <= DEBRIS_CONTROLLER_TUNING.targetingRingVisibleDistance;

  debrisRing.visible = visible;

  if (!isPrimaryTarget) {
    return;
  }

  playerRing.visible = visible;

  if (!visible) return;

  debrisRing.lookAt(player.position);
  playerRing.lookAt(debris.position);

  debrisRing.rotation.z += dt * 1.15;
  playerRing.rotation.z -= dt * 1.45;

  const rangeAlpha = THREE.MathUtils.clamp(
    1 - distance / DEBRIS_CONTROLLER_TUNING.targetingRingVisibleDistance,
    0,
    1,
  );

  const alignAlpha = THREE.MathUtils.clamp(
    (alignment - DEBRIS_CONTROLLER_TUNING.captureAlignment) /
      Math.max(
        0.0001,
        1 - DEBRIS_CONTROLLER_TUNING.captureAlignment,
      ),
    0,
    1,
  );

  const ringScale = THREE.MathUtils.lerp(
    DEBRIS_CONTROLLER_TUNING.targetingRingScaleMax,
    DEBRIS_CONTROLLER_TUNING.targetingRingScaleMin,
    rangeAlpha,
  );

  debrisRing.scale.setScalar(ringScale);
  playerRing.scale.setScalar(ringScale);

  if (captureWindowOpen && alignAlpha > 0.9) {
    debrisRing.material.color.set(0x4dff88);
    playerRing.material.color.set(0x4dff88);
  } else {
    debrisRing.material.color.setRGB(
      1.0,
      0.78 + alignAlpha * 0.18,
      0.3 + alignAlpha * 0.18,
    );

    playerRing.material.color.setRGB(
      0.22,
      0.68 + alignAlpha * 0.2,
      1.0 - alignAlpha * 0.18,
    );
  }
}

function updateDebrisTargetingUi({
  debris,
  player,
  playerState,
  distance,
  alignment,
  captureWindowOpen,
}) {
  if (!debris?.userData || !player || !playerState?.forward) {
    return
  }

  const playerUp = player.position.clone().normalize()
  let playerRight = new THREE.Vector3().crossVectors(playerState.forward, playerUp)
  if (playerRight.lengthSq() <= 0.0001) {
    playerRight = new THREE.Vector3(1, 0, 0)
  } else {
    playerRight.normalize()
  }

  const toDebris = debris.position.clone().sub(player.position)
  const distanceSafe = Math.max(0.0001, toDebris.length())
  const directionToDebris = toDebris.clone().normalize()

  const verticalOffset = directionToDebris.dot(playerUp)
  const horizontalOffset = directionToDebris.dot(playerRight)

  const rangeRatio = THREE.MathUtils.clamp(
    1 - distance / DEBRIS_CONTROLLER_TUNING.targetingVisibleDistance,
    0,
    1,
  )
  const alignmentRatio = THREE.MathUtils.clamp(
    (alignment - DEBRIS_CONTROLLER_TUNING.captureAlignment) /
      Math.max(
        0.0001,
        DEBRIS_CONTROLLER_TUNING.targetingFullLockAlignment -
          DEBRIS_CONTROLLER_TUNING.captureAlignment,
      ),
    0,
    1,
  )

  debris.userData.targetingUi = {
    visible:
      debris.userData.active &&
      debris.userData.tracked &&
      !debris.userData.attached &&
      distance <= DEBRIS_CONTROLLER_TUNING.targetingVisibleDistance,
    attached: !!debris.userData.attached,
    captureWindowOpen: !!captureWindowOpen,
    distance,
    rangeRatio,
    alignment,
    alignmentRatio,
    interceptChance: debris.userData.interceptChance ?? 0,
    verticalOffset,
    horizontalOffset,
    verticalNormalized: THREE.MathUtils.clamp(
      verticalOffset / DEBRIS_CONTROLLER_TUNING.targetingVerticalScale,
      -1,
      1,
    ),
    horizontalNormalized: THREE.MathUtils.clamp(
      horizontalOffset / DEBRIS_CONTROLLER_TUNING.targetingHorizontalScale,
      -1,
      1,
    ),
    solidLock: !!captureWindowOpen && alignmentRatio >= 0.9,
    lockStrength: THREE.MathUtils.clamp(
      alignmentRatio * 0.7 + rangeRatio * 0.3,
      0,
      1,
    ),
    distanceSafe,
  }
}

function updateDebrisStabilityRing({ debris, player, dt }) {
  const stabilityRing = debris?.userData?.stabilityRing
  if (!stabilityRing || !player) return

  const attached = !!debris.userData.attached
  stabilityRing.visible = attached

  if (!attached) {
    return
  }

  stabilityRing.lookAt(player.position)
  stabilityRing.rotation.z += dt * 0.9

  const stability = THREE.MathUtils.clamp(debris.userData.stability ?? 1, 0, 1)
  const instability = 1 - stability
  const time = performance.now() * 0.001

  let color = new THREE.Color(0x4dff88)
  if (stability <= 0.15) {
    color = new THREE.Color(0xff3333)
  } else if (stability <= 0.3) {
    color = new THREE.Color(0xff7a1a)
  } else if (stability <= 0.6) {
    color = new THREE.Color(0xffd24d)
  }
  stabilityRing.material.color.copy(color)
  stabilityRing.material.opacity = THREE.MathUtils.lerp(0.52, 0.95, instability)

  const pulseSpeed = THREE.MathUtils.lerp(1.25, 7.25, instability)
  const pulseStrength = THREE.MathUtils.lerp(0.015, 0.16, instability)
  const pulse = Math.sin(time * pulseSpeed) * pulseStrength
  stabilityRing.scale.setScalar(1 + pulse)

  const position = stabilityRing.geometry.attributes.position
  const base = stabilityRing.userData.basePositions
  const baseRadius = stabilityRing.userData.baseRadius ?? 1.48
  const waveCount = Math.round(THREE.MathUtils.lerp(6, 18, instability))
  const waveAmount = THREE.MathUtils.lerp(0, 0.28, instability)

  for (let i = 0; i < position.count; i += 1) {
    const baseX = base[i * 3]
    const baseY = base[i * 3 + 1]
    const angle = Math.atan2(baseY, baseX)
    const wave = Math.sin(angle * waveCount + time * pulseSpeed) * waveAmount
    const radius = baseRadius + wave

    position.setXYZ(i, Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
  }

  position.needsUpdate = true
}

function removeDebrisFromScene(scene, debris) {
  if (debris.userData?.guideLine) {
    scene.remove(debris.userData.guideLine)
  }
  scene.remove(debris)
}

function spawnReplacementDebris({
  scene,
  debris,
  planetRadius,
  createDebris,
  cascadeCount = 0,
}) {
  const nextSize = getNextDebrisSize(debris.userData?.size)

  if (!nextSize) {
    return null
  }

  const newDebris = createDebris(planetRadius, {
    size: nextSize,
    cascadeCount,
    originalSize: debris.userData.originalSize,
    terminalPayout: debris.userData.terminalPayout,
    debrisChainId: debris.userData.debrisChainId,
    payoutAwarded: debris.userData.payoutAwarded,
  })

  newDebris.position.copy(debris.position)
  newDebris.userData.captureProgress = 0
  newDebris.userData.cascadeCount = cascadeCount

  if (debris.userData?.direction && newDebris.userData?.direction) {
    newDebris.userData.direction.copy(debris.userData.direction)
  }

  scene.add(newDebris)

  if (newDebris.userData?.guideLine) {
    scene.add(newDebris.userData.guideLine)
  }

  return newDebris
}

export function updateDebrisController({
  scene,
  debris,
  player,
  playerState,
  planetRadius,
  dt,
  createDebris,
  attachDebris,
  disposeDebris,
  updateDebrisStability,
  updateDebrisHeat,
  controlStrain = {},
  satellites = [],
  damageSatellite,
  addOrbitalRisk,
  onDebrisCascade,
}) {
  if (!debris || !debris.userData) {
    return debris
  }

  if (typeof debris.userData.captureProgress !== 'number') {
    debris.userData.captureProgress = 0
  }

  if (typeof debris.userData.cascadeCount !== 'number') {
    debris.userData.cascadeCount = 0
  }

  if (!debris.userData.targetingUi) {
    debris.userData.targetingUi = {
      visible: false,
      attached: false,
      captureWindowOpen: false,
      distance: Infinity,
      rangeRatio: 0,
      alignment: 0,
      alignmentRatio: 0,
      interceptChance: 0,
      verticalOffset: 0,
      horizontalOffset: 0,
      verticalNormalized: 0,
      horizontalNormalized: 0,
      solidLock: false,
      lockStrength: 0,
      distanceSafe: 1,
    }
  }

  if (
    !debris.userData.attached &&
    debris.userData.tracked &&
    debris.userData.active
  ) {
    const distance = player.position.distanceTo(debris.position)
    const alignment = playerState.forward.dot(debris.userData.direction)

    const sizeFeel = getDebrisSizeFeel(debris.userData.size)
    const effectiveCaptureDistance =
      DEBRIS_CONTROLLER_TUNING.captureDistance + sizeFeel.captureDistanceBonus
    const effectiveCaptureAlignment = THREE.MathUtils.clamp(
      DEBRIS_CONTROLLER_TUNING.captureAlignment + sizeFeel.captureAlignmentBonus,
      0,
      0.96,
    )

    const captureWindowOpen =
      distance < effectiveCaptureDistance &&
      alignment > effectiveCaptureAlignment &&
      debris.userData.interceptChance >= DEBRIS_CONTROLLER_TUNING.captureInterceptChance

    updateDebrisTargetingUi({
      debris,
      player,
      playerState,
      distance,
      alignment,
      captureWindowOpen,
    })

    updateDebrisRingPair({
      debris,
      player,
      distance,
      alignment,
      captureWindowOpen,
      dt,
    })

    if (captureWindowOpen) {
      debris.userData.captureProgress += dt * sizeFeel.captureRateMultiplier
    } else {
      debris.userData.captureProgress = 0
    }

    if (debris.userData.captureProgress >= DEBRIS_CONTROLLER_TUNING.captureHoldTime) {
      debris.userData.captureProgress = 0
      attachDebris(debris)
      debris.userData.attachGraceTime = DEBRIS_CONTROLLER_TUNING.attachGraceDuration
      debris.userData.lastAttachForward = playerState.forward.clone()
      debris.userData.lastAttachSpeed = playerState.velocity?.length?.() ?? 0
    }
  }

  if (!debris.userData.attached) {
    debris.userData.targetingUi.attached = false
  }

  if (debris.userData.attached) {
    const headingAlignment = THREE.MathUtils.clamp(
      playerState.forward.dot(debris.userData.direction),
      -1,
      1,
    )
    const alignment = Math.max(0, headingAlignment)
    const sizeFeel = getDebrisSizeFeel(debris.userData.size)
    const heatSafeRatio = debris.userData.heat / Math.max(0.0001, debris.userData.burnThreshold)
    const burnRadius = planetRadius + 7
    const inBurnZone = playerState.radiusCurrent < burnRadius
    if (!debris.userData.visual) {
      debris.userData.visual = {}
    }

    const heatRatio = THREE.MathUtils.clamp(
      debris.userData.heat / Math.max(0.0001, debris.userData.burnThreshold),
      0,
      1,
    )

    const burnDepth = THREE.MathUtils.clamp(
      1 - playerState.radiusCurrent / burnRadius,
      0,
      1,
    )
    const offsetDir = player.position.clone().normalize()
    const followOffset = offsetDir.clone().multiplyScalar(-1.5)
    const targetTowPosition = player.position.clone().add(followOffset)
    const towLagDistance = debris.position.distanceTo(targetTowPosition)
    const towLagRatio = THREE.MathUtils.clamp(
      towLagDistance / DEBRIS_CONTROLLER_TUNING.towLagMaxDistance,
      0,
      1,
    )
    const effectiveTowLagRatio =
      Math.max(0, towLagRatio - DEBRIS_CONTROLLER_TUNING.towLagDeadzoneRatio) *
      sizeFeel.towLagMultiplier

    debris.userData.targetingUi = {
      ...debris.userData.targetingUi,
      visible: false,
      attached: true,
      captureWindowOpen: false,
      distance: player.position.distanceTo(debris.position),
      rangeRatio: 1,
      alignment,
      alignmentRatio: 1,
      interceptChance: debris.userData.interceptChance ?? 0,
      verticalOffset: 0,
      horizontalOffset: 0,
      verticalNormalized: 0,
      horizontalNormalized: 0,
      solidLock: true,
      lockStrength: 1,
      distanceSafe: Math.max(0.0001, player.position.distanceTo(debris.position)),
    }

    if (debris.userData.targetRing) {
      debris.userData.targetRing.visible = false
    }

    if (
      player?.userData?.playerTargetRing &&
      player?.userData?.primaryTargetDebris === debris
    ) {
      player.userData.playerTargetRing.visible = false
    }

    updateDebrisStabilityRing({
      debris,
      player,
      dt,
    })

    debris.userData.visual.heatRatio = heatRatio
    debris.userData.visual.burnDepth = burnDepth
    debris.userData.visual.inBurnZone = inBurnZone

    const collidedSatellite = satellites.find((satellite) => {
      if (!satellite?.userData?.active) {
        return false
      }

      const distanceToSatellite = debris.position.distanceTo(satellite.position)
      return distanceToSatellite <= DEBRIS_CONTROLLER_TUNING.satelliteCollisionDistance
    })

    if (collidedSatellite) {
      const nextCascadeCount = (debris.userData.cascadeCount ?? 0) + 1
      const canSpawnCascadeDebris =
        nextCascadeCount <= DEBRIS_CONTROLLER_TUNING.cascadeSpawnLimit

      damageSatellite?.(collidedSatellite, {
        source: 'debrisCollision',
        debrisSize: debris.userData.size,
      })

      addOrbitalRisk?.(DEBRIS_CONTROLLER_TUNING.cascadeRiskIncrease)
      onDebrisCascade?.({
        debris,
        satellite: collidedSatellite,
        cascadeCount: nextCascadeCount,
        riskIncrease: DEBRIS_CONTROLLER_TUNING.cascadeRiskIncrease,
      })

      debris.userData.disposeReason = 'collision'
      disposeDebris?.(debris)
      removeDebrisFromScene(scene, debris)

      if (canSpawnCascadeDebris) {
        return (
          spawnReplacementDebris({
            scene,
            debris,
            planetRadius,
            createDebris,
            cascadeCount: nextCascadeCount,
          }) || null
        )
      }

      return null
    }

    // Burning debris should remain a viable early disposal path if the player is
    // flying smoothly. In the burn zone, good alignment damps instability and
    // gives a little extra stability recovery instead of making burn runs feel
    // self-defeating.
    const isTurningInput = !!controlStrain.isTurningInput
    const isThrottleChanging = !!controlStrain.isThrottleChanging
    const isBoosting = !!controlStrain.isBoosting

    let turnIntensity = 0

    if (isTurningInput) {
      turnIntensity += 0.95
    }

    if (isThrottleChanging) {
      turnIntensity += 0.45
    }

    if (isBoosting) {
      turnIntensity += 0.18
    }

    if (inBurnZone) {
      turnIntensity += 0.35
    }

    if (effectiveTowLagRatio > 0.18) {
      turnIntensity += effectiveTowLagRatio * 0.25
    }

    turnIntensity *= sizeFeel.turnInstabilityMultiplier

    const isCalmTow =
      !isTurningInput &&
      !isThrottleChanging &&
      !isBoosting &&
      !inBurnZone

    if (isCalmTow) {
      turnIntensity = 0
      debris.userData.stability = Math.min(
        1.25,
        debris.userData.stability +
          DEBRIS_CONTROLLER_TUNING.calmRecoveryRate * sizeFeel.recoveryMultiplier * dt,
      )
    }

    if (
      inBurnZone &&
      alignment >= DEBRIS_CONTROLLER_TUNING.burnDisposalAlignment &&
      heatSafeRatio >= DEBRIS_CONTROLLER_TUNING.burnDisposalHeatMinRatio
    ) {
      const burnRecoveryIntensity = turnIntensity * DEBRIS_CONTROLLER_TUNING.burnDisposalTurnDamping
      if (burnRecoveryIntensity < 0.9) {
        debris.userData.stability = Math.min(
          1.25,
          debris.userData.stability +
            DEBRIS_CONTROLLER_TUNING.burnDisposalRecoveryRate * sizeFeel.recoveryMultiplier * dt,
        )
      }
    }

    if (typeof debris.userData.attachGraceTime !== 'number') {
      debris.userData.attachGraceTime = 0
    }

    if (debris.userData.attachGraceTime > 0) {
      debris.userData.attachGraceTime = Math.max(0, debris.userData.attachGraceTime - dt)
      turnIntensity *= DEBRIS_CONTROLLER_TUNING.attachGraceStrainMultiplier
    }

    updateDebrisStability(debris, playerState.forward, turnIntensity, dt)

    const burnResult = updateDebrisHeat(
      debris,
      playerState.radiusCurrent,
      burnRadius,
      dt,
    )

    if (burnResult === 'BURNED') {
      const currentSize = debris.userData.size
      const nextSize = getNextDebrisSize(currentSize)
      const originalSizeForPayout = String(
        debris.userData.originalSize ?? currentSize ?? 'SMALL',
      ).toUpperCase()
      const terminalPayoutForChain =
        typeof debris.userData.terminalPayout === 'number'
          ? debris.userData.terminalPayout
          : originalSizeForPayout === 'LARGE'
            ? 500
            : originalSizeForPayout === 'MEDIUM'
              ? 320
              : 180

      debris.userData.originalSize = originalSizeForPayout
      debris.userData.terminalPayout = terminalPayoutForChain
      debris.userData.payoutAwarded = !!debris.userData.payoutAwarded

      const getStageBurnPayout = (size) => {
        const normalized = String(size ?? 'SMALL').toUpperCase()
        if (normalized === 'LARGE') return 500
        if (normalized === 'MEDIUM') return 320
        return 180
      }

      // --- In-place degradation ---
      if (nextSize) {
        const stagePayout = getStageBurnPayout(currentSize)

        // visual feedback for stage loss
        spawnBurnupExplosion(scene, debris.position.clone(), currentSize)

        // build a temporary next-stage debris so we can steal its visual shape
        // and updated size-dependent properties, while keeping the same live object.
        const stageDebris = createDebris(planetRadius, {
          size: nextSize,
          originalSize: debris.userData.originalSize,
          terminalPayout: debris.userData.terminalPayout,
          debrisChainId: debris.userData.debrisChainId,
          payoutAwarded: debris.userData.payoutAwarded,
          cascadeCount: debris.userData.cascadeCount,
        })

        // update size tier + visuals in-place

        if (debris.geometry) {
          debris.geometry.dispose()
        }
        debris.geometry = stageDebris.geometry
        stageDebris.geometry = null

        debris.scale.copy(stageDebris.scale)
        debris.rotation.copy(stageDebris.rotation)

        debris.userData.baseScale = stageDebris.userData.baseScale?.clone?.() ?? null
        debris.userData.baseVertexPositions = stageDebris.userData.baseVertexPositions
          ? Float32Array.from(stageDebris.userData.baseVertexPositions)
          : null
        debris.userData.vertexBurnSeeds = stageDebris.userData.vertexBurnSeeds
          ? Float32Array.from(stageDebris.userData.vertexBurnSeeds)
          : null
        debris.userData.lastNormalUpdateProgress = -1
        debris.userData.normalUpdateCooldown = 0

        // update size-dependent physics/state from the new size profile
        debris.userData.size = nextSize
        debris.userData.mass = stageDebris.userData.mass
        debris.userData.burnThreshold = stageDebris.userData.burnThreshold
        debris.userData.instabilityMultiplier = stageDebris.userData.instabilityMultiplier
        debris.userData.originalSize = originalSizeForPayout
        debris.userData.terminalPayout = terminalPayoutForChain
        debris.userData.debrisChainId =
          debris.userData.debrisChainId ?? stageDebris.userData.debrisChainId
        debris.userData.payoutAwarded = !!debris.userData.payoutAwarded

        // reset burn state so the new stage has to actually burn down
        // instead of immediately cascading again on the next frame.
        debris.userData.heat = 0
        debris.userData.burnDamage = 0
        debris.userData.captureProgress = 0

        if (!debris.userData.visual) {
          debris.userData.visual = {}
        }
        debris.userData.visual.heatRatio = 0
        debris.userData.visual.burnDepth = 0
        debris.userData.visual.inBurnZone = inBurnZone

        // cleanup temporary shell
        if (stageDebris.material) {
          stageDebris.material.dispose()
        }
        if (stageDebris.userData?.targetRing) {
          if (stageDebris.userData.targetRing.geometry) {
            stageDebris.userData.targetRing.geometry.dispose()
          }
          if (stageDebris.userData.targetRing.material) {
            stageDebris.userData.targetRing.material.dispose()
          }
        }
        if (stageDebris.userData?.stabilityRing) {
          if (stageDebris.userData.stabilityRing.geometry) {
            stageDebris.userData.stabilityRing.geometry.dispose()
          }
          if (stageDebris.userData.stabilityRing.material) {
            stageDebris.userData.stabilityRing.material.dispose()
          }
        }

        debris.userData.lastStageBurnPayout = stagePayout
        debris.userData.lastStageBurnSize = String(currentSize ?? 'SMALL').toUpperCase()
        debris.userData.stagePayout = stagePayout
        return debris
      }

      // --- Terminal destruction (SMALL only) ---
      const stagePayout = getStageBurnPayout(currentSize)

      spawnBurnupExplosion(scene, debris.position.clone(), debris.userData.size)

      debris.userData.originalSize = originalSizeForPayout
      debris.userData.terminalPayout = terminalPayoutForChain
      debris.userData.payoutAwarded = !!debris.userData.payoutAwarded
      debris.userData.stagePayout = stagePayout
      debris.userData.disposeReason = 'burned_terminal'
      disposeDebris?.(debris)
      removeDebrisFromScene(scene, debris)

      return null
    }
  }

  if (!debris.userData.attached && !debris.userData.tracked) {
    if (debris.userData.targetRing) {
      debris.userData.targetRing.visible = false
    }

    if (
      player?.userData?.playerTargetRing &&
      player?.userData?.primaryTargetDebris === debris
    ) {
      player.userData.playerTargetRing.visible = false
    }
    if (debris.userData.stabilityRing) {
      debris.userData.stabilityRing.visible = false
    }
    if (debris.userData.visual) {
      debris.userData.visual.heatRatio = 0
      debris.userData.visual.burnDepth = 0
      debris.userData.visual.inBurnZone = false
    }
    debris.userData.targetingUi = {
      ...debris.userData.targetingUi,
      visible: false,
      attached: false,
      captureWindowOpen: false,
      solidLock: false,
      lockStrength: 0,
    }
  }

  if (!debris.userData.attached && debris.userData.stabilityRing) {
    debris.userData.stabilityRing.visible = false
  }
  if (!debris.userData.attached && debris.userData.visual) {
    debris.userData.visual.heatRatio = 0
    debris.userData.visual.burnDepth = 0
    debris.userData.visual.inBurnZone = false
  }
  return debris
}