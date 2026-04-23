// Orbital Cleaner
// Copyright (c) 2026 Trei Feske
// Licensed under the MIT License

// Excuse the mess.
// Will circle back and refactor post game jam.

import * as THREE from "three";
import { createScene } from "./scene.js";
import { createPlanet, updatePlanet } from "./planet.js";
import { createSun, updateSun } from "./sun.js";
import { createSkybox, updateSkybox } from "./skybox.js";
import { createMoon, updateMoon } from "./moon.js";
import {
  createPlayer,
  createPlayerState,
  updatePlayer as updatePlayerSystem,
} from "./player.js";
import {
  createCameraState,
  updateCamera as updateCameraSystem,
} from "./cameraController.js";
import { createStation, updateStation } from "./station.js";
import {
  createTrajectoryState,
  initializeTrajectoryState,
  updateTrail as updateTrailSystem,
  updateTrajectoryGuide as updateTrajectoryGuideSystem,
} from "./trajectory.js";
import { createHud, drawOrbitalHud, drawRadar } from "./hud.js";
import {
  drawTerminalUi,
  clearTerminalUi,
  buildUpgradeTerminalData,
  skipTerminalTypewriter,
  isTerminalTypewriterComplete,
} from "./terminalUi.js";
import { updateScan as updateScanSystem, selectPrimaryDebris } from "./scan.js";
import {
  createFuelState,
  updateFuelSystem,
  canBoost,
  refuelFuelState,
} from "./fuelSystem.js";
import {
  createSessionStats,
  createShiftState,
  createUpgradeState,
  buildUpgradeOptions,
  setTerminalMode,
  tryApplyTerminalUpgrade,
  updateStationTerminalState,
  closeShiftTerminal,
  buildShiftSummary,
  updateSessionRunContext,
} from "./shiftSystem.js";
import {
  setDebrisTracked,
  updateDebrisTracking,
  updateDebrisInterceptChance,
  updateDebrisThreatLevel,
  attachDebris,
  disposeDebris,
  updateDebrisStability,
  updateDebrisHeat,
  detachDebris,
} from "./debris.js";
import {
  createDebrisManagerState,
  initializeDebrisManager,
  spawnTestDebrisInFrontOfPlayer as spawnTestDebrisFromManager,
  updateDebrisManager,
  getActiveDebrisCount,
} from "./debrisManager.js";
import {
  createSatellites,
  updateSatellites,
  checkSatelliteCollisions,
  updateSatelliteRepairs,
  getSatelliteRepairCandidate,
} from "./satellites.js";
import {
  createEvaSystem,
  updateEvaSystem,
  onEvaDebrisAttached,
  onEvaDebrisReleased,
} from "./evaSystem.js";
import {
  createDamageState,
  resetDamageState,
  registerCrash,
  trackAtmosphereExposure,
  markFuelDepleted,
  buildDamageReport,
} from "./damageSystem.js";
import {
  createPlayerAccount,
  applyShiftSettlement,
  tryApplyGovernmentStipend,
  getAccountBalance,
  getAccountStatus,
} from "./playerAccount.js";
import { spawnFloatingText, updateFloatingTexts } from "./floatingText.js";
import {
  spawnBurnupExplosion,
  spawnSatelliteCrashEffect,
  updateEffects,
} from "./effects.js";
import { UI_STATE, setUIState, drawUI } from "./ui.js";
import {
  createMenuUI,
  setMenuVisible,
  toggleMenuVisible,
  setRadioState,
} from "./menuUI.js";
import { createMainMenu, showMainMenu, hideMainMenu } from "./mainMenu.js";
import { createTrainingMenu } from "./trainingMenu.js";
import {
  loadSound,
  playSound,
  startLoop,
  stopLoop,
  stopAllLoops,
  startAmbient,
} from "./sound.js";
import { startRadioStation, stopRadioStation } from "./radio.js";
import {
  configureComboSystem,
  updateComboSystem,
  registerComboEvent,
  resetComboSystem,
  consumeComboExpiredFlag,
  penalizeComboTimer,
} from "./comboSystem.js";
import { createMobileControls } from "./mobileControls.js";
import { createInputSystem } from "./input.js";
import {
  createKesslerSyndrome,
  updateKesslerSyndrome,
  getKesslerSpawnMultiplier,
  applyKesslerImpulse,
  getKesslerUIState,
} from "./kesslerSyndrome.js";

const { scene, camera, renderer } = createScene();

const SOUND_ASSETS = {
  repair: new URL("../assets/sfx/repair.ogg", import.meta.url).href,
  debris: new URL("../assets/sfx/debris.ogg", import.meta.url).href,
  crash: new URL("../assets/sfx/crash.ogg", import.meta.url).href,
  burnup: new URL("../assets/sfx/burnup.ogg", import.meta.url).href,
  burn: new URL("../assets/sfx/burn.ogg", import.meta.url).href,
  boost: new URL("../assets/sfx/boost.ogg", import.meta.url).href,
  beep: new URL("../assets/sfx/beep.ogg", import.meta.url).href,
  lowFuelVoice: new URL("../assets/sfx/lowfuel_voice.ogg", import.meta.url)
    .href,
  netpay: new URL("../assets/sfx/netpay.ogg", import.meta.url).href,
  netloss: new URL("../assets/sfx/netloss.ogg", import.meta.url).href,
  terminal: new URL("../assets/sfx/terminal.ogg", import.meta.url).href,
  bonusActive: new URL("../assets/sfx/bonus_active.ogg", import.meta.url).href,
  bonusExpired: new URL("../assets/sfx/bonus_expired.ogg", import.meta.url)
    .href,
  eva_deploy_air_release: new URL(
    "../assets/sfx/eva_deploy_air_release.ogg",
    import.meta.url,
  ).href,
  eva_repair_wrench_loop: new URL(
    "../assets/sfx/eva_repair_wrench_loop.ogg",
    import.meta.url,
  ).href,
};

const MUSIC_ASSETS = {
  spaceAmbience: new URL("../assets/music/Space-Ambience.ogg", import.meta.url)
    .href,
  deepSpace: new URL(
    "../assets/music/Deep-Space-Atmosphere.ogg",
    import.meta.url,
  ).href,
};

const UI_ASSETS = {
  menuLogo: new URL("../assets/ui/orbital-cleaner-logo.png", import.meta.url)
    .href,
  menuBadge: new URL("../assets/ui/orbital-cleaner-badge.png", import.meta.url)
    .href,
};

loadSound("repair", SOUND_ASSETS.repair, { volume: 0.72 });
loadSound("debris", SOUND_ASSETS.debris, { volume: 0.72 });
loadSound("crash", SOUND_ASSETS.crash, { volume: 0.78 });
loadSound("burnup", SOUND_ASSETS.burnup, { volume: 0.95 });
loadSound("burn", SOUND_ASSETS.burn, { loop: true, volume: 0.26 });
loadSound("boost", SOUND_ASSETS.boost, { loop: true, volume: 0.5 });
loadSound("beep", SOUND_ASSETS.beep, { loop: true, volume: 0.62 });
loadSound("lowFuelVoice", SOUND_ASSETS.lowFuelVoice, { volume: 0.78 });
loadSound("netpay", SOUND_ASSETS.netpay, { volume: 0.7 });
loadSound("netloss", SOUND_ASSETS.netloss, { volume: 0.7 });
loadSound("terminal", SOUND_ASSETS.terminal, { loop: true, volume: 0.3 });
loadSound("bonusActive", SOUND_ASSETS.bonusActive, { volume: 0.42 });
loadSound("bonusExpired", SOUND_ASSETS.bonusExpired, { volume: 0.36 });
loadSound("eva_deploy_air_release", SOUND_ASSETS.eva_deploy_air_release, {
  volume: 0.7,
});
loadSound("eva_repair_wrench_loop", SOUND_ASSETS.eva_repair_wrench_loop, {
  loop: true,
  volume: 0.5,
});

loadSound("spaceAmbience", MUSIC_ASSETS.spaceAmbience, {
  loop: true,
  volume: 0.2,
});
loadSound("deepSpace", MUSIC_ASSETS.deepSpace, {
  loop: true,
  volume: 0.38,
});

const planetRadius = 200;
const playerRadius = 0.1;
const startRadius = planetRadius + 10;
const minRadius = planetRadius + 6;
const maxRadius = planetRadius + 14;
const minThrottlePercent = 20;
const maxThrottlePercent = 80;
const throttleStepPerSecond = 28;
const baseForwardSpeed = 0.6;
const maxForwardSpeed = 0.82;
const speedLerp = 0.08;
const yawRate = 1.9;
const altitudeChangeRate = 8;
const altitudeLerp = 0.08;
const boostMultiplier = 1.65;
const cameraDistance = 9;
const cameraHeight = 3.2;
const cameraFollowLerp = 0.08;
const cameraLookLerp = 0.12;
const cameraTargetLerp = 0.14;
const shipAlignLerp = 0.14;
const forwardLookDistance = 14;
const forwardDriftBlend = 0.06;

const keys = {};
const inputSystem = createInputSystem();
const mobileControls = createMobileControls(keys);
const controllerEdgeState = { enter: false, escape: false };

const MISSION_FOCUS_ORDER = ["REPAIR", "DEBRIS", "OPEN"];

const DIFFICULTY_PRESETS = {
  TRAINING_SHIFT: {
    id: "TRAINING_SHIFT",
    label: "Training Shift",
    kessler: {
      safeFunctionalThreshold: 1,
    },
  },
  CERTIFIED: {
    id: "CERTIFIED",
    label: "Certified",
    kessler: {
      safeFunctionalThreshold: 2,
    },
  },
  HAZARD_DUTY: {
    id: "HAZARD_DUTY",
    label: "Hazard Duty",
    kessler: {
      safeFunctionalThreshold: 3,
    },
  },
  ZERO_TOLERANCE: {
    id: "ZERO_TOLERANCE",
    label: "Zero Tolerance",
    kessler: {
      safeFunctionalThreshold: (satellites) => satellites.length,
    },
  },
};

let activeDifficulty = DIFFICULTY_PRESETS.TRAINING_SHIFT;

const PRESSURE_CONFIG = {
  orbitalRiskGainPerDebrisPerSecond: 2.2,
  serviceBacklogGainPerDamagedSatPerSecond: 1.6,
  passiveRiskDecayPerSecond: 0.18,
  passiveBacklogDecayPerSecond: 0.08,
  debrisDisposeRiskReduction: 16,
  repairBacklogReduction: 12,
  maxValue: 100,
};

const STATION_TERMINAL_TRIGGER_DISTANCE = 9;
const STATION_TERMINAL_REARM_DISTANCE = 18;
const DEBRIS_AUTO_FOCUS_DISTANCE = 8;
const UPGRADE_KEYS = ["1", "2", "3"];
const RESPAWN_DELAY_SECONDS = 0.55;

const COMBO_CONFIG = {
  chainWindow: 10,
  bonusPerStep: 0.15,
  maxMultiplier: 2.5,
};

const pauseState = {
  paused: false,
};

const kesslerDifficultyConfig = {
  ...activeDifficulty.kessler,
};

const kesslerSyndrome = createKesslerSyndrome(kesslerDifficultyConfig);

const appState = {
  started: false,
  bootReady: false,
  bootStartedAt: performance.now(),
};
let trainingMenuController = null;
let trainingOverlay = null;

function isTrainingOverlayVisible() {
  return !!trainingOverlay && trainingOverlay.style.display !== "none";
}

function ensureTrainingOverlay() {
  if (trainingOverlay) {
    return trainingOverlay;
  }

  const overlay = document.createElement("div");
  overlay.id = "training-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "180",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at center, rgba(8, 16, 28, 0.94) 0%, rgba(3, 7, 14, 0.985) 74%)",
    padding: "28px",
  });

  const panel = document.createElement("div");
  panel.id = "training-overlay-panel";
  Object.assign(panel.style, {
    width: "min(900px, 100%)",
    minHeight: "520px",
    borderRadius: "18px",
    border: "1px solid rgba(120, 220, 255, 0.24)",
    background: "rgba(6, 12, 20, 0.9)",
    boxShadow:
      "0 0 0 1px rgba(90, 190, 255, 0.08) inset, 0 24px 52px rgba(0,0,0,0.46)",
    color: "#d7f5ff",
    fontFamily: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
    padding: "26px 28px",
    display: "grid",
    gridTemplateColumns: "minmax(220px, 280px) 1fr",
    gap: "24px",
  });

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  trainingOverlay = overlay;
  return overlay;
}

function renderTrainingOverlay() {
  if (!trainingMenuController) {
    trainingMenuController = createTrainingMenu();
  }

  const overlay = ensureTrainingOverlay();
  const panel = overlay.querySelector("#training-overlay-panel");
  const data = trainingMenuController.render();

  const topicButtons = (data.sections || [])
    .map((section) => {
      const isActive = section.id === data.activeSectionId;
      const border = isActive
        ? "rgba(138, 222, 255, 0.82)"
        : "rgba(106, 165, 206, 0.34)";
      const background = isActive
        ? "linear-gradient(180deg, rgba(16, 32, 48, 0.97), rgba(8, 17, 27, 0.98))"
        : "linear-gradient(180deg, rgba(8, 16, 28, 0.94), rgba(6, 11, 18, 0.96))";
      const color = isActive
        ? "rgba(240, 250, 255, 0.98)"
        : "rgba(225, 242, 255, 0.9)";
      return `
        <button
          type="button"
          data-training-topic="${section.id}"
          style="
            width: 100%;
            text-align: left;
            padding: 12px 14px;
            border-radius: 12px;
            border: 1px solid ${border};
            background: ${background};
            color: ${color};
            font-family: inherit;
            font-size: 14px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            cursor: pointer;
          "
        >${section.title}</button>
      `;
    })
    .join("");

  panel.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px;">
      <div style="font-size:22px; font-weight:700; letter-spacing:0.1em; color:#8de8ff;">
        ${data.title}
      </div>
      <div style="font-size:12px; color:rgba(190, 222, 235, 0.82); letter-spacing:0.05em; line-height:1.5;">
        ${data.subtitle}
      </div>
      <div style="margin-top:10px; display:flex; flex-direction:column; gap:10px;">
        ${topicButtons}
      </div>
    </div>
    <div style="display:flex; flex-direction:column; min-height:100%;">
      <div style="font-size:24px; font-weight:700; letter-spacing:0.08em; color:#f3fbff; margin-bottom:12px;">
        ${data.sectionTitle}
      </div>
      <div style="font-size:14px; color:rgba(214, 238, 245, 0.9); line-height:1.7; max-width:560px; margin-bottom:18px;">
        ${data.description}
      </div>
      <div style="display:flex; align-items:flex-start; gap:18px; flex-wrap:wrap;">
        <div style="width:min(320px, 100%); border:1px solid rgba(106, 165, 206, 0.38); border-radius:14px; background:rgba(6, 12, 20, 0.82); padding:10px; box-shadow:0 0 0 1px rgba(90, 190, 255, 0.06) inset;">
          ${
            data.video
              ? `<video src="${data.video}" autoplay loop muted playsinline style="display:block; width:100%; border-radius:10px; background:#000;"></video>`
              : `<div style="height:180px; display:flex; align-items:center; justify-content:center; color:rgba(190,222,235,0.7);">NO TRAINING CLIP</div>`
          }
        </div>
        <div style="flex:1; min-width:220px; display:flex; flex-direction:column; gap:12px;">
          <div style="font-size:12px; color:rgba(200,255,200,0.9); letter-spacing:0.05em; line-height:1.6;">
            ${data.footer}
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:6px;">
            <button type="button" data-training-nav="prev" style="padding:10px 14px; border-radius:10px; border:1px solid rgba(106,165,206,0.34); background:rgba(8,16,28,0.94); color:rgba(225,242,255,0.92); font-family:inherit; cursor:pointer;">PREV</button>
            <button type="button" data-training-nav="next" style="padding:10px 14px; border-radius:10px; border:1px solid rgba(106,165,206,0.34); background:rgba(8,16,28,0.94); color:rgba(225,242,255,0.92); font-family:inherit; cursor:pointer;">NEXT</button>
            <button type="button" data-training-nav="back" style="padding:10px 14px; border-radius:10px; border:1px solid rgba(170,120,120,0.34); background:rgba(18,10,12,0.92); color:rgba(255,232,232,0.92); font-family:inherit; cursor:pointer;">BACK</button>
          </div>
        </div>
      </div>
    </div>
  `;

  panel.querySelectorAll("[data-training-topic]").forEach((button) => {
    button.addEventListener("click", () => {
      trainingMenuController.setActiveSection(button.dataset.trainingTopic);
      renderTrainingOverlay();
    });
  });

  panel.querySelectorAll("[data-training-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.trainingNav;
      if (action === "prev") {
        trainingMenuController.prev();
        renderTrainingOverlay();
        return;
      }
      if (action === "next") {
        trainingMenuController.next();
        renderTrainingOverlay();
        return;
      }
      if (action === "back") {
        hideTrainingOverlay();
      }
    });
  });
}

function showTrainingOverlay() {
  if (!trainingMenuController) {
    trainingMenuController = createTrainingMenu();
  }

  hideMainMenu();
  const overlay = ensureTrainingOverlay();
  overlay.style.display = "flex";
  renderTrainingOverlay();
}

function hideTrainingOverlay() {
  if (trainingOverlay) {
    trainingOverlay.style.display = "none";
  }
  showMainMenu();
}
const BOOT_MIN_DURATION_MS = 950;
const BOOT_MESSAGE_INTERVAL_MS = 320;
const BOOT_MESSAGES = [
  "INITIALIZING SYSTEMS...",
  "SYNCING ORBITAL DATA...",
  "VERIFYING SHIFT STATUS...",
  "LOADING SANITATION CONTRACTS...",
];

function createBootOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "boot-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "120",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at center, rgba(8, 16, 28, 0.92) 0%, rgba(3, 7, 14, 0.98) 72%)",
    pointerEvents: "none",
  });

  const overlayPanel = document.createElement("div");
  Object.assign(overlayPanel.style, {
    minWidth: "340px",
    maxWidth: "560px",
    padding: "18px 22px",
    border: "1px solid rgba(120, 220, 255, 0.35)",
    borderRadius: "14px",
    background: "rgba(6, 12, 20, 0.88)",
    boxShadow:
      "0 0 0 1px rgba(90, 190, 255, 0.08) inset, 0 18px 40px rgba(0,0,0,0.45)",
    color: "#d7f5ff",
    fontFamily: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
    letterSpacing: "0.06em",
  });

  const title = document.createElement("div");
  title.textContent = "ORBITAL CLEANER";
  Object.assign(title.style, {
    fontSize: "14px",
    fontWeight: "700",
    marginBottom: "10px",
    color: "#8de8ff",
  });

  const message = document.createElement("div");
  message.textContent = BOOT_MESSAGES[0];
  Object.assign(message.style, {
    fontSize: "13px",
    fontWeight: "600",
    color: "#f3fbff",
  });

  const subline = document.createElement("div");
  subline.textContent = "LOW ORBIT SANITATION DIVISION";
  Object.assign(subline.style, {
    marginTop: "12px",
    fontSize: "11px",
    opacity: "0.78",
    color: "#9ecedf",
  });

  overlayPanel.appendChild(title);
  overlayPanel.appendChild(message);
  overlayPanel.appendChild(subline);
  overlay.appendChild(overlayPanel);
  document.body.appendChild(overlay);

  return { overlay, message };
}

const bootOverlay = createBootOverlay();

function updateBootOverlay() {
  const elapsed = performance.now() - appState.bootStartedAt;
  const messageIndex = Math.min(
    BOOT_MESSAGES.length - 1,
    Math.floor(elapsed / BOOT_MESSAGE_INTERVAL_MS),
  );

  bootOverlay.message.textContent = BOOT_MESSAGES[messageIndex];
}

function finishBootSequence() {
  if (appState.bootReady) {
    return;
  }

  appState.bootReady = true;
  if (bootOverlay?.overlay) {
    bootOverlay.overlay.style.display = "none";
  }

  showMainMenu();
  setUIState(UI_STATE.MENU);
}

const audioState = {
  lowFuelVoicePlayed: false,
};

const terminalAudioState = {
  settlementCuePlayed: false,
};

const comboPenaltyState = {
  atmospherePenaltyArmed: true,
  repairMissPenaltyArmed: true,
};

let selectedPrimaryDebris = null;
let comboLastTimestamp = null;

const shipMenuState = {
  open: false,
  radioEnabled: true,
  radioTrack: "Prosperity Radio",
  spaceTrack: "deepSpace",
  audioStarted: false,
};

function ensureBackgroundAudioStarted() {
  if (shipMenuState.audioStarted) return;

  startAmbient("spaceAmbience");

  if (shipMenuState.radioEnabled) {
    startRadioStation();
  }

  shipMenuState.audioStarted = true;
}

function handleMobilePauseRequest() {
  if (!appState.started) {
    return;
  }

  ensureBackgroundAudioStarted();

  if (!shiftState.terminalOpen) {
    pauseState.paused = !pauseState.paused;
    setUIState(pauseState.paused ? UI_STATE.PAUSED : UI_STATE.GAME);
  }
}

function handleConfirmRequest() {
  if (!appState.started) {
    return;
  }

  if (!shiftState.terminalOpen) {
    return;
  }

  skipTerminalTypewriter();
  stopLoop("terminal");

  if (shiftState._justSkippedTyping) {
    shiftState._justSkippedTyping = false;
    return;
  }

  if (shiftState.terminalMode === "summary") {
    setTerminalMode(shiftState, "upgrade");
    shiftState.terminalData = buildUpgradeTerminalData(
      buildUpgradeOptions(playerUpgrades),
    );
  } else {
    closeShiftTerminalFlow();
  }
}

function syncRadioState() {
  if (shipMenuState.radioEnabled) {
    stopLoop("deepSpace");
    startRadioStation();
  } else {
    stopRadioStation();
    startLoop("deepSpace");
  }

  setRadioState({
    enabled: shipMenuState.radioEnabled,
    radioTrack: shipMenuState.radioTrack,
    spaceTrack: shipMenuState.spaceTrack,
  });
}

window.addEventListener("keydown", (e) => {
  const key = typeof e.key === "string" ? e.key.toLowerCase() : "";
  keys[key] = true;
  keys[e.code] = true;
  if (isTrainingOverlayVisible()) {
    if (!e.repeat && e.code === "Escape") {
      hideTrainingOverlay();
      return;
    }

    if (!e.repeat && e.code === "ArrowLeft") {
      trainingMenuController?.prev();
      renderTrainingOverlay();
      return;
    }

    if (!e.repeat && e.code === "ArrowRight") {
      trainingMenuController?.next();
      renderTrainingOverlay();
      return;
    }

    return;
  }

  if (!appState.started) {
    return;
  }

  ensureBackgroundAudioStarted();

  // Pause system
  if (!e.repeat && e.code === "Escape") {
    handleMobilePauseRequest();
    return;
  }
  if (!e.repeat && e.code === "Backquote") {
    if (!shiftState.terminalOpen) {
      shipMenuState.open = toggleMenuVisible();
      return;
    }
  }

  if (!e.repeat && key === "r") {
    shipMenuState.radioEnabled = !shipMenuState.radioEnabled;
    syncRadioState();
    return;
  }

  if (!e.repeat && (key === "m" || e.code === "KeyM")) {
    cycleMissionFocus();
  }

  // Manual release
  if (!e.repeat && (key === "f" || e.code === "KeyF")) {
    const primaryDebris = resolvePrimaryDebris();
    if (primaryDebris && primaryDebris.userData?.attached) {
      detachDebris(primaryDebris);
    }
    return;
  }

  // DELETE AFTER TESTING: Spawns debris directly in front of the player.
  if (!e.repeat && (key === "p" || e.code === "KeyP")) {
    spawnTestDebrisInFrontOfPlayer();
    return;
  }

  if (shiftState.terminalOpen && UPGRADE_KEYS.includes(key)) {
    const appliedUpgrade = tryApplyTerminalUpgrade({
      key,
      shiftState,
      upgradeState: playerUpgrades,
      playerConfig,
      playerHeatState,
      playerHeatConfig,
      satellites,
    });

    if (appliedUpgrade) {
      console.log("UPGRADE APPLIED", {
        key,
        appliedUpgrade,
        playerUpgrades: { ...playerUpgrades },
      });
      closeShiftTerminalFlow();
      return;
    }
  }
  if (
    shiftState.terminalOpen &&
    (e.code === "Enter" || e.code === "NumpadEnter")
  ) {
    handleConfirmRequest();
    return;
  }
});

window.addEventListener("keyup", (e) => {
  const key = typeof e.key === "string" ? e.key.toLowerCase() : "";
  keys[key] = false;
  keys[e.code] = false;
});

createMenuUI({
  radioEnabled: shipMenuState.radioEnabled,
  currentRadioTrack: shipMenuState.radioTrack,
  currentSpaceTrack: shipMenuState.spaceTrack,
});
mobileControls.setPauseHandler(handleMobilePauseRequest);

if (!shipMenuState.radioEnabled) {
  startLoop("deepSpace");
}

const planet = createPlanet(scene, planetRadius);
const sun = createSun(scene);
const moon = createMoon(scene);
createSkybox(scene);

const player = createPlayer(playerRadius, startRadius);
scene.add(player);
const evaSystem = createEvaSystem(scene, player.userData.ship);

const playerState = createPlayerState(startRadius, baseForwardSpeed);
playerState.throttlePercent = 50;

const playerConfig = {
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

  // Orbit + ellipse tuning
  highOrbitMaxRadius: maxRadius + 6,
  transferOrbitMaxRadius: maxRadius + 12,
  highOrbitTurnBonus: 0.18,
  highOrbitSpeedPenalty: 0.24,
  transferOrbitSpeedPenalty: 0.16,
  lowOrbitSpeedBonus: 0.08,
  ellipticalThresholdRadius: maxRadius + 6.75,
  ellipticalBuildRate: 0.16,
  ellipticalDecayRate: 0.3,
  transferOrbitEllipseBuildMultiplier: 2.25,
  maxEllipseAmplitude: Math.max(1.6, (maxRadius + 12 - (maxRadius + 6)) * 0.95),
};

const cameraState = createCameraState();

const cameraConfig = {
  cameraDistance,
  cameraHeight,
  cameraFollowLerp,
  cameraLookLerp,
  cameraTargetLerp,
  forwardLookDistance,
};

const station = createStation(planetRadius);
scene.add(station);

if (station.userData.orbitRing) {
  scene.add(station.userData.orbitRing);
}

if (station.userData.guideLine) {
  scene.add(station.userData.guideLine);
}

const debrisManagerState = createDebrisManagerState();
initializeDebrisManager({
  managerState: debrisManagerState,
  scene,
  planetRadius,
});

function spawnTestDebrisInFrontOfPlayer() {
  spawnTestDebrisFromManager({
    managerState: debrisManagerState,
    scene,
    planetRadius,
    player,
    playerState,
  });
}

function resolvePrimaryDebris(previousTarget = selectedPrimaryDebris) {
  const primaryDebris = selectPrimaryDebris({
    debrisList: debrisManagerState.debrisList,
    player,
    playerState,
    previousTarget,
  });

  selectedPrimaryDebris = primaryDebris;
  player.userData.primaryTargetDebris = primaryDebris ?? null;
  return primaryDebris;
}

const satellites = createSatellites(scene);
for (const satellite of satellites) {
  if (satellite?.userData) {
    satellite.userData.baseRepairTime = satellite.userData.repairTime;
  }
}
// Mission state
let score = 0;
let shiftEarnings = 0;
let shiftBonusPay = 0;
let mission = {
  type: "OPEN",
  status: "ACTIVE",
};
let activeRepairSatellite = null;
let orbitalRisk = 0;
let serviceBacklog = 0;
const shiftState = createShiftState();
const sessionStats = createSessionStats();
const damageState = createDamageState();
const playerAccount = createPlayerAccount();
const fuelState = createFuelState({
  max: 100,
  lowThreshold: 25,
});

const fuelConfig = {
  baseDrainPerSecond: 0.22,
  boostDrainPerSecond: 0.42,
};

const playerUpgrades = createUpgradeState();
const respawnState = {
  timer: 0,
  pending: false,
};

setTerminalMode(shiftState, "summary");

function stopGameplayLoops() {
  stopLoop("boost");
  stopLoop("burn");
  stopLoop("beep");
}

function syncGameplayAudio({
  isBoosting = false,
  inAtmosphere = false,
  fuelAmount = 100,
}) {
  if (isBoosting) {
    startLoop("boost");
  } else {
    stopLoop("boost");
  }

  if (inAtmosphere) {
    startLoop("burn");
  } else {
    stopLoop("burn");
  }

  if (typeof fuelAmount === "number" && fuelAmount <= 10) {
    startLoop("beep");
  } else {
    stopLoop("beep");
  }

  if (typeof fuelAmount === "number" && fuelAmount <= 20) {
    if (!audioState.lowFuelVoicePlayed) {
      playSound("lowFuelVoice");
      audioState.lowFuelVoicePlayed = true;
    }
  } else {
    audioState.lowFuelVoicePlayed = false;
  }
}

function triggerRespawnDelay() {
  respawnState.timer = RESPAWN_DELAY_SECONDS;
  respawnState.pending = true;
  playerState.velocity.set(0, 0, 0);
  stopGameplayLoops();
}

function closeShiftTerminalFlow() {
  setTerminalMode(shiftState, "summary");
  closeShiftTerminal({
    shiftState,
    sessionStats,
    refuel: () => refuelFuelState(fuelState),
    clearTerminalUi,
  });
  terminalAudioState.settlementCuePlayed = false;
  stopLoop("terminal");
  stopGameplayLoops();
  syncRadioState();
  shiftEarnings = 0;
  shiftBonusPay = 0;
  resetDamageState(damageState);
  resetComboSystem();

  comboPenaltyState.atmospherePenaltyArmed = true;
  comboPenaltyState.repairMissPenaltyArmed = true;
}

function cycleMissionFocus() {
  const currentIndex = MISSION_FOCUS_ORDER.indexOf(mission.type);
  const nextIndex = (currentIndex + 1) % MISSION_FOCUS_ORDER.length;
  mission.type = MISSION_FOCUS_ORDER[nextIndex];
  mission.status = "ACTIVE";
  console.log("MISSION FOCUS", mission.type);
}

function setMissionFocus(type) {
  if (!MISSION_FOCUS_ORDER.includes(type)) return;
  mission.type = type;
  mission.status = "ACTIVE";
  console.log("MISSION FOCUS", mission.type);
}

function addOrbitalRisk(amount = 0) {
  orbitalRisk = THREE.MathUtils.clamp(
    orbitalRisk + amount,
    0,
    PRESSURE_CONFIG.maxValue,
  );
}

function damageSatellite(satellite, context = {}) {
  if (!satellite?.userData) return;

  satellite.userData.damaged = true;
  satellite.userData.repairActive = false;
  satellite.userData.repairProgress = 0;

  if (typeof satellite.userData.baseRepairTime === "number") {
    satellite.userData.repairTime = satellite.userData.baseRepairTime;
  }

  console.log("SATELLITE DAMAGED", {
    satelliteId: satellite.uuid,
    source: context.source || "unknown",
    debrisSize: context.debrisSize || null,
  });
}

// HUD + RADAR STATE
const scanRadius = 26;

const hud = createHud();

// Player-side repair alignment ring
const repairAssistRing = new THREE.Mesh(
  new THREE.RingGeometry(0.85, 0.98, 48),
  new THREE.MeshBasicMaterial({
    color: 0xff5555,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
);
repairAssistRing.renderOrder = 20;
scene.add(repairAssistRing);

const repairAssistTempForward = new THREE.Vector3();
const repairAssistTempPos = new THREE.Vector3();
const repairAssistBaseNormal = new THREE.Vector3(0, 0, 1);

const trajectoryState = createTrajectoryState(200, 96);
scene.add(trajectoryState.trailLine);
scene.add(trajectoryState.guideLine);

const trajectoryConfig = {
  minRadius,
  maxRadius,
  yawRate,
  altitudeChangeRate,
  boostMultiplier,
  baseForwardSpeed,
  maxForwardSpeed,
  speedLerp,
  forwardDriftBlend,

  // Orbit + ellipse tuning (must match playerConfig)
  highOrbitMaxRadius: maxRadius + 6,
  transferOrbitMaxRadius: maxRadius + 12,
  highOrbitTurnBonus: 0.18,
  highOrbitSpeedPenalty: 0.24,
  transferOrbitSpeedPenalty: 0.16,
  lowOrbitSpeedBonus: 0.08,
  ellipticalThresholdRadius: maxRadius + 6.75,
  ellipticalBuildRate: 0.16,
  ellipticalDecayRate: 0.3,
  transferOrbitEllipseBuildMultiplier: 2.25,
  maxEllipseAmplitude: Math.max(1.6, (maxRadius + 12 - (maxRadius + 6)) * 0.95),
};

const burnRadius = planetRadius + 7;
const playerHeatState = {
  heat: 0,
  maxHeat: 4.5,
  warning: false,
  critical: false,
};
const playerHeatConfig = {
  heatGainPerSecond: 0.58,
  heatCoolPerSecond: 0.7,
};

cameraState.smoothedLookTarget.copy(player.position);
cameraState.smoothedCameraTarget.copy(player.position);
cameraState.smoothedCameraUp.copy(player.position.clone().normalize());

initializeTrajectoryState(trajectoryState, player.position);

const clock = new THREE.Clock();
configureComboSystem(COMBO_CONFIG);

function startGameFromMainMenu() {
  if (appState.started) return;

  appState.started = true;
  hideTrainingOverlay();
  hideMainMenu();
  setUIState(UI_STATE.GAME);
  pauseState.paused = false;
  shipMenuState.open = false;
  setMenuVisible(false);
  ensureBackgroundAudioStarted();
}

function showPlaceholderMenuPanel(label) {
  console.log(`${label} menu option selected. Wire this panel next.`);
}

createMainMenu({
  logoSrc: UI_ASSETS.menuLogo,
  logoAlt: "Orbital Cleaner",
  badgeSrc: UI_ASSETS.menuBadge,
  badgeAlt: "Orbital Cleaner badge",
  kickerText: "Low Orbit Sanitation Division",
  subtitleText: "Return to shift and restore low orbit",
  footerText: "Arrow Keys / W S / Q E Navigate   Enter Select",
  selectedDifficultyId: activeDifficulty.id,
  onDifficultyChange: (difficultyId) => {
    const selectedDifficulty = DIFFICULTY_PRESETS[difficultyId];
    if (!selectedDifficulty) {
      return;
    }

    activeDifficulty = selectedDifficulty;
    console.log("DIFFICULTY CHANGED:", selectedDifficulty.label);
  },
  onStart: startGameFromMainMenu,
  onTraining: showTrainingOverlay,
  onSettings: () => showPlaceholderMenuPanel("Settings"),
  onCredits: () => showPlaceholderMenuPanel("Credits"),
});

setUIState(UI_STATE.MENU);

function updateThrottle(dt) {
  if (keys["arrowup"] || keys["KeyE"] || keys["e"]) {
    playerState.throttlePercent = Math.min(
      maxThrottlePercent,
      playerState.throttlePercent + throttleStepPerSecond * dt,
    );
  }

  if (keys["arrowdown"] || keys["KeyQ"] || keys["q"]) {
    playerState.throttlePercent = Math.max(
      minThrottlePercent,
      playerState.throttlePercent - throttleStepPerSecond * dt,
    );
  }
}

function updatePlayerHeat(dt) {
  if (playerState.radiusCurrent < burnRadius) {
    playerHeatState.heat = Math.min(
      playerHeatState.maxHeat,
      playerHeatState.heat + dt * playerHeatConfig.heatGainPerSecond,
    );
  } else {
    playerHeatState.heat = Math.max(
      0,
      playerHeatState.heat - dt * playerHeatConfig.heatCoolPerSecond,
    );
  }

  playerHeatState.warning = playerHeatState.heat >= 1.5;
  playerHeatState.critical = playerHeatState.heat >= 3.5;

  if (player.material) {
    if (playerHeatState.critical) {
      player.material.color.setHex(0xff8844);
    } else if (playerHeatState.warning) {
      player.material.color.setHex(0xff6644);
    } else {
      player.material.color.setHex(0xff4444);
    }
  }

  if (playerHeatState.heat >= playerHeatState.maxHeat) {
    console.log("Player overheated in atmosphere!");
    playerHeatState.heat = 0;
    playerHeatState.warning = false;
    playerHeatState.critical = false;
    if (player.material) {
      player.material.color.setHex(0xff4444);
    }
    return true;
  }

  return false;
}
function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const rawDt =
    comboLastTimestamp == null ? 0 : (now - comboLastTimestamp) / 1000;

  comboLastTimestamp = now;

  const dt = Math.min(clock.getDelta(), 0.05);

  inputSystem.pollGamepad();
  inputSystem.applyVirtualStateToKeys(keys);

  const controllerVirtualState = inputSystem.virtualState;
  const controllerEnterPressed =
    !!controllerVirtualState.Enter && !controllerEdgeState.enter;
  const controllerEscapePressed =
    !!controllerVirtualState.Escape && !controllerEdgeState.escape;

  controllerEdgeState.enter = !!controllerVirtualState.Enter;
  controllerEdgeState.escape = !!controllerVirtualState.Escape;

  if (!appState.bootReady) {
    stopGameplayLoops();
    updateBootOverlay();
    drawUI(UI_STATE.MENU);
    comboLastTimestamp = null;
    renderer.render(scene, camera);

    if (performance.now() - appState.bootStartedAt >= BOOT_MIN_DURATION_MS) {
      finishBootSequence();
    }

    return;
  }

  if (!appState.started) {
    stopGameplayLoops();
    drawUI(UI_STATE.MENU);
    comboLastTimestamp = null;
    renderer.render(scene, camera);
    return;
  }

  if (controllerEscapePressed) {
    handleMobilePauseRequest();
  }

  if (controllerEnterPressed) {
    handleConfirmRequest();
  }

  const activeDebrisCount = getActiveDebrisCount(debrisManagerState);
  console.log("ACTIVE DEBRIS COUNT:", activeDebrisCount);
  const totalSatelliteCount = satellites.length;
  const damagedSatelliteCount = satellites.reduce(
    (count, satellite) => count + (satellite?.userData?.damaged ? 1 : 0),
    0,
  );
  const functionalSatelliteCount = Math.max(
    0,
    totalSatelliteCount - damagedSatelliteCount,
  );

  const resolvedSafeFunctionalThreshold =
    typeof activeDifficulty.kessler.safeFunctionalThreshold === "function"
      ? activeDifficulty.kessler.safeFunctionalThreshold(satellites)
      : activeDifficulty.kessler.safeFunctionalThreshold;

  kesslerSyndrome.config.safeFunctionalThreshold =
    resolvedSafeFunctionalThreshold;

  updateKesslerSyndrome(kesslerSyndrome, {
    functionalSatellites: functionalSatelliteCount,
    totalSatellites: totalSatelliteCount,
    unrepairedSatellites: damagedSatelliteCount,
    activeDebrisCount,
    dt,
  });

  updateSessionRunContext(sessionStats, {
    kesslerMeter: getKesslerUIState(kesslerSyndrome).meter,
    activeDebrisCount,
  });

  const kesslerSpawnMultiplier = getKesslerSpawnMultiplier(kesslerSyndrome);

  if (pauseState.paused) {
    // Render current frame but do not update game state
    stopGameplayLoops();
    drawUI(UI_STATE.PAUSED);
    comboLastTimestamp = null;
    renderer.render(scene, camera);
    return;
  }
  if (shipMenuState.open) {
    stopGameplayLoops();
    drawUI(UI_STATE.GAME);
    comboLastTimestamp = null;
    renderer.render(scene, camera);
    return;
  }

  drawUI(UI_STATE.GAME);
  let primaryDebris = resolvePrimaryDebris();

  const comboExpired = updateComboSystem(rawDt);
  if (comboExpired && consumeComboExpiredFlag()) {
    playSound("bonusExpired");
    spawnFloatingText(scene, player.position, "BONUS EXPIRED", player);
  }

  const stationDistance = player.position.distanceTo(station.position);
  const wasTerminalOpen = shiftState.terminalOpen;

  updateStationTerminalState({
    shiftState,
    stationDistance,
    triggerDistance: STATION_TERMINAL_TRIGGER_DISTANCE,
    rearmDistance: STATION_TERMINAL_REARM_DISTANCE,
    sessionStats,
    buildSummary: (stats) => {
      const summary = buildShiftSummary(stats);
      const damageReport = buildDamageReport(damageState);
      summary.damageReport = damageReport;
      summary.bonusPay = shiftBonusPay;
      summary.netPay =
        (summary.netPay ?? 0) - (damageReport.totalDamageCost ?? 0);
      return summary;
    },
  });

  if (!wasTerminalOpen && shiftState.terminalOpen) {
    setTerminalMode(shiftState, "summary");
    terminalAudioState.settlementCuePlayed = false;
    startLoop("terminal");

    if (shiftState.terminalData) {
      const settlementResult = applyShiftSettlement(
        playerAccount,
        shiftState.terminalData.netPay ?? 0,
      );
      const stipendApplied = tryApplyGovernmentStipend(playerAccount);

      shiftState.terminalData = {
        ...shiftState.terminalData,
        settlementResult,
        stipendApplied,
        account: {
          credits: playerAccount.credits,
          debt: playerAccount.debt,
          balance: getAccountBalance(playerAccount),
          status: getAccountStatus(playerAccount),
          completedShifts: playerAccount.completedShifts,
          stipendAmount: playerAccount.stipendAmount,
        },
      };
      if (
        !terminalAudioState.settlementCuePlayed &&
        shiftState.terminalMode === "summary" &&
        isTerminalTypewriterComplete()
      ) {
        terminalAudioState.settlementCuePlayed = true;

        stopLoop("terminal");

        const net = shiftState.terminalData?.netPay ?? 0;

        if (net >= 0) {
          playSound("netpay");
        } else {
          playSound("netloss");
        }
      }
    }
  }

  if (shiftState.terminalOpen) {
    stopGameplayLoops();

    drawOrbitalHud(hud, {
      player,
      playerState,
      playerHeatState,
      fuelState,
      throttlePercent: playerState.throttlePercent,
      station,
      satellites,
      debris: primaryDebris,
      debrisList: debrisManagerState.debrisList,
      trajectoryState,
      mission,
      score,
      shiftEarnings,
      orbitalRisk,
      serviceBacklog,
      playerAccount,
    });
    drawRadar(hud, {
      player,
      playerState,
      station,
      satellites,
      debris: primaryDebris,
      debrisList: debrisManagerState.debrisList,
      scanRadius,
      fuelState,
      kesslerState: getKesslerUIState(kesslerSyndrome),
    });
    drawTerminalUi(hud, {
      terminalOpen: shiftState.terminalOpen,
      terminalData: shiftState.terminalData,
      terminalMode: shiftState.terminalMode,
    });
    comboLastTimestamp = null;
    renderer.render(scene, camera);
    return;
  }

  if (respawnState.pending) {
    stopGameplayLoops();
    respawnState.timer -= dt;

    if (respawnState.timer <= 0) {
      respawnState.pending = false;
      respawnState.timer = 0;
      player.position.set(0, 0, playerState.radiusCurrent);
      playerState.velocity.set(0, 0, 0);
      comboPenaltyState.atmospherePenaltyArmed = true;
      comboPenaltyState.repairMissPenaltyArmed = true;
    }

    updatePlanet(planet, dt);
    updateSun(sun, dt, camera);
    updateMoon(moon, dt);
    updateSkybox(dt, camera);
    updateStation(station, dt);
    updateDebrisManager({
      managerState: debrisManagerState,
      scene,
      player,
      playerState,
      planetRadius,
      dt,
      kesslerSpawnMultiplier,
      attachDebris,
      disposeDebris,
      updateDebrisStability,
      updateDebrisHeat,
      controlStrain: {
        isTurningInput: false,
        isThrottleChanging: false,
        isBoosting: false,
      },
      satellites,
      damageSatellite,
      addOrbitalRisk,
      onDebrisCascade: ({ debris: cascadeDebris, satellite, riskIncrease }) => {
        spawnFloatingText(
          scene,
          satellite.position,
          `CASCADE RISK +${riskIncrease}`,
          player,
        );

        serviceBacklog = THREE.MathUtils.clamp(
          serviceBacklog + 10,
          0,
          PRESSURE_CONFIG.maxValue,
        );

        if (mission.type !== "DEBRIS") {
          setMissionFocus("DEBRIS");
        }

        console.log("DEBRIS CASCADE", {
          debrisSize: cascadeDebris?.userData?.size || null,
          satelliteId: satellite?.uuid || null,
          orbitalRisk,
          serviceBacklog,
        });
      },
    });
    primaryDebris = resolvePrimaryDebris(primaryDebris);
    updateSatellites(satellites, dt, primaryDebris);
    updateCameraSystem(camera, player, playerState, cameraState, cameraConfig);
    updateTrailSystem(trajectoryState, player.position, playerState.velocity);
    updateTrajectoryGuideSystem(
      trajectoryState,
      player.position,
      playerState,
      keys,
      trajectoryConfig,
    );
    drawOrbitalHud(hud, {
      player,
      playerState,
      playerHeatState,
      fuelState,
      throttlePercent: playerState.throttlePercent,
      station,
      satellites,
      debris: primaryDebris,
      debrisList: debrisManagerState.debrisList,
      trajectoryState,
      mission,
      score,
      shiftEarnings,
      orbitalRisk,
      serviceBacklog,
      playerAccount,
    });
    drawRadar(hud, {
      player,
      playerState,
      station,
      satellites,
      debris: primaryDebris,
      debrisList: debrisManagerState.debrisList,
      scanRadius,
      fuelState,
      kesslerState: getKesslerUIState(kesslerSyndrome),
    });
    updateEvaSystem(evaSystem, dt);
    updateFloatingTexts(dt);
    updateEffects(dt);
    renderer.render(scene, camera);
    return;
  }

  primaryDebris = resolvePrimaryDebris(primaryDebris);

  updateScanSystem({
    debrisList: debrisManagerState.debrisList,
    player,
    playerState,
    station,
    scanRadius,
    dt,
    setDebrisTracked,
    updateDebrisTracking,
    updateDebrisInterceptChance,
    updateDebrisThreatLevel,
  });

  const rawBoostInput = !!(
    keys["shift"] ||
    keys["Shift"] ||
    keys["ShiftLeft"] ||
    keys["ShiftRight"]
  );

  const boostAllowed = canBoost(fuelState);
  const isBoosting = rawBoostInput && boostAllowed;

  const isTurningInput = !!(
    keys["a"] ||
    keys["d"] ||
    keys["arrowleft"] ||
    keys["arrowright"] ||
    keys["ArrowLeft"] ||
    keys["ArrowRight"]
  );

  const isThrottleChanging = !!(
    keys["arrowup"] ||
    keys["arrowdown"] ||
    keys["ArrowUp"] ||
    keys["ArrowDown"]
  );

  const movementKeys = isBoosting
    ? keys
    : {
        ...keys,
        shift: false,
        Shift: false,
        ShiftLeft: false,
        ShiftRight: false,
      };

  updateFuelSystem(fuelState, dt, isBoosting, fuelConfig);
  const fuelAmount = [
    fuelState?.current,
    fuelState?.amount,
    fuelState?.value,
    fuelState?.level,
  ].find((value) => typeof value === "number");

  syncGameplayAudio({
    isBoosting,
    inAtmosphere: playerState.radiusCurrent < burnRadius,
    fuelAmount,
  });

  const isInAtmospherePenaltyZone = playerState.radiusCurrent < burnRadius;
  if (isInAtmospherePenaltyZone && comboPenaltyState.atmospherePenaltyArmed) {
    const comboPenalty = penalizeComboTimer(2.5, 2);
    if (comboPenalty.penalized) {
      spawnFloatingText(scene, player.position, "BONUS AT RISK", player);
    }
    comboPenaltyState.atmospherePenaltyArmed = false;
  } else if (!isInAtmospherePenaltyZone) {
    comboPenaltyState.atmospherePenaltyArmed = true;
  }

  if (
    typeof fuelAmount === "number" &&
    fuelAmount <= 0 &&
    !damageState.towedThisShift
  ) {
    markFuelDepleted(damageState);
  }
  updateThrottle(dt);
  updatePlayerSystem(player, playerState, movementKeys, dt, playerConfig);
  const burnedUpInAtmosphere = updatePlayerHeat(dt);
  if (burnedUpInAtmosphere) {
    registerCrash(damageState);
    applyKesslerImpulse(kesslerSyndrome, 1.25);
    console.log("CRASH EVENT (ATMOSPHERE)", {
      activeDebrisCount,
      kesslerSpawnMultiplier,
      reason: "burnup",
    });
    resetComboSystem();
    comboPenaltyState.atmospherePenaltyArmed = true;
    comboPenaltyState.repairMissPenaltyArmed = true;
    stopLoop("burn");
    playSound("burnup");
    spawnBurnupExplosion(scene, player.position.clone());
    triggerRespawnDelay();
  }
  trackAtmosphereExposure(
    damageState,
    dt,
    playerState.radiusCurrent < burnRadius ||
      playerHeatState.warning ||
      playerHeatState.critical,
  );
  updateCameraSystem(camera, player, playerState, cameraState, cameraConfig);
  updatePlanet(planet, dt);
  updateSun(sun, dt, camera);
  updateMoon(moon, dt);
  updateSkybox(dt, camera);
  updateStation(station, dt);

  updateSatellites(satellites, dt, primaryDebris);

  orbitalRisk = THREE.MathUtils.clamp(
    orbitalRisk +
      activeDebrisCount *
        PRESSURE_CONFIG.orbitalRiskGainPerDebrisPerSecond *
        dt -
      PRESSURE_CONFIG.passiveRiskDecayPerSecond * dt,
    0,
    PRESSURE_CONFIG.maxValue,
  );

  serviceBacklog = THREE.MathUtils.clamp(
    serviceBacklog +
      damagedSatelliteCount *
        PRESSURE_CONFIG.serviceBacklogGainPerDamagedSatPerSecond *
        dt -
      PRESSURE_CONFIG.passiveBacklogDecayPerSecond * dt,
    0,
    PRESSURE_CONFIG.maxValue,
  );

  const repairFocusEnabled =
    mission.type === "REPAIR" || mission.type === "OPEN";
  const debrisFocusEnabled =
    mission.type === "DEBRIS" || mission.type === "OPEN";
  const debrisEvaActive = !!primaryDebris?.userData?.attached;
  const repairCandidate = !debrisEvaActive
    ? getSatelliteRepairCandidate(player, playerState, satellites)
    : null;

  if (repairCandidate !== activeRepairSatellite) {
    const lostRepairApproach =
      repairFocusEnabled &&
      !debrisEvaActive &&
      activeRepairSatellite &&
      !repairCandidate;

    if (lostRepairApproach && comboPenaltyState.repairMissPenaltyArmed) {
      const comboPenalty = penalizeComboTimer(3, 2);
      if (comboPenalty.penalized) {
        spawnFloatingText(scene, player.position, "BONUS AT RISK", player);
      }
      comboPenaltyState.repairMissPenaltyArmed = false;
    }

    if (activeRepairSatellite?.userData) {
      activeRepairSatellite.userData.repairActive = false;
      onEvaDebrisReleased(evaSystem);
    }

    activeRepairSatellite = repairCandidate;

    if (activeRepairSatellite?.userData) {
      activeRepairSatellite.userData.repairActive = true;
      onEvaDebrisAttached(evaSystem, activeRepairSatellite);

      if (mission.type !== "REPAIR") {
        setMissionFocus("REPAIR");
      }
    }
  }

  if (activeRepairSatellite) {
    comboPenaltyState.repairMissPenaltyArmed = true;
  }

  // Player-side repair ring: appears only near an active repair target and helps
  // the player visually align with the satellite ring.
  if (repairFocusEnabled && activeRepairSatellite?.userData) {
    const repairDistance = activeRepairSatellite.userData.repairDistance || 0;
    const showDistance = repairDistance * 2.2;
    const distanceToRepair = player.position.distanceTo(
      activeRepairSatellite.position,
    );
    const shouldShowRepairRing = distanceToRepair <= showDistance;

    if (shouldShowRepairRing) {
      const tangentA = activeRepairSatellite.userData.orbitBasis?.tangentA;
      const tangentB = activeRepairSatellite.userData.orbitBasis?.tangentB;
      const radius = activeRepairSatellite.userData.radius;
      const angle = activeRepairSatellite.userData.angle;
      const speed = activeRepairSatellite.userData.speed || 0;

      if (tangentA && tangentB && radius != null && angle != null) {
        const satPos = tangentA
          .clone()
          .multiplyScalar(Math.cos(angle) * radius)
          .add(tangentB.clone().multiplyScalar(Math.sin(angle) * radius));
        const lookAhead = tangentA
          .clone()
          .multiplyScalar(
            Math.cos(angle + Math.sign(speed || 1) * 0.08) * radius,
          )
          .add(
            tangentB
              .clone()
              .multiplyScalar(
                Math.sin(angle + Math.sign(speed || 1) * 0.08) * radius,
              ),
          );
        const satelliteTangent = lookAhead.sub(satPos).normalize();
        const alignment = Math.abs(playerState.forward.dot(satelliteTangent));
        const alignmentAlpha = THREE.MathUtils.clamp(
          (alignment - 0.6) /
            Math.max(
              0.0001,
              activeRepairSatellite.userData.repairAlignment - 0.6,
            ),
          0,
          1,
        );

        repairAssistTempForward.copy(playerState.forward).normalize();
        repairAssistTempPos
          .copy(player.position)
          .addScaledVector(repairAssistTempForward, 1.1);
        repairAssistRing.position.copy(repairAssistTempPos);
        repairAssistRing.quaternion.setFromUnitVectors(
          repairAssistBaseNormal,
          repairAssistTempForward,
        );

        const targetOpacity = 0.88;
        repairAssistRing.material.opacity = THREE.MathUtils.lerp(
          repairAssistRing.material.opacity,
          targetOpacity,
          0.14,
        );

        const ringColor = new THREE.Color().setHSL(
          0.0 + 0.33 * alignmentAlpha,
          0.9,
          0.55,
        );
        repairAssistRing.material.color.copy(ringColor);
        repairAssistRing.visible = true;
      } else {
        repairAssistRing.material.opacity = THREE.MathUtils.lerp(
          repairAssistRing.material.opacity,
          0,
          0.18,
        );
        repairAssistRing.visible = repairAssistRing.material.opacity > 0.01;
      }
    } else {
      repairAssistRing.material.opacity = THREE.MathUtils.lerp(
        repairAssistRing.material.opacity,
        0,
        0.18,
      );
      repairAssistRing.visible = repairAssistRing.material.opacity > 0.01;
    }
  } else {
    repairAssistRing.material.opacity = THREE.MathUtils.lerp(
      repairAssistRing.material.opacity,
      0,
      0.18,
    );
    repairAssistRing.visible = repairAssistRing.material.opacity > 0.01;
  }

  const repairedSat = updateSatelliteRepairs(
    player,
    playerState,
    satellites,
    dt,
  );
  if (repairedSat) {
    const repairReward = mission.type === "REPAIR" ? 180 : 120;
    const comboResult = registerComboEvent("satellite", repairReward);
    const comboBonus = comboResult.bonus;
    shiftBonusPay += comboBonus;
    const totalRepairReward = repairReward + comboBonus;

    score += mission.type === "REPAIR" ? 2 : 1;
    shiftEarnings += totalRepairReward;
    playSound("repair");
    spawnFloatingText(
      scene,
      player.position,
      `+${totalRepairReward} CR`,
      player,
    );

    if (comboResult.chainCount === 2) {
      playSound("bonusActive");
      spawnFloatingText(
        scene,
        player.position,
        "PERFORMANCE BONUS ACTIVE",
        player,
      );
    } else if (comboResult.chainCount > 2) {
      spawnFloatingText(
        scene,
        player.position,
        `${comboResult.label} x${comboResult.chainCount}`,
        player,
      );
    }

    serviceBacklog = Math.max(
      0,
      serviceBacklog - PRESSURE_CONFIG.repairBacklogReduction,
    );
    repairAssistRing.material.opacity = 0;
    repairAssistRing.visible = false;

    if (activeRepairSatellite === repairedSat) {
      onEvaDebrisReleased(evaSystem);
      activeRepairSatellite = null;
    }

    console.log("SATELLITE REPAIRED", {
      score,
      comboChain: comboResult.chainCount,
      comboMultiplier: comboResult.multiplier,
      comboBonus,
    });
    sessionStats.repairsCompleted += 1;
  }

  primaryDebris = resolvePrimaryDebris(primaryDebris);

  const debrisDistance = primaryDebris?.position
    ? player.position.distanceTo(primaryDebris.position)
    : Infinity;
  const shouldAutoFocusDebris =
    !!primaryDebris?.userData?.active &&
    !primaryDebris?.userData?.attached &&
    debrisDistance <= DEBRIS_AUTO_FOCUS_DISTANCE;

  if (shouldAutoFocusDebris && mission.type !== "DEBRIS") {
    if (activeRepairSatellite?.userData) {
      activeRepairSatellite.userData.repairActive = false;
      onEvaDebrisReleased(evaSystem);
      activeRepairSatellite = null;
    }

    setMissionFocus("DEBRIS");
  }

  const previousPrimaryDebris = primaryDebris;
  const wasAttached = !!previousPrimaryDebris?.userData?.attached;

  updateDebrisManager({
    managerState: debrisManagerState,
    scene,
    player,
    playerState,
    planetRadius,
    dt,
    kesslerSpawnMultiplier,
    attachDebris,
    disposeDebris,
    updateDebrisStability,
    updateDebrisHeat,
    controlStrain: {
      isTurningInput,
      isThrottleChanging,
      isBoosting,
    },
    satellites,
    damageSatellite,
    addOrbitalRisk,
    onDebrisCascade: ({ debris: cascadeDebris, satellite, riskIncrease }) => {
      spawnFloatingText(
        scene,
        satellite.position,
        `CASCADE RISK +${riskIncrease}`,
        player,
      );

      serviceBacklog = THREE.MathUtils.clamp(
        serviceBacklog + 10,
        0,
        PRESSURE_CONFIG.maxValue,
      );

      if (mission.type !== "DEBRIS") {
        setMissionFocus("DEBRIS");
      }

      console.log("DEBRIS CASCADE", {
        debrisSize: cascadeDebris?.userData?.size || null,
        satelliteId: satellite?.uuid || null,
        orbitalRisk,
        serviceBacklog,
      });
    },
  });

  const debrisDisposedCount = debrisManagerState.lastFrame?.disposedCount || 0;
  const previousPrimaryDisposed =
    !!previousPrimaryDebris &&
    (!previousPrimaryDebris.parent || !previousPrimaryDebris.userData?.active);
  const attachedTargetDisposedThisFrame =
    wasAttached && previousPrimaryDisposed;

  if (attachedTargetDisposedThisFrame) {
    onEvaDebrisReleased(evaSystem);
    selectedPrimaryDebris = null;
    player.userData.primaryTargetDebris = null;
    primaryDebris = null;
  } else {
    primaryDebris = resolvePrimaryDebris(previousPrimaryDebris);
  }

  const isAttached = !!primaryDebris?.userData?.attached;

  if (!wasAttached && isAttached && primaryDebris) {
    if (activeRepairSatellite?.userData) {
      activeRepairSatellite.userData.repairActive = false;
      onEvaDebrisReleased(evaSystem);
      activeRepairSatellite = null;
    }

    onEvaDebrisAttached(evaSystem, primaryDebris);

    if (mission.type !== "DEBRIS") {
      setMissionFocus("DEBRIS");
    }
  }

  if (wasAttached && !isAttached && !attachedTargetDisposedThisFrame) {
    onEvaDebrisReleased(evaSystem);
  }

  const disposalEvents = debrisManagerState.lastFrame?.disposalEvents || [];
  const burnDisposals = disposalEvents.filter(
    (event) => event?.reason === "burned_terminal",
  );

  if (burnDisposals.length > 0) {
    for (const burnEvent of burnDisposals) {
      const terminalPayout =
        typeof burnEvent?.terminalPayout === "number"
          ? burnEvent.terminalPayout
          : burnEvent?.originalSize === "LARGE"
            ? 500
            : burnEvent?.originalSize === "MEDIUM"
              ? 320
              : 180;

      const debrisReward =
        mission.type === "DEBRIS"
          ? terminalPayout
          : Math.max(120, Math.round(terminalPayout * 0.75));
      const comboResult = registerComboEvent("debris", debrisReward);
      const comboBonus = comboResult.bonus;
      shiftBonusPay += comboBonus;
      const totalDebrisReward = debrisReward + comboBonus;

      score += mission.type === "DEBRIS" ? 3 : 2;
      shiftEarnings += totalDebrisReward;
      playSound("debris");
      spawnFloatingText(
        scene,
        player.position,
        `+${totalDebrisReward} CR`,
        player,
      );

      if (comboResult.chainCount === 2) {
        playSound("bonusActive");
        spawnFloatingText(
          scene,
          player.position,
          "PERFORMANCE BONUS ACTIVE",
          player,
        );
      } else if (comboResult.chainCount > 2) {
        spawnFloatingText(
          scene,
          player.position,
          `${comboResult.label} x${comboResult.chainCount}`,
          player,
        );
      }

      orbitalRisk = Math.max(
        0,
        orbitalRisk - PRESSURE_CONFIG.debrisDisposeRiskReduction,
      );
      applyKesslerImpulse(kesslerSyndrome, -0.75);
      console.log("DEBRIS BURN DISPOSAL", {
        score,
        size: burnEvent?.size || null,
        originalSize: burnEvent?.originalSize || null,
        terminalPayout,
        comboChain: comboResult.chainCount,
        comboMultiplier: comboResult.multiplier,
        comboBonus,
      });
      sessionStats.debrisCleared += 1;
    }
  }

  const hitSatellite = checkSatelliteCollisions(player, satellites);
  if (hitSatellite) {
    registerCrash(damageState);
    applyKesslerImpulse(kesslerSyndrome, 2.75);
    serviceBacklog = THREE.MathUtils.clamp(
      serviceBacklog + 6,
      0,
      PRESSURE_CONFIG.maxValue,
    );
    if (hitSatellite?.userData) {
      damageSatellite(hitSatellite, { source: "player_collision" });
    }
    console.log("CRASH EVENT (SATELLITE)", {
      activeDebrisCount,
      kesslerSpawnMultiplier,
      reason: "collision",
    });
    resetComboSystem();
    comboPenaltyState.atmospherePenaltyArmed = true;
    comboPenaltyState.repairMissPenaltyArmed = true;
    playSound("crash");
    spawnSatelliteCrashEffect(scene, player.position.clone());
    triggerRespawnDelay();
  }

  updateTrailSystem(trajectoryState, player.position, playerState.velocity);
  updateTrajectoryGuideSystem(
    trajectoryState,
    player.position,
    playerState,
    keys,
    trajectoryConfig,
  );
  drawOrbitalHud(hud, {
    player,
    playerState,
    playerHeatState,
    fuelState,
    throttlePercent: playerState.throttlePercent,
    station,
    satellites,
    debris: primaryDebris,
    debrisList: debrisManagerState.debrisList,
    trajectoryState,
    mission,
    score,
    shiftEarnings,
    orbitalRisk,
    serviceBacklog,
    playerAccount,
  });
  drawRadar(hud, {
    player,
    playerState,
    station,
    satellites,
    debris: primaryDebris,
    debrisList: debrisManagerState.debrisList,
    scanRadius,
    fuelState,
    kesslerState: getKesslerUIState(kesslerSyndrome),
  });

  updateEvaSystem(evaSystem, dt);
  updateFloatingTexts(dt);
  updateEffects(dt);

  renderer.render(scene, camera);
}

animate();
