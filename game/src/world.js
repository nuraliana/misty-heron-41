// SHADOWLINE — the simulation. Pure logic, no DOM: the browser loop
// and the Node playtest both drive it through step(world, input, dt).
// Guards patrol, suspect, chase and search; cameras sweep and call the
// alarm; noise pulls guards to look; the player sneaks, throws coins,
// takes intel and slips out the exit.

import {
  CAMERA,
  COIN,
  COLS,
  GUARD,
  LIVES,
  COINS_PER_LEVEL,
  PLAYER,
  ROWS,
  SCORE,
  STEP,
  TILE,
} from './config.js';
import { buildLevel, isGrass, isSolid, tileCenter } from './levels.js';
import { createRandom } from './random.js';
import { canSee } from './vision.js';

export const EVENT_PICKUP = 'pickup';
export const EVENT_THROW = 'throw';
export const EVENT_SUSPICIOUS = 'suspicious';
export const EVENT_ALARM = 'alarm';
export const EVENT_CAUGHT = 'caught';
export const EVENT_LEVEL = 'level';
export const EVENT_WIN = 'win';
export const EVENT_OVER = 'over';

const SEARCH_WAIT = 1.6;
const CHASE_GIVE_UP = 2.5;
const RESPAWN_GRACE = 2.5;
const CAUGHT_FREEZE = 1.2;
const STEP_NOISE_EVERY = 0.4;

function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/** Circle-vs-grid movement: slide along one axis at a time. */
function moveCircle(cells, ent, dx, dy, radius) {
  const nx = ent.x + dx;
  if (!hitsSolid(cells, nx, ent.y, radius)) ent.x = nx;
  const ny = ent.y + dy;
  if (!hitsSolid(cells, ent.x, ny, radius)) ent.y = ny;
}

function hitsSolid(cells, x, y, radius) {
  const minTx = Math.floor((x - radius) / TILE);
  const maxTx = Math.floor((x + radius) / TILE);
  const minTy = Math.floor((y - radius) / TILE);
  const maxTy = Math.floor((y + radius) / TILE);
  for (let ty = minTy; ty <= maxTy; ty += 1) {
    for (let tx = minTx; tx <= maxTx; tx += 1) {
      if (isSolid(cells, tx, ty)) {
        const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
        const cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < radius * radius) return true;
      }
    }
  }
  return false;
}

function makeGuard(route, rng, index) {
  const start = rng.int(0, route.length);
  const [sx, sy] = route[start];
  const pos = tileCenter(sx, sy);
  const next = route[(start + 1) % route.length];
  const np = tileCenter(next[0], next[1]);
  return {
    id: index,
    x: pos.x,
    y: pos.y,
    facing: Math.atan2(np.y - pos.y, np.x - pos.x),
    state: 'patrol',
    suspicion: 0,
    route,
    wpIndex: (start + 1) % route.length,
    pauseT: 0,
    searchT: 0,
    chaseT: 0,
    lastSeen: null,
    investigate: null,
    scanPhase: rng.next() * Math.PI * 2,
    announced: false,
  };
}

function makeCamera(spec, rng) {
  const pos = tileCenter(spec.tx, spec.ty);
  return {
    x: pos.x,
    y: pos.y,
    facing: spec.baseAngle,
    baseAngle: spec.baseAngle,
    halfAngle: CAMERA.halfAngle,
    range: CAMERA.range,
    sweep: spec.sweep,
    speed: spec.speed,
    phase: rng.next() * Math.PI * 2,
    suspicion: 0,
    announced: false,
  };
}

export function createWorld(seed, levelIndex = 0, carry = null) {
  const rng = createRandom(seed + levelIndex * 7919);
  const { def, cells } = buildLevel(levelIndex);
  const start = tileCenter(def.player[0], def.player[1]);
  const exitPos = tileCenter(def.exit[0], def.exit[1]);
  return {
    seed,
    levelIndex,
    def,
    cells,
    time: 0,
    status: 'playing',
    caughtT: 0,
    score: carry ? carry.score : 0,
    lives: carry ? carry.lives : LIVES,
    ghost: true,
    intelGot: 0,
    player: {
      x: start.x,
      y: start.y,
      facing: 0,
      moving: false,
      sneaking: false,
      coins: COINS_PER_LEVEL,
      grace: 0,
      hidden: false,
      stepT: 0,
    },
    guards: def.guards.map((g, i) => makeGuard(g.route, rng, i)),
    cameras: def.cameras.map((c) => makeCamera(c, rng)),
    intel: def.intel.map(([tx, ty]) => {
      const p = tileCenter(tx, ty);
      return { x: p.x, y: p.y, taken: false };
    }),
    exit: { x: exitPos.x, y: exitPos.y, open: false },
    coins: [],
    events: [],
    message: '',
    messageT: 0,
    lastClear: null,
  };
}

function announce(world, text, seconds = 2.2) {
  world.message = text;
  world.messageT = seconds;
}

function emitNoise(world, x, y, radius) {
  for (const g of world.guards) {
    if (g.state !== 'patrol') continue;
    if (dist(g.x, g.y, x, y) <= radius) {
      g.state = 'investigate';
      g.investigate = { x, y };
      g.suspicion = Math.max(g.suspicion, GUARD.suspectAt);
    }
  }
}

function startChase(world, guard, x, y) {
  guard.state = 'chase';
  guard.chaseT = 0;
  guard.lastSeen = { x, y };
  if (!guard.announced) {
    guard.announced = true;
    world.events.push(EVENT_ALARM);
    announce(world, 'Alarm! A guard is chasing you — break line of sight!');
  }
}

function moveToward(world, ent, tx, ty, speed, dt) {
  const d = dist(ent.x, ent.y, tx, ty);
  if (d < 2) return true;
  const step = Math.min(d, speed * dt);
  const dx = ((tx - ent.x) / d) * step;
  const dy = ((ty - ent.y) / d) * step;
  ent.facing = Math.atan2(dy, dx);
  moveCircle(world.cells, ent, dx, dy, ent.radius ?? GUARD.radius);
  return dist(ent.x, ent.y, tx, ty) < 3;
}

function updateGuard(world, g, dt) {
  const p = world.player;
  const seen = !p.grace && canSee(world.cells, g, p, p.hidden);
  if (seen.seen) {
    const closeness = Math.max(0.6, Math.min(1.6, 1.6 - seen.dist / g.range));
    const sneakFactor = p.sneaking ? 0.55 : 1;
    g.suspicion = Math.min(1, g.suspicion + GUARD.detectRate * closeness * sneakFactor * dt);
    g.lastSeen = { x: p.x, y: p.y };
    if (g.suspicion >= GUARD.alarmAt) {
      world.ghost = false;
      if (g.state !== 'chase') startChase(world, g, p.x, p.y);
    } else if (g.suspicion >= GUARD.suspectAt && g.state === 'patrol') {
      world.ghost = false;
      g.state = 'investigate';
      g.investigate = { x: p.x, y: p.y };
      if (!g.announced) {
        g.announced = true;
        world.events.push(EVENT_SUSPICIOUS);
        announce(world, 'A guard is suspicious — it is coming to look.');
      }
    }
  } else {
    g.suspicion = Math.max(0, g.suspicion - GUARD.calmRate * dt);
    if (g.suspicion < GUARD.suspectAt * 0.5) g.announced = false;
  }

  if (g.state === 'patrol') {
    const [wx, wy] = g.route[g.wpIndex];
    const target = tileCenter(wx, wy);
    if (g.pauseT > 0) {
      g.pauseT -= dt;
      g.scanPhase += dt * 1.4;
      g.facing += Math.sin(g.scanPhase) * 0.9 * dt;
    } else if (moveToward(world, g, target.x, target.y, GUARD.patrolSpeed, dt)) {
      g.wpIndex = (g.wpIndex + 1) % g.route.length;
      g.pauseT = GUARD.pauseTime;
    }
  } else if (g.state === 'investigate') {
    const t = g.investigate ?? g.lastSeen;
    if (!t) {
      g.state = 'patrol';
    } else if (moveToward(world, g, t.x, t.y, GUARD.searchSpeed, dt)) {
      g.searchT += dt;
      g.scanPhase += dt * 2.2;
      g.facing += Math.sin(g.scanPhase) * 1.2 * dt;
      if (g.searchT >= SEARCH_WAIT) {
        g.searchT = 0;
        g.investigate = null;
        g.state = 'patrol';
      }
    }
  } else if (g.state === 'chase') {
    g.chaseT += dt;
    if (seen.seen) {
      g.chaseT = 0;
      g.lastSeen = { x: p.x, y: p.y };
    }
    const target = seen.seen ? { x: p.x, y: p.y } : g.lastSeen;
    if (!target || g.chaseT > CHASE_GIVE_UP) {
      g.state = 'investigate';
      g.investigate = g.lastSeen;
      g.searchT = 0;
    } else {
      moveToward(world, g, target.x, target.y, GUARD.chaseSpeed, dt);
      if (!p.grace && dist(g.x, g.y, p.x, p.y) < GUARD.radius + PLAYER.radius + 2) {
        caught(world);
      }
    }
  }
}

function updateCamera(world, cam, dt) {
  cam.phase += dt * cam.speed;
  cam.facing = cam.baseAngle + cam.sweep * Math.sin(cam.phase);
  const p = world.player;
  const seen = !p.grace && canSee(world.cells, cam, p, p.hidden);
  if (seen.seen) {
    cam.suspicion = Math.min(1, cam.suspicion + CAMERA.detectRate * dt);
    if (cam.suspicion >= 1) {
      world.ghost = false;
      cam.suspicion = 0.5;
      cam.announced = true;
      world.events.push(EVENT_ALARM);
      announce(world, 'Camera spotted you! Every guard is coming!');
      for (const g of world.guards) {
        if (g.state !== 'chase') startChase(world, g, p.x, p.y);
      }
    }
  } else {
    cam.suspicion = Math.max(0, cam.suspicion - CAMERA.calmRate * dt);
    if (cam.suspicion < 0.3) cam.announced = false;
  }
}

function caught(world) {
  if (world.status !== 'playing') return;
  world.lives -= 1;
  world.score = Math.max(0, world.score - SCORE.caughtPenalty);
  world.events.push(EVENT_CAUGHT);
  if (world.lives <= 0) {
    world.status = 'over';
    world.events.push(EVENT_OVER);
    announce(world, 'Caught! The museum keeps its secrets.', 4);
    return;
  }
  world.status = 'caught';
  world.caughtT = CAUGHT_FREEZE;
  announce(world, `Caught! ${world.lives} ${world.lives === 1 ? 'life' : 'lives'} left.`, 3);
}

function respawn(world) {
  const start = tileCenter(world.def.player[0], world.def.player[1]);
  world.player.x = start.x;
  world.player.y = start.y;
  world.player.grace = RESPAWN_GRACE;
  world.player.coins = COINS_PER_LEVEL;
  for (const g of world.guards) {
    const [sx, sy] = g.route[0];
    const pos = tileCenter(sx, sy);
    g.x = pos.x;
    g.y = pos.y;
    g.state = 'patrol';
    g.suspicion = 0;
    g.wpIndex = 1 % g.route.length;
    g.pauseT = 0;
    g.investigate = null;
    g.lastSeen = null;
  }
  for (const c of world.cameras) c.suspicion = 0;
  world.status = 'playing';
}

/**
 * Advance the world one fixed step. input: { mx, my, sneak, throwAt }
 * (mx/my form a unit-ish move direction; throwAt is a world point or null).
 * Returns the events raised this step (also on world.events).
 */
export function step(world, input, dt = STEP) {
  world.events.length = 0;
  if (world.status === 'caught') {
    world.caughtT -= dt;
    if (world.caughtT <= 0) respawn(world);
    return world.events;
  }
  if (world.status !== 'playing') return world.events;

  world.time += dt;
  if (world.messageT > 0) world.messageT -= dt;
  const p = world.player;
  if (p.grace > 0) p.grace -= dt;

  // Throw a coin: it flies, lands, and its clink pulls the nearest guard.
  if (input.throwAt && p.coins > 0 && world.coins.length === 0) {
    p.coins -= 1;
    const d = dist(p.x, p.y, input.throwAt.x, input.throwAt.y);
    const fly = Math.min(d, COIN.throwDistance);
    const ang = Math.atan2(input.throwAt.y - p.y, input.throwAt.x - p.x);
    const lx = p.x + Math.cos(ang) * fly;
    const ly = p.y + Math.sin(ang) * fly;
    world.coins.push({ x: lx, y: ly, t: 0, clinked: false });
    world.events.push(EVENT_THROW);
  }

  // Player movement.
  const speed = input.sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  const len = Math.hypot(input.mx, input.my);
  p.moving = len > 0.1;
  p.sneaking = !!input.sneak && p.moving;
  if (p.moving) {
    const nx = (input.mx / (len || 1)) * speed * dt;
    const ny = (input.my / (len || 1)) * speed * dt;
    p.facing = Math.atan2(input.my, input.mx);
    moveCircle(world.cells, p, nx, ny, PLAYER.radius);
    // Running footsteps carry: guards nearby come to look.
    if (!p.sneaking) {
      p.stepT += dt;
      if (p.stepT >= STEP_NOISE_EVERY) {
        p.stepT = 0;
        emitNoise(world, p.x, p.y, PLAYER.noiseRadius);
      }
    }
  }
  const ptx = Math.floor(p.x / TILE);
  const pty = Math.floor(p.y / TILE);
  p.hidden = isGrass(world.cells, ptx, pty);

  // Coins land and clink.
  for (const c of world.coins) {
    c.t += dt;
    if (!c.clinked && c.t >= 0.35) {
      c.clinked = true;
      emitNoise(world, c.x, c.y, COIN.noiseRadius);
    }
  }
  world.coins = world.coins.filter((c) => c.t < 1.4);

  // Intel pickup.
  for (const f of world.intel) {
    if (!f.taken && dist(p.x, p.y, f.x, f.y) < PLAYER.radius + 18) {
      f.taken = true;
      world.intelGot += 1;
      world.score += SCORE.intel;
      world.events.push(EVENT_PICKUP);
      if (world.intelGot >= world.intel.length) {
        world.exit.open = true;
        announce(world, 'All intel taken — the exit is open. Get out unseen!');
      } else {
        announce(world, `Intel ${world.intelGot} of ${world.intel.length} taken.`);
      }
    }
  }

  // Exit.
  if (world.exit.open && dist(p.x, p.y, world.exit.x, world.exit.y) < PLAYER.radius + 22) {
    const timeBonus = Math.max(100, SCORE.levelTimeBonus - Math.floor(world.time) * 4);
    const ghostBonus = world.ghost ? SCORE.ghostBonus : 0;
    world.score += timeBonus + ghostBonus;
    const clearInfo = { timeBonus, ghostBonus };
    world.events.push(EVENT_LEVEL);
    if (world.levelIndex >= 2) {
      world.status = 'won';
      world.events.push(EVENT_WIN);
      world.lastClear = clearInfo;
    } else {
      // Advance to the next wing, but keep this step's events (and the
      // clear breakdown) so the caller can show the cleared screen.
      const savedEvents = world.events.slice();
      const next = createWorld(world.seed, world.levelIndex + 1, {
        score: world.score,
        lives: world.lives,
      });
      Object.assign(world, next);
      world.events = savedEvents;
      world.lastClear = clearInfo;
      announce(world, `${next.def.name} — ${next.def.sub}`, 3);
    }
    return world.events;
  }

  for (const g of world.guards) updateGuard(world, g, dt);
  for (const c of world.cameras) updateCamera(world, c, dt);
  return world.events;
}

/** Highest suspicion among all watchers, for the HUD eye. */
export function maxSuspicion(world) {
  let m = 0;
  for (const g of world.guards) m = Math.max(m, g.suspicion);
  for (const c of world.cameras) m = Math.max(m, c.suspicion);
  return m;
}

export { COLS, ROWS };
