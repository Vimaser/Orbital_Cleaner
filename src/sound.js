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

const musicState = {
  ambient: null,
  radio: null,
  space: null,
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

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
}

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
  if (!audioUnlocked) return;

  const base = sounds[name];
  if (!base) return;

  if (loops[name]) return;

  const sound = base.cloneNode();
  sound.loop = true;
  sound.volume = getEffectiveVolume(name);
  sound.currentTime = 0;
  sound.play().catch(() => {});

  loopAudioRefs[name] = sound;
  loops[name] = true;
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