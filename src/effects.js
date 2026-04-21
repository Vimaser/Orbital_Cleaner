import * as THREE from "three";

const activeEffects = [];
const tempVec3 = new THREE.Vector3();
const tempVec3B = new THREE.Vector3();
const tempEuler = new THREE.Euler();

const BURN_BREAKUP_CONFIG = {
  SMALL: {
    shardCount: 6,
    shardScaleMin: 0.08,
    shardScaleMax: 0.16,
    speedMin: 1.8,
    speedMax: 4.2,
    flashScale: 0.28,
    shockwaveEndScale: 4.2,
  },
  MEDIUM: {
    shardCount: 9,
    shardScaleMin: 0.12,
    shardScaleMax: 0.24,
    speedMin: 2.2,
    speedMax: 5.3,
    flashScale: 0.36,
    shockwaveEndScale: 5.8,
  },
  LARGE: {
    shardCount: 12,
    shardScaleMin: 0.16,
    shardScaleMax: 0.34,
    speedMin: 2.5,
    speedMax: 6.2,
    flashScale: 0.46,
    shockwaveEndScale: 7.0,
  },
};
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

function createBurnShardBurst({
  scene,
  position,
  size = "MEDIUM",
  color = 0xffa14a,
  emberColor = 0xffddaa,
  life = 0.82,
}) {
  if (!scene || !position) return null;

  const normalizedSize = String(size ?? "MEDIUM").toUpperCase();
  const cfg = BURN_BREAKUP_CONFIG[normalizedSize] || BURN_BREAKUP_CONFIG.MEDIUM;

  const group = new THREE.Group();
  group.position.copy(position);
  scene.add(group);

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 12),
    new THREE.MeshBasicMaterial({
      color: 0xfff1c2,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  flash.scale.setScalar(cfg.flashScale);
  group.add(flash);

  const shards = [];

  for (let i = 0; i < cfg.shardCount; i += 1) {
    const shardGeometry = new THREE.TetrahedronGeometry(1, 0);
    const shardMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });

    const shard = new THREE.Mesh(shardGeometry, shardMaterial);
    const shardScale =
      cfg.shardScaleMin + Math.random() * (cfg.shardScaleMax - cfg.shardScaleMin);
    shard.scale.setScalar(shardScale);

    shard.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );

    const dir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ).normalize();
    const speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
    const velocity = dir.multiplyScalar(speed);
    velocity.y += (Math.random() - 0.35) * 0.9;

    const spin = new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
    );

    shard.userData.velocity = velocity;
    shard.userData.spin = spin;
    shard.userData.drag = 0.982 - Math.random() * 0.01;

    group.add(shard);
    shards.push(shard);
  }

  createParticleCloud({
    scene,
    position,
    color: emberColor,
    count: Math.round(cfg.shardCount * 4.5),
    size: normalizedSize === "LARGE" ? 0.14 : 0.11,
    life: life * 0.9,
    speedMin: cfg.speedMin * 0.65,
    speedMax: cfg.speedMax * 0.7,
    inward: false,
  });

  const effect = {
    type: "burnShardBurst",
    scene,
    group,
    flash,
    shards,
    life,
    maxLife: life,
  };

  activeEffects.push(effect);
  return effect;
}

export function spawnBurnupExplosion(scene, position, size = "MEDIUM") {
  const normalizedSize = String(size ?? "MEDIUM").toUpperCase();
  const cfg = BURN_BREAKUP_CONFIG[normalizedSize] || BURN_BREAKUP_CONFIG.MEDIUM;

  createShockwaveRing(
    scene,
    position,
    0xffaa55,
    cfg.flashScale,
    cfg.shockwaveEndScale,
    0.42,
  );

  return createBurnShardBurst({
    scene,
    position,
    size: normalizedSize,
    color: 0xff9c45,
    emberColor: 0xffd7a1,
    life: normalizedSize === "LARGE" ? 0.92 : 0.8,
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
      } else if (effect.type === "burnShardBurst") {
        if (effect.group.parent) {
          effect.group.parent.remove(effect.group);
        }
        effect.flash.geometry.dispose();
        effect.flash.material.dispose();
        for (const shard of effect.shards) {
          shard.geometry.dispose();
          shard.material.dispose();
        }
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

    if (effect.type === "burnShardBurst") {
      const progress = 1 - lifeAlpha;

      effect.flash.scale.setScalar(
        THREE.MathUtils.lerp(1, 2.8, progress) * effect.flash.scale.x,
      );
      effect.flash.material.opacity = lifeAlpha * 0.75;

      for (let j = 0; j < effect.shards.length; j += 1) {
        const shard = effect.shards[j];
        const velocity = shard.userData.velocity;
        const spin = shard.userData.spin;

        tempVec3B.copy(velocity);
        shard.position.addScaledVector(tempVec3B, dt);

        tempEuler.set(spin.x * dt, spin.y * dt, spin.z * dt);
        shard.rotation.x += tempEuler.x;
        shard.rotation.y += tempEuler.y;
        shard.rotation.z += tempEuler.z;

        velocity.multiplyScalar(shard.userData.drag);
        velocity.y -= dt * 0.45;

        shard.material.opacity = lifeAlpha;
        shard.scale.multiplyScalar(0.9985);
      }

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
    } else if (effect.type === "burnShardBurst") {
      if (effect.group.parent) {
        effect.group.parent.remove(effect.group);
      }
      effect.flash.geometry.dispose();
      effect.flash.material.dispose();
      for (const shard of effect.shards) {
        shard.geometry.dispose();
        shard.material.dispose();
      }
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