import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import shipUrl from '../assets/models/ksp_primitive_orbital_station_complex.glb?url'

let mixer = null

function createHullLight(color = 0x88ccff, intensity = 0.55, distance = 4.5) {
  const light = new THREE.PointLight(color, intensity, distance, 2)
  light.castShadow = false
  return light
}

function createThrusterFlame(length = 1.2, radius = 0.16, color = 0x66ccff) {
  const flameGroup = new THREE.Group()

  const outerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(radius, length, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    })
  )
  outerFlame.rotation.x = Math.PI / 2
  outerFlame.scale.set(1, 0.001, 1)
  outerFlame.visible = false

  const innerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 0.52, length * 0.72, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    })
  )
  innerFlame.rotation.x = Math.PI / 2
  innerFlame.position.z = -length * 0.08
  innerFlame.scale.set(1, 0.001, 1)
  innerFlame.visible = false

  flameGroup.add(outerFlame)
  flameGroup.add(innerFlame)
  flameGroup.userData.outerFlame = outerFlame
  flameGroup.userData.innerFlame = innerFlame
  flameGroup.visible = false

  return flameGroup
}

export function createOrbitalShip() {
  const group = new THREE.Group()
  group.name = 'OrbitalShip'

  const loader = new GLTFLoader()

  // Thruster rig is attached even before the model loads so effects always exist.
  const thrusterRig = new THREE.Group()
  thrusterRig.name = 'OrbitalShipThrusters'
  group.add(thrusterRig)

  const mainBoostLeft = createThrusterFlame(1.9, 0.18, 0x88ddff)
  mainBoostLeft.position.set(-0.7, -0.1, 2.15)
  thrusterRig.add(mainBoostLeft)

  const mainBoostRight = createThrusterFlame(1.9, 0.18, 0x88ddff)
  mainBoostRight.position.set(0.7, -0.1, 2.15)
  thrusterRig.add(mainBoostRight)

  const yawLeft = createThrusterFlame(0.95, 0.1, 0xffc266)
  yawLeft.position.set(1.35, 0.0, 0.25)
  yawLeft.rotation.z = -Math.PI / 2
  thrusterRig.add(yawLeft)

  const yawRight = createThrusterFlame(0.95, 0.1, 0xffc266)
  yawRight.position.set(-1.35, 0.0, 0.25)
  yawRight.rotation.z = Math.PI / 2
  thrusterRig.add(yawRight)

  const pitchUp = createThrusterFlame(0.95, 0.1, 0xff9a66)
  pitchUp.position.set(0.0, -0.85, 0.15)
  pitchUp.rotation.x = 0
  thrusterRig.add(pitchUp)

  const pitchDown = createThrusterFlame(0.95, 0.1, 0xff9a66)
  pitchDown.position.set(0.0, 0.85, 0.15)
  pitchDown.rotation.x = Math.PI
  thrusterRig.add(pitchDown)

  group.userData.thrusters = {
    mainBoostLeft,
    mainBoostRight,
    yawLeft,
    yawRight,
    pitchUp,
    pitchDown,
  }

  const hullLightFront = createHullLight(0x88ccff, 0.38, 4.8)
  hullLightFront.position.set(0, 0.2, -1.9)
  group.add(hullLightFront)

  const hullLightRear = createHullLight(0xffb366, 0.28, 4.2)
  hullLightRear.position.set(0, -0.15, 1.8)
  group.add(hullLightRear)

  loader.load(
    shipUrl,
    (gltf) => {
      const model = gltf.scene

      // Normalize scale
      const box = new THREE.Box3().setFromObject(model)
      const size = new THREE.Vector3()
      box.getSize(size)

      const maxDim = Math.max(size.x, size.y, size.z)
      if (maxDim > 0.00001) {
        const targetSize = 4.8
        const scale = targetSize / maxDim
        model.scale.setScalar(scale)
      }

      // Center model locally
      const box2 = new THREE.Box3().setFromObject(model)
      const center = new THREE.Vector3()
      box2.getCenter(center)
      model.position.sub(center)

      // Slight forward offset so "nose" isn't centered
      model.position.z -= 1.5
      model.rotation.y = Math.PI
      model.rotation.z = THREE.MathUtils.degToRad(4)

      // Improve materials for space lighting
      model.traverse((child) => {
        if (!child.isMesh) return

        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map((mat) => {
              const cloned = mat.clone()
              cloned.envMapIntensity = 1.35
              if ("metalness" in cloned) cloned.metalness = Math.min(1, (cloned.metalness ?? 0.25) + 0.08)
              if ("roughness" in cloned) cloned.roughness = Math.max(0.18, (cloned.roughness ?? 0.7) - 0.08)
              cloned.needsUpdate = true
              return cloned
            })
          } else {
            child.material = child.material.clone()
            child.material.envMapIntensity = 1.35
            if ("metalness" in child.material) {
              child.material.metalness = Math.min(1, (child.material.metalness ?? 0.25) + 0.08)
            }
            if ("roughness" in child.material) {
              child.material.roughness = Math.max(0.18, (child.material.roughness ?? 0.7) - 0.08)
            }
            child.material.needsUpdate = true
          }
        }
      })

      group.add(model)

      // Animation support disabled for stability
      // (Some imported GLB animations can rotate/flatten the model unexpectedly)
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model)
        // Do not auto-play clips
      }

    },
    undefined,
    (err) => {
      console.error('[OrbitalShip] Failed to load:', err)
    }
  )

  return group
}

export function updateOrbitalShip(dt) {
  if (mixer) mixer.update(dt)
}
