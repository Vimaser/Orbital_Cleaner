import * as THREE from "three";

export function createHud() {
  const hudRoot = document.createElement("div");
  hudRoot.style.position = "fixed";
  hudRoot.style.left = "0";
  hudRoot.style.top = "0";
  hudRoot.style.width = "100%";
  hudRoot.style.height = "100%";
  hudRoot.style.pointerEvents = "none";
  hudRoot.style.zIndex = "20";
  document.body.appendChild(hudRoot);

  function makeHudCanvas(width, height, left, bottom) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.style.position = "absolute";
    canvas.style.left = left;
    canvas.style.bottom = bottom;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.pointerEvents = "none";
    hudRoot.appendChild(canvas);
    return canvas;
  }

  const orbitHudCanvas = makeHudCanvas(260, 260, "20px", "20px");
  const orbitHudCtx = orbitHudCanvas.getContext("2d");

  const infoHudCanvas = makeHudCanvas(520, 260, "20px", "20px");
  infoHudCanvas.style.top = "auto";
  infoHudCanvas.style.bottom = "20px";
  const infoHudCtx = infoHudCanvas.getContext("2d");

  const radarCanvas = makeHudCanvas(220, 220, "auto", "20px");
  radarCanvas.style.right = "20px";
  const radarCtx = radarCanvas.getContext("2d");

  return {
    hudRoot,
    orbitHudCanvas,
    orbitHudCtx,
    infoHudCanvas,
    infoHudCtx,
    radarCanvas,
    radarCtx,
    radarSweepAngle: 0,
    temp: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    projected: new THREE.Vector3(),
  };
}

function projectOrbitalPointToHud(
  point,
  center,
  radiusPx,
  player,
  playerState,
  hud,
) {
  hud.up.copy(player.position).normalize();
  hud.forward.copy(playerState.forward).normalize();
  hud.forward.projectOnPlane(hud.up).normalize();
  hud.right.crossVectors(hud.forward, hud.up).normalize();

  hud.temp.copy(point).normalize();
  const x = hud.temp.dot(hud.right);
  const y = hud.temp.dot(hud.up);
  const z = hud.temp.dot(hud.forward);

  const scale = 1 / Math.max(0.25, z + 1.35);

  return {
    x: center.x + x * radiusPx * scale,
    y: center.y - y * radiusPx * scale,
    visible: z > -0.9,
  };
}

function drawWireOrb(ctx, center, radiusPx) {
  ctx.save();
  ctx.strokeStyle = "rgba(140,255,240,0.42)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = -2; i <= 2; i++) {
    const t = i / 3;

    ctx.beginPath();
    ctx.ellipse(
      center.x,
      center.y,
      radiusPx,
      Math.max(10, radiusPx * (1 - Math.abs(t) * 0.28)),
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      center.x,
      center.y,
      Math.max(10, radiusPx * (1 - Math.abs(t) * 0.28)),
      radiusPx,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawOrbitSampleLine(
  ctx,
  object,
  color,
  center,
  radiusPx,
  hud,
  player,
  playerState,
  steps = 96,
  width = 2,
  dashed = false,
) {
  if (!object) return;

  const angle = object.userData.angle;
  const speed = object.userData.speed || 0;
  const basis = object.userData.basis || object.userData.orbitBasis;
  const radius = object.userData.radius;
  if (!basis || !Number.isFinite(radius)) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dashed) ctx.setLineDash([6, 4]);

  let first = true;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const sampleAngle =
      angle + (i / steps) * Math.PI * 2 * Math.sign(speed || 1);
    const samplePos = basis.tangentA
      .clone()
      .multiplyScalar(Math.cos(sampleAngle) * radius)
      .add(
        basis.tangentB.clone().multiplyScalar(Math.sin(sampleAngle) * radius),
      );

    const p = projectOrbitalPointToHud(
      samplePos,
      center,
      radiusPx,
      player,
      playerState,
      hud,
    );
    if (first) {
      ctx.moveTo(p.x, p.y);
      first = false;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawLastKnownOrbitLine(
  ctx,
  debris,
  center,
  radiusPx,
  hud,
  player,
  playerState,
) {
  if (!debris?.userData) return;
  if (debris.userData.tracked) return;
  if (!debris.userData.hasLastKnownTrack) return;

  const angle = debris.userData.lastKnownAngle;
  const speed = debris.userData.lastKnownSpeed || 0;
  const basis = debris.userData.lastKnownBasis;
  const radius = debris.userData.lastKnownRadius;
  if (!basis || !Number.isFinite(radius)) return;

  const life = 1;

  ctx.save();
  ctx.strokeStyle = `rgba(255, 215, 120, ${0.18 + life * 0.38})`;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([4, 6]);

  let first = true;
  ctx.beginPath();
  for (let i = 0; i <= 72; i++) {
    const sampleAngle = angle + (i / 72) * Math.PI * 2 * Math.sign(speed || 1);
    const samplePos = basis.tangentA
      .clone()
      .multiplyScalar(Math.cos(sampleAngle) * radius)
      .add(
        basis.tangentB.clone().multiplyScalar(Math.sin(sampleAngle) * radius),
      );

    const p = projectOrbitalPointToHud(
      samplePos,
      center,
      radiusPx,
      player,
      playerState,
      hud,
    );
    if (first) {
      ctx.moveTo(p.x, p.y);
      first = false;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawDebrisTargetingReticle(ctx, centerX, centerY, targetingUi) {
  if (!targetingUi?.visible) return;

  const lockBlend = THREE.MathUtils.clamp(targetingUi.lockStrength ?? 0, 0, 1);
  const outerRadius = 22 + targetingUi.rangeRatio * 12;

  // Player ring starts smaller and grows into the target ring as lock improves.
  const playerRadius = THREE.MathUtils.lerp(
    outerRadius * 0.58,
    outerRadius,
    lockBlend,
  );

  const playerOffsetX = targetingUi.horizontalNormalized * 22;
  const playerOffsetY = -targetingUi.verticalNormalized * 22;
  const playerCenterX = centerX + playerOffsetX;
  const playerCenterY = centerY + playerOffsetY;

  const targetColor = targetingUi.solidLock
    ? 'rgba(120,255,160,0.98)'
    : targetingUi.captureWindowOpen
      ? `rgba(${Math.round(255 - lockBlend * 95)},${Math.round(220 + lockBlend * 35)},${Math.round(90 + lockBlend * 50)},0.98)`
      : `rgba(${Math.round(255 - lockBlend * 70)},${Math.round(210 + lockBlend * 30)},${Math.round(70 + lockBlend * 40)},0.92)`;

  const playerColor = targetingUi.solidLock
    ? 'rgba(120,255,160,0.96)'
    : `rgba(${Math.round(80 + lockBlend * 40)},${Math.round(190 + lockBlend * 65)},${Math.round(255 - lockBlend * 95)},0.95)`;

  ctx.save();

  // Debris ring: dotted yellow/green outer ring.
  ctx.strokeStyle = targetColor;
  ctx.lineWidth = targetingUi.solidLock ? 3.2 : 2.2;
  ctx.setLineDash(targetingUi.solidLock ? [] : [7, 5]);
  ctx.beginPath();
  ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Debris ring: solid yellow/green outline under the dotted ring.
  ctx.strokeStyle = targetingUi.solidLock
    ? 'rgba(120,255,160,0.82)'
    : `rgba(${Math.round(255 - lockBlend * 85)},${Math.round(210 + lockBlend * 40)},${Math.round(80 + lockBlend * 55)},0.62)`;
  ctx.lineWidth = targetingUi.solidLock ? 2.8 : 1.4;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(centerX, centerY, outerRadius + 2, 0, Math.PI * 2);
  ctx.stroke();

  // Player ring: blue dotted ring that visually nests into the target ring.
  ctx.strokeStyle = playerColor;
  ctx.lineWidth = targetingUi.solidLock ? 2.8 : 2;
  ctx.setLineDash(targetingUi.solidLock ? [] : [5, 5]);
  ctx.beginPath();
  ctx.arc(playerCenterX, playerCenterY, playerRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Fill glow to make the merge state feel more readable as alignment improves.
  if (lockBlend > 0.08) {
    ctx.fillStyle = targetingUi.solidLock
      ? `rgba(120,255,160,${0.16 + lockBlend * 0.22})`
      : `rgba(255,220,110,${0.05 + lockBlend * 0.14})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius - 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Small center marker so the player can read the true debris center.
  ctx.fillStyle = targetingUi.solidLock
    ? 'rgba(120,255,160,0.98)'
    : 'rgba(255,220,110,0.95)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Vertical cue remains subtle and only appears when the player is notably high/low.
  if (Math.abs(targetingUi.verticalNormalized) > 0.12) {
    ctx.fillStyle = 'rgba(255,235,180,0.95)';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      targetingUi.verticalNormalized > 0 ? '↓' : '↑',
      centerX,
      centerY +
        (targetingUi.verticalNormalized > 0
          ? outerRadius + 16
          : -(outerRadius + 16)),
    );
  }

  ctx.restore();
}

export function drawOrbitalHud(hud, data) {
  const { orbitHudCanvas, orbitHudCtx, infoHudCanvas, infoHudCtx, projected } =
    hud;

  const {
    player,
    playerState,
    playerHeatState,
    throttlePercent,
    station,
    satellites,
    debris,
    debrisList = [],
    trajectoryState,
    mission,
    score,
    shiftEarnings,
    orbitalRisk,
    serviceBacklog,
    playerAccount,
  } = data;

  let apoPoint = null;
  let periPoint = null;
  let apoRadius = -Infinity;
  let periRadius = Infinity;

  const interceptPct = Math.round(debris?.userData?.interceptChance || 0);
  const onTarget = !!debris?.userData?.tracked && interceptPct >= 65;
  const strongTarget = !!debris?.userData?.tracked && interceptPct >= 82;

  let activeRepairSat = null;
  let activeRepairProgress = 0;
  let activeRepairDistance = Infinity;
  let activeRepairAlignment = 0;

  for (const sat of satellites) {
    if (!sat?.userData?.damaged) continue;

    const distance = player.position.distanceTo(sat.position);
    const progress = sat.userData.repairProgress || 0;

    const radius = sat.userData.radius;
    const angle = sat.userData.angle;
    const orbitBasis = sat.userData.orbitBasis;
    const speed = sat.userData.speed || 0;

    const pos = orbitBasis.tangentA
      .clone()
      .multiplyScalar(Math.cos(angle) * radius)
      .add(
        orbitBasis.tangentB.clone().multiplyScalar(Math.sin(angle) * radius),
      );
    const lookAhead = orbitBasis.tangentA
      .clone()
      .multiplyScalar(Math.cos(angle + Math.sign(speed || 1) * 0.08) * radius)
      .add(
        orbitBasis.tangentB
          .clone()
          .multiplyScalar(
            Math.sin(angle + Math.sign(speed || 1) * 0.08) * radius,
          ),
      );
    const tangent = lookAhead.sub(pos).normalize();
    const alignment = Math.abs(playerState.forward.dot(tangent));

    const shouldPrefer =
      !activeRepairSat ||
      progress > activeRepairProgress ||
      (progress === activeRepairProgress && distance < activeRepairDistance);

    if (shouldPrefer) {
      activeRepairSat = sat;
      activeRepairProgress = progress;
      activeRepairDistance = distance;
      activeRepairAlignment = alignment;
    }
  }

  const ctx = orbitHudCtx;
  const w = orbitHudCanvas.width;
  const h = orbitHudCanvas.height;
  const textCtx = infoHudCtx;
  const tw = infoHudCanvas.width;
  const th = infoHudCanvas.height;
  const center = { x: w * 0.5, y: h * 0.5 };
  const radiusPx = 88;

  ctx.clearRect(0, 0, w, h);
  textCtx.clearRect(0, 0, tw, th);

  ctx.fillStyle = "rgba(4, 16, 22, 0.32)";
  ctx.beginPath();
  ctx.arc(center.x, center.y, 108, 0, Math.PI * 2);
  ctx.fill();

  drawWireOrb(ctx, center, radiusPx);

  drawOrbitSampleLine(
    ctx,
    station,
    "rgba(80,255,235,0.82)",
    center,
    radiusPx,
    hud,
    player,
    playerState,
    96,
    2.2,
    false,
  );

  for (const satellite of satellites) {
    const isRepairTarget =
      satellite?.userData?.damaged &&
      (mission?.type === "REPAIR" || mission?.type === "OPEN");
    drawOrbitSampleLine(
      ctx,
      satellite,
      isRepairTarget ? "rgba(120,255,160,0.9)" : "rgba(255,120,90,0.42)",
      center,
      radiusPx,
      hud,
      player,
      playerState,
      72,
      isRepairTarget ? 2.2 : 1.1,
      false,
    );
  }

  const debrisTargets = debrisList.length ? debrisList : debris ? [debris] : [];

  for (const debrisTarget of debrisTargets) {
    if (!debrisTarget?.userData?.active) continue;

    const isPrimaryDebris = debrisTarget === debris;
    const orbitColor = isPrimaryDebris
      ? "rgba(255,220,120,0.95)"
      : "rgba(255,200,120,0.5)";
    const orbitWidth = isPrimaryDebris ? 1.75 : 1.1;

    if (debrisTarget?.userData?.tracked) {
      drawOrbitSampleLine(
        ctx,
        debrisTarget,
        orbitColor,
        center,
        radiusPx,
        hud,
        player,
        playerState,
        72,
        orbitWidth,
        true,
      );
    } else if (debrisTarget?.userData?.hasLastKnownTrack) {
      drawLastKnownOrbitLine(
        ctx,
        debrisTarget,
        center,
        radiusPx,
        hud,
        player,
        playerState,
      );
    }
  }

  // Satellite spotted flash marker
  if (
    debris?.userData?.spottedFlashTime > 0 &&
    debris.userData.lastSpottedPosition
  ) {
    const pulse = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;

    const p = projectOrbitalPointToHud(
      debris.userData.lastSpottedPosition,
      center,
      radiusPx,
      player,
      playerState,
      hud,
    );

    ctx.save();

    ctx.fillStyle = `rgba(255, 80, 80, ${0.6 + pulse * 0.4})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,80,80,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10 + pulse * 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // Player trajectory underglow
  ctx.save();
  ctx.strokeStyle = strongTarget
    ? "rgba(120,255,140,0.34)"
    : onTarget
      ? "rgba(255,230,120,0.30)"
      : "rgba(255,255,255,0.24)";
  ctx.lineWidth = strongTarget ? 9 : onTarget ? 8 : 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i < trajectoryState.guidePointCount; i++) {
    projected.set(
      trajectoryState.guidePositions[i * 3],
      trajectoryState.guidePositions[i * 3 + 1],
      trajectoryState.guidePositions[i * 3 + 2],
    );
    const radius = projected.length();
    const p = projectOrbitalPointToHud(
      projected,
      center,
      radiusPx,
      player,
      playerState,
      hud,
    );

    if (radius > apoRadius) {
      apoRadius = radius;
      apoPoint = { ...p, radius };
    }
    if (radius < periRadius) {
      periRadius = radius;
      periPoint = { ...p, radius };
    }

    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();

  // Player trajectory main dotted guide
  ctx.save();
  ctx.strokeStyle = strongTarget
    ? "rgba(120,255,140,1.0)"
    : onTarget
      ? "rgba(255,230,120,1.0)"
      : "rgba(255,255,255,0.98)";
  ctx.lineWidth = strongTarget ? 3.8 : onTarget ? 3.4 : 3.0;
  ctx.shadowBlur = strongTarget ? 18 : onTarget ? 12 : 10;
  ctx.shadowColor = strongTarget
    ? "rgba(120,255,140,0.95)"
    : onTarget
      ? "rgba(255,220,120,0.95)"
      : "rgba(255,255,255,0.9)";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash([2, 8]);
  ctx.beginPath();
  for (let i = 0; i < trajectoryState.guidePointCount; i++) {
    projected.set(
      trajectoryState.guidePositions[i * 3],
      trajectoryState.guidePositions[i * 3 + 1],
      trajectoryState.guidePositions[i * 3 + 2],
    );
    const p = projectOrbitalPointToHud(
      projected,
      center,
      radiusPx,
      player,
      playerState,
      hud,
    );
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();

  // Thin centerline to help match orbital paths at a glance
  ctx.save();
  ctx.strokeStyle = strongTarget
    ? "rgba(120,255,140,0.75)"
    : onTarget
      ? "rgba(255,230,120,0.72)"
      : "rgba(255,255,255,0.62)";
  ctx.lineWidth = 1.15;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i < trajectoryState.guidePointCount; i++) {
    projected.set(
      trajectoryState.guidePositions[i * 3],
      trajectoryState.guidePositions[i * 3 + 1],
      trajectoryState.guidePositions[i * 3 + 2],
    );
    const p = projectOrbitalPointToHud(
      projected,
      center,
      radiusPx,
      player,
      playerState,
      hud,
    );
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();

  if (playerState.inEllipticalOrbit && apoPoint && periPoint) {
    // Apoapsis marker
    ctx.save();
    ctx.strokeStyle = playerState.apoapsisWindow
      ? "rgba(120, 255, 180, 0.98)"
      : "rgba(120, 200, 255, 0.98)";
    ctx.fillStyle = playerState.apoapsisWindow
      ? "rgba(120, 255, 180, 0.24)"
      : "rgba(120, 200, 255, 0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      apoPoint.x,
      apoPoint.y,
      playerState.apoapsisWindow ? 11 : 9,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = playerState.apoapsisWindow
      ? "rgba(180, 255, 210, 0.98)"
      : "rgba(190, 230, 255, 0.98)";
    ctx.font = "11px monospace";
    ctx.fillText("APO", apoPoint.x + 12, apoPoint.y - 6);
    if (playerState.apoapsisWindow) {
      ctx.fillText("BURN ↓", apoPoint.x + 12, apoPoint.y + 8);
    }
    ctx.restore();

    // Periapsis marker
    ctx.save();
    ctx.strokeStyle = playerState.periapsisWindow
      ? "rgba(120, 255, 180, 0.98)"
      : "rgba(255, 170, 120, 0.98)";
    ctx.fillStyle = playerState.periapsisWindow
      ? "rgba(120, 255, 180, 0.24)"
      : "rgba(255, 170, 120, 0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      periPoint.x,
      periPoint.y,
      playerState.periapsisWindow ? 11 : 9,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = playerState.periapsisWindow
      ? "rgba(180, 255, 210, 0.98)"
      : "rgba(255, 215, 180, 0.98)";
    ctx.font = "11px monospace";
    ctx.fillText("PERI", periPoint.x + 12, periPoint.y - 6);
    if (playerState.periapsisWindow) {
      ctx.fillText("BURN ↑", periPoint.x + 12, periPoint.y + 8);
    }
    ctx.restore();
  }

  const playerPoint = projectOrbitalPointToHud(
    player.position,
    center,
    radiusPx,
    player,
    playerState,
    hud,
  );
  ctx.fillStyle = strongTarget ? "#8dff9a" : onTarget ? "#ffe37a" : "#ffffff";
  ctx.beginPath();
  ctx.arc(
    playerPoint.x,
    playerPoint.y,
    strongTarget ? 6.2 : onTarget ? 5.8 : 5.2,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.strokeStyle = strongTarget
    ? "rgba(120,255,140,0.98)"
    : onTarget
      ? "rgba(255,220,120,0.98)"
      : "rgba(255,255,255,0.98)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(
    playerPoint.x,
    playerPoint.y,
    strongTarget ? 10.5 : onTarget ? 9.5 : 8.5,
    0,
    Math.PI * 2,
  );
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(playerPoint.x - 11, playerPoint.y);
  ctx.lineTo(playerPoint.x + 11, playerPoint.y);
  ctx.moveTo(playerPoint.x, playerPoint.y - 11);
  ctx.lineTo(playerPoint.x, playerPoint.y + 11);
  ctx.stroke();

  const stationPoint = projectOrbitalPointToHud(
    station.position,
    center,
    radiusPx,
    player,
    playerState,
    hud,
  );
  ctx.fillStyle = "#4dfff2";
  ctx.beginPath();
  ctx.arc(stationPoint.x, stationPoint.y, 4.5, 0, Math.PI * 2);
  ctx.fill();

  for (const satellite of satellites) {
    const satPoint = projectOrbitalPointToHud(
      satellite.position,
      center,
      radiusPx,
      player,
      playerState,
      hud,
    );
    const isRepairTarget =
      satellite?.userData?.damaged &&
      (mission?.type === "REPAIR" || mission?.type === "OPEN");
    const isActiveRepairTarget = activeRepairSat === satellite;

    if (isRepairTarget) {
      const radius = satellite.userData.radius;
      const angle = satellite.userData.angle;
      const orbitBasis = satellite.userData.orbitBasis;
      const speed = satellite.userData.speed || 0;
      const pos = orbitBasis.tangentA
        .clone()
        .multiplyScalar(Math.cos(angle) * radius)
        .add(
          orbitBasis.tangentB.clone().multiplyScalar(Math.sin(angle) * radius),
        );
      const lookAhead = orbitBasis.tangentA
        .clone()
        .multiplyScalar(Math.cos(angle + Math.sign(speed || 1) * 0.08) * radius)
        .add(
          orbitBasis.tangentB
            .clone()
            .multiplyScalar(
              Math.sin(angle + Math.sign(speed || 1) * 0.08) * radius,
            ),
        );
      const tangent = lookAhead.sub(pos).normalize();
      const repairAlignment = Math.abs(playerState.forward.dot(tangent));
      const repairDistance = player.position.distanceTo(satellite.position);
      const inRepairWindow =
        activeRepairSat === satellite &&
        repairDistance <= (satellite.userData.repairDistance || 0) &&
        repairAlignment >= (satellite.userData.repairAlignment || 1);

      ctx.save();
      ctx.fillStyle = "rgba(120,255,160,0.98)";
      ctx.beginPath();
      ctx.arc(satPoint.x, satPoint.y, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(120,255,160,0.92)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(satPoint.x, satPoint.y, 10, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    } else {
      ctx.fillStyle = "#ff8b63";
      ctx.beginPath();
      ctx.arc(satPoint.x, satPoint.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const debrisTarget of debrisTargets) {
    if (!debrisTarget?.userData?.tracked) continue;

    const debrisPoint = projectOrbitalPointToHud(
      debrisTarget.position,
      center,
      radiusPx,
      player,
      playerState,
      hud,
    );
    const isPrimaryDebris = debrisTarget === debris;

    if (isPrimaryDebris) {
      drawDebrisTargetingReticle(
        ctx,
        debrisPoint.x,
        debrisPoint.y,
        debrisTarget.userData?.targetingUi,
      );
    }

    ctx.fillStyle = isPrimaryDebris ? "#ffd26b" : "rgba(255,210,120,0.72)";
    ctx.beginPath();
    ctx.arc(debrisPoint.x, debrisPoint.y, isPrimaryDebris ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const leftColX = 0;
  const focusColX = 220;
  const topInfoY = 12;
  const heatInfoY = 30;
  const stressInfoY = 46;

  textCtx.fillStyle = "rgba(210,255,248,0.9)";
  textCtx.font = "12px monospace";
  textCtx.fillText("ORBITAL TRAJECTORIES", leftColX, topInfoY);
  if (playerAccount) {
    const balance =
      typeof playerAccount.balance === "number"
        ? playerAccount.balance
        : (playerAccount.credits ?? 0) - (playerAccount.debt ?? 0);

    const accountColor =
      balance < 0
        ? "rgba(255,140,120,0.98)"
        : balance <= 250
          ? "rgba(255,210,120,0.96)"
          : "rgba(190,230,255,0.92)";

    textCtx.fillStyle = "rgba(160,210,235,0.72)";
    textCtx.fillText("ACCOUNT", focusColX, 52);

    textCtx.fillStyle = accountColor;
    textCtx.fillText(`BAL: ${Math.round(balance)} CR`, focusColX, 70);
  }

  const focusType = mission?.type || "OPEN";
  const focusColor =
    focusType === "REPAIR"
      ? "rgba(120,255,160,0.98)"
      : focusType === "DEBRIS"
        ? "rgba(255,210,120,0.98)"
        : "rgba(190,230,255,0.95)";

  textCtx.fillStyle = "rgba(190,230,255,0.92)";
  textCtx.fillText("MISSION FOCUS", focusColX, 82);
  textCtx.fillStyle = focusColor;
  textCtx.fillText(`${focusType}`, focusColX + 34, 100);
  textCtx.fillStyle = "rgba(190,230,255,0.92)";
  textCtx.fillText(`STATUS: ${mission?.status || "IDLE"}`, focusColX, 122);
  const earnedValue = Math.round(shiftEarnings ?? 0);
  textCtx.fillText(`SHIFT: +${earnedValue} CR`, focusColX, 140);

  const riskValue = Math.round(orbitalRisk ?? 0);
  const backlogValue = Math.round(serviceBacklog ?? 0);

  const rightColX = 316;
  const targetColY = 44;
  const orbitColY = debris?.userData?.attached ? 222 : 188;

  if (
    (mission?.type === "REPAIR" || mission?.type === "OPEN") &&
    activeRepairSat
  ) {
  } else {
    if (debris?.userData?.tracked || debris?.userData?.attached) {
      const targetingUi = debris.userData?.targetingUi
      const alignPct = Math.round((targetingUi?.alignmentRatio ?? 0) * 100)
      const verticalPct = Math.round((targetingUi?.verticalNormalized ?? 0) * 100)

      textCtx.fillStyle = strongTarget
        ? "rgba(120,255,140,0.98)"
        : onTarget
          ? "rgba(255,230,120,0.98)"
          : "rgba(180,220,255,0.82)";

      textCtx.fillText(
        strongTarget
          ? "TRJ MATCH: STRONG"
          : onTarget
            ? "TRJ MATCH: GOOD"
            : debris.userData.hasLastKnownTrack
              ? "TRJ: LAST KNOWN"
              : "TRJ: ADJUST",
        rightColX,
        targetColY,
      );

      textCtx.fillStyle = "rgba(255,220,120,0.95)";
      textCtx.fillText(
        debris.userData.attached ? "TRK: ATTACHED" : "TRK: ACTIVE",
        rightColX,
        targetColY + 18,
      );
      textCtx.fillText(
        `SZ: ${debris.userData.size}`,
        rightColX,
        targetColY + 36,
      );
      textCtx.fillText(
        `THR: ${debris.userData.threatLevel}`,
        rightColX,
        targetColY + 54,
      );
      textCtx.fillText(`INT: ${interceptPct}%`, rightColX, targetColY + 72);
      textCtx.fillText(`ALIGN: ${alignPct}%`, rightColX, targetColY + 90);
      textCtx.fillText(`V-OFF: ${verticalPct > 0 ? '+' : ''}${verticalPct}`, rightColX, targetColY + 108);
    }
    if (debris?.userData?.attached) {
      textCtx.fillStyle = "rgba(255,170,120,0.95)";
      textCtx.fillText(
        `BURN: ${(debris.userData.burnDamage ?? 0).toFixed(1)}/${debris.userData.burnThreshold}`,
        rightColX,
        targetColY + 126,
      );
      textCtx.fillText(
        `STAB: ${Math.round(debris.userData.stability * 100)}%`,
        rightColX,
        targetColY + 144,
      );
    }
  }

  if (playerHeatState) {
    textCtx.fillStyle = playerHeatState.critical
      ? "rgba(255,110,80,0.98)"
      : playerHeatState.warning
        ? "rgba(255,180,120,0.98)"
        : "rgba(180,220,255,0.85)";

    textCtx.fillText(
      `SHIP HEAT: ${playerHeatState.heat.toFixed(1)}/${playerHeatState.maxHeat.toFixed(1)}`,
      leftColX,
      heatInfoY,
    );

    if (playerHeatState.critical) {
      textCtx.fillText("ATMOSPHERIC STRESS CRITICAL", leftColX, stressInfoY);
    } else if (playerHeatState.warning) {
      textCtx.fillText("ATMOSPHERIC STRESS WARNING", leftColX, stressInfoY);
    }
  }

  textCtx.fillStyle = "rgba(220,240,255,0.9)";
  textCtx.fillText(
    `THRTL: ${Math.round(throttlePercent ?? 50)}%`,
    rightColX,
    orbitColY,
  );

  textCtx.fillStyle = "rgba(160,210,235,0.72)";

  if (playerState.inEllipticalOrbit) {
    textCtx.fillStyle = "rgba(140, 210, 255, 0.98)";
    textCtx.fillText("ORB: ELLIPTICAL", rightColX, orbitColY + 18);

    if (Number.isFinite(apoRadius) && Number.isFinite(periRadius)) {
      textCtx.fillStyle = "rgba(200, 235, 255, 0.9)";
      textCtx.fillText(
        `APO: ${apoRadius.toFixed(1)}`,
        rightColX,
        orbitColY + 36,
      );
      textCtx.fillText(
        `PERI: ${periRadius.toFixed(1)}`,
        rightColX,
        orbitColY + 54,
      );
    }

    if (playerState.apoapsisWindow) {
      textCtx.fillStyle = "rgba(150, 255, 190, 0.98)";
      textCtx.fillText("WND: APO  BURN ↓", rightColX, orbitColY + 72);
    } else if (playerState.periapsisWindow) {
      textCtx.fillStyle = "rgba(150, 255, 190, 0.98)";
      textCtx.fillText("WND: PERI BURN ↑", rightColX, orbitColY + 72);
    }
  }
}

export function drawRadar(hud, data) {
  const { radarCanvas, radarCtx } = hud;
  const {
    player,
    playerState,
    station,
    satellites,
    debris,
    debrisList = [],
    scanRadius,
    fuelState,
  } = data;

  const ctx = radarCtx;
  const w = radarCanvas.width;
  const h = radarCanvas.height;
  const center = { x: w * 0.5, y: h * 0.5 };
  const radiusPx = 92;

  hud.radarSweepAngle += 0.045;
  if (hud.radarSweepAngle > Math.PI * 2) hud.radarSweepAngle -= Math.PI * 2;

  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "rgba(14, 44, 18, 0.72)";
  ctx.beginPath();
  ctx.arc(center.x, center.y, 104, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(120,255,120,0.75)";
  ctx.lineWidth = 1.5;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.arc(center.x, center.y, (radiusPx / 4) * i, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(center.x - radiusPx, center.y);
  ctx.lineTo(center.x + radiusPx, center.y);
  ctx.moveTo(center.x, center.y - radiusPx);
  ctx.lineTo(center.x, center.y + radiusPx);
  ctx.stroke();

  const sweepGradient = ctx.createRadialGradient(
    center.x,
    center.y,
    8,
    center.x,
    center.y,
    radiusPx,
  );
  sweepGradient.addColorStop(0, "rgba(120,255,120,0.22)");
  sweepGradient.addColorStop(1, "rgba(120,255,120,0)");

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(hud.radarSweepAngle);
  ctx.fillStyle = sweepGradient;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radiusPx, -0.12, 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  function drawRadarObject(worldPos, color, size = 6) {
    const toObj = worldPos.clone().sub(player.position);
    const distance = toObj.length();
    if (distance > scanRadius * 2.25) return;

    hud.forward.copy(playerState.forward).normalize();
    hud.right
      .crossVectors(hud.forward, player.position.clone().normalize())
      .normalize();
    hud.up.copy(player.position).normalize();

    const x = toObj.dot(hud.right);
    const y = toObj.dot(hud.forward);
    const normalizedX = THREE.MathUtils.clamp(x / (scanRadius * 2), -1, 1);
    const normalizedY = THREE.MathUtils.clamp(y / (scanRadius * 2), -1, 1);

    const px = center.x + normalizedX * radiusPx * 0.82;
    const py = center.y - normalizedY * radiusPx * 0.82;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }

  drawRadarObject(station.position, "#6efff1", 5);

  for (const satellite of satellites) {
    drawRadarObject(satellite.position, "#ff8b63", 4);
  }

  const radarDebrisTargets = debrisList.length ? debrisList : debris ? [debris] : [];

  for (const debrisTarget of radarDebrisTargets) {
    if (!debrisTarget?.userData?.tracked) continue;
    drawRadarObject(
      debrisTarget.position,
      debrisTarget === debris ? "#ffd46a" : "rgba(255,212,106,0.68)",
      debrisTarget === debris ? 5 : 4,
    );
  }

  if (fuelState) {
    const fuelPct = THREE.MathUtils.clamp(
      fuelState.current / Math.max(1, fuelState.max),
      0,
      1,
    );
    const fuelBarX = 18;
    const fuelBarY = 24;
    const fuelBarW = 120;
    const fuelBarH = 10;

    ctx.fillStyle = "rgba(6, 18, 12, 0.88)";
    ctx.fillRect(fuelBarX, fuelBarY, fuelBarW, fuelBarH);

    ctx.strokeStyle = fuelState.low
      ? "rgba(255,170,120,0.95)"
      : "rgba(120,255,120,0.95)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fuelBarX, fuelBarY, fuelBarW, fuelBarH);

    ctx.fillStyle = fuelState.low
      ? "rgba(255,170,120,0.95)"
      : "rgba(120,255,120,0.95)";
    ctx.fillRect(fuelBarX, fuelBarY, fuelBarW * fuelPct, fuelBarH);

    ctx.fillStyle = "rgba(200,255,200,0.9)";
    ctx.font = "12px monospace";
    ctx.fillText(`FUEL ${Math.round(fuelPct * 100)}%`, fuelBarX, 18);
  }

  ctx.fillStyle = "rgba(200,255,200,0.9)";
  ctx.font = "12px monospace";
  ctx.fillText("RADAR SCAN", 18, 56);
  ctx.fillText("AUTO SCAN ACTIVE", 18, h - 16);
}
