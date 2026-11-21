// SHADOWLINE — staged scenes for screenshots. Each scene is the real
// game with a real world state: the title screen, a mid-play sneak, a
// guard in full alarm beside the player, and the victory screen. The
// renderer paints them exactly as it paints live play.

import { GUARD, TILE } from './config.js';
import { tileCenter } from './levels.js';
import { createWorld } from './world.js';

/**
 * Build the state a screenshot needs. Returns { screen, world } where
 * screen is one of the renderer's screen names. The world is staged,
 * never stepped: what you see is what the code drew.
 */
export function stageShot(name, seed) {
  if (name === 'start') {
    return { screen: 'title', world: createWorld(seed, 0) };
  }
  if (name === 'play') {
    const world = createWorld(seed, 0);
    // Wren sneaking through the grass at the top-left, a guard's cone
    // sweeping just past her.
    const g = tileCenter(2, 2);
    world.player.x = g.x;
    world.player.y = g.y + 10;
    world.player.sneaking = true;
    world.player.facing = Math.PI / 2;
    world.player.hidden = true;
    const guard = world.guards[0];
    guard.x = tileCenter(4, 6).x;
    guard.y = tileCenter(4, 6).y;
    guard.facing = -Math.PI / 2;
    guard.suspicion = 0.2;
    const intel = world.intel[0];
    intel.taken = false;
    return { screen: 'play', world };
  }
  if (name === 'alert') {
    const world = createWorld(seed, 1);
    // A guard in full alarm, cone red, closing on Wren by the door.
    const p = tileCenter(14, 9);
    world.player.x = p.x;
    world.player.y = p.y;
    world.player.facing = Math.PI;
    const guard = world.guards[3];
    guard.x = tileCenter(17, 9).x;
    guard.y = tileCenter(17, 9).y;
    guard.facing = Math.PI;
    guard.state = 'chase';
    guard.suspicion = 1;
    guard.lastSeen = { x: p.x, y: p.y };
    world.ghost = false;
    world.message = 'Alarm! A guard is chasing you — break line of sight!';
    world.messageT = 99;
    return { screen: 'play', world };
  }
  if (name === 'win') {
    const world = createWorld(seed, 2);
    world.status = 'won';
    world.score = 2340;
    world.intelGot = 3;
    for (const f of world.intel) f.taken = true;
    world.exit.open = true;
    return { screen: 'win', world };
  }
  return { screen: 'title', world: createWorld(seed, 0) };
}
