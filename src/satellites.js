import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { CONFIG } from "./config.js";

function checkSatelliteDebrisProximity(satellite, debris) {
  if (!debris || !debris.userData?.active) return;

  const distance = satellite.position.distanceTo(debris.position);
  const detectionRadius = 3.5;

  if (distance <= detectionRadius) {
    debris.userData.tracked = true;
    debris.userData.spottedFlashTime = 2.5;

    if (!debris.userData.lastSpottedPosition) {
      debris.userData.lastSpottedPosition = new THREE.Vector3();
    }

    debris.userData.lastSpottedPosition.copy(debris.position);
  }
}

const SATELLITE_TUNING = {
  collisionRadiusScale: 0.75,
  collisionBuffer: 0.25,
  repairTime: CONFIG.satellites.repairTime,
  repairDistance: CONFIG.satellites.repairDistance,
  repairAlignment: CONFIG.satellites.repairAlignment,
  repairBurstMs: CONFIG.satellites.repairBurstMs,
  ringBurstMs: CONFIG.satellites.ringBurstMs,
  rebreakMinMs: CONFIG.satellites.rebreakMinMs,
  rebreakMaxMs: CONFIG.satellites.rebreakMaxMs,
};

const DAWN_MODEL_URL = new URL("../assets/models/dawn.glb", import.meta.url)
  .href;
const dawnLoader = new GLTFLoader();
let dawnModelPromise = null;

function loadDawnModel() {
  if (!dawnModelPromise) {
    dawnModelPromise = dawnLoader.loadAsync(DAWN_MODEL_URL);
  }
  return dawnModelPromise;
}

function applyDawnSatelliteModel(group, config, fallbackParts) {
  loadDawnModel()
    .then((gltf) => {
      if (!group.parent) return;

      const dawnScene = clone(gltf.scene);
      dawnScene.name = "dawnSatelliteModel";

      const box = new THREE.Box3().setFromObject(dawnScene);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const longest = Math.max(size.x || 1, size.y || 1, size.z || 1);
      const targetSize = config.size * 2.2;
      const scale = targetSize / longest;

      dawnScene.position.sub(center);
      dawnScene.scale.setScalar(scale);
      dawnScene.rotation.x = Math.PI * 0.5;
      dawnScene.rotation.z = Math.PI;

      dawnScene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
          if (Array.isArray(child.material)) {
            child.material = child.material.map((mat) => {
              const nextMat = mat.clone();
              nextMat.depthWrite = true;
              return nextMat;
            });
          } else if (child.material) {
            child.material = child.material.clone();
            child.material.depthWrite = true;
          }
        }
      });

      group.add(dawnScene);
      group.userData.dawnModel = dawnScene;

      for (const part of fallbackParts) {
        if (part) part.visible = false;
      }
    })
    .catch((error) => {
      console.warn(
        "[satellites] Failed to load dawn.glb, using fallback satellite mesh.",
        error,
      );
    });
}

const ORBIT_SEGMENTS = 128;
const GUIDE_POINT_COUNT = 48;

const SATELLITE_CONFIGS = [
  {
    radius: 208,
    angle: 0,
    speed: 0.22,
    inclination: 0.18,
    ascendingNode: 0.0,
    size: 1.15,
    repairTime: 2.6,
    color: 0xff5533,
  },
  {
    radius: 212,
    angle: Math.PI * 0.9,
    speed: -0.16,
    inclination: 0.62,
    ascendingNode: 1.35,
    size: 1.3,
    repairTime: 3.4,
    color: 0xffaa33,
  },
  {
    radius: 206,
    angle: Math.PI * 1.6,
    speed: 0.28,
    inclination: 1.02,
    ascendingNode: 2.25,
    size: 1.05,
    repairTime: 4.2,
    color: 0xff3355,
  },
  {
    radius: 210,
    angle: Math.PI * 0.35,
    speed: 0.19,
    inclination: 0.42,
    ascendingNode: 0.78,
    size: 1.2,
    repairTime: 2.2,
    color: 0xff7744,
  },
  {
    radius: 214,
    angle: Math.PI * 1.18,
    speed: -0.24,
    inclination: 1.24,
    ascendingNode: 2.9,
    size: 1.45,
    repairTime: 5.0,
    color: 0xff6644,
  },
  {
    radius: 207,
    angle: Math.PI * 1.92,
    speed: 0.31,
    inclination: 0.88,
    ascendingNode: 1.92,
    size: 1.0,
    repairTime: 2.8,
    color: 0xff4466,
  },
  {
    radius: 211,
    angle: Math.PI * 0.62,
    speed: -0.2,
    inclination: 1.46,
    ascendingNode: 0.26,
    size: 1.25,
    repairTime: 3.8,
    color: 0xff9955,
  },
  {
    radius: 205,
    angle: Math.PI * 1.42,
    speed: 0.34,
    inclination: 0.14,
    ascendingNode: 2.62,
    size: 1.1,
    repairTime: 2.4,
    color: 0xff5555,
  },
];

function getOrbitBasis(config) {
  const inclination = config.inclination || 0;
  const ascendingNode = config.ascendingNode || 0;

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
  const normal = new THREE.Vector3()
    .crossVectors(tangentA, tangentB)
    .normalize();

  return { tangentA, tangentB, normal };
}

function getOrbitPosition(radius, angle, basis) {
  return basis.tangentA
    .clone()
    .multiplyScalar(Math.cos(angle) * radius)
    .add(basis.tangentB.clone().multiplyScalar(Math.sin(angle) * radius));
}

function createOrbitRing(config) {
  const points = [];
  const basis = getOrbitBasis(config);

  for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
    const t = (i / ORBIT_SEGMENTS) * Math.PI * 2;
    points.push(getOrbitPosition(config.radius, t, basis));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: config.color,
    transparent: true,
    opacity: 0.22,
  });

  const ring = new THREE.LineLoop(geometry, material);
  ring.frustumCulled = false;
  return ring;
}

function createGuideLine(config) {
  const positions = new Float32Array(GUIDE_POINT_COUNT * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, GUIDE_POINT_COUNT);

  const material = new THREE.LineDashedMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
    dashSize: 1.1,
    gapSize: 0.65,
  });

  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  return line;
}

function createSatelliteMesh(config) {
  const group = new THREE.Group();
  const fallbackParts = [];

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(config.size, config.size * 0.45, config.size * 0.45),
    new THREE.MeshStandardMaterial({
      color: config.color,
      emissive: config.color,
      emissiveIntensity: 0.35,
      metalness: 0.35,
      roughness: 0.55,
    }),
  );
  group.add(body);
  fallbackParts.push(body);

  const leftPanel = new THREE.Mesh(
    new THREE.BoxGeometry(
      config.size * 0.9,
      config.size * 0.08,
      config.size * 0.45,
    ),
    new THREE.MeshStandardMaterial({
      color: 0x66aaff,
      emissive: 0x224466,
      emissiveIntensity: 0.45,
      metalness: 0.2,
      roughness: 0.5,
    }),
  );
  leftPanel.position.x = -config.size * 0.95;
  group.add(leftPanel);
  fallbackParts.push(leftPanel);

  const rightPanel = leftPanel.clone();
  rightPanel.position.x = config.size * 0.95;
  group.add(rightPanel);
  fallbackParts.push(rightPanel);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(config.size * 0.14, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.9,
      toneMapped: false,
    }),
  );
  beacon.position.y = config.size * 0.28;
  group.add(beacon);
  group.userData.beacon = beacon;
  fallbackParts.push(beacon);

  const beaconLight = new THREE.PointLight(
    0xff4444,
    0,
    config.size * 10.5,
    2.0,
  );
  beaconLight.position.copy(beacon.position);
  beaconLight.castShadow = false;
  group.add(beaconLight);
  group.userData.beaconLight = beaconLight;
  group.userData.repairBurstUntil = 0;
  group.userData.ringBurstUntil = 0;

  // Collision proximity halo
  const collisionHaloGeometry = new THREE.RingGeometry(
    config.size * 1.08,
    config.size * 1.28,
    48,
  );
  const collisionHaloMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa44,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const collisionHalo = new THREE.Mesh(
    collisionHaloGeometry,
    collisionHaloMaterial,
  );
  collisionHalo.renderOrder = 11;
  group.add(collisionHalo);

  // World-space repair label above the target rings
  const repairLabelCanvas = document.createElement("canvas");
  repairLabelCanvas.width = 384;
  repairLabelCanvas.height = 128;
  const repairLabelCtx = repairLabelCanvas.getContext("2d");
  const repairLabelTexture = new THREE.CanvasTexture(repairLabelCanvas);
  repairLabelTexture.needsUpdate = true;

  const repairLabelMaterial = new THREE.SpriteMaterial({
    map: repairLabelTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0,
  });
  const repairLabel = new THREE.Sprite(repairLabelMaterial);
  repairLabel.scale.set(config.size * 2.8, config.size * 0.95, 1);
  repairLabel.position.set(0, config.size * 2.55, 0);
  repairLabel.renderOrder = 12;
  group.add(repairLabel);

  // World-space collision warning label
  const warningLabelCanvas = document.createElement("canvas");
  warningLabelCanvas.width = 320;
  warningLabelCanvas.height = 96;
  const warningLabelCtx = warningLabelCanvas.getContext("2d");
  const warningLabelTexture = new THREE.CanvasTexture(warningLabelCanvas);
  warningLabelTexture.needsUpdate = true;

  const warningLabelMaterial = new THREE.SpriteMaterial({
    map: warningLabelTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0,
  });
  const warningLabel = new THREE.Sprite(warningLabelMaterial);
  warningLabel.scale.set(config.size * 2.2, config.size * 0.72, 1);
  warningLabel.position.set(0, config.size * 1.7, 0);
  warningLabel.renderOrder = 13;
  group.add(warningLabel);

  const orbitRing = createOrbitRing(config);
  const guideLine = createGuideLine(config);
  const orbitBasis = getOrbitBasis(config);

  // Target alignment rings
  const targetRing = new THREE.Group();
  targetRing.renderOrder = 10;

  // Outer dotted ring
  const outerRingPoints = [];
  const outerRadius = config.size * 1.95;
  const outerSegments = 64;
  for (let i = 0; i < outerSegments; i++) {
    const t = (i / outerSegments) * Math.PI * 2;
    outerRingPoints.push(
      new THREE.Vector3(
        Math.cos(t) * outerRadius,
        0,
        Math.sin(t) * outerRadius,
      ),
    );
  }
  const outerRingGeometry = new THREE.BufferGeometry().setFromPoints(
    outerRingPoints,
  );
  const outerRingMaterial = new THREE.LineDashedMaterial({
    color: 0xffdd55,
    transparent: true,
    opacity: 0.0,
    dashSize: config.size * 0.18,
    gapSize: config.size * 0.12,
    depthWrite: false,
  });
  const outerRing = new THREE.LineLoop(outerRingGeometry, outerRingMaterial);
  outerRing.computeLineDistances();
  outerRing.renderOrder = 10;
  targetRing.add(outerRing);

  // Inner support ring
  const innerRingPoints = [];
  const innerRadius = config.size * 1.62;
  const innerSegments = 64;
  for (let i = 0; i < innerSegments; i++) {
    const t = (i / innerSegments) * Math.PI * 2;
    innerRingPoints.push(
      new THREE.Vector3(
        Math.cos(t) * innerRadius,
        0,
        Math.sin(t) * innerRadius,
      ),
    );
  }
  const innerRingGeometry = new THREE.BufferGeometry().setFromPoints(
    innerRingPoints,
  );
  const innerRingMaterial = new THREE.LineBasicMaterial({
    color: 0xffdd55,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const innerRing = new THREE.LineLoop(innerRingGeometry, innerRingMaterial);
  innerRing.renderOrder = 10;
  targetRing.add(innerRing);

  group.add(targetRing);

  group.userData.radius = config.radius;
  group.userData.angle = config.angle;
  group.userData.speed = config.speed;
  group.userData.inclination = config.inclination || 0;
  group.userData.ascendingNode = config.ascendingNode || 0;
  group.userData.orbitBasis = orbitBasis;
  group.userData.collisionRadius =
    config.size * SATELLITE_TUNING.collisionRadiusScale;
  group.userData.orbitRing = orbitRing;
  group.userData.guideLine = guideLine;
  // Repair state
  group.userData.damaged = Math.random() < 0.7; // most satellites start damaged
  group.userData.repairProgress = 0;
  group.userData.repairTime =
    config.repairTime ?? SATELLITE_TUNING.repairTime;
  group.userData.repairAlignment = SATELLITE_TUNING.repairAlignment;
  group.userData.repairDistance = SATELLITE_TUNING.repairDistance;
  group.userData.repairActive = false;
  group.userData.targetRing = targetRing;
  group.userData.collisionHalo = collisionHalo;
  group.userData.repairLabel = repairLabel;
  group.userData.repairLabelCanvas = repairLabelCanvas;
  group.userData.repairLabelCtx = repairLabelCtx;
  group.userData.repairLabelTexture = repairLabelTexture;
  group.userData.warningLabel = warningLabel;
  group.userData.warningLabelCanvas = warningLabelCanvas;
  group.userData.warningLabelCtx = warningLabelCtx;
  group.userData.warningLabelTexture = warningLabelTexture;
  group.userData.baseColor = config.color;
  group.userData.rebreakAt = 0;

  applyDawnSatelliteModel(group, config, fallbackParts);

  // Slightly dim emissive for damaged ones at start
  if (group.userData.damaged) {
    body.material.emissiveIntensity = 0.2;
  } else {
    group.userData.rebreakAt =
      performance.now() +
      (SATELLITE_TUNING.rebreakMinMs +
        Math.random() *
          (SATELLITE_TUNING.rebreakMaxMs - SATELLITE_TUNING.rebreakMinMs));
  }
  group.userData.fallbackParts = fallbackParts;
  return group;
}
function updateSatelliteGuide(satellite) {
  const guideLine = satellite.userData.guideLine;
  if (!guideLine) return;

  const positions = guideLine.geometry.attributes.position.array;
  const radius = satellite.userData.radius;
  const speed = satellite.userData.speed;
  const basis = satellite.userData.orbitBasis;
  let angle = satellite.userData.angle;
  const dt = 1 / 60;

  for (let i = 0; i < GUIDE_POINT_COUNT; i++) {
    angle += speed * dt;
    const pos = getOrbitPosition(radius, angle, basis);

    const index = i * 3;
    positions[index] = pos.x;
    positions[index + 1] = pos.y;
    positions[index + 2] = pos.z;
  }

  guideLine.geometry.attributes.position.needsUpdate = true;
  guideLine.geometry.computeBoundingSphere();
  guideLine.computeLineDistances();
}

function updateSatelliteTransform(satellite) {
  const { radius, angle, orbitBasis, speed } = satellite.userData;

  const position = getOrbitPosition(radius, angle, orbitBasis);
  satellite.position.copy(position);

  const lookAhead = getOrbitPosition(
    radius,
    angle + Math.sign(speed || 1) * 0.08,
    orbitBasis,
  );
  const tangent = lookAhead.sub(position).normalize();
  satellite.lookAt(satellite.position.clone().add(tangent));
  const ring = satellite.userData.targetRing;
  if (ring) {
    // Keep the repair ring aligned to the orbital tangent in world space,
    // without inheriting the satellite body's spin/look rotation.
    const normal = tangent.clone().normalize();
    const worldQuat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      normal,
    );
    const parentWorldQuat = new THREE.Quaternion();
    satellite.getWorldQuaternion(parentWorldQuat);
    const localQuat = parentWorldQuat.invert().multiply(worldQuat);
    ring.setRotationFromQuaternion(localQuat);
    ring.position.set(0, 0, 0);
  }

  const collisionHalo = satellite.userData.collisionHalo;
  if (collisionHalo) {
    const normal = tangent.clone().normalize();
    const worldQuat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      normal,
    );
    const parentWorldQuat = new THREE.Quaternion();
    satellite.getWorldQuaternion(parentWorldQuat);
    const localQuat = parentWorldQuat.invert().multiply(worldQuat);
    collisionHalo.setRotationFromQuaternion(localQuat);
    collisionHalo.position.set(0, 0, 0);
  }
}

function getSatelliteTangent(satellite) {
  const { radius, angle, orbitBasis, speed } = satellite.userData;
  const pos = getOrbitPosition(radius, angle, orbitBasis);
  const lookAhead = getOrbitPosition(
    radius,
    angle + Math.sign(speed || 1) * 0.08,
    orbitBasis,
  );
  return lookAhead.sub(pos).normalize();
}

function updateSatelliteBeacon(satellite, timeSeconds) {
  const beacon = satellite.userData.beacon;
  const beaconLight = satellite.userData.beaconLight;
  if (!beacon?.material) return;

  const nowMs = performance.now();
  const burstRemainingMs = Math.max(
    0,
    (satellite.userData.repairBurstUntil || 0) - nowMs,
  );
  const burstT = burstRemainingMs > 0 ? burstRemainingMs / 450 : 0;

  if (satellite.userData.damaged) {
    const pulse = 0.55 + (Math.sin(timeSeconds * 5.2) * 0.5 + 0.5) * 0.95;
    const blinkOn = Math.sin(timeSeconds * 7.8) > -0.15;

    beacon.material.color.setHex(blinkOn ? 0xff6666 : 0x661111);
    beacon.material.emissive.setHex(blinkOn ? 0xff2a2a : 0x2a0000);
    beacon.material.emissiveIntensity = blinkOn ? 1.9 + pulse * 0.55 : 0.18;
    beacon.scale.setScalar(1 + pulse * 0.28);

    if (beaconLight) {
      beaconLight.color.setHex(0xff5544);
      beaconLight.intensity = blinkOn ? 2.4 + pulse * 2.1 : 0.16;
      beaconLight.distance = 11.5 + pulse * 5.5;
    }
  } else {
    const burstGlow = burstT * burstT;

    beacon.material.color.setHex(0x99ffcc);
    beacon.material.emissive.setHex(0x33ff88);
    beacon.material.emissiveIntensity = 1.35 + burstGlow * 3.25;
    beacon.scale.setScalar(1 + burstGlow * 0.6);

    if (beaconLight) {
      beaconLight.color.setHex(0x44ff99);
      beaconLight.intensity = 3.65 + burstGlow * 9.5;
      beaconLight.distance = 25.5 + burstGlow * 18;
    }
  }
}

export function getSatelliteRepairCandidate(player, playerState, satellites) {
  if (!player || !playerState || !Array.isArray(satellites)) return null;

  let best = null;
  let bestProgress = -1;
  let bestDistance = Infinity;

  for (const sat of satellites) {
    if (!sat?.userData?.damaged) continue;

    const distance = player.position.distanceTo(sat.position);
    const tangent = getSatelliteTangent(sat);
    const rawAlignment = Math.abs(playerState.forward.dot(tangent));
    const snapThreshold = Math.max(0.94, (sat.userData.repairAlignment || 0.8) + 0.1);
    const alignment = rawAlignment >= snapThreshold ? 1 : rawAlignment;

    const inWindow =
      distance <= sat.userData.repairDistance &&
      alignment >= sat.userData.repairAlignment;

    const collisionHalo = sat.userData.collisionHalo;
    const warningLabel = sat.userData.warningLabel;
    const warningLabelCtx = sat.userData.warningLabelCtx;
    const warningLabelTexture = sat.userData.warningLabelTexture;
    const collisionRadius = sat.userData.collisionRadius || 1;
    const cautionDistance = collisionRadius + 1.75;
    const dangerDistance = collisionRadius + 0.95;
    const criticalDistance = collisionRadius + 0.45;
    const inCautionZone = distance <= cautionDistance;
    const inDangerZone = distance <= dangerDistance;
    const inCriticalZone = distance <= criticalDistance;

    if (collisionHalo) {
      const haloOpacityTarget = inCautionZone
        ? inCriticalZone
          ? 0.92
          : inDangerZone
            ? 0.68
            : 0.38
        : 0;
      collisionHalo.material.opacity = THREE.MathUtils.lerp(
        collisionHalo.material.opacity,
        haloOpacityTarget,
        0.18,
      );

      const pulse = 0.78 + Math.sin(performance.now() * 0.015) * 0.22;
      const haloColor = inCriticalZone
        ? new THREE.Color(0xff3344)
        : inDangerZone
          ? new THREE.Color(0xff6633)
          : new THREE.Color(0xffaa44);
      collisionHalo.material.color.copy(haloColor);
      collisionHalo.scale.setScalar(
        inCriticalZone ? pulse : inDangerZone ? 1.04 : 1,
      );
    }

    if (warningLabel && warningLabelCtx && warningLabelTexture) {
      const warningOpacityTarget = inDangerZone ? 1 : 0;
      warningLabel.material.opacity = THREE.MathUtils.lerp(
        warningLabel.material.opacity,
        warningOpacityTarget,
        0.2,
      );
      warningLabel.visible = warningLabel.material.opacity > 0.01;
      warningLabelCtx.clearRect(0, 0, 320, 96);

      if (warningLabel.visible) {
        warningLabelCtx.textAlign = "center";
        warningLabelCtx.textBaseline = "middle";
        warningLabelCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
        warningLabelCtx.fillRect(26, 20, 268, 56);
        warningLabelCtx.font = "bold 70px monospace";
        warningLabelCtx.fillStyle = inCriticalZone
          ? "rgba(255,90,90,0.98)"
          : "rgba(255,180,90,0.98)";
        warningLabelCtx.fillText("TOO CLOSE", 160, 48);
      }

      warningLabelTexture.needsUpdate = true;
    }

    if (!inWindow) continue;

    const progress = sat.userData.repairProgress || 0;
    const shouldPrefer =
      !best ||
      progress > bestProgress ||
      (progress === bestProgress && distance < bestDistance);

    if (shouldPrefer) {
      best = sat;
      bestProgress = progress;
      bestDistance = distance;
    }
  }

  return best;
}

export function createSatellites(scene) {
  const satellites = SATELLITE_CONFIGS.map((config) => {
    const satellite = createSatelliteMesh(config);
    updateSatelliteTransform(satellite);
    updateSatelliteGuide(satellite);
    scene.add(satellite);

    if (satellite.userData.orbitRing) {
      scene.add(satellite.userData.orbitRing);
    }

    if (satellite.userData.guideLine) {
      scene.add(satellite.userData.guideLine);
    }

    return satellite;
  });

  return satellites;
}

export function updateSatellites(satellites, dt, debris) {
  if (!Array.isArray(satellites)) return;

  for (const satellite of satellites) {
    satellite.userData.angle += satellite.userData.speed * dt;
    const nowMs = performance.now();
    if (
      !satellite.userData.damaged &&
      !satellite.userData.repairActive &&
      (satellite.userData.ringBurstUntil || 0) <= nowMs &&
      satellite.userData.rebreakAt > 0 &&
      nowMs >= satellite.userData.rebreakAt
    ) {
      satellite.userData.damaged = true;
      satellite.userData.repairProgress = 0;
      satellite.userData.rebreakAt =
        nowMs +
        (SATELLITE_TUNING.rebreakMinMs +
          Math.random() *
            (SATELLITE_TUNING.rebreakMaxMs - SATELLITE_TUNING.rebreakMinMs));

      const body = satellite.children[0];
      if (body && body.material) {
        body.material.emissive = new THREE.Color(satellite.userData.baseColor || 0xffffff);
        body.material.emissiveIntensity = 0.2;
      }

      const beacon = satellite.userData.beacon;
      if (beacon?.material) {
        beacon.material.color.setHex(0xff6666);
        beacon.material.emissive.setHex(0xff2a2a);
        beacon.material.emissiveIntensity = 1.2;
        beacon.scale.setScalar(1);
      }
    }
    updateSatelliteTransform(satellite);
    updateSatelliteGuide(satellite);
    updateSatelliteBeacon(satellite, performance.now() * 0.001);
    checkSatelliteDebrisProximity(satellite, debris);
  }

  if (debris?.userData?.spottedFlashTime > 0) {
    debris.userData.spottedFlashTime -= dt;
  }
}

export function checkSatelliteCollisions(player, satellites) {
  if (!player || !Array.isArray(satellites)) return null;

  for (const satellite of satellites) {
    const hitDistance =
      (satellite.userData.collisionRadius || 1) +
      SATELLITE_TUNING.collisionBuffer;
    if (player.position.distanceTo(satellite.position) <= hitDistance) {
      return satellite;
    }
  }

  return null;
}

export function updateSatelliteRepairs(player, playerState, satellites, dt) {
  if (!player || !Array.isArray(satellites)) return null;

  let repairedSatellite = null;

  for (const sat of satellites) {
    const nowMs = performance.now();
    const hasRingBurst = (sat.userData.ringBurstUntil || 0) > nowMs;
    const ring = sat.userData.targetRing;
    const ringVisible = !!ring?.children?.some(
      (child) => child.material && child.material.opacity > 0.001,
    );
    if (!sat.userData.damaged && !hasRingBurst && !ringVisible) continue;

    const distance = player.position.distanceTo(sat.position);
    const tangent = getSatelliteTangent(sat);
    const rawAlignment = Math.abs(playerState.forward.dot(tangent));
    const snapThreshold = Math.max(0.94, (sat.userData.repairAlignment || 0.8) + 0.1);
    const alignment = rawAlignment >= snapThreshold ? 1 : rawAlignment;

    // Target ring logic: visibility and color
    const showDist = (sat.userData.repairDistance || 0) * 2.2;
    const inShowRange = distance <= showDist;

    const inWindow =
      distance <= sat.userData.repairDistance &&
      alignment >= sat.userData.repairAlignment;

    const label = sat.userData.repairLabel;
    const labelCtx = sat.userData.repairLabelCtx;
    const labelTexture = sat.userData.repairLabelTexture;
    const repairPct = Math.round(
      THREE.MathUtils.clamp(
        (sat.userData.repairProgress || 0) /
          Math.max(0.0001, sat.userData.repairTime || 1),
        0,
        1,
      ) * 100,
    );

    if (label && labelCtx && labelTexture) {
      const labelOpacityTarget = inShowRange && sat.userData.damaged ? 1 : 0;
      label.material.opacity = THREE.MathUtils.lerp(
        label.material.opacity,
        labelOpacityTarget,
        0.14,
      );
      label.visible = label.material.opacity > 0.01;

      labelCtx.clearRect(0, 0, 384, 128);

      if (label.visible) {
        labelCtx.textAlign = "center";
        labelCtx.textBaseline = "middle";

        labelCtx.fillStyle = "rgba(0, 0, 0, 0.45)";
        labelCtx.fillRect(24, 18, 336, 92);

        labelCtx.font = "bold 28px monospace";
        labelCtx.fillStyle = inWindow
          ? "rgba(120,255,160,0.98)"
          : "rgba(255,230,120,0.96)";
        labelCtx.fillText(
          inWindow ? "REPAIR: ENGAGED" : "REPAIR: APPROACH",
          192,
          46,
        );

        labelCtx.font = "bold 26px monospace";
        labelCtx.fillStyle = "rgba(255,245,160,0.98)";
        labelCtx.fillText(`RPR: ${repairPct}%`, 192, 82);
      }

      labelTexture.needsUpdate = true;
    }

    if (ring) {
      const burstRemaining = Math.max(
        0,
        (sat.userData.ringBurstUntil || 0) - nowMs,
      );
      const burstT =
        burstRemaining > 0 ? burstRemaining / SATELLITE_TUNING.ringBurstMs : 0;

      if (burstT > 0) {
        const glow = 0.35 + burstT * 0.95;
        const scale = 1 + (1 - burstT) * 0.42;

        for (const child of ring.children) {
          if (child.material) {
            child.material.opacity = glow * 1.0;
            child.material.color.setHex(0x44ff99);
          }
        }

        ring.scale.setScalar(scale);
      } else {
        ring.scale.setScalar(1);

        if (!sat.userData.damaged) {
          for (const child of ring.children) {
            if (child.material) {
              child.material.opacity = 0;
              child.material.color.setHex(0x44ff99);
            }
            if (child.computeLineDistances) {
              child.computeLineDistances();
            }
          }
        } else {
          const lockBlend = THREE.MathUtils.clamp(
            (alignment - 0.55) / Math.max(0.001, (sat.userData.repairAlignment || 0.8) - 0.55),
            0,
            1,
          );
          const isLocked = alignment >= (sat.userData.repairAlignment || 0.8);
          const targetOpacity = inShowRange ? 0.4 + lockBlend * 0.58 : 0.0;
          const color = isLocked
            ? new THREE.Color(0x9dffbf)
            : new THREE.Color().setHSL(0.02 + 0.21 * lockBlend, 0.9, 0.55);
          const targetScale = isLocked ? 0.96 : 1;

          ring.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.18);

          for (const child of ring.children) {
            if (child.material) {
              child.material.opacity = THREE.MathUtils.lerp(
                child.material.opacity,
                targetOpacity,
                isLocked ? 0.2 : 0.12,
              );
              child.material.color.copy(color);
            }
            if (child.computeLineDistances) {
              child.computeLineDistances();
            }
          }
        }
      }
    }

    if (sat.userData.repairActive && inWindow) {
      sat.userData.repairProgress += dt;
    } else {
      sat.userData.repairProgress = Math.max(
        0,
        sat.userData.repairProgress - dt * 0.6,
      );
    }

    // While repairing, boost the beacon slightly based on repair progress,
    // while still preserving the broken/repaired color logic from the beacon updater.
    const beacon = sat.userData.beacon;
    if (beacon && beacon.material) {
      const alpha = THREE.MathUtils.clamp(
        sat.userData.repairProgress / sat.userData.repairTime,
        0,
        1,
      );
      beacon.material.emissiveIntensity += alpha * 0.45;
    }

    if (sat.userData.repairProgress >= sat.userData.repairTime) {
      sat.userData.damaged = false;
      sat.userData.repairActive = false;
      sat.userData.repairProgress = 0;
      // completion feedback: tint body greener
      const body = sat.children[0];
      if (body && body.material) {
        body.material.emissive = new THREE.Color(0x55ff88);
        body.material.emissiveIntensity = 0.5;
      }
      const beacon = sat.userData.beacon;
      if (beacon?.material) {
        beacon.material.color.setHex(0x99ffcc);
        beacon.material.emissive.setHex(0x33ff88);
        beacon.material.emissiveIntensity = 1.35;
        beacon.scale.setScalar(1);
      }
      sat.userData.repairBurstUntil =
        performance.now() + SATELLITE_TUNING.repairBurstMs;
      sat.userData.ringBurstUntil =
        performance.now() + SATELLITE_TUNING.ringBurstMs;
      sat.userData.rebreakAt =
        performance.now() +
        (SATELLITE_TUNING.rebreakMinMs +
          Math.random() *
            (SATELLITE_TUNING.rebreakMaxMs - SATELLITE_TUNING.rebreakMinMs));
      if (sat.userData.repairLabel) {
        sat.userData.repairLabel.material.opacity = 0;
        sat.userData.repairLabel.visible = false;
      }
      if (sat.userData.collisionHalo) {
        sat.userData.collisionHalo.material.opacity = 0;
        sat.userData.collisionHalo.scale.setScalar(1);
      }
      if (sat.userData.warningLabel) {
        sat.userData.warningLabel.material.opacity = 0;
        sat.userData.warningLabel.visible = false;
      }
      repairedSatellite = sat;
    }
  }

  return repairedSatellite;
}
