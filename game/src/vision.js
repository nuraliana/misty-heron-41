// SHADOWLINE — seeing. A guard (or camera) sees the player when the
// player is inside its vision cone, close enough, and in line of sight:
// a grid raycast that walls and crates block, grass never does.

import { TILE } from './config.js';
import { blocksSight } from './levels.js';

export { blocksSight };

/** Angle from (x1,y1) to (x2,y2), in radians. Screen coords: y grows down. */
export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** True when the target angle sits inside a cone of halfAngle around facing. */
export function inCone(facing, halfAngle, tx, ty, x, y) {
  const a = angleTo(x, y, tx, ty);
  return Math.abs(angleDiff(a, facing)) <= halfAngle;
}

/**
 * Line of sight between two pixel points, sampled along the segment.
 * Walls and crates block it. Steps are a third of a tile, so no thin
 * wall can be skipped between two samples.
 */
export function hasLineOfSight(cells, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (TILE / 3)));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (blocksSight(cells, tx, ty)) return false;
  }
  return true;
}

/**
 * Full vision test for one watcher (guard or camera) against the player:
 * in range, in cone, line of sight, and the player not hidden in grass.
 * Returns { seen, dist } — seen false carries the distance anyway.
 */
export function canSee(cells, watcher, player, playerHidden) {
  const dx = player.x - watcher.x;
  const dy = player.y - watcher.y;
  const dist = Math.hypot(dx, dy);
  if (dist > watcher.range) return { seen: false, dist };
  if (!inCone(watcher.facing, watcher.halfAngle, player.x, player.y, watcher.x, watcher.y)) {
    return { seen: false, dist };
  }
  if (playerHidden) return { seen: false, dist };
  if (!hasLineOfSight(cells, watcher.x, watcher.y, player.x, player.y)) {
    return { seen: false, dist };
  }
  return { seen: true, dist };
}
