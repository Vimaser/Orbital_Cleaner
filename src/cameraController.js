import * as THREE from 'three'

export function createCameraState() {
  return {
    smoothedLookTarget: new THREE.Vector3(),
    smoothedCameraTarget: new THREE.Vector3(),
    smoothedCameraUp: new THREE.Vector3(0, 1, 0),
    tempForward: new THREE.Vector3(),
    lookAheadOffset: new THREE.Vector3(),
    emergencyDriftOffset: new THREE.Vector3(),
  }
}

export function updateCamera(camera, player, playerState, state, config) {
  const {
    cameraDistance,
    cameraHeight,
    cameraFollowLerp,
    cameraLookLerp,
    cameraTargetLerp,
    forwardLookDistance,
    emergencyPowerActive = false,
    emergencyCameraFollowMultiplier = 0.42,
    emergencyCameraLookMultiplier = 0.48,
    emergencyCameraTargetMultiplier = 0.5,
    emergencyCameraDriftAmount = 0.18,
  } = config

  const {
    smoothedLookTarget,
    smoothedCameraTarget,
    smoothedCameraUp,
    tempForward,
    lookAheadOffset,
    emergencyDriftOffset,
  } = state

  const radialDirection = player.position.clone().normalize()
  tempForward.copy(playerState.forward).normalize()

  const backward = tempForward.clone().multiplyScalar(-1)

  const activeCameraFollowLerp = emergencyPowerActive
    ? cameraFollowLerp * emergencyCameraFollowMultiplier
    : cameraFollowLerp
  const activeCameraLookLerp = emergencyPowerActive
    ? cameraLookLerp * emergencyCameraLookMultiplier
    : cameraLookLerp
  const activeCameraTargetLerp = emergencyPowerActive
    ? cameraTargetLerp * emergencyCameraTargetMultiplier
    : cameraTargetLerp

  const sideDrift = new THREE.Vector3()
    .crossVectors(smoothedCameraUp, tempForward)
    .normalize()
    .multiplyScalar(emergencyPowerActive ? emergencyCameraDriftAmount : 0)
  emergencyDriftOffset.lerp(sideDrift, emergencyPowerActive ? 0.035 : 0.12)

  smoothedCameraTarget.lerp(player.position, activeCameraTargetLerp)
  smoothedCameraUp.lerp(radialDirection, 0.1).normalize()

  const desiredPosition = smoothedCameraTarget
    .clone()
    .add(backward.multiplyScalar(cameraDistance))
    .add(smoothedCameraUp.clone().multiplyScalar(cameraHeight))

  desiredPosition.add(emergencyDriftOffset)
  camera.position.lerp(desiredPosition, activeCameraFollowLerp)

  lookAheadOffset.copy(tempForward).multiplyScalar(forwardLookDistance)
  const desiredLookTarget = smoothedCameraTarget
    .clone()
    .add(lookAheadOffset)
    .add(smoothedCameraUp.clone().multiplyScalar(0.5))

  smoothedLookTarget.lerp(desiredLookTarget.add(emergencyDriftOffset), activeCameraLookLerp)

  camera.up.copy(smoothedCameraUp)
  camera.lookAt(smoothedLookTarget)
}