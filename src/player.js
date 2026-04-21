// Orbital Cleaner
// Copyright (c) 2026 Trei Feske
// Licensed under the MIT License

import * as THREE from "three";
import { createOrbitalShip, updateOrbitalShip } from "./orbitalShip.js";

function createHeatShell(radius = 0.7, color = 0xffa84d) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 18, 18),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  mesh.visible = false;
  return mesh;
}

function createHeatParticle(size = 0.09, color = 0xffb35c) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(size, 10, 10),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  mesh.visible = false;
  return mesh;
}

function updateShipHeatTint(ship, heat) {
  if (!ship) return;

  ship.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    for (const material of materials) {
      if (!material) continue;

      if (!material.userData.__baseColor && material.color) {
        material.userData.__baseColor = material.color.clone();
      }
      if (!material.userData.__baseEmissive && material.emissive) {
        material.userData.__baseEmissive = material.emissive.clone();
      }

      const baseColor =
        material.userData.__baseColor || new THREE.Color(0xffffff);
      const baseEmissive =
        material.userData.__baseEmissive || new THREE.Color(0x000000);

      const heatedColor = new THREE.Color()
        .copy(baseColor)
        .lerp(new THREE.Color(0xffa24d), heat * 0.45);
      if (material.color) {
        material.color.copy(heatedColor);
      }

      if (material.emissive) {
        const emissiveTarget = new THREE.Color(0xff6a1a);
        material.emissive.copy(baseEmissive).lerp(emissiveTarget, heat * 0.35);
        material.emissiveIntensity = heat > 0.02 ? 0.12 + heat * 0.75 : 0;
      }

      material.needsUpdate = true;
    }
  });
}

function createHeatFxRig() {
  const rig = new THREE.Group();
  rig.name = "PlayerHeatFx";

  const outerShell = createHeatShell(2.15, 0xff9f45);
  rig.add(outerShell);

  const innerShell = createHeatShell(1.55, 0xffe1a3);
  rig.add(innerShell);

  const wakeCore = createHeatShell(1.65, 0xffb766);
  wakeCore.position.set(0, 0, 1.9);
  rig.add(wakeCore);

  const trailParticles = [];
  const particleCount = 18;

  for (let i = 0; i < particleCount; i++) {
    const particle = createHeatParticle(
      i < 6 ? 0.14 : 0.09,
      i < 6 ? 0xffd08a : 0xff9a4d,
    );
    particle.position.set(0, 0, 0);
    particle.userData.life = 0;
    particle.userData.maxLife = 1.0 + i * 0.08;
    particle.userData.velocity = new THREE.Vector3();
    particle.userData.seed = Math.random() * Math.PI * 2;
    rig.add(particle);
    trailParticles.push(particle);
  }

  rig.userData.fx = {
    outerShell,
    innerShell,
    wakeCore,
    trailParticles,
  };
  rig.userData.heatPulse = 0;

  return rig;
}

function updateHeatFx(player, state, dt, config, camera = null) {
  const heatRig = player.userData.heatFx;
  const dangerField = player.userData.dangerField;
  if (!heatRig?.userData?.fx) return;

  const { minRadius, maxRadius } = config;
  const fx = heatRig.userData.fx;

  // Heat ramps up only near the lower portion of the allowed orbit band.
  const normalizedAltitude = THREE.MathUtils.clamp(
    (state.radiusCurrent - minRadius) / Math.max(0.0001, maxRadius - minRadius),
    0,
    1,
  );
  const heat = THREE.MathUtils.clamp((0.38 - normalizedAltitude) / 0.38, 0, 1);

  heatRig.userData.heatPulse = (heatRig.userData.heatPulse || 0) + dt;
  const pulse = 0.9 + Math.sin(heatRig.userData.heatPulse * 22) * 0.1;
  const active = heat > 0.02;

  // Anchor to planet: use radialDirection as the 'up' so the effect is stable
  // relative to the planet, then face the camera in world space.
  if (camera) {
    // Build a desired WORLD rotation that faces the camera but uses the
    // planet normal (radialDirection) as the up vector.
    const desired = new THREE.Object3D();
    desired.position.copy(player.position);
    desired.up.copy(state.radialDirection);
    desired.lookAt(camera.position);
    desired.rotateY(Math.PI); // flip so the tail points toward camera

    // Convert world rotation to LOCAL so it cancels parent (player) rotation
    const parentWorldQuat = new THREE.Quaternion();
    player.getWorldQuaternion(parentWorldQuat);
    const invParent = parentWorldQuat.clone().invert();

    const desiredWorldQuat = desired.quaternion.clone();
    const localQuat = invParent.multiply(desiredWorldQuat);

    heatRig.quaternion.copy(localQuat);
  } else {
    heatRig.rotation.set(0, 0, 0);
  }
  heatRig.position.set(0, 0, 0);

  heatRig.visible = active;

  if (!active) {
    fx.outerShell.visible = false;
    fx.innerShell.visible = false;
    fx.wakeCore.visible = false;
    fx.outerShell.material.opacity = 0.0;
    fx.innerShell.material.opacity = 0.0;
    fx.wakeCore.material.opacity = 0.0;
    fx.wakeCore.scale.setScalar(0.001);

    for (const particle of fx.trailParticles) {
      particle.visible = false;
      particle.material.opacity = 0.0;
      particle.scale.setScalar(0.001);
      particle.userData.life = 0;
      particle.userData.velocity.set(0, 0, 0);
      particle.position.set(0, 0, 0);
    }
    if (player.material) {
      player.userData.corePulse = (player.userData.corePulse || 0) + dt * 2.2;
      const idlePulse = 0.92 + Math.sin(player.userData.corePulse * 3.2) * 0.06;
      player.material.emissiveIntensity = 0.75 * idlePulse;
      player.material.opacity = 0.88;
      player.material.color.setHex(0xff5544);
      player.material.emissive.setHex(0xff3311);
    }

    if (dangerField?.material) {
      dangerField.material.opacity = 0.045;
      dangerField.scale.setScalar(
        0.96 + Math.sin((player.userData.corePulse || 0) * 2.4) * 0.025,
      );
    }
    updateShipHeatTint(player.userData.ship, 0);
    return;
  }

  fx.outerShell.visible = true;
  fx.innerShell.visible = true;
  fx.wakeCore.visible = true;

  fx.outerShell.material.opacity = 0.1 + heat * 0.28 * pulse;
  fx.innerShell.material.opacity = 0.08 + heat * 0.2 * pulse;
  fx.outerShell.scale.setScalar(1 + heat * 0.14);
  fx.innerShell.scale.setScalar(1 + heat * 0.1);

  fx.wakeCore.material.opacity = 0.12 + heat * 0.34 * pulse;
  fx.wakeCore.scale.setScalar(1 + heat * 0.42);
  if (player.material) {
    player.userData.corePulse =
      (player.userData.corePulse || 0) + dt * (3.5 + heat * 6.5);
    const pulseAlpha = 0.9 + Math.sin(player.userData.corePulse * 5.6) * 0.1;
    player.material.color.copy(
      new THREE.Color(0xff5544).lerp(new THREE.Color(0xffaa55), heat * 0.55),
    );
    player.material.emissive.copy(
      new THREE.Color(0xff3311).lerp(new THREE.Color(0xff7711), heat * 0.75),
    );
    player.material.emissiveIntensity = (0.95 + heat * 1.8) * pulseAlpha;
    player.material.opacity = 0.9 + heat * 0.08;
  }

  if (dangerField?.material) {
    dangerField.material.opacity = 0.06 + heat * 0.16;
    dangerField.scale.setScalar(
      1 + heat * 0.18 + Math.sin((player.userData.corePulse || 0) * 4.2) * 0.03,
    );
  }
  updateShipHeatTint(player.userData.ship, heat);

  const forwardDir = player.userData.forward.clone().normalize();
  const radialUp = state.radialDirection.clone().normalize();
  const rightDir = new THREE.Vector3()
    .crossVectors(forwardDir, radialUp)
    .normalize();

  for (let i = 0; i < fx.trailParticles.length; i++) {
    const particle = fx.trailParticles[i];
    const data = particle.userData;

    data.life -= dt;

    if (data.life <= 0) {
      // Respawn near the heat wake when heat is active.
      data.life = data.maxLife * (0.8 + Math.random() * 0.4);

      const lateral = (Math.random() - 0.5) * 0.65;
      const vertical = (Math.random() - 0.5) * 0.42;
      const depth = 2.0 + Math.random() * 2.4;

      particle.position.copy(forwardDir).multiplyScalar(depth);
      particle.position.addScaledVector(rightDir, lateral);
      particle.position.addScaledVector(radialUp, vertical);

      const drift = 1.8 + heat * 3.2 + Math.random() * 0.9;
      data.velocity.copy(forwardDir).multiplyScalar(0.65 + drift);
      data.velocity.addScaledVector(rightDir, lateral * 0.85);
      data.velocity.addScaledVector(radialUp, vertical * 0.65);
    } else {
      particle.position.addScaledVector(data.velocity, dt);
    }

    const lifeAlpha = THREE.MathUtils.clamp(data.life / data.maxLife, 0, 1);
    particle.visible = lifeAlpha > 0.01;
    particle.material.opacity = (0.04 + heat * 0.26 * pulse) * lifeAlpha;
    particle.scale.setScalar((0.28 + heat * 0.85) * lifeAlpha);
  }
}

function createPlayerTargetRing() {
  const points = [];
  const segments = 64;
  const radius = 1.74;

  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(
      new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0),
    );
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: 0x4db8ff,
    transparent: true,
    opacity: 0.98,
    dashSize: 0.18,
    gapSize: 0.12,
    linewidth: 1,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });

  const ring = new THREE.LineLoop(geometry, material);
  ring.position.z = -0.4;
  ring.scale.setScalar(1.25);
  ring.computeLineDistances();
  ring.visible = false;
  ring.renderOrder = 12;
  return ring;
}

export function createPlayer(playerRadius, startRadius) {
  const player = new THREE.Mesh(
    new THREE.SphereGeometry(playerRadius, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xff5544,
      emissive: 0xff3311,
      emissiveIntensity: 1.1,
      transparent: true,
      opacity: 0.92,
      metalness: 0.08,
      roughness: 0.35,
    }),
  );
  const dangerField = new THREE.Mesh(
    new THREE.SphereGeometry(playerRadius * 2.35, 20, 20),
    new THREE.MeshBasicMaterial({
      color: 0xff6644,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  dangerField.visible = true;
  player.add(dangerField);
  player.userData.dangerField = dangerField;

  const playerNose = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0xffff66 }),
  );
  playerNose.rotation.x = -Math.PI / 2;
  playerNose.position.z = 0.55;
  playerNose.visible = false;
  player.add(playerNose);

  const orbitalShip = createOrbitalShip();
  player.add(orbitalShip);
  player.userData.ship = orbitalShip;

  const heatFx = createHeatFxRig();
  player.add(heatFx);
  player.userData.heatFx = heatFx;

  const playerTargetRing = createPlayerTargetRing();
  player.add(playerTargetRing);
  player.userData.playerTargetRing = playerTargetRing;

  player.position.set(0, 0, startRadius);
  player.userData.forward = new THREE.Vector3(1, 0, 0);
  player.userData.corePulse = 0;

  return player;
}

export function createPlayerState(startRadius, baseForwardSpeed) {
  return {
    velocity: new THREE.Vector3(),
    radiusCurrent: startRadius,
    targetRadius: startRadius,
    orbitBaseRadius: startRadius,
    currentSpeed: baseForwardSpeed,
    forward: new THREE.Vector3(1, 0, 0),
    desiredForward: new THREE.Vector3(1, 0, 0),
    radialDirection: new THREE.Vector3(),
    tangentDirection: new THREE.Vector3(),
    tempRight: new THREE.Vector3(),
    targetQuaternion: new THREE.Quaternion(),
    orbitPhase: 0,
    ellipticalStrength: 0,
    inEllipticalOrbit: false,
    apoapsisWindow: false,
    periapsisWindow: false,
  };
}

export function updatePlayer(player, state, keys, dt, config, camera = null) {
  const {
    minRadius,
    maxRadius,
    yawRate,
    altitudeChangeRate,
    altitudeLerp,
    boostMultiplier,
    baseForwardSpeed,
    maxForwardSpeed,
    speedLerp,
    forwardDriftBlend,
    shipAlignLerp,
    minThrottlePercent,
    maxThrottlePercent,
    highOrbitMaxRadius = maxRadius + 6,
    transferOrbitMaxRadius = maxRadius + 12,
    highOrbitTurnBonus = 0.18,
    highOrbitSpeedPenalty = 0.24,
    transferOrbitSpeedPenalty = 0.16,
    lowOrbitSpeedBonus = 0.08,
    ellipticalThresholdRadius = highOrbitMaxRadius + 0.75,
    ellipticalBuildRate = 0.16,
    ellipticalDecayRate = 0.3,
    transferOrbitEllipseBuildMultiplier = 2.25,
    maxEllipseAmplitude = Math.max(
      1.6,
      (transferOrbitMaxRadius - highOrbitMaxRadius) * 0.95,
    ),
  } = config;

  const {
    velocity,
    radialDirection,
    forward,
    desiredForward,
    tangentDirection,
    tempRight,
    targetQuaternion,
    orbitBaseRadius,
  } = state;

  radialDirection.copy(player.position).normalize();

  let yawInput = 0;
  if (keys["a"]) yawInput += 1;
  if (keys["d"]) yawInput -= 1;

  let climbInput = 0;
  if (keys["w"]) climbInput += 1;
  if (keys["s"]) climbInput -= 1;

  const altitudeAlphaForTurn = THREE.MathUtils.clamp(
    (Math.min(state.radiusCurrent, highOrbitMaxRadius) - minRadius) /
      Math.max(0.0001, highOrbitMaxRadius - minRadius),
    0,
    1,
  );
  const effectiveYawRate =
    yawRate * (1 + altitudeAlphaForTurn * highOrbitTurnBonus);
  const yaw = yawInput * effectiveYawRate * dt;
  if (yaw !== 0) {
    const qYaw = new THREE.Quaternion().setFromAxisAngle(radialDirection, yaw);
    desiredForward.copy(forward).applyQuaternion(qYaw).normalize();
  } else {
    desiredForward.copy(forward);
  }

  const desiredRadialComponent = radialDirection
    .clone()
    .multiplyScalar(desiredForward.dot(radialDirection));
  desiredForward.sub(desiredRadialComponent).normalize();

  forward.lerp(desiredForward, forwardDriftBlend).normalize();

  if (climbInput !== 0) {
    state.targetRadius += climbInput * altitudeChangeRate * dt;
  }
  state.targetRadius = THREE.MathUtils.clamp(
    state.targetRadius,
    minRadius,
    transferOrbitMaxRadius,
  );
  state.orbitBaseRadius = THREE.MathUtils.lerp(
    orbitBaseRadius,
    state.targetRadius,
    altitudeLerp,
  );

  const throttlePercent = THREE.MathUtils.clamp(
    state.throttlePercent ?? 50,
    minThrottlePercent,
    maxThrottlePercent,
  );
  const throttleAlpha =
    (throttlePercent - minThrottlePercent) /
    (maxThrottlePercent - minThrottlePercent);

  const cruiseSpeed = THREE.MathUtils.lerp(
    baseForwardSpeed,
    maxForwardSpeed,
    throttleAlpha,
  );

  const altitudeAlphaForSpeed = THREE.MathUtils.clamp(
    (Math.min(state.orbitBaseRadius, highOrbitMaxRadius) - minRadius) /
      Math.max(0.0001, highOrbitMaxRadius - minRadius),
    0,
    1,
  );
  const transferOrbitAlpha = THREE.MathUtils.clamp(
    (state.orbitBaseRadius - highOrbitMaxRadius) /
      Math.max(0.0001, transferOrbitMaxRadius - highOrbitMaxRadius),
    0,
    1,
  );
  const altitudeSpeedFactor =
    1 +
    lowOrbitSpeedBonus -
    altitudeAlphaForSpeed * (lowOrbitSpeedBonus + highOrbitSpeedPenalty) -
    transferOrbitAlpha * transferOrbitSpeedPenalty;

  const boost = keys["shift"] ? boostMultiplier : 1;
  const targetSpeed = cruiseSpeed * altitudeSpeedFactor * boost;

  state.currentSpeed = THREE.MathUtils.lerp(
    state.currentSpeed,
    targetSpeed,
    speedLerp,
  );

  // Soft arcade elliptical orbit: staying in the new higher orbit band builds
  // eccentricity instead of just using a hidden penalty counter.
  const highOrbitOvershoot = Math.max(
    0,
    state.orbitBaseRadius - ellipticalThresholdRadius,
  );
  const highOrbitRange = Math.max(
    0.0001,
    transferOrbitMaxRadius - ellipticalThresholdRadius,
  );
  const targetEllipticalStrength = THREE.MathUtils.clamp(
    highOrbitOvershoot / highOrbitRange,
    0,
    1,
  );

  const effectiveBuildRate = THREE.MathUtils.lerp(
    ellipticalBuildRate,
    ellipticalBuildRate * transferOrbitEllipseBuildMultiplier,
    transferOrbitAlpha,
  );

  if (targetEllipticalStrength > state.ellipticalStrength) {
    state.ellipticalStrength = THREE.MathUtils.lerp(
      state.ellipticalStrength,
      targetEllipticalStrength,
      effectiveBuildRate,
    );
  } else {
    state.ellipticalStrength = THREE.MathUtils.lerp(
      state.ellipticalStrength,
      targetEllipticalStrength,
      ellipticalDecayRate,
    );
  }

  state.inEllipticalOrbit = state.ellipticalStrength > 0.05;

  // Detect simple burn windows at the farthest and closest parts of the ellipse.
  // We use cosine because apo/peri happen at the extrema of the sine-driven radius.
  const phaseCos = Math.cos(state.orbitPhase);
  const burnWindowThreshold = 0.22;
  state.apoapsisWindow =
    state.inEllipticalOrbit &&
    Math.abs(phaseCos) < burnWindowThreshold &&
    Math.sin(state.orbitPhase) > 0;
  state.periapsisWindow =
    state.inEllipticalOrbit &&
    Math.abs(phaseCos) < burnWindowThreshold &&
    Math.sin(state.orbitPhase) < 0;

  const phaseAdvance =
    (state.currentSpeed / Math.max(1, state.orbitBaseRadius)) * dt * 60;
  state.orbitPhase += phaseAdvance;

  const ellipseAmplitude =
    maxEllipseAmplitude *
    state.ellipticalStrength *
    (0.7 + transferOrbitAlpha * 0.6);
  const desiredRadius =
    state.orbitBaseRadius + Math.sin(state.orbitPhase) * ellipseAmplitude;

  // Circularization mechanic:
  // - At periapsis (closest point), ArrowUp helps circularize.
  // - At apoapsis (farthest point), ArrowDown helps circularize.
  // Wrong input at the wrong extreme slightly worsens the ellipse, but gently.
  const circularizeRate = 0.55 * dt;
  const destabilizeRate = 0.18 * dt;

  if (state.inEllipticalOrbit) {
    if (state.periapsisWindow && keys["arrowup"]) {
      state.ellipticalStrength = Math.max(
        0,
        state.ellipticalStrength - circularizeRate,
      );
      state.orbitBaseRadius = THREE.MathUtils.lerp(
        state.orbitBaseRadius,
        state.radiusCurrent,
        0.08,
      );
    } else if (state.periapsisWindow && keys["arrowdown"]) {
      state.ellipticalStrength = Math.min(
        1,
        state.ellipticalStrength + destabilizeRate,
      );
    }

    if (state.apoapsisWindow && keys["arrowdown"]) {
      state.ellipticalStrength = Math.max(
        0,
        state.ellipticalStrength - circularizeRate,
      );
      state.orbitBaseRadius = THREE.MathUtils.lerp(
        state.orbitBaseRadius,
        state.radiusCurrent,
        0.08,
      );
    } else if (state.apoapsisWindow && keys["arrowup"]) {
      state.ellipticalStrength = Math.min(
        1,
        state.ellipticalStrength + destabilizeRate,
      );
    }
  }

  state.radiusCurrent = THREE.MathUtils.lerp(
    state.radiusCurrent,
    desiredRadius,
    altitudeLerp,
  );

  // If the orbit has effectively been circularized, clear the extra state cleanly.
  if (state.ellipticalStrength < 0.02) {
    state.ellipticalStrength = 0;
    state.inEllipticalOrbit = false;
    state.apoapsisWindow = false;
    state.periapsisWindow = false;
  }

  velocity.copy(forward).multiplyScalar(state.currentSpeed * dt * 60);
  player.position.add(velocity);
  player.position.normalize().multiplyScalar(state.radiusCurrent);

  radialDirection.copy(player.position).normalize();
  const radialAfterMove = radialDirection
    .clone()
    .multiplyScalar(forward.dot(radialDirection));
  forward.sub(radialAfterMove).normalize();

  tangentDirection.copy(forward);

  if (forward.lengthSq() > 0.000001) {
    tempRight.crossVectors(forward, radialDirection).normalize();
    const correctedUp = new THREE.Vector3()
      .crossVectors(tempRight, forward)
      .normalize();
    const basis = new THREE.Matrix4().makeBasis(
      tempRight,
      correctedUp,
      forward,
    );
    targetQuaternion.setFromRotationMatrix(basis);
    const stabilizedAlignLerp = Math.min(shipAlignLerp * 0.35, 0.05);
    player.quaternion.slerp(targetQuaternion, stabilizedAlignLerp);
  }

  player.userData.forward.copy(forward);

  if (player.userData.ship) {
    updateOrbitalShip(dt);
  }

  updateHeatFx(player, state, dt, config, camera);

  // --- Auto-hide target ring if no nearby valid debris ---
  const ring = player.userData.playerTargetRing;
  const targetDebris = player.userData.primaryTargetDebris;

  if (ring) {
    if (!targetDebris || !targetDebris.userData?.active) {
      ring.visible = false;
    } else {
      const distance = player.position.distanceTo(targetDebris.position);
      const maxRingDistance = 8;

      if (distance > maxRingDistance) {
        ring.visible = false;
      }
    }
  }
}
