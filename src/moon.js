import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import moonUrl from '../assets/models/moon.glb?url'

const DEFAULT_MOON_CONFIG = {
  orbitRadius: 950,
  orbitPeriodSeconds: 90 * 60, // 90 real minutes per full orbit
  visualRadius: 48,
  orbitInclinationDeg: 11,
  startAngleDeg: 35,
  axialSpinPeriodSeconds: 90 * 60,
  earthshineIntensity: 0.22,
  rimOpacity: 0.085,
}

function degToRad(deg) {
  return (deg * Math.PI) / 180
}

function computeScaleForRadius(object3d, targetRadius) {
  const bounds = new THREE.Box3().setFromObject(object3d)
  const size = new THREE.Vector3()
  bounds.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)

  if (!Number.isFinite(maxDim) || maxDim <= 0.000001) {
    return 1
  }

  const targetDiameter = targetRadius * 2
  return targetDiameter / maxDim
}

export function createMoon(scene, overrides = {}) {
  const config = { ...DEFAULT_MOON_CONFIG, ...overrides }

  const system = {
    group: new THREE.Group(),
    pivot: new THREE.Group(),
    moon: new THREE.Group(),
    orbitRadius: config.orbitRadius,
    orbitPeriodSeconds: config.orbitPeriodSeconds,
    axialSpinPeriodSeconds: config.axialSpinPeriodSeconds,
    currentAngle: degToRad(config.startAngleDeg),
    angularVelocity: (Math.PI * 2) / config.orbitPeriodSeconds,
    spinVelocity: (Math.PI * 2) / config.axialSpinPeriodSeconds,
    visualRadius: config.visualRadius,
    orbitInclination: degToRad(config.orbitInclinationDeg),
    loaderComplete: false,
    debugName: 'MoonSystem',
    earthshineIntensity: config.earthshineIntensity,
    rimOpacity: config.rimOpacity,
    earthshineLight: null,
    rimShell: null,
  }

  system.group.name = 'MoonSystem'
  system.pivot.name = 'MoonOrbitPivot'
  system.moon.name = 'MoonBody'

  system.pivot.rotation.z = system.orbitInclination
  system.group.add(system.pivot)
  system.pivot.add(system.moon)
  scene.add(system.group)

  // Fallback sphere so phases/orbit work even if GLB fails.
  const fallbackMaterial = new THREE.MeshStandardMaterial({
    color: 0xbfc3ca,
    roughness: 0.96,
    metalness: 0.0,
    emissive: 0x0b1020,
    emissiveIntensity: 0.03,
  })
  const fallbackMoon = new THREE.Mesh(
    new THREE.SphereGeometry(system.visualRadius, 48, 48),
    fallbackMaterial,
  )
  fallbackMoon.name = 'MoonFallback'
  system.moon.add(fallbackMoon)
  system.moon.userData.visual = fallbackMoon

  // Subtle Earthshine coming from Earth's direction (the scene origin).
  const earthshineLight = new THREE.PointLight(0x8fb2ff, system.earthshineIntensity, system.orbitRadius * 2.2, 2)
  earthshineLight.position.set(0, 0, 0)
  system.group.add(earthshineLight)
  system.earthshineLight = earthshineLight

  // Faint rim shell so the moon reads better against space without looking fake.
  const rimShellMaterial = new THREE.MeshBasicMaterial({
    color: 0x9bb7ff,
    transparent: true,
    opacity: system.rimOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
    toneMapped: false,
  })
  const rimShell = new THREE.Mesh(
    new THREE.SphereGeometry(system.visualRadius * 1.035, 48, 48),
    rimShellMaterial,
  )
  rimShell.name = 'MoonRimShell'
  system.moon.add(rimShell)
  system.rimShell = rimShell

  const loader = new GLTFLoader()
  loader.load(
    moonUrl,
    (gltf) => {
      const model = gltf.scene
      if (!model) {
        return
      }

      const scale = computeScaleForRadius(model, system.visualRadius)
      model.scale.setScalar(scale)

      const recenteredBounds = new THREE.Box3().setFromObject(model)
      const center = new THREE.Vector3()
      recenteredBounds.getCenter(center)
      model.position.sub(center)

      model.traverse((child) => {
        if (!child.isMesh || !child.material) return

        const materials = Array.isArray(child.material) ? child.material : [child.material]
        for (const material of materials) {
          if (!material) continue
          if ('roughness' in material) {
            material.roughness = Math.min(1, Math.max(0.82, material.roughness ?? 0.92))
          }
          if ('metalness' in material) {
            material.metalness = 0.0
          }
          if ('envMapIntensity' in material) {
            material.envMapIntensity = 0.35
          }
          if ('emissive' in material) {
            material.emissive.setHex(0x0a1020)
            material.emissiveIntensity = 0.025
          }
          material.needsUpdate = true
        }
      })

      if (system.moon.userData.visual?.parent) {
        system.moon.remove(system.moon.userData.visual)
      }

      system.moon.add(model)
      system.moon.userData.visual = model
      system.loaderComplete = true

      console.log('[Moon] Loaded moon.glb')
    },
    undefined,
    (error) => {
      console.warn('[Moon] Failed to load moon.glb, using fallback sphere.', error)
    },
  )

  // Initialize starting orbit position immediately.
  updateMoon(system, 0)

  return system
}

export function updateMoon(system, dt) {
  if (!system) return

  system.currentAngle += system.angularVelocity * dt

  const x = Math.cos(system.currentAngle) * system.orbitRadius
  const z = Math.sin(system.currentAngle) * system.orbitRadius
  system.moon.position.set(x, 0, z)

  // Slow axial rotation for a little life. Keep it subtle.
  system.moon.rotation.y += system.spinVelocity * dt

  // Keep the Earthshine pointing from Earth toward the moon and make the rim
  // react slightly to lunar position so the dark side still reads softly.
  if (system.earthshineLight) {
    system.earthshineLight.intensity = system.earthshineIntensity
  }

  if (system.rimShell?.material) {
    const phasePulse = 0.75 + Math.sin(system.currentAngle) * 0.08
    system.rimShell.material.opacity = system.rimOpacity * phasePulse
  }
}