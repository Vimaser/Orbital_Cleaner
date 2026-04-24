// radio.js - Handles song ↔ DJ sequencing for Prosperity Radio

import { playDJLine } from './DJ.js';
import { getMusicVolume } from './sound.js';

// --- SONG POOL ---
const SONGS = [
  new URL('../assets/music/Cool_Solar_Winds.ogg', import.meta.url).href,
  new URL('../assets/music/Dandy_Space_Cowboy.ogg', import.meta.url).href,
  new URL('../assets/music/High_Spirits.ogg', import.meta.url).href,
  new URL('../assets/music/Solar_Symphony.ogg', import.meta.url).href,
  new URL('../assets/music/Space_Driftin.ogg', import.meta.url).href,
  new URL('../assets/music/Space_Janitor.ogg', import.meta.url).href,
  new URL('../assets/music/Space_Orbity.ogg', import.meta.url).href,
  new URL('../assets/music/Surfing_The_Aurora_Borealis.ogg', import.meta.url).href,
  new URL('../assets/music/Velvet_Cistern.ogg', import.meta.url).href,
  new URL('../assets/music/Low_Orbit_Lullaby.ogg', import.meta.url).href,
];

// --- STATE ---
let currentSong = null;
let lastSong = null;
let radioActive = false;

const RADIO_BASE_VOLUME = 0.7;

function getRadioVolume() {
  return RADIO_BASE_VOLUME * getMusicVolume();
}

// --- HELPERS ---
function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getNextSong() {
  let pick;

  do {
    pick = getRandom(SONGS);
  } while (SONGS.length > 1 && pick === lastSong);

  lastSong = pick;
  return pick;
}

// --- CORE FLOW ---
function playSong(onComplete) {
  const file = getNextSong();
  const audio = new Audio(file);

  currentSong = audio;
  audio.volume = getRadioVolume();
  audio.preload = 'auto';

  audio.onerror = () => {
    console.warn('[Radio] Failed to load song:', file);
    currentSong = null;
    if (onComplete) onComplete();
  };

  audio.onended = () => {
    currentSong = null;
    if (onComplete) onComplete();
  };

  audio.play().catch((error) => {
    console.warn('[Radio] Playback blocked or failed:', error);
    currentSong = null;
  });
}

function radioLoop() {
  if (!radioActive) return;

  playSong(() => {
    playDJLine(() => {
      radioLoop(); // loop back
    });
  });
}

// --- PUBLIC API ---
export function startRadioStation() {
  if (radioActive) return;

  radioActive = true;
  radioLoop();
}

export function stopRadioStation() {
  radioActive = false;

  if (currentSong) {
    currentSong.pause();
    currentSong.currentTime = 0;
    currentSong = null;
  }
}


export function updateRadioVolume() {
  if (currentSong) {
    currentSong.volume = getRadioVolume();
  }
}