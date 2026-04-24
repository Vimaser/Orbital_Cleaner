import * as THREE from "three";

export const DEBRIS_TUNING = {
  sizeConfig: {
    SMALL: { mass: 1, burnThreshold: 2.75, instabilityMultiplier: 0.65 },
    MEDIUM: { mass: 2, burnThreshold: 5.0, instabilityMultiplier: 1.0 },
    LARGE: { mass: 4, burnThreshold: 9.5, instabilityMultiplier: 1.3 },
  },
  attachedStabilityStart: 1.25,
  instabilityPerTurn: 0.42,
  heatGainPerSecond: 0.9,
  heatCoolPerSecond: 0.18,
  burnDamageGainPerSecond: 0.75,
  releaseVelocityBlend: 0.72,
  attachedDirectionBlend: 0.08,
  releaseVelocityCarry: 3.2,
  freeDriftDamping: 0.2,
  orbitRecaptureRate: 0.18,
  releaseSpeedScale: 0.45,
  minReleaseOrbitSpeed: 0.05,
  maxReleaseOrbitSpeed: 0.22,
};

function getBaseScaleBySize(size = "MEDIUM") {
  const normalized = String(size).toUpperCase();

  if (normalized === "SMALL") {
    return new THREE.Vector3(0.55, 0.75, 0.6);
  }

  if (normalized === "LARGE") {
    return new THREE.Vector3(1.35, 0.85, 1.15);
  }

  return new THREE.Vector3(1.05, 1.05, 1.05);
}

function getBurnShrinkFactor(size = "MEDIUM", burnProgress = 0) {
  const normalized = String(size).toUpperCase();
  const t = THREE.MathUtils.clamp(burnProgress, 0, 1);

  if (normalized === "SMALL") {
    return THREE.MathUtils.lerp(1, 0.65, t);
  }

  if (normalized === "LARGE") {
    return THREE.MathUtils.lerp(1, 0.72, t);
  }

  return THREE.MathUtils.lerp(1, 0.7, t);
}

function cacheDebrisGeometryState(debris) {
  if (!debris?.geometry) return;

  const positionAttr = debris.geometry.attributes.position;
  if (!positionAttr) return;

  debris.userData.baseVertexPositions = Float32Array.from(positionAttr.array);
  debris.userData.lastNormalUpdateProgress = -1;
  debris.userData.normalUpdateCooldown = 0;

  const vertexCount = positionAttr.count;
  const seeds = new Float32Array(vertexCount);
  for (let i = 0; i < vertexCount; i += 1) {
    seeds[i] = Math.random();
  }
  debris.userData.vertexBurnSeeds = seeds;
}

function applyDebrisBurnDeformation(debris, burnProgress = 0) {
  if (!debris?.geometry || !debris?.userData) return;

  const positionAttr = debris.geometry.attributes.position;
  const basePositions = debris.userData.baseVertexPositions;
  const burnSeeds = debris.userData.vertexBurnSeeds;

  if (!positionAttr || !basePositions || !burnSeeds) return;

  const t = THREE.MathUtils.clamp(burnProgress, 0, 1);
  const time = performance.now() * 0.001;
  const dtGuess = 1 / 60;
  const size = debris.userData.size ?? "MEDIUM";
  const shrink = getBurnShrinkFactor(size, t);
  const array = positionAttr.array;

  for (let i = 0; i < positionAttr.count; i += 1) {
    const i3 = i * 3;
    const bx = basePositions[i3];
    const by = basePositions[i3 + 1];
    const bz = basePositions[i3 + 2];

    const seed = burnSeeds[i];
    const uneven = 1 - t * (0.12 + seed * 0.24);
    const pulse = Math.sin(time * (2.5 + seed * 3.5) + seed * 10) * t * 0.035;
    const scalar = Math.max(0.18, shrink * uneven + pulse);

    array[i3] = bx * scalar;
    array[i3 + 1] = by * scalar;
    array[i3 + 2] = bz * scalar;
  }

  positionAttr.needsUpdate = true;

  debris.userData.normalUpdateCooldown = Math.max(
    0,
    (debris.userData.normalUpdateCooldown ?? 0) - dtGuess,
  );

  const lastNormalUpdateProgress =
    debris.userData.lastNormalUpdateProgress ?? -1;
  const shouldRefreshNormals =
    t <= 0.001 ||
    t >= 0.999 ||
    lastNormalUpdateProgress < 0 ||
    Math.abs(t - lastNormalUpdateProgress) >= 0.08 ||
    (debris.userData.normalUpdateCooldown ?? 0) <= 0;

  if (shouldRefreshNormals) {
    debris.geometry.computeVertexNormals();
    debris.userData.lastNormalUpdateProgress = t;
    debris.userData.normalUpdateCooldown = 0.1;
  }

  const baseScale = debris.userData.baseScale;
  if (baseScale) {
    const axisJitter = 1 - t * 0.06;
    debris.scale.set(
      baseScale.x * axisJitter,
      baseScale.y * (1 - t * 0.1),
      baseScale.z * (1 - t * 0.08),
    );
  }
}

function getOrbitBasis(inclination, ascendingNode) {
  const q = new THREE.Quaternion()
    .setFromAxisAngle(new THREE.Vector3(0, 1, 0), ascendingNode)
    .multiply(
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        inclination,
      ),
    );

  const tangentA = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
  const tangentB = new THREE.Vector3(1, 0, 0).applyQuaternion(q).normalize();

  return { tangentA, tangentB };
}

function getOrbitPosition(radius, angle, basis) {
  return basis.tangentA
    .clone()
    .multiplyScalar(Math.cos(angle) * radius)
    .add(basis.tangentB.clone().multiplyScalar(Math.sin(angle) * radius));
}

function recaptureOrbitFromCurrentState(debris) {
  if (!debris?.userData) return;

  const pos = debris.position.clone();
  const r = pos.length();
  if (r <= 0.0001) return;

  const radial = pos.clone().normalize();

  const sourceVelocity =
    debris.userData.freeDriftVelocity &&
    debris.userData.freeDriftVelocity.lengthSq() > 1e-6
      ? debris.userData.freeDriftVelocity.clone()
      : debris.userData.direction.clone().multiplyScalar(debris.userData.speed);

  let tangent = sourceVelocity
    .clone()
    .sub(radial.clone().multiplyScalar(sourceVelocity.dot(radial)));
  let tangentialSpeed = tangent.length();

  if (tangent.lengthSq() <= 1e-6) {
    tangent = debris.userData.direction
      .clone()
      .sub(
        radial.clone().multiplyScalar(debris.userData.direction.dot(radial)),
      );
    tangentialSpeed = Math.max(
      tangentialSpeed,
      tangent.length() * Math.max(0.0001, debris.userData.speed),
    );
  }

  if (tangent.lengthSq() <= 1e-6) {
    tangent = new THREE.Vector3(0, 1, 0).cross(radial);
    if (tangent.lengthSq() <= 1e-6) {
      tangent = new THREE.Vector3(1, 0, 0).cross(radial);
    }
  }

  tangentialSpeed = THREE.MathUtils.clamp(
    tangentialSpeed * DEBRIS_TUNING.releaseSpeedScale,
    DEBRIS_TUNING.minReleaseOrbitSpeed,
    DEBRIS_TUNING.maxReleaseOrbitSpeed,
  );
  tangent.normalize();

  debris.userData.radius = r;
  debris.userData.speed = tangentialSpeed;
  debris.userData.angle = 0;
  debris.userData.basis = {
    tangentA: radial,
    tangentB: tangent,
  };

  debris.userData.direction.copy(tangent);
}
function createDebrisTargetRing() {
  const points = [];
  const segments = 64;
  const radius = 1.225;

  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(
      new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0),
    );
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: 0xffd24d,
    transparent: true,
    opacity: 0.95,
    dashSize: 0.18,
    gapSize: 0.12,
    linewidth: 1,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });

  const ring = new THREE.LineLoop(geometry, material);
  ring.computeLineDistances();
  ring.visible = false;
  ring.renderOrder = 12;
  return ring;
}

function createDebrisStabilityRing() {
  const points = [];
  const segments = 96;
  const radius = 1.48;

  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(
      new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0),
    );
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x4dff88,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });

  const ring = new THREE.LineLoop(geometry, material);
  ring.visible = false;
  ring.renderOrder = 14;
  ring.userData.baseRadius = radius;
  ring.userData.basePositions = Float32Array.from(geometry.attributes.position.array);
  return ring;
}
function createDebrisGeometryBySize(size = "MEDIUM") {
  const normalized = String(size).toUpperCase();

  if (normalized === "SMALL") {
    // sharper, smaller shard
    return new THREE.TetrahedronGeometry(0.22, 0);
  }

  if (normalized === "LARGE") {
    // broad slab-like piece
    return new THREE.BoxGeometry(1.25, 0.75, 1.05);
  }

  // chunky mid piece
  return new THREE.IcosahedronGeometry(0.5, 0);
}

function applyDebrisShapeVariation(debris, size = "MEDIUM") {
  const baseScale = getBaseScaleBySize(size);
  debris.scale.copy(baseScale);
  debris.userData.baseScale = baseScale.clone();

  // keep some visual randomness (will be partially overridden by lookAt, but still helps)
  debris.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI,
  );
}

function getTerminalPayoutBySize(size = "MEDIUM") {
  const normalized = String(size).toUpperCase();

  // Economy tuning:
  // SMALL = common cleanup payout
  // MEDIUM = notable score / worthwhile catch
  // LARGE = rare jackpot-style treasure burn
  if (normalized === "LARGE") return 2400;
  if (normalized === "MEDIUM") return 950;
  return 300;
}

function updateDebrisVisuals(debris, dt) {
  if (!debris?.material || !debris?.userData) return;

  const material = debris.material;
  const visual = debris.userData.visual ?? {};
  const heatRatio = THREE.MathUtils.clamp(visual.heatRatio ?? 0, 0, 1);
  const burnDepth = THREE.MathUtils.clamp(visual.burnDepth ?? 0, 0, 1);
  const inBurnZone = !!visual.inBurnZone;
  const time = performance.now() * 0.001;

  const burnProgress = THREE.MathUtils.clamp(
    (debris.userData.burnDamage ?? 0) /
      Math.max(0.0001, debris.userData.burnThreshold ?? 1),
    0,
    1,
  );

  const baseColor = new THREE.Color(0xff8844);
  const warmColor = new THREE.Color(0xffb347);
  const hotColor = new THREE.Color(0xfff2a6);
  const burnColor = new THREE.Color(0xff5a1f);

  const targetColor = baseColor.clone();
  if (heatRatio > 0.82) {
    targetColor.lerp(hotColor, (heatRatio - 0.82) / 0.18);
  } else if (heatRatio > 0.45) {
    targetColor.lerp(warmColor, (heatRatio - 0.45) / 0.37);
  }

  if (inBurnZone) {
    targetColor.lerp(burnColor, burnDepth * 0.22);
  }

  material.color.copy(targetColor);
  material.emissive.copy(targetColor.clone().multiplyScalar(0.24 + heatRatio * 0.45));

  const flicker = inBurnZone
    ? 0.9 + Math.sin(time * (6 + burnDepth * 10)) * (0.08 + burnDepth * 0.16)
    : 1;

  material.emissiveIntensity =
    (0.35 + heatRatio * 1.8 + burnDepth * 0.9 + burnProgress * 0.75) *
    flicker;

  const baseOpacity = debris.userData.revealed ? 1.0 : 0.35;
  material.opacity = inBurnZone
    ? THREE.MathUtils.clamp(baseOpacity + burnDepth * 0.12, baseOpacity, 0.94)
    : baseOpacity;

  applyDebrisBurnDeformation(debris, burnProgress);

  debris.rotation.x += dt * (0.15 + heatRatio * 0.4 + burnProgress * 0.15);
  debris.rotation.y += dt * (0.12 + burnDepth * 0.35 + burnProgress * 0.12);

  if (debris.userData.targetRing?.material && debris.userData.attached) {
    const ringMaterial = debris.userData.targetRing.material;
    const ringColor = new THREE.Color(0xffd24d).lerp(new THREE.Color(0xff7a1a), burnDepth * 0.65);
    ringMaterial.color.copy(ringColor);
    ringMaterial.opacity = THREE.MathUtils.clamp(0.72 + burnDepth * 0.25, 0.72, 0.98);
  }
}

export function createDebris(planetRadius, options = {}) {
  const requestedSize = String(options.size ?? "SMALL").toUpperCase();

  const debris = new THREE.Mesh(
    createDebrisGeometryBySize(requestedSize),
    new THREE.MeshStandardMaterial({
      color: 0xff8844,
      emissive: 0x220800,
      emissiveIntensity: 0.4,
      flatShading: true,
      transparent: true,
      opacity: 0.35, // hidden until scanned later
    }),
  );

  applyDebrisShapeVariation(debris, requestedSize);
  cacheDebrisGeometryState(debris);

  const targetRing = createDebrisTargetRing();
  debris.add(targetRing);
  debris.userData.targetRing = targetRing;

  const stabilityRing = createDebrisStabilityRing();
  debris.add(stabilityRing);
  debris.userData.stabilityRing = stabilityRing;

  const radius = planetRadius + 5 + Math.random() * 4;
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.15 + Math.random() * 0.2;

  const inclination = Math.random() * 1.2;
  const ascendingNode = Math.random() * Math.PI * 2;

  const basis = getOrbitBasis(inclination, ascendingNode);

  const position = getOrbitPosition(radius, angle, basis);
  debris.position.copy(position);

  // Direction = tangent (used for capture alignment later)
  const lookAhead = getOrbitPosition(radius, angle + 0.05, basis);
  const direction = lookAhead.sub(position).normalize();

  debris.userData.radius = radius;
  debris.userData.angle = angle;
  debris.userData.speed = speed;
  debris.userData.basis = basis;
  debris.userData.direction = direction;
  debris.userData.velocity = direction.clone().multiplyScalar(speed);
  debris.userData.freeDriftTime = 0;
  debris.userData.freeDriftVelocity = new THREE.Vector3();
  debris.userData.needsOrbitRecapture = false;
  debris.userData.cascadeCount = options.cascadeCount ?? 0;
  debris.userData.revealed = false;
  debris.userData.tracked = false;
  debris.userData.trackTime = 0;
  debris.userData.maxTrackTime = 10;
  debris.userData.hasLastKnownTrack = false;
  debris.userData.lastKnownRadius = radius;
  debris.userData.lastKnownAngle = angle;
  debris.userData.lastKnownSpeed = speed;
  debris.userData.lastKnownBasis = basis;
  debris.userData.threatLevel = "LOW";
  debris.userData.interceptChance = 0;
  // NEW: payload / gameplay properties
  const sizeRoll = Math.random();
  let size = requestedSize;
  if (!options.size) {
    // Gameplay weighting:
    // SMALL = common orbital clutter
    // MEDIUM = rarer, more notable targets
    // LARGE = special event-style catches
    if (sizeRoll > 0.96) size = "LARGE";
    else if (sizeRoll > 0.78) size = "MEDIUM";
    else size = "SMALL";

    if (size !== requestedSize) {
      debris.geometry.dispose();
      debris.geometry = createDebrisGeometryBySize(size);
      applyDebrisShapeVariation(debris, size);
      cacheDebrisGeometryState(debris);
    }
  }

  const cfg = DEBRIS_TUNING.sizeConfig[size];
  const originalSize = String(options.originalSize ?? size).toUpperCase();
  const terminalPayout =
    options.terminalPayout ?? getTerminalPayoutBySize(originalSize);
  const debrisChainId =
    options.debrisChainId ??
    `debris_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  debris.userData.size = size;
  debris.userData.originalSize = originalSize;
  debris.userData.terminalPayout = terminalPayout;
  debris.userData.debrisChainId = debrisChainId;
  debris.userData.payoutAwarded = options.payoutAwarded ?? false;
  debris.userData.mass = cfg.mass;
  debris.userData.burnThreshold = cfg.burnThreshold;
  debris.userData.instabilityMultiplier = cfg.instabilityMultiplier ?? 1.0;

  debris.userData.attached = false;
  debris.userData.stability = 1.0;
  debris.userData.heat = 0;
  debris.userData.burnDamage = 0;
  debris.userData.active = true;
  debris.userData.captureProgress = 0;

  debris.userData.visual = {
    heatRatio: 0,
    burnDepth: 0,
    inBurnZone: false,
  };

  return debris;
}

export function setDebrisTracked(debris, duration = null) {
  if (!debris || !debris.userData) return;

  debris.userData.tracked = true;
  debris.userData.revealed = true;
  debris.userData.trackTime = duration ?? debris.userData.maxTrackTime ?? 10;
  debris.userData.hasLastKnownTrack = true;
  debris.userData.lastKnownRadius = debris.userData.radius;
  debris.userData.lastKnownAngle = debris.userData.angle;
  debris.userData.lastKnownSpeed = debris.userData.speed;
  debris.userData.lastKnownBasis = debris.userData.basis;
}

export function updateDebrisTracking(debris, dt) {
  if (!debris || !debris.userData || !debris.userData.active) return;

  if (debris.userData.tracked) {
    debris.userData.trackTime = Math.max(0, debris.userData.trackTime - dt);

    debris.userData.hasLastKnownTrack = true;
    debris.userData.lastKnownRadius = debris.userData.radius;
    debris.userData.lastKnownAngle = debris.userData.angle;
    debris.userData.lastKnownSpeed = debris.userData.speed;
    debris.userData.lastKnownBasis = debris.userData.basis;

    if (debris.userData.trackTime <= 0) {
      debris.userData.tracked = false;
      debris.userData.revealed = false;
      debris.userData.interceptChance = 0;
      debris.userData.threatLevel = "LOW";
    }
  }

  if (!debris.userData.tracked && debris.userData.hasLastKnownTrack) {
    debris.userData.lastKnownAngle += debris.userData.lastKnownSpeed * dt;
  }
}

export function updateDebris(debris, dt, player = null) {
  if (!debris || !debris.userData.active) return;

  if (debris.userData.attached && player) {
    const offsetDir = player.position.clone().normalize();
    const followOffset = offsetDir.clone().multiplyScalar(-1.5);

    const targetPos = player.position.clone().add(followOffset);
    const travelDelta = targetPos.clone().sub(debris.position);

    debris.position.lerp(targetPos, 0.1);

    if (dt > 0) {
      const carriedVelocity = travelDelta.multiplyScalar(1 / dt);
      debris.userData.freeDriftVelocity.lerp(
        carriedVelocity,
        DEBRIS_TUNING.releaseVelocityBlend,
      );
    }

    if (player.userData && player.userData.forward) {
      debris.userData.direction
        .lerp(player.userData.forward, DEBRIS_TUNING.attachedDirectionBlend)
        .normalize();
      debris.lookAt(debris.position.clone().add(debris.userData.direction));
    }

    updateDebrisVisuals(debris, dt);

    debris.userData.freeDriftTime = 0;
    return;
  }

  if (debris.userData.freeDriftTime > 0) {
    const orbitalVelocity = debris.userData.direction
      .clone()
      .multiplyScalar(debris.userData.speed);

    const driftBlend = THREE.MathUtils.clamp(
      debris.userData.freeDriftTime / DEBRIS_TUNING.releaseVelocityCarry,
      0,
      1,
    );

    const blendedVelocity = debris.userData.freeDriftVelocity
      .clone()
      .multiplyScalar(driftBlend)
      .add(orbitalVelocity.multiplyScalar(1 - driftBlend));

    debris.position.addScaledVector(blendedVelocity, dt);

    if (blendedVelocity.lengthSq() > 0.0001) {
      debris.userData.direction.copy(blendedVelocity.clone().normalize());
      debris.lookAt(debris.position.clone().add(debris.userData.direction));
    }

    debris.userData.freeDriftVelocity.multiplyScalar(
      Math.max(0, 1 - DEBRIS_TUNING.freeDriftDamping * dt),
    );
    debris.userData.freeDriftTime = Math.max(
      0,
      debris.userData.freeDriftTime - dt,
    );

    if (
      debris.userData.freeDriftTime <= 0 &&
      debris.userData.needsOrbitRecapture
    ) {
      recaptureOrbitFromCurrentState(debris);
      debris.userData.needsOrbitRecapture = false;
    }

    const radius = debris.position.length();
    if (radius > 0.0001) {
      debris.userData.radius = radius;
      debris.position.normalize().multiplyScalar(radius);
    }

    updateDebrisVisuals(debris, dt);
  } else {
    // Normal orbital motion
    debris.userData.angle += debris.userData.speed * dt;

    const position = getOrbitPosition(
      debris.userData.radius,
      debris.userData.angle,
      debris.userData.basis,
    );

    debris.position.copy(position);

    const lookAhead = getOrbitPosition(
      debris.userData.radius,
      debris.userData.angle + 0.05,
      debris.userData.basis,
    );

    const direction = lookAhead.sub(position).normalize();
    debris.userData.direction.copy(direction);

    debris.lookAt(debris.position.clone().add(direction));
    updateDebrisVisuals(debris, dt);
  }
}

export function attachDebris(debris) {
  if (!debris || !debris.userData) return;

  debris.userData.attached = true;
  debris.userData.stability = DEBRIS_TUNING.attachedStabilityStart;
  debris.userData.heat = 0;
  debris.userData.freeDriftTime = 0;
  debris.userData.freeDriftVelocity.set(0, 0, 0);
  debris.userData.needsOrbitRecapture = false;
  // Burn damage is persistent and does not reset on attach.
  debris.userData.burnDamage = debris.userData.burnDamage ?? 0;
}

export function detachDebris(debris) {
  if (!debris || !debris.userData) return;

  debris.userData.attached = false;
  debris.userData.hasLastKnownTrack = true;
  debris.userData.lastKnownRadius = debris.userData.radius;
  debris.userData.lastKnownAngle = debris.userData.angle;
  debris.userData.lastKnownSpeed = debris.userData.speed;
  debris.userData.lastKnownBasis = debris.userData.basis;

  const releaseVelocity =
    debris.userData.freeDriftVelocity?.clone() ?? new THREE.Vector3();

  if (releaseVelocity.lengthSq() > 0.0001) {
    debris.userData.direction.copy(releaseVelocity.normalize());
  }

  debris.userData.freeDriftTime = DEBRIS_TUNING.releaseVelocityCarry;
  debris.userData.freeDriftVelocity.copy(releaseVelocity);

  debris.userData.needsOrbitRecapture = true;

  // Slight drift when released
  debris.userData.speed *= 0.95;
}

export function disposeDebris(debris) {
  if (!debris || !debris.userData) return;

  debris.userData.active = false;
  debris.userData.attached = false;
  debris.userData.tracked = false;
  debris.userData.revealed = false;
  debris.userData.captureProgress = 0;
  debris.userData.stability = 0;
  debris.userData.heat = 0;
  debris.visible = false;
}

export function updateDebrisStability(
  debris,
  playerForward,
  turnIntensity,
  dt,
) {
  if (!debris.userData.attached) {
    return;
  }

  const heatFactor =
    1 +
    ((debris.userData.burnDamage ?? 0) /
      Math.max(0.0001, debris.userData.burnThreshold)) *
      1.5;
  const instabilityMultiplier = debris.userData.instabilityMultiplier ?? 1.0;
  const effectiveTurnIntensity = Math.max(0, Math.abs(turnIntensity) - 0.08);

  const instability =
    effectiveTurnIntensity *
    DEBRIS_TUNING.instabilityPerTurn *
    heatFactor *
    instabilityMultiplier;

  debris.userData.stability -= instability * dt;
  debris.userData.stability = Math.max(0, debris.userData.stability);

  if (debris.userData.stability <= 0) {
    detachDebris(debris);
  }
}

export function updateDebrisHeat(debris, playerRadius, burnRadius, dt) {
  if (!debris.userData.attached) return null;

  if (playerRadius < burnRadius) {
    // Immediate thermal intensity for visuals / moment-to-moment pressure.
    debris.userData.heat += dt * DEBRIS_TUNING.heatGainPerSecond;

    // Persistent structural burn damage: once accumulated, it does not go away.
    debris.userData.burnDamage =
      (debris.userData.burnDamage ?? 0) +
      dt * DEBRIS_TUNING.burnDamageGainPerSecond;

    // Burn zone should always pressure stability.
    debris.userData.stability = Math.max(
      0,
      debris.userData.stability - dt * 0.12,
    );

    // If the debris is already badly cooked, the burn gets nastier.
    if (
      (debris.userData.burnDamage ?? 0) >
      debris.userData.burnThreshold * 0.45
    ) {
      debris.userData.stability = Math.max(
        0,
        debris.userData.stability - dt * 0.18,
      );
    }

    if ((debris.userData.burnDamage ?? 0) >= debris.userData.burnThreshold) {
      debris.userData.visual = {
        heatRatio: THREE.MathUtils.clamp(
          debris.userData.heat / Math.max(0.001, debris.userData.burnThreshold),
          0,
          1,
        ),
        burnDepth: 1,
        inBurnZone: true,
      };
      return "BURNED";
    }
  } else {
    // Visual heat can cool somewhat after leaving the burn zone,
    // but structural burn damage remains.
    debris.userData.heat = Math.max(
      0,
      debris.userData.heat - dt * DEBRIS_TUNING.heatCoolPerSecond,
    );
  }

  const heatRatio = THREE.MathUtils.clamp(
    debris.userData.heat / Math.max(0.001, debris.userData.burnThreshold),
    0,
    1,
  );
  const burnDepth = THREE.MathUtils.clamp(
    (debris.userData.burnDamage ?? 0) /
      Math.max(0.001, debris.userData.burnThreshold),
    0,
    1,
  );

  debris.userData.visual = {
    heatRatio,
    burnDepth,
    inBurnZone: playerRadius < burnRadius,
  };

  return null;
}

export function updateDebrisInterceptChance(
  debris,
  playerPosition,
  playerDirection,
  playerRadius,
) {
  if (
    !debris ||
    !debris.userData ||
    !debris.userData.active ||
    !debris.userData.tracked
  )
    return 0;
  if (!playerPosition || !playerDirection) return 0;

  const distance = playerPosition.distanceTo(debris.position);
  const alignment = THREE.MathUtils.clamp(
    playerDirection.dot(debris.userData.direction),
    -1,
    1,
  );
  const radiusDiff = Math.abs((playerRadius ?? 0) - debris.userData.radius);

  const score = 100 - distance * 1.8 - (1 - alignment) * 55 - radiusDiff * 8;

  debris.userData.interceptChance = THREE.MathUtils.clamp(score, 0, 100);
  return debris.userData.interceptChance;
}

export function updateDebrisThreatLevel(debris, protectedPosition) {
  if (
    !debris ||
    !debris.userData ||
    !debris.userData.active ||
    !debris.userData.tracked
  )
    return "LOW";
  if (!protectedPosition) return debris.userData.threatLevel;

  const distanceToProtected = debris.position.distanceTo(protectedPosition);

  if (distanceToProtected < 18) {
    debris.userData.threatLevel = "HIGH";
  } else if (distanceToProtected < 36) {
    debris.userData.threatLevel = "MED";
  } else {
    debris.userData.threatLevel = "LOW";
  }

  return debris.userData.threatLevel;
}
