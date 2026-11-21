// SHADOWLINE — boot and the one loop: input is read every frame, the
// world advances in fixed 1/60 s steps (several in a slow frame, none
// in a fast one), and the renderer paints what is there. The game moves
// between six screens: title, play, paused, level cleared, game over
// and victory. Footsteps sound as the player walks, and every world
// event gets its sound and its announcement.
//
// ?seed=N fixes the level's random choices. ?shot=start|play|alert|win
// (with &seed=N) stages that scene instead of running the loop, paints
// it twice and sets window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_ALARM,
  EVENT_CAUGHT,
  EVENT_LEVEL,
  EVENT_OVER,
  EVENT_PICKUP,
  EVENT_SUSPICIOUS,
  EVENT_THROW,
  EVENT_WIN,
  createWorld,
  step,
} from './world.js';
import {
  ACTION_CONFIRM,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_THROW,
  createInput,
} from './input.js';
import { createAudio } from './audio.js';
import {
  SCREEN_LEVEL,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();
const view = renderer.view;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

let world = createWorld(seed, 0);
let screen = SCREEN_TITLE;
let best = readBest();
let audioUnlocked = false;

function setStatus(text) {
  if (status) status.textContent = text;
}

function unlockAudio() {
  if (!audioUnlocked) {
    audioUnlocked = true;
    audio.unlock();
  }
}

function playEventSounds(events) {
  for (const e of events) {
    if (e === EVENT_PICKUP) audio.pickup();
    else if (e === EVENT_THROW) audio.coin();
    else if (e === EVENT_SUSPICIOUS) audio.suspicious();
    else if (e === EVENT_ALARM) audio.alarmOn();
    else if (e === EVENT_CAUGHT) {
      audio.alarmOff();
      audio.caught();
    } else if (e === EVENT_LEVEL) audio.level();
    else if (e === EVENT_WIN) audio.win();
    else if (e === EVENT_OVER) audio.over();
  }
}

function startGame() {
  world = createWorld(seed, 0);
  screen = SCREEN_PLAY;
  setStatus('Playing SHADOWLINE: take the intel, reach the exit unseen.');
}

function throwAt(sx, sy) {
  if (screen !== SCREEN_PLAY) return;
  unlockAudio();
  const w = renderer.toWorld(sx, sy);
  pendingThrow = { x: w.x, y: w.y };
}

let pendingThrow = null;
const input = createInput(canvas, throwAt);

function stepFrame(dt) {
  const move = input.readMove();
  const throwAtPoint = pendingThrow;
  pendingThrow = null;
  if (input.wasPressed(ACTION_MUTE)) {
    const muted = audio.toggleMute();
    setStatus(muted ? 'Muted.' : 'Sound on.');
  }
  if (screen === SCREEN_PLAY) {
    if (input.wasPressed(ACTION_PAUSE)) {
      screen = SCREEN_PAUSED;
      audio.alarmOff();
      setStatus('Paused.');
      return;
    }
    const events = step(world, {
      mx: move.mx,
      my: move.my,
      sneak: move.sneak,
      throwAt: throwAtPoint,
    }, dt);
    if (world.player.moving && !world.player.sneaking) {
      if (Math.random() < dt * 2.2) audio.step();
    }
    playEventSounds(events);
    if (world.status === 'won') {
      screen = SCREEN_WIN;
      if (world.score > best) {
        best = world.score;
        saveBest(best);
      }
      setStatus(`Victory! Final score ${world.score}.`);
    } else if (world.status === 'over') {
      screen = SCREEN_OVER;
      if (world.score > best) {
        best = world.score;
        saveBest(best);
      }
      setStatus(`Game over. Score ${world.score}.`);
    } else if (events.includes(EVENT_LEVEL)) {
      // The world has already advanced to the next wing; the cleared
      // screen is an overlay the player dismisses with Enter.
      screen = SCREEN_LEVEL;
      setStatus(`Wing cleared! Score ${world.score}.`);
    }
  } else if (screen === SCREEN_PAUSED) {
    if (input.wasPressed(ACTION_PAUSE) || input.wasPressed(ACTION_CONFIRM)) {
      screen = SCREEN_PLAY;
      setStatus('Playing SHADOWLINE.');
    }
  } else if (screen === SCREEN_TITLE) {
    if (input.wasPressed(ACTION_CONFIRM)) {
      unlockAudio();
      startGame();
    }
  } else if (screen === SCREEN_LEVEL) {
    if (input.wasPressed(ACTION_CONFIRM)) {
      screen = SCREEN_PLAY;
      setStatus('Playing SHADOWLINE.');
    }
  } else if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
    if (input.wasPressed(ACTION_CONFIRM)) {
      unlockAudio();
      startGame();
    }
  }
  input.endFrame();
}

function draw() {
  renderer.draw({
    screen,
    world,
    best,
    muted: audio.muted,
  });
}

if (shot) {
  // Staged screenshot: paint the scene twice, then signal readiness.
  const staged = stageShot(shot, seed);
  world = staged.world;
  screen = staged.screen;
  if (staged.screen === 'win' || staged.screen === 'title') {
    best = Math.max(best, staged.world.score);
  }
  draw();
  draw();
  window.__shotReady = true;
  window.__shadowline = { world, screen, seed };
} else {
  window.__shadowline = { get world() { return world; }, get screen() { return screen; }, seed };
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    acc += elapsed;
    let guard = 0;
    while (acc >= STEP && guard < 8) {
      stepFrame(STEP);
      acc -= STEP;
      guard += 1;
    }
    if (guard >= 8) acc = 0;
    draw();
    requestAnimationFrame(frame);
  }
  // Clicking the canvas also confirms on menus (title / cleared / over / win).
  canvas.addEventListener('mousedown', () => {
    unlockAudio();
    if (screen === SCREEN_TITLE || screen === SCREEN_LEVEL || screen === SCREEN_OVER || screen === SCREEN_WIN) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      else screen = SCREEN_PLAY;
    }
  });
  setStatus('SHADOWLINE: press Enter or click to begin.');
  requestAnimationFrame(frame);
}
