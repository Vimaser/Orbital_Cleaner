import * as THREE from 'three'

export function createSun(scene) {
  const sun = new THREE.Group()

  // Place the visual sun far away so it reads like a distant light source.
  sun.position.set(520, 180, -420)

  // Procedural sun core
  const sunCore = new THREE.Mesh(
    new THREE.SphereGeometry(28, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
    })
  )
  sunCore.frustumCulled = false

  sun.add(sunCore)

  // Main sun lighting for the whole scene.
  const sunLight = new THREE.DirectionalLight(0xfff7e0, 6.2)
  sunLight.position.copy(sun.position)
  sunLight.target.position.set(0, 0, 0)
  scene.add(sunLight)
  scene.add(sunLight.target)

  // Local glow light around the sun so nearby highlights feel hotter.
  const sunPointLight = new THREE.PointLight(0xffe09a, 6.0, 0, 2)
  sunPointLight.position.set(0, 0, 0)
  sun.add(sunPointLight)

  // Soft fill so the dark side of objects is not completely crushed.
  const ambientLight = new THREE.AmbientLight(0x7f91b3, 0.22)
  scene.add(ambientLight)

  // Optional glow shell so the sun reads brighter at a distance.
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(95, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      toneMapped: false,
    })
  )
  glow.frustumCulled = false
  sun.add(glow)

  // Secondary larger glow for a softer animated corona.
  const outerGlow = new THREE.Mesh(
    new THREE.SphereGeometry(160, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      toneMapped: false,
    })
  )
  outerGlow.frustumCulled = false
  const backGlowMap = createRadialGlowTexture()
  const backGlowMaterial = new THREE.SpriteMaterial({
    map: backGlowMap,
    color: 0xffffff,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  })
  const backGlow = new THREE.Sprite(backGlowMaterial)
  backGlow.scale.set(360, 360, 1)
  backGlow.position.set(0, 0, 0)
  backGlow.frustumCulled = false
  backGlow.renderOrder = 1000

  const farBackGlowMaterial = new THREE.SpriteMaterial({
    map: backGlowMap,
    color: 0xffffff,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  })
  const farBackGlow = new THREE.Sprite(farBackGlowMaterial)
  farBackGlow.scale.set(900, 900, 1)
  farBackGlow.position.set(0, 0, 0)
  farBackGlow.frustumCulled = false
  farBackGlow.renderOrder = 999

  sun.add(outerGlow)
  sun.add(backGlow)
  sun.add(farBackGlow)

  const glareMaterial = new THREE.SpriteMaterial({
    map: backGlowMap,
    color: 0xffffff,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  })

  const glare = new THREE.Sprite(glareMaterial)
  glare.scale.set(1500, 1500, 1)
  glare.position.set(0, 0, 0)
  glare.frustumCulled = false
  glare.renderOrder = 1001

  sun.add(glare)

  sun.userData.light = sunLight
  sun.userData.pointLight = sunPointLight
  sun.userData.ambient = ambientLight
  sun.userData.glow = glow
  sun.userData.outerGlow = outerGlow
  sun.userData.backGlow = backGlow
  sun.userData.farBackGlow = farBackGlow
  sun.userData.glare = glare
  sun.userData.time = 0

  scene.add(sun)

  return sun
}

function createRadialGlowTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    0,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  )
  gradient.addColorStop(0, 'rgba(255,255,220,1.0)')
  gradient.addColorStop(0.2, 'rgba(255,220,140,0.95)')
  gradient.addColorStop(0.45, 'rgba(255,170,70,0.55)')
  gradient.addColorStop(0.75, 'rgba(255,120,30,0.18)')
  gradient.addColorStop(1, 'rgba(255,120,30,0.0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export function updateSun(sun, dt, camera = null) {
  if (!sun) return

  sun.userData.time = (sun.userData.time || 0) + dt
  const t = sun.userData.time

  if (camera) {
    if (sun.userData.backGlow) {
      sun.userData.backGlow.quaternion.copy(camera.quaternion)
    }
    if (sun.userData.farBackGlow) {
      sun.userData.farBackGlow.quaternion.copy(camera.quaternion)
    }
    if (sun.userData.glare) {
      sun.userData.glare.quaternion.copy(camera.quaternion)
    }
  }

  // Keep the sun visuals on the same 24-minute world cycle as the planet.
  // This is only a subtle cosmetic rotation of the sun group itself; the
  // lighting direction still comes from the sun's world position below.
  const secondsPerFullRotation = 24 * 60
  const rotationSpeed = (Math.PI * 2) / secondsPerFullRotation
  sun.rotation.y += dt * rotationSpeed

  // Animated corona pulse.
  const pulseA = 1 + Math.sin(t * 1.35) * 0.06
  const pulseB = 1 + Math.sin(t * 0.8 + 1.2) * 0.09

  if (sun.userData.glow) {
    sun.userData.glow.scale.setScalar(pulseA * 1.18)
    sun.userData.glow.material.opacity = 0.6 + Math.sin(t * 1.7) * 0.1
  }

  if (sun.userData.outerGlow) {
    sun.userData.outerGlow.scale.setScalar(pulseB * 1.22)
    sun.userData.outerGlow.material.opacity = 0.34 + Math.sin(t * 1.1 + 0.7) * 0.07
  }

  if (sun.userData.backGlow) {
    const spritePulse = 1 + Math.sin(t * 0.95 + 0.4) * 0.1
    sun.userData.backGlow.scale.set(360 * spritePulse, 360 * spritePulse, 1)
    sun.userData.backGlow.material.opacity = 0.78 + Math.sin(t * 1.2) * 0.12
  }

  if (sun.userData.farBackGlow) {
    const farPulse = 1 + Math.sin(t * 0.55 + 1.1) * 0.12
    sun.userData.farBackGlow.scale.set(900 * farPulse, 900 * farPulse, 1)
    sun.userData.farBackGlow.material.opacity = 0.56 + Math.sin(t * 0.8 + 0.2) * 0.08
  }

  if (sun.userData.glare && camera) {
    const glarePulse = 1 + Math.sin(t * 0.6) * 0.1
    sun.userData.glare.scale.set(1200 * glarePulse, 1200 * glarePulse, 1)

    // Direction-based intensity (prevents pop-in)
    const sunWorldPos = new THREE.Vector3()
    sun.getWorldPosition(sunWorldPos)

    const toSun = sunWorldPos.clone().sub(camera.position).normalize()
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)

    const alignment = Math.max(0, forward.dot(toSun))

    // Smooth ramp instead of pop
    const intensity = Math.pow(alignment, 2.2)

    sun.userData.glare.material.opacity = intensity * 0.35
  }

  if (sun.userData.pointLight) {
    sun.userData.pointLight.intensity = 7.2 + Math.sin(t * 1.5) * 0.65
  }

  if (sun.userData.light) {
    sun.userData.light.intensity = 6.2 + Math.sin(t * 0.9) * 0.25

    // Keep the directional light aligned with the visual sun position.
    const worldPos = new THREE.Vector3()
    sun.getWorldPosition(worldPos)
    sun.userData.light.position.copy(worldPos)
  }
}