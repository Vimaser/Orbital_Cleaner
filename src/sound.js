const sounds = {};
const loops = {};
const loopAudioRefs = {};

let audioUnlocked = false;

const musicState = {
  ambient: null,
  radio: null,
  space: null,
  radioEnabled: true,
};

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
}

window.addEventListener("click", unlockAudio, { once: true });
window.addEventListener("keydown", unlockAudio, { once: true });

export function loadSound(name, src, { loop = false, volume = 1 } = {}) {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.volume = volume;
  audio.preload = "auto";
  sounds[name] = audio;
}

export function playSound(name) {
  if (!audioUnlocked) return;

  const base = sounds[name];
  if (!base) return;

  const sound = base.cloneNode();
  sound.volume = base.volume;
  sound.play().catch(() => {});
}

export function startLoop(name) {
  if (!audioUnlocked) return;

  const base = sounds[name];
  if (!base) return;

  if (loops[name]) return;

  const sound = base.cloneNode();
  sound.loop = true;
  sound.volume = base.volume;
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
  sound.volume = volume;

  const activeLoop = loopAudioRefs[name];
  if (activeLoop) {
    activeLoop.volume = volume;
  }
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