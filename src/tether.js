import * as THREE from 'three'

export function createTether(color = 0x9fd8ff, opacity = 0.7, segments = 12) {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array((segments + 1) * 3)
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.userData.segments = segments

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

export function updateTether(line, start, end) {
  if (!line || !start || !end) return

  // Guard against NaN inputs
  if (
    !Number.isFinite(start.x) || !Number.isFinite(start.y) || !Number.isFinite(start.z) ||
    !Number.isFinite(end.x) || !Number.isFinite(end.y) || !Number.isFinite(end.z)
  ) {
    return
  }

  const attr = line.geometry.attributes.position
  const arr = attr.array
  const segments = line.geometry.userData.segments || 12

  // Mid point and a simple "sag" control point (quadratic bezier)
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)

  // World "down" for sag (cheap, looks good).
  const down = new THREE.Vector3(0, -1, 0)

  const dist = start.distanceTo(end)
  const sagAmount = Math.min(2.5, dist * 0.12) // tweak feel here

  const control = mid.clone().addScaledVector(down, sagAmount)

  // Quadratic Bezier interpolation
  for (let i = 0; i <= segments; i++) {
    const t = i / segments

    // B(t) = (1-t)^2 * start + 2(1-t)t * control + t^2 * end
    const a = (1 - t) * (1 - t)
    const b = 2 * (1 - t) * t
    const c = t * t

    const x = a * start.x + b * control.x + c * end.x
    const y = a * start.y + b * control.y + c * end.y
    const z = a * start.z + b * control.z + c * end.z

    const idx = i * 3
    arr[idx] = x
    arr[idx + 1] = y
    arr[idx + 2] = z
  }

  attr.needsUpdate = true

  // Safe bounding sphere update
  if (line.geometry && line.geometry.computeBoundingSphere) {
    line.geometry.computeBoundingSphere()
  }
}

export function disposeTether(line) {
  if (!line) return

  if (line.parent) {
    line.parent.remove(line)
  }

  line.geometry?.dispose?.()
  line.material?.dispose?.()
}
