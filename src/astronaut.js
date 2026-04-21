import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

const ASTRONAUT_MODEL_URL = new URL('../assets/models/astronaut.glb', import.meta.url).href

const loader = new GLTFLoader()
let astronautModelPromise = null

function loadAstronautModel() {
  if (!astronautModelPromise) {
    astronautModelPromise = loader.loadAsync(ASTRONAUT_MODEL_URL)
  }
  return astronautModelPromise
}

function prepareAstronautScene(sceneRoot, scale = 0.6) {
  const astronautScene = clone(sceneRoot)
  astronautScene.name = 'evaAstronautModel'

  const box = new THREE.Box3().setFromObject(astronautScene)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)

  const height = Math.max(size.y || 1, 1)
  const targetHeight = scale
  const finalScale = targetHeight / height

  astronautScene.position.sub(center)
  astronautScene.scale.setScalar(finalScale)
  astronautScene.rotation.y = Math.PI
  astronautScene.rotation.z = THREE.MathUtils.degToRad(-12)

  astronautScene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = false
      child.receiveShadow = false
      if (Array.isArray(child.material)) {
        child.material = child.material.map((mat) => mat.clone())
      } else if (child.material) {
        child.material = child.material.clone()
      }
    }
  })

  return astronautScene
}

function getTargetWorldPosition(target, fallback = new THREE.Vector3()) {
  if (!target) return fallback.set(0, 0, 0)

  if (target.isObject3D) {
    return target.getWorldPosition(fallback)
  }

  if (target.position && typeof target.position.x === 'number') {
    return fallback.copy(target.position)
  }

  return fallback.set(0, 0, 0)
}

function getShipAnchorWorld(ship, out = new THREE.Vector3()) {
  if (!ship) return out.set(0, 0, 0)

  const localAnchor = new THREE.Vector3(0, 0.22, -0.35)
  return ship.localToWorld(out.copy(localAnchor))
}

function getWorkPoint(ship, target, out = new THREE.Vector3()) {
  if (!ship || !target) return out.set(0, 0, 0)

  const shipPos = new THREE.Vector3()
  const targetPos = new THREE.Vector3()
  ship.getWorldPosition(shipPos)
  getTargetWorldPosition(target, targetPos)

  const towardShip = shipPos.sub(targetPos)
  if (towardShip.lengthSq() < 0.000001) {
    towardShip.set(0, 0, 1)
  } else {
    towardShip.normalize()
  }

  return out.copy(targetPos).addScaledVector(towardShip, 0.55)
}

export function createAstronautSystem(scene, options = {}) {
  const system = {
    scene,
    ship: options.ship || null,
    target: null,
    root: new THREE.Group(),
    model: null,
    state: 'idle', // idle | deploying | attached | retracting
    visible: false,
    progress: 0,
    deployDuration: options.deployDuration ?? 0.9,
    retractDuration: options.retractDuration ?? 0.7,
    hoverAmplitude: options.hoverAmplitude ?? 0.045,
    hoverSpeed: options.hoverSpeed ?? 2.1,
    worldPos: new THREE.Vector3(),
    startPos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
    shipAnchorWorld: new THREE.Vector3(),
    workAnchorWorld: new THREE.Vector3(),
    tempForward: new THREE.Vector3(),
    tempUp: new THREE.Vector3(0, 1, 0),
    tempQuat: new THREE.Quaternion(),
    modelScale: options.modelScale ?? 0.000012,
    loaded: false,
    animTime: 0,
    bodyRoll: 0,
    bodyPitch: 0,
    armSwing: 0,
    mixer: null,
    hasClipAnimation: false,
    returnSnapDistance: options.returnSnapDistance ?? 0.12,
  }

  system.root.visible = false
  scene.add(system.root)

  loadAstronautModel()
    .then((gltf) => {
      if (!system.root.parent) return
      const astronautScene = prepareAstronautScene(gltf.scene, system.modelScale)
      astronautScene.traverse((child) => {
        const lname = child.name?.toLowerCase?.() || ''
        if (lname.includes('arm') && lname.includes('left')) child.name = 'eva_left_arm'
        if (lname.includes('arm') && lname.includes('right')) child.name = 'eva_right_arm'
      })

      system.model = astronautScene
      system.root.add(astronautScene)

      if (Array.isArray(gltf.animations) && gltf.animations.length > 0) {
        system.mixer = new THREE.AnimationMixer(astronautScene)

        const preferredClip =
          gltf.animations.find((clip) => /idle|float|hover|eva|space/i.test(clip.name)) ||
          gltf.animations[0]

        if (preferredClip) {
          const action = system.mixer.clipAction(preferredClip)
          action.reset()
          action.setLoop(THREE.LoopRepeat, Infinity)
          action.fadeIn(0.2)
          action.play()
          system.hasClipAnimation = true
        }
      }

      system.loaded = true
    })
    .catch((error) => {
      console.warn('[astronaut] Failed to load astronaut.glb', error)
    })

  return system
}

export function setAstronautShip(system, ship) {
  if (!system) return
  system.ship = ship
}

export function attachAstronautToTarget(system, target) {
  if (!system?.ship || !target) return

  system.target = target
  system.state = 'deploying'
  system.progress = 0
  system.visible = true
  system.root.visible = true

  getShipAnchorWorld(system.ship, system.shipAnchorWorld)
  getWorkPoint(system.ship, target, system.targetPos)

  system.startPos.copy(system.shipAnchorWorld)
  system.worldPos.copy(system.startPos)
  system.root.position.copy(system.worldPos)
}

export function releaseAstronaut(system) {
  if (!system?.ship) return

  if (system.state === 'idle') {
    system.target = null
    system.visible = false
    system.root.visible = false
    return
  }

  system.state = 'retracting'
  system.progress = 0
  system.target = null
  system.root.getWorldPosition(system.startPos)
  system.worldPos.copy(system.startPos)
  getShipAnchorWorld(system.ship, system.targetPos)
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function updateAstronautSystem(system, dt) {
  if (!system?.ship) return

  if (!system.visible && system.state === 'idle') {
    system.root.visible = false
    return
  }

  getShipAnchorWorld(system.ship, system.shipAnchorWorld)
  system.animTime += dt

  if (system.mixer) {
    system.mixer.update(dt)
  }

  if (system.state === 'deploying') {
    system.progress = Math.min(1, system.progress + dt / Math.max(0.0001, system.deployDuration))

    if (system.target) {
      getWorkPoint(system.ship, system.target, system.targetPos)
    }

    const eased = easeOutCubic(system.progress)
    system.bodyRoll = THREE.MathUtils.lerp(system.bodyRoll, THREE.MathUtils.degToRad(-18), 0.08)
    system.bodyPitch = THREE.MathUtils.lerp(system.bodyPitch, THREE.MathUtils.degToRad(10), 0.08)
    system.armSwing = THREE.MathUtils.lerp(system.armSwing, 0.22, 0.08)
    system.worldPos.lerpVectors(system.startPos, system.targetPos, eased)

    if (system.progress >= 1) {
      system.state = 'attached'
      system.progress = 0
    }
  } else if (system.state === 'attached') {
    if (!system.target?.parent) {
      releaseAstronaut(system)
      return
    }

    getWorkPoint(system.ship, system.target, system.workAnchorWorld)
    const hoverY = Math.sin(performance.now() * 0.001 * system.hoverSpeed) * system.hoverAmplitude
    system.worldPos.copy(system.workAnchorWorld)
    system.worldPos.y += hoverY
    system.bodyRoll = THREE.MathUtils.lerp(system.bodyRoll, Math.sin(system.animTime * 1.7) * 0.18, 0.08)
    system.bodyPitch = THREE.MathUtils.lerp(system.bodyPitch, Math.cos(system.animTime * 1.35) * 0.1, 0.08)
    system.armSwing = THREE.MathUtils.lerp(system.armSwing, 0.34 + Math.sin(system.animTime * 3.2) * 0.08, 0.08)
  } else if (system.state === 'retracting') {
    system.progress = Math.min(1, system.progress + dt / Math.max(0.0001, system.retractDuration))
    const eased = easeOutCubic(system.progress)
    system.bodyRoll = THREE.MathUtils.lerp(system.bodyRoll, THREE.MathUtils.degToRad(14), 0.08)
    system.bodyPitch = THREE.MathUtils.lerp(system.bodyPitch, THREE.MathUtils.degToRad(-8), 0.08)
    system.armSwing = THREE.MathUtils.lerp(system.armSwing, 0.16, 0.08)

    // Keep chasing the moving ship anchor during retraction so the EVA unit
    // cleanly returns instead of drifting past where the ship used to be.
    getShipAnchorWorld(system.ship, system.targetPos)
    system.worldPos.lerpVectors(system.startPos, system.targetPos, eased)

    const remainingDistance = system.worldPos.distanceTo(system.targetPos)
    if (remainingDistance <= system.returnSnapDistance || system.progress >= 1) {
      system.worldPos.copy(system.targetPos)
      system.root.position.copy(system.worldPos)
      system.state = 'idle'
      system.progress = 0
      system.visible = false
      system.root.visible = false
      return
    }
  }

  system.root.visible = true
  system.root.position.copy(system.worldPos)

  system.tempForward.copy(system.shipAnchorWorld).sub(system.worldPos)
  if (system.tempForward.lengthSq() > 0.000001) {
    system.tempForward.normalize()
    system.tempQuat.setFromUnitVectors(system.tempUp, system.tempForward)
    system.root.quaternion.slerp(system.tempQuat, 0.18)
  }

  if (system.model) {
    system.model.rotation.z = THREE.MathUtils.degToRad(-12) + system.bodyRoll
    system.model.rotation.x = system.bodyPitch

    if (!system.hasClipAnimation) {
      const leftArm = system.model.getObjectByName('eva_left_arm')
      const rightArm = system.model.getObjectByName('eva_right_arm')
      if (leftArm) leftArm.rotation.z = system.armSwing
      if (rightArm) rightArm.rotation.z = -system.armSwing
    }
  }
}

export function disposeAstronautSystem(system) {
  if (!system) return

  if (system.mixer) {
    system.mixer.stopAllAction()
    system.mixer = null
  }

  if (system.root?.parent) {
    system.root.parent.remove(system.root)
  }

  system.root?.traverse((child) => {
    if (child.isMesh) {
      child.geometry?.dispose?.()
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => mat?.dispose?.())
      } else {
        child.material?.dispose?.()
      }
    }
  })
}