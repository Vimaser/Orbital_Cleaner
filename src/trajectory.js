import * as THREE from 'three'

export function createTrajectoryState(trailLength = 200, guidePointCount = 96) {
  const trailPositions = new Float32Array(trailLength * 3)
  const trailGeometry = new THREE.BufferGeometry()
  trailGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(trailPositions, 3)
  )
  trailGeometry.setDrawRange(0, 0)

  const trailMaterial = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.7,
  })

  const trailLine = new THREE.Line(trailGeometry, trailMaterial)
  trailLine.frustumCulled = false

  const guidePositions = new Float32Array(guidePointCount * 3)
  const guideGeometry = new THREE.BufferGeometry()
  guideGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(guidePositions, 3)
  )
  guideGeometry.setDrawRange(0, guidePointCount)

  const guideMaterial = new THREE.LineDashedMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.65,
    dashSize: 1.2,
    gapSize: 0.7,
  })

  const guideLine = new THREE.Line(guideGeometry, guideMaterial)
  guideLine.frustumCulled = false

  return {
    trailLength,
    guidePointCount,
    trailCount: 0,
    trailPositions,
    trailGeometry,
    trailLine,
    guidePositions,
    guideGeometry,
    guideLine,
  }
}

export function initializeTrajectoryState(state, playerPosition) {
  const { trailPositions, trailGeometry, guidePositions, guideGeometry, guideLine } = state

  for (let i = 0; i < trailPositions.length; i += 3) {
    trailPositions[i] = playerPosition.x
    trailPositions[i + 1] = playerPosition.y
    trailPositions[i + 2] = playerPosition.z
  }
  trailGeometry.attributes.position.needsUpdate = true
  trailGeometry.computeBoundingSphere()

  for (let i = 0; i < guidePositions.length; i += 3) {
    guidePositions[i] = playerPosition.x
    guidePositions[i + 1] = playerPosition.y
    guidePositions[i + 2] = playerPosition.z
  }
  guideGeometry.attributes.position.needsUpdate = true
  guideGeometry.computeBoundingSphere()
  guideLine.computeLineDistances()
}

export function updateTrail(state, playerPosition, playerVelocity) {
  const { trailGeometry, trailLength } = state
  const positions = trailGeometry.attributes.position.array

  if (state.trailCount === 0) {
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = playerPosition.x
      positions[i + 1] = playerPosition.y
      positions[i + 2] = playerPosition.z
    }
    state.trailCount = 1
    trailGeometry.setDrawRange(0, state.trailCount)
    trailGeometry.attributes.position.needsUpdate = true
    return
  }

  for (let i = positions.length - 3; i >= 3; i -= 3) {
    positions[i] = positions[i - 3]
    positions[i + 1] = positions[i - 2]
    positions[i + 2] = positions[i - 1]
  }

  if (playerVelocity.lengthSq() < 0.0000001) {
    trailGeometry.attributes.position.needsUpdate = true
    return
  }

  positions[0] = playerPosition.x
  positions[1] = playerPosition.y
  positions[2] = playerPosition.z

  state.trailCount = Math.min(state.trailCount + 1, trailLength)
  trailGeometry.setDrawRange(0, state.trailCount)
  trailGeometry.attributes.position.needsUpdate = true
  trailGeometry.computeBoundingSphere()
}

export function updateTrajectoryGuide(state, playerPosition, playerState, keys, config) {
  const positions = state.guideGeometry.attributes.position.array
  const simPos = playerPosition.clone()
  const simForward = playerState.forward.clone().normalize()
  let simRadius = playerState.radiusCurrent
  let simBaseRadius = playerState.orbitBaseRadius ?? playerState.radiusCurrent
  let simEllipseStrength = playerState.ellipticalStrength ?? 0
  let simPhase = playerState.orbitPhase ?? 0
  let simCurrentRadius = playerState.radiusCurrent
  const simDesiredForward = new THREE.Vector3()
  const simRadial = new THREE.Vector3()
  const simVelocity = new THREE.Vector3()
  const simYawInput = (keys['a'] ? 1 : 0) + (keys['d'] ? -1 : 0)
  const simClimbInput = (keys['w'] ? 1 : 0) + (keys['s'] ? -1 : 0)
  let simSpeed = playerState.currentSpeed

  const highOrbitMaxRadius = config.highOrbitMaxRadius ?? (config.maxRadius + 6)
  const transferOrbitMaxRadius = config.transferOrbitMaxRadius ?? (config.maxRadius + 12)
  const highOrbitTurnBonus = config.highOrbitTurnBonus ?? 0.18
  const highOrbitSpeedPenalty = config.highOrbitSpeedPenalty ?? 0.24
  const transferOrbitSpeedPenalty = config.transferOrbitSpeedPenalty ?? 0.16
  const lowOrbitSpeedBonus = config.lowOrbitSpeedBonus ?? 0.08
  const ellipticalThresholdRadius = config.ellipticalThresholdRadius ?? (highOrbitMaxRadius + 0.75)
  const transferOrbitEllipseBuildMultiplier = config.transferOrbitEllipseBuildMultiplier ?? 2.25
  const ellipticalBuildRate = config.ellipticalBuildRate ?? 0.16
  const ellipticalDecayRate = config.ellipticalDecayRate ?? 0.3
  const maxEllipseAmplitude = config.maxEllipseAmplitude ?? Math.max(1.6, (transferOrbitMaxRadius - highOrbitMaxRadius) * 0.95)

  const simDt = 1 / 60

  for (let i = 0; i < state.guidePointCount; i++) {
    simRadial.copy(simPos).normalize()

    const altitudeAlphaForTurn = THREE.MathUtils.clamp(
      (Math.min(simCurrentRadius, highOrbitMaxRadius) - config.minRadius) /
        Math.max(0.0001, highOrbitMaxRadius - config.minRadius),
      0,
      1,
    )
    const effectiveYawRate = config.yawRate * (1 + altitudeAlphaForTurn * highOrbitTurnBonus)
    const simYaw = simYawInput * effectiveYawRate * simDt

    if (simYaw !== 0) {
      const qYaw = new THREE.Quaternion().setFromAxisAngle(simRadial, simYaw)
      simDesiredForward.copy(simForward).applyQuaternion(qYaw).normalize()
    } else {
      simDesiredForward.copy(simForward)
    }

    const simDesiredRadialComponent = simRadial
      .clone()
      .multiplyScalar(simDesiredForward.dot(simRadial))
    simDesiredForward.sub(simDesiredRadialComponent).normalize()
    simForward.lerp(simDesiredForward, config.forwardDriftBlend).normalize()

    if (simClimbInput !== 0) {
      simBaseRadius += simClimbInput * config.altitudeChangeRate * simDt
    }
    simBaseRadius = THREE.MathUtils.clamp(simBaseRadius, config.minRadius, transferOrbitMaxRadius)

    const throttlePercent = THREE.MathUtils.clamp(
      playerState.throttlePercent ?? 50,
      config.minThrottlePercent ?? 20,
      config.maxThrottlePercent ?? 80,
    )
    const throttleAlpha =
      (throttlePercent - (config.minThrottlePercent ?? 20)) /
      Math.max(0.0001, (config.maxThrottlePercent ?? 80) - (config.minThrottlePercent ?? 20))

    const cruiseSpeed = THREE.MathUtils.lerp(
      config.baseForwardSpeed,
      config.maxForwardSpeed,
      throttleAlpha,
    )

    const altitudeAlphaForSpeed = THREE.MathUtils.clamp(
      (Math.min(simBaseRadius, highOrbitMaxRadius) - config.minRadius) /
        Math.max(0.0001, highOrbitMaxRadius - config.minRadius),
      0,
      1,
    )
    const transferOrbitAlpha = THREE.MathUtils.clamp(
      (simBaseRadius - highOrbitMaxRadius) /
        Math.max(0.0001, transferOrbitMaxRadius - highOrbitMaxRadius),
      0,
      1,
    )
    const altitudeSpeedFactor =
      (1 + lowOrbitSpeedBonus) -
      altitudeAlphaForSpeed * (lowOrbitSpeedBonus + highOrbitSpeedPenalty) -
      transferOrbitAlpha * transferOrbitSpeedPenalty

    const simBoost = keys['shift'] ? config.boostMultiplier : 1
    const simTargetSpeed = cruiseSpeed * altitudeSpeedFactor * simBoost
    simSpeed = THREE.MathUtils.lerp(simSpeed, simTargetSpeed, config.speedLerp)

    const highOrbitOvershoot = Math.max(0, simBaseRadius - ellipticalThresholdRadius)
    const highOrbitRange = Math.max(0.0001, transferOrbitMaxRadius - ellipticalThresholdRadius)
    const targetEllipticalStrength = THREE.MathUtils.clamp(highOrbitOvershoot / highOrbitRange, 0, 1)

    const effectiveBuildRate = THREE.MathUtils.lerp(
      ellipticalBuildRate,
      ellipticalBuildRate * transferOrbitEllipseBuildMultiplier,
      transferOrbitAlpha,
    )

    if (targetEllipticalStrength > simEllipseStrength) {
      simEllipseStrength = THREE.MathUtils.lerp(
        simEllipseStrength,
        targetEllipticalStrength,
        effectiveBuildRate,
      )
    } else {
      simEllipseStrength = THREE.MathUtils.lerp(
        simEllipseStrength,
        targetEllipticalStrength,
        ellipticalDecayRate,
      )
    }

    // advance orbit phase (approximate same logic as player)
    simPhase += (simSpeed / Math.max(1, simBaseRadius)) * simDt * 60

    const ellipseAmplitude = maxEllipseAmplitude * simEllipseStrength * (0.7 + transferOrbitAlpha * 0.6)
    const desiredRadius = simBaseRadius + Math.sin(simPhase) * ellipseAmplitude

    simVelocity.copy(simForward).multiplyScalar(simSpeed)
    simPos.addScaledVector(simVelocity, simDt * 60)
    simPos.normalize().multiplyScalar(desiredRadius)

    simRadius = desiredRadius
    simCurrentRadius = desiredRadius

    simRadial.copy(simPos).normalize()
    const simRadialAfterMove = simRadial
      .clone()
      .multiplyScalar(simForward.dot(simRadial))
    simForward.sub(simRadialAfterMove).normalize()

    const index = i * 3
    positions[index] = simPos.x
    positions[index + 1] = simPos.y
    positions[index + 2] = simPos.z
  }

  state.guideGeometry.attributes.position.needsUpdate = true
  state.guideGeometry.computeBoundingSphere()
  state.guideLine.computeLineDistances()
}