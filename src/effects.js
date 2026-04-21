import * as THREE from "three";

const activeEffects = [];
const tempVec3 = new THREE.Vector3();
function createShockwaveRing(scene, position, color, startScale = 0.4, endScale = 5.8, life = 0.45) {
  if (!scene || !position) return null;

  const geometry = new THREE.RingGeometry(0.7, 1.1, 32);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

  const ring = new THREE.Mesh(geometry, material);
  ring.position.copy(position);
  ring.scale.setScalar(startScale);
  scene.add(ring);

  const effect = {
    type: "ring",
    scene,
    mesh: ring,
    life,
    maxLife: life,
    startScale,
    endScale,
  };

  activeEffects.push(effect);
  return effect;
}

function createParticleCloud({
  scene,
  position,
  color = 0xff8844,
  count = 96,
  size = 0.18,
  life = 1.2,
  speedMin = 2.2,
  speedMax = 5.8,
  inward = false,
  burstDelay = 0,
}) {
  if (!scene || !position) return null;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = [];

  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;

    const dir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ).normalize();

    const speed = speedMin + Math.random() * (speedMax - speedMin);
    const velocity = dir.multiplyScalar(inward ? -speed : speed);
    velocity.y += (Math.random() - 0.35) * 1.2;
    velocities.push(velocity);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

  const points = new THREE.Points(geometry, material);
  points.position.copy(position);
  scene.add(points);

  const effect = {
    scene,
    points,
    velocities,
    life,
    maxLife: life,
    inward,
    burstDelay,
    burstTriggered: !inward || burstDelay <= 0,
    rotationSpeed: (Math.random() - 0.5) * 2.2,
  };

  activeEffects.push(effect);
  return effect;
}

export function spawnBurnupExplosion(scene, position) {
  createShockwaveRing(scene, position, 0xffaa55, 0.35, 6.8, 0.42);

  createParticleCloud({
    scene,
    position,
    color: 0xff7a33,
    count: 110,
    size: 0.2,
    life: 1.2,
    speedMin: 2.8,
    speedMax: 6.4,
    inward: false,
  });

  return createParticleCloud({
    scene,
    position,
    color: 0xffd18a,
    count: 64,
    size: 0.13,
    life: 0.85,
    speedMin: 1.8,
    speedMax: 3.8,
    inward: false,
  });
}

export function spawnSatelliteCrashEffect(scene, position) {
  createShockwaveRing(scene, position, 0xa8e4ff, 0.28, 4.9, 0.32);

  createParticleCloud({
    scene,
    position,
    color: 0x66b8ff,
    count: 52,
    size: 0.11,
    life: 0.5,
    speedMin: 0.9,
    speedMax: 1.8,
    inward: true,
    burstDelay: 0.08,
  });

  return createParticleCloud({
    scene,
    position,
    color: 0x88ccff,
    count: 96,
    size: 0.16,
    life: 1.05,
    speedMin: 1.8,
    speedMax: 4.1,
    inward: true,
    burstDelay: 0.11,
  });
}

export function updateEffects(dt) {
  for (let i = activeEffects.length - 1; i >= 0; i--) {
    const effect = activeEffects[i];
    effect.life -= dt;

    if (effect.life <= 0) {
      if (effect.type === "ring") {
        if (effect.mesh.parent) {
          effect.mesh.parent.remove(effect.mesh);
        }
        effect.mesh.geometry.dispose();
        effect.mesh.material.dispose();
      } else {
        if (effect.points.parent) {
          effect.points.parent.remove(effect.points);
        }
        effect.points.geometry.dispose();
        effect.points.material.dispose();
      }
      activeEffects.splice(i, 1);
      continue;
    }

    const lifeAlpha = Math.max(0, effect.life / effect.maxLife);

    if (effect.type === "ring") {
      const progress = 1 - lifeAlpha;
      const scale = THREE.MathUtils.lerp(effect.startScale, effect.endScale, progress);
      effect.mesh.scale.setScalar(scale);
      effect.mesh.material.opacity = lifeAlpha * 0.9;
      effect.mesh.rotation.z += dt * 1.8;
      continue;
    }

    if (
      effect.inward &&
      !effect.burstTriggered &&
      effect.maxLife - effect.life >= effect.burstDelay
    ) {
      effect.burstTriggered = true;
      for (const velocity of effect.velocities) {
        velocity.multiplyScalar(-2.35);
      }
      effect.points.material.size *= 1.18;
    }

    const attr = effect.points.geometry.attributes.position;
    const arr = attr.array;

    for (let j = 0; j < effect.velocities.length; j++) {
      tempVec3.copy(effect.velocities[j]);
      arr[j * 3 + 0] += tempVec3.x * dt;
      arr[j * 3 + 1] += tempVec3.y * dt;
      arr[j * 3 + 2] += tempVec3.z * dt;

      effect.velocities[j].multiplyScalar(0.985);
    }

    attr.needsUpdate = true;
    effect.points.material.opacity = lifeAlpha;
    effect.points.material.size *= 0.998;
    effect.points.rotation.z += dt * effect.rotationSpeed;
  }
}

export function clearEffects() {
  for (let i = activeEffects.length - 1; i >= 0; i--) {
    const effect = activeEffects[i];
    if (effect.type === "ring") {
      if (effect.mesh.parent) {
        effect.mesh.parent.remove(effect.mesh);
      }
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
    } else {
      if (effect.points.parent) {
        effect.points.parent.remove(effect.points);
      }
      effect.points.geometry.dispose();
      effect.points.material.dispose();
    }
  }
  activeEffects.length = 0;
}