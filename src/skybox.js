import * as THREE from 'three'

const REAL_STARS = [
  { id: 'sirius', ra: 101.287, dec: -16.716, mag: -1.46 },
  { id: 'canopus', ra: 95.987, dec: -52.695, mag: -0.74 },
  { id: 'capella', ra: 79.172, dec: 45.998, mag: 0.08 },
  { id: 'rigel', ra: 78.634, dec: -8.201, mag: 0.18 },
  { id: 'betelgeuse', ra: 88.793, dec: 7.407, mag: 0.5 },
  { id: 'arcturus', ra: 213.915, dec: 19.182, mag: 0.03 },
  { id: 'spica', ra: 201.298, dec: -11.161, mag: 0.61 },
  { id: 'antares', ra: 247.351, dec: -26.432, mag: -0.05 },
  { id: 'adhara', ra: 104.656, dec: -28.972, mag: 1.5 },
  { id: 'procyon', ra: 114.825, dec: 5.225, mag: 1.64 },
  { id: 'pollux', ra: 116.329, dec: 28.026, mag: 1.14 },
  { id: 'castor', ra: 113.65, dec: 31.888, mag: 1.58 },
  { id: 'aldebaran', ra: 68.98, dec: 16.509, mag: 0.85 },
  { id: 'bellatrix', ra: 81.282, dec: 6.35, mag: 1.64 },
  { id: 'saiph', ra: 86.939, dec: -9.669, mag: 2.07 },
  { id: 'alnilam', ra: 84.053, dec: -1.202, mag: 1.69 },
  { id: 'alnitak', ra: 85.19, dec: -1.942, mag: 1.74 },
  { id: 'mintaka', ra: 83.001, dec: -0.299, mag: 2.23 },
  { id: 'meissa', ra: 89.79, dec: 9.647, mag: 3.33 },
  { id: 'polaris', ra: 37.955, dec: 89.264, mag: 1.97 },
  { id: 'dubhe', ra: 165.46, dec: 61.751, mag: 1.79 },
  { id: 'merak', ra: 165.932, dec: 56.382, mag: 2.37 },
  { id: 'phecda', ra: 178.457, dec: 53.694, mag: 2.41 },
  { id: 'megrez', ra: 183.856, dec: 57.033, mag: 3.32 },
  { id: 'alioth', ra: 193.507, dec: 55.959, mag: 1.76 },
  { id: 'mizar', ra: 200.981, dec: 54.925, mag: 2.23 },
  { id: 'alkaid', ra: 206.885, dec: 49.313, mag: 1.85 },
  { id: 'vega', ra: 279.234, dec: 38.783, mag: 0.03 },
  { id: 'deneb', ra: 310.358, dec: 45.28, mag: 1.25 },
  { id: 'altair', ra: 297.696, dec: 8.868, mag: 0.77 },
  { id: 'algol', ra: 47.042, dec: 40.956, mag: 2.12 },
  { id: 'mirfak', ra: 51.081, dec: 49.861, mag: 1.79 },
  { id: 'hamal', ra: 31.793, dec: 23.462, mag: 2.0 },
  { id: 'schedar', ra: 10.127, dec: 56.537, mag: 2.24 },
  { id: 'caph', ra: 2.294, dec: 59.149, mag: 2.28 },
  { id: 'tsih', ra: 14.177, dec: 60.717, mag: 2.15 },
  { id: 'achernar', ra: 24.428, dec: -57.237, mag: 0.46 },
  { id: 'fomalhaut', ra: 344.412, dec: -29.622, mag: 1.16 },
  { id: 'regulus', ra: 152.093, dec: 11.967, mag: 1.35 },
  { id: 'denebola', ra: 177.265, dec: 14.572, mag: 2.14 },
  { id: 'gacrux', ra: 186.65, dec: -57.113, mag: 1.63 },
  { id: 'acrux', ra: 186.649, dec: -63.099, mag: 0.77 },
  { id: 'mimosa', ra: 191.93, dec: -59.688, mag: 1.25 },
  { id: 'shaula', ra: 263.402, dec: -37.104, mag: 1.62 },
  { id: 'sargas', ra: 264.33, dec: -42.998, mag: 1.86 },
  { id: 'kaus_australis', ra: 283.816, dec: -34.385, mag: 1.79 },
  { id: 'nunki', ra: 283.918, dec: -26.296, mag: 2.05 },
  { id: 'enif', ra: 333.366, dec: 9.963, mag: 2.38 },
  { id: 'markab', ra: 346.19, dec: 15.205, mag: 2.49 },
  { id: 'scheat', ra: 345.943, dec: 28.082, mag: 2.42 },
  { id: 'algenib', ra: 3.309, dec: 15.184, mag: 2.83 },
  { id: 'almach', ra: 30.975, dec: 42.33, mag: 2.1 },
  { id: 'alpheratz', ra: 2.097, dec: 29.09, mag: 2.06 },
  { id: 'mirach', ra: 17.433, dec: 35.621, mag: 2.05 },
  { id: 'ruchbah', ra: 21.454, dec: 60.235, mag: 2.68 },
]

const CONSTELLATION_LINES = [
  // Orion
  ['betelgeuse', 'bellatrix'],
  ['bellatrix', 'mintaka'],
  ['mintaka', 'alnilam'],
  ['alnilam', 'alnitak'],
  ['alnitak', 'saiph'],
  ['saiph', 'rigel'],
  ['rigel', 'mintaka'],
  ['betelgeuse', 'meissa'],
  ['meissa', 'bellatrix'],

  // Big Dipper / Ursa Major
  ['dubhe', 'merak'],
  ['merak', 'phecda'],
  ['phecda', 'megrez'],
  ['megrez', 'alioth'],
  ['alioth', 'mizar'],
  ['mizar', 'alkaid'],

  // Summer Triangle
  ['vega', 'deneb'],
  ['deneb', 'altair'],
  ['altair', 'vega'],

  // Gemini
  ['castor', 'pollux'],
  ['pollux', 'procyon'],

  // Taurus / Perseus / Andromeda / Cassiopeia area
  ['aldebaran', 'capella'],
  ['mirfak', 'algol'],
  ['almach', 'mirach'],
  ['mirach', 'alpheratz'],
  ['schedar', 'caph'],
  ['schedar', 'tsih'],
  ['tsih', 'ruchbah'],

  // Scorpius / Sagittarius
  ['antares', 'shaula'],
  ['shaula', 'sargas'],
  ['sargas', 'nunki'],
  ['nunki', 'kaus_australis'],

  // Southern Cross
  ['acrux', 'mimosa'],
  ['mimosa', 'gacrux'],

  // Pegasus square area
  ['alpheratz', 'markab'],
  ['markab', 'scheat'],
  ['scheat', 'algenib'],
  ['algenib', 'alpheratz'],
]

let skybox = null
let stars = null
let brightStars = null
let constellationLines = null

export function createSkybox(scene) {
  skybox = new THREE.Group()
  skybox.name = 'Skybox'

  const starCount = 4500
  const radius = 1000
  const positions = new Float32Array(starCount * 3)
  const colors = new Float32Array(starCount * 3)

  for (let i = 0; i < starCount; i++) {
    const u = Math.random()
    const v = Math.random()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)

    // Slight shell variation so stars do not feel mathematically flat.
    const shellBias = Math.random() > 0.86 ? 0.72 + Math.random() * 0.1 : 0.84 + Math.random() * 0.16
    const r = radius * shellBias

    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = r * Math.cos(phi)
    const z = r * Math.sin(phi) * Math.sin(theta)

    const index = i * 3
    positions[index] = x
    positions[index + 1] = y
    positions[index + 2] = z

    // Mostly white stars, with subtle cool and warm variation.
    const tintRoll = Math.random()
    let color = new THREE.Color(0xffffff)
    if (tintRoll > 0.985) {
      color = new THREE.Color(0xaecbff)
    } else if (tintRoll > 0.955) {
      color = new THREE.Color(0xffe6bf)
    } else if (tintRoll > 0.88) {
      color = new THREE.Color(0xdfe9ff)
    }

    colors[index] = color.r
    colors[index + 1] = color.g
    colors[index + 2] = color.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    vertexColors: true,
    size: 1,
    sizeAttenuation: true,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    fog: false,
  })

  stars = new THREE.Points(geometry, material)
  stars.frustumCulled = false
  stars.renderOrder = -1000

  skybox.add(stars)

  const brightPositions = new Float32Array(REAL_STARS.length * 3)
  const brightColors = new Float32Array(REAL_STARS.length * 3)

  for (let i = 0; i < REAL_STARS.length; i++) {
    const star = REAL_STARS[i]

    const raRad = THREE.MathUtils.degToRad(star.ra)
    const decRad = THREE.MathUtils.degToRad(star.dec)

    const r = radius * 0.95

    const x = r * Math.cos(decRad) * Math.cos(raRad)
    const y = r * Math.sin(decRad)
    const z = r * Math.cos(decRad) * Math.sin(raRad)

    const index = i * 3
    brightPositions[index] = x
    brightPositions[index + 1] = y
    brightPositions[index + 2] = z

    // Brightness based on magnitude
    const intensity = Math.max(0.3, 1.5 - star.mag * 0.3)
    brightColors[index] = intensity
    brightColors[index + 1] = intensity
    brightColors[index + 2] = intensity

    // Slight tinting for major stars so the sky feels less monochrome.
    if (star.id === 'rigel' || star.id === 'vega' || star.id === 'spica') {
      brightColors[index] *= 0.85
      brightColors[index + 1] *= 0.92
      brightColors[index + 2] *= 1.08
    } else if (star.id === 'betelgeuse' || star.id === 'antares' || star.id === 'aldebaran') {
      brightColors[index] *= 1.08
      brightColors[index + 1] *= 0.94
      brightColors[index + 2] *= 0.86
    }
  }

  const brightGeometry = new THREE.BufferGeometry()
  brightGeometry.setAttribute('position', new THREE.BufferAttribute(brightPositions, 3))
  brightGeometry.setAttribute('color', new THREE.BufferAttribute(brightColors, 3))

  const brightMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    vertexColors: true,
    size: 5.5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    fog: false,
  })

  brightStars = new THREE.Points(brightGeometry, brightMaterial)
  brightStars.frustumCulled = false
  brightStars.renderOrder = -999

  skybox.add(brightStars)

  const starMap = new Map()
  for (let i = 0; i < REAL_STARS.length; i++) {
    const star = REAL_STARS[i]
    const index = i * 3
    starMap.set(
      star.id,
      new THREE.Vector3(
        brightPositions[index],
        brightPositions[index + 1],
        brightPositions[index + 2],
      ),
    )
  }

  const linePositions = []
  for (const [a, b] of CONSTELLATION_LINES) {
    const aPos = starMap.get(a)
    const bPos = starMap.get(b)
    if (!aPos || !bPos) continue
    linePositions.push(aPos.x, aPos.y, aPos.z)
    linePositions.push(bPos.x, bPos.y, bPos.z)
  }

  const lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(linePositions, 3),
  )

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xbfd6ff,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    fog: false,
  })

  constellationLines = new THREE.LineSegments(lineGeometry, lineMaterial)
  constellationLines.frustumCulled = false
  constellationLines.renderOrder = -998
  skybox.add(constellationLines)

  scene.add(skybox)

  console.log('[Skybox] Starfield created:', starCount, 'real stars:', REAL_STARS.length, 'constellation links:', CONSTELLATION_LINES.length)
}

export function updateSkybox(dt, camera = null) {
  if (!skybox) return

  // Keep the starfield centered on the camera so it always surrounds the player.
  if (camera) {
    skybox.position.copy(camera.position)
  }

  // Extremely slow drift so space does not feel dead static.
  skybox.rotation.y += dt * 0.0008
  skybox.rotation.x += dt * 0.00015

  const t = performance.now() * 0.001

  if (stars?.material) {
    stars.material.opacity = 0.9 + Math.sin(t * 0.35) * 0.03
  }

  if (brightStars?.material) {
    brightStars.material.opacity = 0.84 + Math.sin(t * 0.7 + 0.6) * 0.06
  }

  if (constellationLines?.material) {
    constellationLines.material.opacity = 0.1 + Math.sin(t * 0.22 + 0.4) * 0.015
  }
}
