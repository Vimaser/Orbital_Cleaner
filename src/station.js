import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

const ORBIT_SEGMENTS = 160
const GUIDE_POINT_COUNT = 72

const ISS_MODEL_URL = new URL('../assets/models/iss.glb', import.meta.url).href

const issLoader = new GLTFLoader()
let issModelPromise = null

function loadIssModel() {
  if (!issModelPromise) {
    issModelPromise = issLoader.loadAsync(ISS_MODEL_URL)
  }
  return issModelPromise
}

function applyIssModel(station, fallbackMesh) {
  loadIssModel()
    .then((gltf) => {
      if (!station?.parent) return

      const issScene = clone(gltf.scene)
      issScene.name = 'issStationModel'

      const box = new THREE.Box3().setFromObject(issScene)
      const size = new THREE.Vector3()
      const center = new THREE.Vector3()
      box.getSize(size)
      box.getCenter(center)

      const longest = Math.max(size.x || 1, size.y || 1, size.z || 1)
      const targetSize = 7.5
      const scale = targetSize / longest

      issScene.position.sub(center)
      issScene.position.y += 0.9
      issScene.position.x += 0.45
      issScene.scale.setScalar(scale)
      issScene.rotation.x = 0
      issScene.rotation.y = Math.PI * 0.5
      issScene.rotation.z = Math.PI * 0.12

      issScene.traverse((child) => {
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

      station.add(issScene)
      station.userData.issModel = issScene

      if (fallbackMesh) {
        fallbackMesh.visible = false
      }
    })
    .catch((error) => {
      console.warn('[station] Failed to load iss.glb, using fallback station mesh.', error)
    })
}

function createOrbitRing(radius, basis) {
  const points = []

  for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
    const t = (i / ORBIT_SEGMENTS) * Math.PI * 2
    points.push(getOrbitPosition(radius, t, basis))
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: 0x33ffee,
    transparent: true,
    opacity: 0.34,
  })

  const ring = new THREE.LineLoop(geometry, material)
  ring.frustumCulled = false
  return ring
}

function createGuideLine() {
  const positions = new Float32Array(GUIDE_POINT_COUNT * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setDrawRange(0, GUIDE_POINT_COUNT)

  const material = new THREE.LineDashedMaterial({
    color: 0x99fff6,
    transparent: true,
    opacity: 0.65,
    dashSize: 1.25,
    gapSize: 0.65,
  })

  const line = new THREE.Line(geometry, material)
  line.frustumCulled = false
  return line
}

function getOrbitBasis(inclination = 0.25, ascendingNode = 0.6) {
  const q = new THREE.Quaternion()
    .setFromAxisAngle(new THREE.Vector3(0, 1, 0), ascendingNode)
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), inclination))

  const tangentA = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize()
  const tangentB = new THREE.Vector3(1, 0, 0).applyQuaternion(q).normalize()

  return { tangentA, tangentB }
}

function getOrbitPosition(radius, angle, basis) {
  return basis.tangentA.clone().multiplyScalar(Math.cos(angle) * radius)
    .add(basis.tangentB.clone().multiplyScalar(Math.sin(angle) * radius))
}

export function createStation(planetRadius) {
  const station = new THREE.Group()
  station.name = 'OrbitalStation'

  const fallbackMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.6, 1.6),
    new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x003333,
      emissiveIntensity: 1.5,
    })
  )
  fallbackMesh.name = 'StationFallbackMesh'
  station.add(fallbackMesh)

  const radius = planetRadius + 3.2
  const angle = Math.PI * 0.25
  const speed = 0.08 // slower than satellites

  const basis = getOrbitBasis(0.3, 0.8)
  const orbitRing = createOrbitRing(radius, basis)
  const guideLine = createGuideLine()

  const position = getOrbitPosition(radius, angle, basis)
  station.position.copy(position)

  station.userData.radius = radius
  station.userData.angle = angle
  station.userData.speed = speed
  station.userData.basis = basis
  station.userData.orbitRing = orbitRing
  station.userData.guideLine = guideLine

  station.userData.fallbackMesh = fallbackMesh

  applyIssModel(station, fallbackMesh)

  return station
}

function updateStationGuide(station) {
  const guideLine = station.userData.guideLine
  if (!guideLine) return

  const positions = guideLine.geometry.attributes.position.array
  const radius = station.userData.radius
  const speed = station.userData.speed
  const basis = station.userData.basis
  let angle = station.userData.angle
  const simDt = 1 / 60

  for (let i = 0; i < GUIDE_POINT_COUNT; i++) {
    angle += speed * simDt
    const pos = getOrbitPosition(radius, angle, basis)
    const index = i * 3
    positions[index] = pos.x
    positions[index + 1] = pos.y
    positions[index + 2] = pos.z
  }

  guideLine.geometry.attributes.position.needsUpdate = true
  guideLine.geometry.computeBoundingSphere()
  guideLine.computeLineDistances()
}

export function updateStation(station, dt) {
  if (!station) return

  station.userData.angle += station.userData.speed * dt

  const position = getOrbitPosition(
    station.userData.radius,
    station.userData.angle,
    station.userData.basis
  )

  station.position.copy(position)

  // Face direction of travel (tangent)
  const lookAhead = getOrbitPosition(
    station.userData.radius,
    station.userData.angle + 0.05,
    station.userData.basis
  )

  const tangent = lookAhead.sub(position).normalize()
  station.lookAt(station.position.clone().add(tangent))
  updateStationGuide(station)
}