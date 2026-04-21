import * as THREE from 'three'
import {
  createAstronautSystem,
  setAstronautShip,
  attachAstronautToTarget,
  releaseAstronaut,
  updateAstronautSystem,
  disposeAstronautSystem,
} from './astronaut.js'

import {
  playSound,
  startLoop,
  stopLoop,
  isLoopPlaying,
} from './sound.js'

const EVA_DEBUG = false

const TARGET_RING_COLOR = new THREE.Color(0xffd84a)
const PLAYER_RING_START_COLOR = new THREE.Color(0xff4d4d)
const PLAYER_RING_LOCK_COLOR = new THREE.Color(0x49ff9a)

function createRingLine({
  radius = 0.34,
  segments = 48,
  color = 0xffffff,
  opacity = 1,
  dashed = false,
  dashSize = 0.06,
  gapSize = 0.035,
} = {}) {
  const points = []
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2
    points.push(new THREE.Vector3(Math.cos(t) * radius, Math.sin(t) * radius, 0))
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = dashed
    ? new THREE.LineDashedMaterial({
        color,
        transparent: true,
        opacity,
        dashSize,
        gapSize,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      })
    : new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      })

  const ring = new THREE.LineLoop(geometry, material)
  ring.frustumCulled = false
  if (dashed) ring.computeLineDistances()
  return ring
}

function setRingVisibility(ring, visible) {
  if (!ring) return
  ring.visible = visible
}

function updatePlayerRingColor(ring, alignment) {
  if (!ring?.material?.color) return
  ring.material.color.copy(PLAYER_RING_START_COLOR).lerp(PLAYER_RING_LOCK_COLOR, alignment)
  ring.material.needsUpdate = true
}

function createTetherLine(color = 0x9fd8ff, opacity = 0.7) {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(6)
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    toneMapped: false,
  })

  const line = new THREE.Line(geometry, material)
  line.frustumCulled = false
  return line
}

function updateLine(line, start, end) {
  if (!line) return
  const attr = line.geometry.attributes.position
  const arr = attr.array

  arr[0] = start.x
  arr[1] = start.y
  arr[2] = start.z
  arr[3] = end.x
  arr[4] = end.y
  arr[5] = end.z

  attr.needsUpdate = true
  line.geometry.computeBoundingSphere()
}

function getShipAnchorWorld(ship, out = new THREE.Vector3()) {
  if (!ship) return out.set(0, 0, 0)

  const localAnchor = new THREE.Vector3(0, 0, 0.95)
  return ship.localToWorld(out.copy(localAnchor))
}

function getTargetWorkPoint(ship, target, out = new THREE.Vector3()) {
  if (!ship || !target) return out.set(0, 0, 0)

  const shipPos = new THREE.Vector3()
  const targetPos = new THREE.Vector3()
  ship.getWorldPosition(shipPos)
  target.getWorldPosition(targetPos)

  const towardShip = shipPos.sub(targetPos)
  if (towardShip.lengthSq() < 0.000001) {
    towardShip.set(0, 0, 1)
  } else {
    towardShip.normalize()
  }

  const sizeLabel = target.userData?.size
  let sizeOffset = 0.08
  if (typeof sizeLabel === 'string') {
    const normalized = sizeLabel.toUpperCase()
    if (normalized === 'SMALL') sizeOffset = 0.08
    else if (normalized === 'MEDIUM') sizeOffset = 0.14
    else if (normalized === 'LARGE') sizeOffset = 0.22
  } else if (typeof sizeLabel === 'number' && Number.isFinite(sizeLabel)) {
    sizeOffset = sizeLabel * 0.08
  }

  const offset = 0.48 + sizeOffset
  return out.copy(targetPos).addScaledVector(towardShip, offset)
}

function getAlignmentData(system) {
  if (!system?.activeTarget?.parent) {
    return {
      distance: Infinity,
      reveal: 0,
      lock: 0,
      isLocked: false,
    }
  }

  getTargetWorkPoint(system.ship, system.activeTarget, system.debrisAnchorWorld)
  const distance = system.astronautSystem.root.position.distanceTo(system.debrisAnchorWorld)
  const reveal = THREE.MathUtils.clamp(
    1 - distance / system.ringRevealDistance,
    0,
    1,
  )
  const lock = THREE.MathUtils.clamp(
    1 - distance / system.lockDistance,
    0,
    1,
  )

  return {
    distance,
    reveal,
    lock,
    isLocked: distance <= system.lockDistance,
  }
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function createEvaSystem(scene, ship) {
  const system = {
    scene,
    ship,
    astronautSystem: createAstronautSystem(scene, {
      ship,
      modelScale: 0.62,
      deployDuration: 0.9,
      retractDuration: 0.7,
      hoverAmplitude: 0.045,
      hoverSpeed: 2.1,
    }),
    shipTether: createTetherLine(0x9fd8ff, 0.85),
    debrisTether: createTetherLine(0xffd38a, 0.65),
    targetRing: createRingLine({
      radius: 0.34,
      segments: 56,
      color: TARGET_RING_COLOR,
      opacity: 0.95,
      dashed: true,
      dashSize: 0.055,
      gapSize: 0.03,
    }),
    playerRing: createRingLine({
      radius: 0.26,
      segments: 56,
      color: PLAYER_RING_START_COLOR,
      opacity: 0.95,
    }),
    state: 'idle',
    previousState: 'idle',
    activeTarget: null,
    progress: 0,
    deployDuration: 1.25,
    retractDuration: 0.8,
    deployedOffset: new THREE.Vector3(0.1, 0.42, 0.18),
    driftOffset: new THREE.Vector3(),
    worldPos: new THREE.Vector3(),
    startPos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
    repairProgress: 0,
    repairHoldDuration: 1.35,
    ringRevealDistance: 1.1,
    lockDistance: 0.12,
    currentAlignment: 0,
    shipAnchorWorld: new THREE.Vector3(),
    debrisAnchorWorld: new THREE.Vector3(),
    tempVecA: new THREE.Vector3(),
    tempVecB: new THREE.Vector3(),
  }

  setAstronautShip(system.astronautSystem, ship)

  system.shipTether.visible = false
  system.debrisTether.visible = false
  system.targetRing.visible = false
  system.playerRing.visible = false

  scene.add(system.shipTether)
  scene.add(system.debrisTether)
  scene.add(system.targetRing)
  scene.add(system.playerRing)

  if (EVA_DEBUG) {
    console.log('[EVA] createEvaSystem', {
      hasScene: !!scene,
      hasShip: !!ship,
      ship,
      astronautSystem: system.astronautSystem,
    })
  }

  return system
}

export function onEvaTargetAttached(system, target) {
  if (!system?.ship || !target) {
    if (EVA_DEBUG) {
      console.log('[EVA] onEvaTargetAttached ABORT', {
        hasSystem: !!system,
        hasShip: !!system?.ship,
        target,
      })
    }
    return
  }

  system.activeTarget = target
  system.state = 'deploying'
  system.progress = 0
  system.repairProgress = 0
  system.currentAlignment = 0
  system._loggedDeploying = false
  system._loggedAttached = false
  system._loggedRetracting = false

  getShipAnchorWorld(system.ship, system.shipAnchorWorld)
  system.startPos.copy(system.shipAnchorWorld)

  getTargetWorkPoint(system.ship, target, system.targetPos)
  attachAstronautToTarget(system.astronautSystem, target)
  system.shipTether.visible = true
  system.debrisTether.visible = true
  system.targetRing.visible = false
  system.playerRing.visible = false

  if (EVA_DEBUG) {
    console.log('[EVA] ATTACH', {
      target,
      state: system.state,
      shipAnchorWorld: system.shipAnchorWorld.clone(),
      startPos: system.startPos.clone(),
      targetPos: system.targetPos.clone(),
    })
  }
}

export function onEvaDebrisAttached(system, debris) {
  onEvaTargetAttached(system, debris)
}

export function onEvaTargetReleased(system) {
  if (!system?.ship) {
    if (EVA_DEBUG) {
      console.log('[EVA] onEvaTargetReleased ABORT', {
        hasSystem: !!system,
        hasShip: !!system?.ship,
      })
    }
    return
  }

  if (system.state === 'idle') {
    system.activeTarget = null
    releaseAstronaut(system.astronautSystem)
    system.shipTether.visible = false
    system.debrisTether.visible = false
    stopLoop('eva_repair_wrench_loop')
    if (EVA_DEBUG) {
      console.log('[EVA] RELEASE while idle')
    }
    return
  }

  system.state = 'retracting'
  system.progress = 0
  system.repairProgress = 0
  system.currentAlignment = 0
  system._loggedDeploying = false
  system._loggedAttached = false
  system._loggedRetracting = false
  stopLoop('eva_repair_wrench_loop')
  system.targetRing.visible = false
  system.playerRing.visible = false
  system.activeTarget = null
  system.astronautSystem.root.getWorldPosition(system.startPos)
  getShipAnchorWorld(system.ship, system.targetPos)
  releaseAstronaut(system.astronautSystem)

  if (EVA_DEBUG) {
    console.log('[EVA] RELEASE', {
      state: system.state,
      startPos: system.startPos.clone(),
      targetPos: system.targetPos.clone(),
    })
  }
}

export function onEvaDebrisReleased(system) {
  onEvaTargetReleased(system)
}

export function updateEvaSystem(system, dt) {
  if (!system?.ship) {
    if (EVA_DEBUG) {
      console.log('[EVA] updateEvaSystem ABORT', {
        hasSystem: !!system,
        hasShip: !!system?.ship,
      })
    }
    return
  }

  const previousState = system.previousState ?? 'idle'

  getShipAnchorWorld(system.ship, system.shipAnchorWorld)

  if (system._lastLoggedState !== system.state && EVA_DEBUG) {
    console.log('[EVA] STATE', {
      from: system._lastLoggedState ?? 'none',
      to: system.state,
      dt,
      astronautVisible: system.astronautSystem?.root?.visible,
      shipTetherVisible: system.shipTether.visible,
      debrisTetherVisible: system.debrisTether.visible,
      activeTarget: system.activeTarget,
      shipAnchorWorld: system.shipAnchorWorld.clone(),
    })
    system._lastLoggedState = system.state
  }

  if (system.state === 'idle') {
    stopLoop('eva_repair_wrench_loop');
    releaseAstronaut(system.astronautSystem)
    system.shipTether.visible = false
    system.debrisTether.visible = false
    system.targetRing.visible = false
    system.playerRing.visible = false
    system.previousState = system.state
    return
  }

  updateAstronautSystem(system.astronautSystem, dt)

  system.shipTether.visible = true

  if (system.state === 'deploying') {
    if (previousState !== 'deploying') {
      playSound('eva_deploy_air_release');
      stopLoop('eva_repair_wrench_loop');
    }
    system.progress = Math.min(1, system.progress + dt / system.deployDuration)
    const eased = easeOutCubic(system.progress)

    if (EVA_DEBUG && system.progress > 0.01 && !system._loggedDeploying) {
      console.log('[EVA] DEPLOYING', {
        progress: system.progress,
        astronautPos: system.astronautSystem.root.position.clone(),
        targetPos: system.targetPos.clone(),
      })
      system._loggedDeploying = true
    }

    if (system.activeTarget) {
      getTargetWorkPoint(system.ship, system.activeTarget, system.targetPos)
    }

    system.worldPos.lerpVectors(system.startPos, system.targetPos, eased)

    const alignmentData = getAlignmentData(system)
    system.currentAlignment = alignmentData.lock

    const showRings = alignmentData.distance <= system.ringRevealDistance
    setRingVisibility(system.targetRing, showRings)
    setRingVisibility(system.playerRing, showRings)

    if (showRings) {
      system.targetRing.position.copy(system.debrisAnchorWorld)
      system.playerRing.position.copy(system.astronautSystem.root.position)
      system.targetRing.lookAt(system.shipAnchorWorld)
      system.playerRing.lookAt(system.debrisAnchorWorld)
      updatePlayerRingColor(system.playerRing, alignmentData.lock)
    }

    if (system.progress >= 1) {
      system.state = 'attached'
      system.progress = 0
      system._loggedDeploying = false
    }
    } else if (system.state === 'attached') {
    if (!isLoopPlaying('eva_repair_wrench_loop')) {
      startLoop('eva_repair_wrench_loop');
    }

    if (!system.activeTarget?.parent) {
      onEvaTargetReleased(system)
      return
    }

    const targetIsReleasedDebris =
      system.activeTarget?.userData &&
      Object.prototype.hasOwnProperty.call(system.activeTarget.userData, 'attached') &&
      !system.activeTarget.userData.attached

    if (targetIsReleasedDebris) {
      onEvaTargetReleased(system)
      return
    }

    getTargetWorkPoint(system.ship, system.activeTarget, system.debrisAnchorWorld)

    const t = performance.now() * 0.001
    const driftScale = 1 - THREE.MathUtils.clamp(system.repairProgress, 0, 1)
    system.driftOffset.set(
      Math.sin(t * 1.1) * 0.03 * driftScale,
      Math.cos(t * 0.8) * 0.025 * driftScale,
      Math.sin(t * 1.7) * 0.02 * driftScale,
    )

    system.worldPos.copy(system.debrisAnchorWorld).add(system.driftOffset)

    const alignmentData = getAlignmentData(system)
    system.currentAlignment = alignmentData.lock

    const showRings = alignmentData.distance <= system.ringRevealDistance
    setRingVisibility(system.targetRing, showRings)
    setRingVisibility(system.playerRing, showRings)

    if (showRings) {
      system.targetRing.position.copy(system.debrisAnchorWorld)
      system.playerRing.position.copy(system.astronautSystem.root.position)
      system.targetRing.lookAt(system.shipAnchorWorld)
      system.playerRing.lookAt(system.debrisAnchorWorld)
      updatePlayerRingColor(system.playerRing, alignmentData.lock)
    }

    if (alignmentData.isLocked) {
      system.repairProgress = Math.min(1, system.repairProgress + dt / system.repairHoldDuration)
    } else {
      system.repairProgress = Math.max(0, system.repairProgress - dt * 0.45)
    }

    if (EVA_DEBUG && !system._loggedAttached) {
      console.log('[EVA] ATTACHED HOLD', {
        astronautPos: system.astronautSystem.root.position.clone(),
        debrisAnchorWorld: system.debrisAnchorWorld.clone(),
        alignment: system.currentAlignment,
        repairProgress: system.repairProgress,
      })
      system._loggedAttached = true
    }

    if (system.repairProgress >= 1) {
      system.targetRing.visible = false
      system.playerRing.visible = false
      onEvaTargetReleased(system)
      return
    }
  } else if (system.state === 'retracting') {
    stopLoop('eva_repair_wrench_loop');
    system.progress = Math.min(1, system.progress + dt / system.retractDuration)
    const eased = easeOutCubic(system.progress)

    if (EVA_DEBUG && system.progress > 0.01 && !system._loggedRetracting) {
      console.log('[EVA] RETRACTING', {
        progress: system.progress,
        astronautPos: system.astronautSystem.root.position.clone(),
        targetPos: system.targetPos.clone(),
      })
      system._loggedRetracting = true
    }

    getShipAnchorWorld(system.ship, system.targetPos)
    system.worldPos.lerpVectors(system.startPos, system.targetPos, eased)

    system.targetRing.visible = false
    system.playerRing.visible = false

    if (system.progress >= 1) {
      system.state = 'idle'
      system.progress = 0
      releaseAstronaut(system.astronautSystem)
      system.shipTether.visible = false
      system.debrisTether.visible = false
      system.targetRing.visible = false
      system.playerRing.visible = false
      system._loggedAttached = false
      system._loggedRetracting = false
      system.previousState = system.state
      return
    }
  }

  updateLine(system.shipTether, system.shipAnchorWorld, system.astronautSystem.root.position)

  if (system.state === 'attached' && system.activeTarget?.parent) {
    system.debrisTether.visible = true
    getTargetWorkPoint(system.ship, system.activeTarget, system.debrisAnchorWorld)
    updateLine(system.debrisTether, system.astronautSystem.root.position, system.debrisAnchorWorld)
  } else if (system.state === 'deploying' && system.activeTarget?.parent) {
    system.debrisTether.visible = true
    getTargetWorkPoint(system.ship, system.activeTarget, system.debrisAnchorWorld)
    updateLine(system.debrisTether, system.astronautSystem.root.position, system.debrisAnchorWorld)
  } else {
    system.debrisTether.visible = false
  }
  system.previousState = system.state
}

export function disposeEvaSystem(system) {
  if (!system) return

  if (EVA_DEBUG) {
    console.log('[EVA] DISPOSE', system)
  }
  stopLoop('eva_repair_wrench_loop')

  disposeAstronautSystem(system.astronautSystem)
  if (system.shipTether?.parent) system.shipTether.parent.remove(system.shipTether)
  if (system.debrisTether?.parent) system.debrisTether.parent.remove(system.debrisTether)
  if (system.targetRing?.parent) system.targetRing.parent.remove(system.targetRing)
  if (system.playerRing?.parent) system.playerRing.parent.remove(system.playerRing)

  ;[system.shipTether, system.debrisTether, system.targetRing, system.playerRing].forEach((line) => {
    if (!line) return
    line.geometry?.dispose?.()
    line.material?.dispose?.()
  })
}