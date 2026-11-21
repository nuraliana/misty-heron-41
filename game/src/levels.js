// SHADOWLINE — the three wings of the Meridian Museum.
// A level is data: wall rectangles, grass rectangles, single crates,
// the player's start, the exit, three intel files, guard patrol routes
// and security cameras. The grid is built from that data, and the build
// is validated (every route walkable, every target reachable) so a typo
// in a rectangle fails loudly in testing instead of silently in play.
//
// Coordinates are tiles. The playfield is 32 by 18 tiles of 40 px.
// Legend for what a cell holds: wall | floor | grass | crate.
// Walls and crates block movement and sight; grass hides the player
// but never blocks anything.

import { COLS, ROWS, TILE } from './config.js';

const WALL = 'wall';
const FLOOR = 'floor';
const GRASS = 'grass';
const CRATE = 'crate';

export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

function buildGrid(def) {
  const cells = [];
  for (let y = 0; y < ROWS; y += 1) {
    const row = [];
    for (let x = 0; x < COLS; x += 1) {
      const border = x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1;
      row.push(border ? WALL : FLOOR);
    }
    cells.push(row);
  }
  for (const w of def.walls) {
    for (let y = w.y; y < w.y + w.h; y += 1) {
      for (let x = w.x; x < w.x + w.w; x += 1) cells[y][x] = WALL;
    }
  }
  for (const g of def.grass) {
    for (let y = g.y; y < g.y + g.h; y += 1) {
      for (let x = g.x; x < g.x + g.w; x += 1) {
        if (cells[y][x] === FLOOR) cells[y][x] = GRASS;
      }
    }
  }
  for (const [x, y] of def.crates) {
    if (cells[y][x] === FLOOR) cells[y][x] = CRATE;
  }
  return cells;
}

/** True when a tile blocks movement (wall or crate). */
export function isSolid(cells, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const c = cells[ty][tx];
  return c === WALL || c === CRATE;
}

/** True when a tile blocks sight (wall or crate; grass never does). */
export function blocksSight(cells, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const c = cells[ty][tx];
  return c === WALL || c === CRATE;
}

export function isGrass(cells, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
  return cells[ty][tx] === GRASS;
}

export const LEVELS = [
  {
    name: 'The Gallery',
    sub: 'Wing 1 — open halls, learn the routes',
    walls: [
      { x: 15, y: 1, w: 1, h: 4 },
      { x: 15, y: 6, w: 1, h: 6 },
      { x: 15, y: 13, w: 1, h: 4 },
      { x: 6, y: 8, w: 5, h: 1 },
      { x: 22, y: 8, w: 6, h: 1 },
    ],
    grass: [
      { x: 2, y: 2, w: 3, h: 2 },
      { x: 2, y: 14, w: 3, h: 2 },
      { x: 26, y: 2, w: 3, h: 2 },
      { x: 26, y: 14, w: 3, h: 2 },
      { x: 6, y: 12, w: 2, h: 2 },
      { x: 24, y: 4, w: 2, h: 2 },
    ],
    crates: [[7, 4], [9, 13], [20, 3], [24, 11], [18, 14], [10, 6]],
    player: [2, 9],
    exit: [29, 9],
    intel: [[7, 2], [13, 14], [24, 15]],
    guards: [
      { route: [[4, 3], [4, 14]] },
      { route: [[18, 4], [28, 4]] },
      { route: [[25, 6], [25, 14]] },
    ],
    cameras: [],
  },
  {
    name: 'The Vault',
    sub: 'Wing 2 — one door, four guards, one camera',
    walls: [
      { x: 15, y: 1, w: 1, h: 8 },
      { x: 15, y: 10, w: 1, h: 7 },
      { x: 3, y: 5, w: 8, h: 1 },
      { x: 21, y: 12, w: 8, h: 1 },
      { x: 24, y: 2, w: 1, h: 4 },
    ],
    grass: [
      { x: 2, y: 2, w: 3, h: 2 },
      { x: 27, y: 2, w: 2, h: 2 },
      { x: 2, y: 14, w: 3, h: 2 },
      { x: 17, y: 14, w: 3, h: 2 },
      { x: 27, y: 15, w: 2, h: 2 },
      { x: 6, y: 10, w: 2, h: 2 },
    ],
    crates: [[10, 2], [10, 14], [19, 6], [26, 9], [21, 15], [8, 14], [28, 6]],
    player: [2, 9],
    exit: [29, 9],
    intel: [[6, 2], [13, 15], [26, 13]],
    guards: [
      { route: [[3, 3], [12, 3]] },
      { route: [[4, 13], [12, 13]] },
      { route: [[27, 3], [27, 11]] },
      { route: [[10, 9], [20, 9]] },
    ],
    cameras: [{ tx: 16, ty: 1, baseAngle: Math.PI / 2, sweep: 0.5, speed: 0.55 }],
  },
  {
    name: 'The Rotunda',
    sub: 'Wing 3 — five guards, two cameras, no easy road',
    walls: [
      { x: 13, y: 7, w: 6, h: 4 },
      { x: 8, y: 2, w: 1, h: 6 },
      { x: 23, y: 10, w: 1, h: 6 },
      { x: 3, y: 13, w: 7, h: 1 },
      { x: 22, y: 4, w: 7, h: 1 },
    ],
    grass: [
      { x: 2, y: 2, w: 2, h: 2 },
      { x: 28, y: 2, w: 2, h: 2 },
      { x: 2, y: 15, w: 3, h: 1 },
      { x: 17, y: 2, w: 2, h: 2 },
      { x: 29, y: 13, w: 1, h: 3 },
      { x: 11, y: 15, w: 3, h: 1 },
    ],
    crates: [[5, 7], [12, 2], [15, 13], [27, 10], [22, 7], [28, 11], [6, 11], [19, 12]],
    player: [2, 9],
    exit: [29, 9],
    intel: [[5, 2], [16, 15], [27, 2]],
    guards: [
      { route: [[3, 4], [3, 12]] },
      { route: [[11, 3], [20, 3]] },
      { route: [[11, 15], [20, 15]] },
      { route: [[28, 5], [28, 13]] },
      { route: [[10, 6], [21, 6]] },
    ],
    cameras: [
      { tx: 16, ty: 1, baseAngle: Math.PI / 2, sweep: 0.5, speed: 0.55 },
      { tx: 16, ty: 16, baseAngle: -Math.PI / 2, sweep: 0.5, speed: 0.45 },
    ],
  },
];

/** Build a level's grid and check it: every patrol tile walkable,
 *  every target on open ground, and the exit reachable from the start
 *  (flood fill over walkable tiles). Throws on the first problem. */
export function buildLevel(index) {
  const def = LEVELS[index];
  const cells = buildGrid(def);
  const problems = [];
  const walkable = (tx, ty) => !isSolid(cells, tx, ty);
  const checkOpen = (tx, ty, what) => {
    if (!walkable(tx, ty)) problems.push(`${what} at ${tx},${ty} is not walkable`);
  };
  checkOpen(def.player[0], def.player[1], 'player start');
  checkOpen(def.exit[0], def.exit[1], 'exit');
  for (const [x, y] of def.intel) checkOpen(x, y, 'intel');
  for (const g of def.guards) {
    for (const [x, y] of g.route) checkOpen(x, y, 'guard waypoint');
  }
  // Flood fill from the player start over walkable tiles.
  const seen = new Set([`${def.player[0]},${def.player[1]}`]);
  const queue = [[def.player[0], def.player[1]]];
  while (queue.length > 0) {
    const [cx, cy] = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = `${nx},${ny}`;
      if (!seen.has(key) && walkable(nx, ny)) {
        seen.add(key);
        queue.push([nx, ny]);
      }
    }
  }
  const reachable = (tx, ty) => seen.has(`${tx},${ty}`);
  if (!reachable(def.exit[0], def.exit[1])) problems.push('exit is not reachable');
  for (const [x, y] of def.intel) {
    if (!reachable(x, y)) problems.push(`intel at ${x},${y} is not reachable`);
  }
  if (problems.length > 0) {
    throw new Error(`Level ${index + 1} (${def.name}): ${problems.join('; ')}`);
  }
  return { def, cells };
}
