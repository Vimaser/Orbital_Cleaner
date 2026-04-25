const sounds = {};
const loops = {};
const loopAudioRefs = {};
const activeOneShots = {};
const soundMeta = {};
const MUSIC_SOUND_NAMES = new Set();

const volumeState = {
  sfx: 1,
  music: 1,
};

let audioUnlocked = false;
let pendingMenuMusic = false;

const MENU_MOVE_SOUND_COOLDOWN_MS = 70;
let lastMenuMoveSoundTime = 0;

const musicState = {
  ambient: null,
  radio: null,
  space: null,
  menu: null,
  radioEnabled: true,
};

function clampVolume(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function getSoundGroup(name) {
  return soundMeta[name]?.group || (MUSIC_SOUND_NAMES.has(name) ? "music" : "sfx");
}

function getGroupVolume(name) {
  return getSoundGroup(name) === "music" ? volumeState.music : volumeState.sfx;
}

function getEffectiveVolume(name, volumeMultiplier = 1) {
  const baseVolume = Number(soundMeta[name]?.baseVolume ?? sounds[name]?.volume ?? 1);
  return clampVolume(baseVolume * getGroupVolume(name) * volumeMultiplier);
}

function updateActiveSoundVolume(name) {
  const sound = sounds[name];
  if (sound) {
    sound.volume = getEffectiveVolume(name);
  }

  const activeLoop = loopAudioRefs[name];
  if (activeLoop) {
    activeLoop.volume = getEffectiveVolume(name);
  }

  const activeOneShot = activeOneShots[name];
  if (activeOneShot) {
    activeOneShot.volume = getEffectiveVolume(name);
  }
}

function updateAllSoundVolumes() {
  Object.keys(sounds).forEach(updateActiveSoundVolume);
}

function primeLoadedAudio() {
  Object.entries(sounds).forEach(([name, audio]) => {
    if (!audio) return;

    const previousMuted = audio.muted;
    const previousVolume = audio.volume;

    audio.muted = true;
    audio.volume = 0;

    const playAttempt = audio.play();

    if (playAttempt?.then) {
      playAttempt
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = previousMuted;
          audio.volume = previousVolume;
        })
        .catch(() => {
          audio.muted = previousMuted;
          audio.volume = previousVolume;
        });
    } else {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = previousMuted;
      audio.volume = previousVolume;
    }
  });
}

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  primeLoadedAudio();

  if (pendingMenuMusic) {
    startMenuMusic();
  }
}

window.addEventListener("pointerdown", unlockAudio, { once: true });
window.addEventListener("mousedown", unlockAudio, { once: true });
window.addEventListener("touchstart", unlockAudio, { once: true });
window.addEventListener("click", unlockAudio, { once: true });
window.addEventListener("keydown", unlockAudio, { once: true });

export function loadSound(name, src, { loop = false, volume = 1, group = null } = {}) {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.preload = "auto";

  const resolvedGroup = group || (loop ? "music" : "sfx");
  soundMeta[name] = {
    baseVolume: clampVolume(volume),
    group: resolvedGroup,
  };

  if (resolvedGroup === "music") {
    MUSIC_SOUND_NAMES.add(name);
  }

  sounds[name] = audio;
  audio.volume = getEffectiveVolume(name);
  audio.load();
}

export function playSound(name, { volume = 1, playbackRate = 1 } = {}) {
  if (!audioUnlocked) return;

  const base = sounds[name];
  if (!base) return;

  const sound = base.cloneNode();
  sound.volume = getEffectiveVolume(name, volume);
  sound.playbackRate = playbackRate;
  sound.play().catch(() => {});
}

export function playSoundIfIdle(name, { volume = 1, playbackRate = 1 } = {}) {
  if (!audioUnlocked) return;

  const base = sounds[name];
  if (!base) return;

  const active = activeOneShots[name];
  if (active && !active.paused && !active.ended) {
    return;
  }

  const sound = base.cloneNode();
  sound.volume = getEffectiveVolume(name, volume);
  sound.playbackRate = playbackRate;
  activeOneShots[name] = sound;

  const clearActive = () => {
    if (activeOneShots[name] === sound) {
      delete activeOneShots[name];
    }
  };

  sound.addEventListener("ended", clearActive, { once: true });
  sound.addEventListener("pause", () => {
    if (sound.currentTime >= sound.duration || sound.ended) {
      clearActive();
    }
  });

  sound.play().catch(() => {
    clearActive();
  });
}

export function startLoop(name) {
  const base = sounds[name];
  if (!base) return false;

  if (loops[name]) return true;

  if (!audioUnlocked) return false;

  const sound = base.cloneNode();
  sound.loop = true;
  sound.volume = getEffectiveVolume(name);
  sound.currentTime = 0;

  const playAttempt = sound.play();

  if (playAttempt?.then) {
    playAttempt
      .then(() => {
        loopAudioRefs[name] = sound;
        loops[name] = true;
      })
      .catch(() => {
        // retry later (important for iframe platforms like Wavedash)
        loops[name] = false;
        window.setTimeout(() => startLoop(name), 300);
      });
  } else {
    // fallback for older browsers
    loopAudioRefs[name] = sound;
    loops[name] = true;
  }

  return true;
}

export function stopLoop(name) {
  const sound = loopAudioRefs[name];
  if (!sound) {
    loops[name] = false;
    return;
  }

  sound.pause();
  sound.currentTime = 0;
  delete loopAudioRefs[name];
  loops[name] = false;
}

export function stopAllLoops() {
  for (const name in loops) {
    if (loops[name]) {
      stopLoop(name);
    }
  }
}

export function setVolume(name, volume) {
  const sound = sounds[name];
  if (!sound) return;

  soundMeta[name] = {
    ...(soundMeta[name] || {}),
    baseVolume: clampVolume(volume),
    group: getSoundGroup(name),
  };

  updateActiveSoundVolume(name);
}

export function setSfxVolume(volume) {
  volumeState.sfx = clampVolume(volume);
  updateAllSoundVolumes();
}

export function setMusicVolume(volume) {
  volumeState.music = clampVolume(volume);
  updateAllSoundVolumes();
}

export function getSfxVolume() {
  return volumeState.sfx;
}

export function getMusicVolume() {
  return volumeState.music;
}

export function getRadioEnabled() {
  return musicState.radioEnabled;
}

export function startAmbient(name) {
  if (!audioUnlocked) return;
  const sound = sounds[name];
  if (!sound) return;

  if (musicState.ambient === name) return;

  if (musicState.ambient) stopLoop(musicState.ambient);

  musicState.ambient = name;
  startLoop(name);
}

export function startMenuMusic() {
  const sound = sounds.menuTheme;
  if (!sound) return;

  if (!audioUnlocked) {
    pendingMenuMusic = true;
    return;
  }

  pendingMenuMusic = false;

  if (musicState.menu === "menuTheme") return;

  if (musicState.menu) {
    stopLoop(musicState.menu);
  }

  musicState.menu = "menuTheme";
  const started = startLoop("menuTheme");
  if (!started) {
    pendingMenuMusic = true;
  }
}

export function stopMenuMusic() {
  pendingMenuMusic = false;

  if (!musicState.menu) return;

  stopLoop(musicState.menu);
  musicState.menu = null;
}

export function startRadio(name) {
  if (!audioUnlocked) return;
  const sound = sounds[name];
  if (!sound) return;

  if (!musicState.radioEnabled) return;

  if (musicState.radio === name) return;

  if (musicState.radio) stopLoop(musicState.radio);
  if (musicState.space) stopLoop(musicState.space);

  musicState.radio = name;
  startLoop(name);
}

export function stopRadio() {
  if (musicState.radio) {
    stopLoop(musicState.radio);
    musicState.radio = null;
  }
}

export function stopRadioAndSpaceMusic() {
  stopRadio();

  if (musicState.space) {
    stopLoop(musicState.space);
    musicState.space = null;
  }
}

export function startSpaceMusic(name) {
  if (!audioUnlocked) return;
  const sound = sounds[name];
  if (!sound) return;

  if (musicState.space === name) return;

  if (musicState.radio) stopLoop(musicState.radio);

  musicState.space = name;
  startLoop(name);
}

export function setRadioEnabled(enabled, radioTrack, spaceTrack) {
  musicState.radioEnabled = enabled;

  if (enabled) {
    if (musicState.space) stopLoop(musicState.space);
    if (radioTrack) startRadio(radioTrack);
  } else {
    stopRadio();
    if (spaceTrack) startSpaceMusic(spaceTrack);
  }
}

export function isLoopPlaying(name) {
  return !!loops[name];
}

export function playMenuMoveSound() {
  if (!audioUnlocked) {
    unlockAudio();
  }
  const now = performance.now();

  if (now - lastMenuMoveSoundTime < MENU_MOVE_SOUND_COOLDOWN_MS) {
    return;
  }

  lastMenuMoveSoundTime = now;
  playSound("menuMove", { volume: 0.5 });
}

export function playMenuSelectSound() {
  if (!audioUnlocked) {
    unlockAudio();
  }
  playSound("menuSelect", { volume: 0.65 });
}

export function playMenuBackSound() {
  if (!audioUnlocked) {
    unlockAudio();
  }
  playSound("menuBack", { volume: 0.6 });
}