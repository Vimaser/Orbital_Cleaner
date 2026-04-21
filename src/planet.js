import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import earthGlbUrl from '../assets/models/earth.glb?url'

export function createPlanet(scene, planetRadius) {
  const planet = new THREE.Object3D()

  const loader = new GLTFLoader()

  loader.load(earthGlbUrl, (gltf) => {
    const earth = gltf.scene

    // Normalize + scale model to match gameplay radius
    const box = new THREE.Box3().setFromObject(earth)
    const size = new THREE.Vector3()
    box.getSize(size)

    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = (planetRadius * 2) / maxDim

    earth.scale.setScalar(scale)

    earth.traverse((child) => {
      if (!child.isMesh) return

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material]

      materials.forEach((material) => {
        if (!material) return

        if (material.map) {
          material.map.colorSpace = THREE.SRGBColorSpace
          material.map.flipY = false
          material.map.needsUpdate = true
        }

        if (material.emissiveMap) {
          material.emissiveMap.colorSpace = THREE.SRGBColorSpace
          material.emissiveMap.flipY = false
          material.emissiveMap.needsUpdate = true
        }

        material.vertexColors = false
        material.needsUpdate = true
      })
    })

    // Center the model
    const center = new THREE.Vector3()
    box.getCenter(center)
    earth.position.sub(center.multiplyScalar(scale))

    planet.add(earth)

    // --- Procedural Night Lights Layer (no texture files needed) ---
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    // Fill black (ocean/dark baseline)
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Helper to draw soft glow blobs (approx pop clusters)
    function glow(x, y, radius, intensity = 1.0) {
      const grd = ctx.createRadialGradient(x, y, 0, x, y, radius)
      grd.addColorStop(0, `rgba(255,220,180,${0.8 * intensity})`)
      grd.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    // Rough regions (hand-tuned, not accurate, but believable)
    const w = canvas.width
    const h = canvas.height

    // US East / Great Lakes
    glow(w * 0.30, h * 0.35, 60, 1.0)
    glow(w * 0.26, h * 0.40, 40, 0.7)

    // Europe
    glow(w * 0.50, h * 0.32, 50, 1.0)

    // India
    glow(w * 0.65, h * 0.45, 45, 1.0)

    // East China
    glow(w * 0.72, h * 0.38, 55, 1.0)

    // Japan
    glow(w * 0.80, h * 0.35, 30, 0.9)

    const nightTexture = new THREE.CanvasTexture(canvas)
    nightTexture.colorSpace = THREE.SRGBColorSpace

    const nightMaterial = new THREE.MeshBasicMaterial({
      map: nightTexture,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const nightSphere = new THREE.Mesh(
      new THREE.SphereGeometry(planetRadius * 1.01, 64, 64),
      nightMaterial
    )
    nightSphere.name = 'NightLightsLayer'

    planet.add(nightSphere)

    // --- Procedural Aurora Layer ---
    const auroraCanvas = document.createElement('canvas')
    auroraCanvas.width = 1024
    auroraCanvas.height = 512
    const auroraCtx = auroraCanvas.getContext('2d')

    auroraCtx.clearRect(0, 0, auroraCanvas.width, auroraCanvas.height)

    function auroraBand(cx, cy, rx, ry, colorA, alphaA, colorB, alphaB) {
      const gradient = auroraCtx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry))
      gradient.addColorStop(0, colorA.replace('ALPHA', alphaA.toString()))
      gradient.addColorStop(0.55, colorB.replace('ALPHA', alphaB.toString()))
      gradient.addColorStop(1, 'rgba(0,0,0,0)')

      auroraCtx.save()
      auroraCtx.fillStyle = gradient
      auroraCtx.beginPath()
      auroraCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      auroraCtx.fill()
      auroraCtx.restore()
    }

    const aw = auroraCanvas.width
    const ah = auroraCanvas.height

    // North pole bands
    auroraBand(aw * 0.50, ah * 0.16, 280, 95, 'rgba(120,255,180,ALPHA)', 0.62, 'rgba(90,180,255,ALPHA)', 0.30)
    auroraBand(aw * 0.40, ah * 0.21, 190, 70, 'rgba(110,255,170,ALPHA)', 0.44, 'rgba(120,210,255,ALPHA)', 0.24)
    auroraBand(aw * 0.60, ah * 0.22, 205, 72, 'rgba(100,255,160,ALPHA)', 0.40, 'rgba(90,180,255,ALPHA)', 0.22)

    // South pole bands
    auroraBand(aw * 0.50, ah * 0.84, 280, 95, 'rgba(120,255,180,ALPHA)', 0.58, 'rgba(90,180,255,ALPHA)', 0.28)
    auroraBand(aw * 0.41, ah * 0.79, 190, 70, 'rgba(110,255,170,ALPHA)', 0.42, 'rgba(120,210,255,ALPHA)', 0.22)
    auroraBand(aw * 0.59, ah * 0.78, 205, 72, 'rgba(100,255,160,ALPHA)', 0.38, 'rgba(90,180,255,ALPHA)', 0.20)

    const auroraTexture = new THREE.CanvasTexture(auroraCanvas)
    auroraTexture.colorSpace = THREE.SRGBColorSpace
    auroraTexture.wrapS = THREE.RepeatWrapping
    auroraTexture.wrapT = THREE.ClampToEdgeWrapping

    const auroraMaterial = new THREE.MeshBasicMaterial({
      map: auroraTexture,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })

    const auroraSphere = new THREE.Mesh(
      new THREE.SphereGeometry(planetRadius * 1.018, 64, 64),
      auroraMaterial
    )
    auroraSphere.name = 'AuroraLayer'

    // Rotate to match GLB Earth orientation (fix pole alignment)
    auroraSphere.rotation.x = Math.PI / 2

    planet.add(auroraSphere)

    // Handle animation if present
    if (gltf.animations && gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(earth)
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip)
        action.reset()
        action.play()
      })

      planet.userData.mixer = mixer
    }
  })

  scene.add(planet)

  return planet
}

export function updatePlanet(planet, dt) {
  // 24 real minutes = full 360° rotation
  const secondsPerFullRotation = 24 * 60
  const rotationSpeed = (Math.PI * 2) / secondsPerFullRotation
  planet.rotation.y += dt * rotationSpeed

  // Also play any embedded GLB animation
  if (planet.userData.mixer) {
    planet.userData.mixer.update(dt)
  }

  // Fade night lights based on rotation (very simple approximation)
  const nightLayer = planet.children.find(c => c.name === 'NightLightsLayer')
  if (nightLayer) {
    const t = (Math.sin(planet.rotation.y) + 1) * 0.5
    nightLayer.material.opacity = 0.6 * (1 - t)
  }

  const auroraLayer = planet.children.find(c => c.name === 'AuroraLayer')
  if (auroraLayer?.material?.map) {
    const t = performance.now() * 0.001
    auroraLayer.material.map.offset.x = (t * 0.0025) % 1

    // More visible on the night side, but still faint overall.
    const nightFactor = 1 - ((Math.sin(planet.rotation.y) + 1) * 0.5)
    const pulse = 0.88 + Math.sin(t * 1.7) * 0.12
    auroraLayer.material.opacity = Math.max(0.04, 0.42 * nightFactor * pulse)
  }
}