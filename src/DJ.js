// DJ.js - Handles Prosperity Radio DJ line selection and playback

const DJ_PATH = '/assets/DJ/';

// Common rotation lines
const COMMON_LINES = [
  'DJ1.ogg',
  'DJ2.ogg',
  'DJ3.ogg',
  'DJ4.ogg',
  'DJ5.ogg',
  'DJ6.ogg',
  'DJ7.ogg',
  'DJ8.ogg',
  'DJ9.ogg',
  'DJ10.ogg',
  'DJ11.ogg',
  'DJ12.ogg',
  'DJ13.ogg',
  'DJ14.ogg',
  'DJ15.ogg',
  'DJ16.ogg',
  'DJ17.ogg',
  'DJ18.ogg',
  'DJ19.ogg',
  'DJ20.ogg'
];

// Rare / uncanny / AI-feeling lines
const RARE_LINES = [
  'DJ21.ogg',
  'DJ22.ogg',
  'DJ23.ogg',
  'DJ24.ogg',
  'DJ25.ogg',
  'DJ26.ogg'
];

const RARE_CHANCE = 0.15;
const DEFAULT_VOLUME = 0.6;

let currentDJAudio = null;
let lastPlayed = null;

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomNoRepeat(arr) {
  let pick;

  do {
    pick = getRandom(arr);
  } while (arr.length > 1 && pick === lastPlayed);

  lastPlayed = pick;
  return pick;
}

function pickNextLine() {
  const useRare = RARE_LINES.length > 0 && Math.random() < RARE_CHANCE;
  return useRare ? getRandomNoRepeat(RARE_LINES) : getRandomNoRepeat(COMMON_LINES);
}

export function playDJLine(onComplete) {
  stopDJ();

  const nextFile = pickNextLine();
  const audio = new Audio(`${DJ_PATH}${nextFile}`);

  currentDJAudio = audio;
  audio.volume = DEFAULT_VOLUME;
  audio.preload = 'auto';

  audio.onended = () => {
    currentDJAudio = null;

    if (typeof onComplete === 'function') {
      onComplete(nextFile);
    }
  };

  audio.onerror = () => {
    console.warn(`[DJ] Failed to load or play ${nextFile}`);
    currentDJAudio = null;

    if (typeof onComplete === 'function') {
      onComplete(nextFile);
    }
  };

  audio.play().catch((error) => {
    console.warn('[DJ] Playback blocked or failed:', error);
    currentDJAudio = null;

    if (typeof onComplete === 'function') {
      onComplete(nextFile);
    }
  });

  return nextFile;
}

export function stopDJ() {
  if (!currentDJAudio) return;

  currentDJAudio.pause();
  currentDJAudio.currentTime = 0;
  currentDJAudio = null;
}

export function isDJPlaying() {
  return !!currentDJAudio;
}
