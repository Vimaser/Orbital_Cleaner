
// DJ.js - Handles Prosperity Radio DJ line selection and playback
import { getMusicVolume } from './sound.js';


// Common rotation lines
const COMMON_LINES = [
  'dj1.ogg',
  'dj2.ogg',
  'dj3.ogg',
  'dj4.ogg',
  'dj5.ogg',
  'dj6.ogg',
  'dj7.ogg',
  'dj8.ogg',
  'dj9.ogg',
  'dj10.ogg',
  'dj11.ogg',
  'dj12.ogg',
  'dj13.ogg',
  'dj14.ogg',
  'dj15.ogg',
  'dj16.ogg',
  'dj17.ogg',
  'dj18.ogg',
  'dj19.ogg',
  'dj20.ogg'
];

// Rare / uncanny / AI-feeling lines
const RARE_LINES = [
  'dj21.ogg',
  'dj22.ogg',
  'dj23.ogg',
  'dj24.ogg',
  'dj25.ogg',
  'dj26.ogg'
];

function resolveDJFileUrl(fileName) {
  return new URL(`../assets/dj/${fileName}`, import.meta.url).href;
}

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
  const audio = new Audio(resolveDJFileUrl(nextFile));

  currentDJAudio = audio;
  audio.volume = DEFAULT_VOLUME * getMusicVolume();
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
