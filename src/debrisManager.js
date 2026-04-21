import * as THREE from "three";
import { createDebris, updateDebris } from "./debris.js";
import { updateDebrisController } from "./debrisController.js";

export const DEBRIS_MANAGER_TUNING = {
  initialDebrisCount: 2,
  maxDebris: 3,
  respawnDelay: 6,
  testSpawnDistance: 6,
};

function addDebrisToScene(scene, debris) {
  if (!debris) return;

  scene.add(debris);

  if (debris.userData?.guideLine) {
    scene.add(debris.userData.guideLine);
  }
}

function removeDebrisFromScene(scene, debris) {
  if (!debris) return;

  if (debris.userData?.guideLine) {
    scene.remove(debris.userData.guideLine);
  }

  scene.remove(debris);
}

export function createDebrisManagerState() {
  return {
    debrisList: [],
    spawnTimer: 0,
    testSpawnIndex: 0,
    lastFrame: {
      attachedStarted: [],
      attachedEnded: [],
      disposedCount: 0,
      burnedCount: 0,
      disposalEvents: [],
    },
  };
}

export function spawnDebrisIntoManager({
  managerState,
  scene,
  planetRadius,
  options = {},
}) {
  if (!managerState || !scene) {
    return null;
  }

  if (managerState.debrisList.length >= DEBRIS_MANAGER_TUNING.maxDebris) {
    return null;
  }

  const debris = createDebris(planetRadius, options);

  // TEMP: Ensure all spawned debris are visible/tracked for testing
  debris.userData.tracked = true;
  debris.userData.revealed = true;
  debris.userData.trackTime = 999;

  managerState.debrisList.push(debris);
  addDebrisToScene(scene, debris);
  return debris;
}

export function initializeDebrisManager({
  managerState,
  scene,
  planetRadius,
  initialDebrisCount = DEBRIS_MANAGER_TUNING.initialDebrisCount,
}) {
  if (!managerState || !scene) {
    return managerState;
  }

  for (let i = 0; i < initialDebrisCount; i += 1) {
    spawnDebrisIntoManager({
      managerState,
      scene,
      planetRadius,
    });
  }

  return managerState;
}

export function spawnTestDebrisInFrontOfPlayer({
  managerState,
  scene,
  planetRadius,
  player,
  playerState,
}) {
  if (!managerState || !scene || !player || !playerState?.forward) {
    return null;
  }

  const spawnForward = playerState.forward.clone().normalize();
  const worldUp = player.position.clone().normalize();

  let lateral = new THREE.Vector3().crossVectors(spawnForward, worldUp);
  if (lateral.lengthSq() <= 0.0001) {
    lateral = new THREE.Vector3(1, 0, 0).cross(worldUp);
  }
  lateral.normalize();

  const spawnIndex = managerState.testSpawnIndex ?? 0;
  const lateralPattern = [-2.2, 0, 2.2];
  const lateralOffset = lateralPattern[spawnIndex % lateralPattern.length];
  const forwardOffset = DEBRIS_MANAGER_TUNING.testSpawnDistance + Math.floor(spawnIndex / lateralPattern.length) * 1.25;

  const spawnPosition = player.position
    .clone()
    .addScaledVector(spawnForward, forwardOffset)
    .addScaledVector(lateral, lateralOffset);
  const spawnRadius = spawnPosition.length();

  managerState.testSpawnIndex = spawnIndex + 1;

  const debris = spawnDebrisIntoManager({
    managerState,
    scene,
    planetRadius,
  });

  if (!debris) {
    return null;
  }

  debris.position.copy(spawnPosition);
  debris.userData.radius = spawnRadius;
  debris.userData.revealed = true;
  debris.userData.tracked = true;
  debris.userData.trackTime = 999;

  if (debris.userData.direction) {
    const spawnDirection = spawnForward
      .clone()
      .addScaledVector(lateral, lateralOffset * 0.08)
      .normalize();
    debris.userData.direction.copy(spawnDirection);
  }

  if (debris.userData.velocity) {
    debris.userData.velocity
      .copy(debris.userData.direction)
      .multiplyScalar(debris.userData.speed);
  }

  console.log("TEST DEBRIS SPAWNED", {
    position: debris.position.clone(),
    direction: debris.userData.direction?.clone() || null,
  });

  return debris;
}

export function updateDebrisManager({
  managerState,
  scene,
  player,
  playerState,
  planetRadius,
  dt,
  attachDebris,
  disposeDebris,
  updateDebrisStability,
  updateDebrisHeat,
  controlStrain,
  satellites,
  damageSatellite,
  addOrbitalRisk,
  onDebrisCascade,
}) {
  if (!managerState || !scene) {
    return managerState;
  }

  const frameEvents = {
    attachedStarted: [],
    attachedEnded: [],
    disposedCount: 0,
    burnedCount: 0,
    disposalEvents: [],
  };

  const recordDisposalEvent = (debris, reason = "disposed") => {
    const normalizedReason = reason || "disposed";

    frameEvents.disposalEvents.push({
      reason: normalizedReason,
      size: debris?.userData?.size ?? null,
      attached: !!debris?.userData?.attached,
      cascadeCount: debris?.userData?.cascadeCount ?? 0,
    });

    if (normalizedReason === "burned") {
      frameEvents.burnedCount += 1;
    }
  };

  const nextDebrisList = [];

  for (const debris of managerState.debrisList) {
    const wasAttached = !!debris?.userData?.attached;
    if (!debris?.userData?.active) {
      frameEvents.disposedCount += 1;
      recordDisposalEvent(debris, debris?.userData?.disposeReason ?? "disposed");
      removeDebrisFromScene(scene, debris);
      continue;
    }

    updateDebris(debris, dt, player);

    const updatedDebris = updateDebrisController({
      scene,
      debris,
      player,
      playerState,
      planetRadius,
      dt,
      createDebris,
      attachDebris,
      disposeDebris,
      updateDebrisStability,
      updateDebrisHeat,
      controlStrain,
      satellites,
      damageSatellite,
      addOrbitalRisk,
      onDebrisCascade,
    });

    const isAttached = !!updatedDebris?.userData?.attached;

    if (!wasAttached && isAttached && updatedDebris) {
      frameEvents.attachedStarted.push(updatedDebris);
    }

    if (wasAttached && !isAttached) {
      frameEvents.attachedEnded.push(debris);
    }

    if (!updatedDebris) {
      frameEvents.disposedCount += 1;
      recordDisposalEvent(debris, debris?.userData?.disposeReason ?? "disposed");
      if (wasAttached) {
        frameEvents.attachedEnded.push(debris);
      }
      removeDebrisFromScene(scene, debris);
      continue;
    }

    if (updatedDebris !== debris) {
      frameEvents.disposedCount += 1;
      recordDisposalEvent(debris, debris?.userData?.disposeReason ?? "disposed");
      if (wasAttached) {
        frameEvents.attachedEnded.push(debris);
      }

      removeDebrisFromScene(scene, debris);
      addDebrisToScene(scene, updatedDebris);
    }

    nextDebrisList.push(updatedDebris);
  }

  managerState.debrisList = nextDebrisList;

  if (managerState.debrisList.length < DEBRIS_MANAGER_TUNING.maxDebris) {
    managerState.spawnTimer += dt;

    if (managerState.spawnTimer >= DEBRIS_MANAGER_TUNING.respawnDelay) {
      spawnDebrisIntoManager({
        managerState,
        scene,
        planetRadius,
      });
      managerState.spawnTimer = 0;
    }
  } else {
    managerState.spawnTimer = 0;
  }

  managerState.lastFrame = frameEvents;
  return managerState;
}

export function getActiveDebrisCount(managerState) {
  if (!managerState?.debrisList) {
    return 0;
  }

  return managerState.debrisList.filter((debris) => debris?.userData?.active)
    .length;
}

export function getPrimaryTrackedDebris(managerState) {
  if (!managerState?.debrisList?.length) {
    return null;
  }

  return (
    managerState.debrisList.find(
      (debris) => debris?.userData?.active && debris?.userData?.tracked,
    ) ||
    managerState.debrisList.find((debris) => debris?.userData?.active) ||
    null
  );
}
