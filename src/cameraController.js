

import * as THREE from 'three'

export function createCameraState() {
  return {
    smoothedLookTarget: new THREE.Vector3(),
    smoothedCameraTarget: new THREE.Vector3(),
    smoothedCameraUp: new THREE.Vector3(0, 1, 0),
    tempForward: new THREE.Vector3(),
    lookAheadOffset: new THREE.Vector3(),
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
  } = config

  const {
    smoothedLookTarget,
    smoothedCameraTarget,
    smoothedCameraUp,
    tempForward,
    lookAheadOffset,
  } = state

  const radialDirection = player.position.clone().normalize()
  tempForward.copy(playerState.forward).normalize()

  const backward = tempForward.clone().multiplyScalar(-1)

  smoothedCameraTarget.lerp(player.position, cameraTargetLerp)
  smoothedCameraUp.lerp(radialDirection, 0.1).normalize()

  const desiredPosition = smoothedCameraTarget
    .clone()
    .add(backward.multiplyScalar(cameraDistance))
    .add(smoothedCameraUp.clone().multiplyScalar(cameraHeight))

  camera.position.lerp(desiredPosition, cameraFollowLerp)

  lookAheadOffset.copy(tempForward).multiplyScalar(forwardLookDistance)
  const desiredLookTarget = smoothedCameraTarget
    .clone()
    .add(lookAheadOffset)
    .add(smoothedCameraUp.clone().multiplyScalar(0.5))

  smoothedLookTarget.lerp(desiredLookTarget, cameraLookLerp)

  camera.up.copy(smoothedCameraUp)
  camera.lookAt(smoothedLookTarget)
}