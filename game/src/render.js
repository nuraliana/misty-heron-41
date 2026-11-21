// SHADOWLINE — everything the eye sees. One canvas, one logical
// field of 1280x720, scaled to the window with letterboxing. The world
// is drawn top-down: checker floor, walls with a lit edge, tall grass,
// crates, glowing intel, the exit door, guards with their vision cones,
// sweeping cameras, the player, and a HUD that always tells you how
// seen you are. Menu screens paint over the frozen world.

import { COLS, FIELD, FONT, GUARD, PALETTE, ROWS, TILE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEVEL = 'level';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** Deterministic speckle for a tile, so grass blades never flicker. */
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

function coneColor(suspicion) {
  if (suspicion >= 1) return { fill: PALETTE.coneAlarm, edge: 'rgba(255, 60, 50, 0.8)' };
  if (suspicion >= GUARD.suspectAt) {
    return { fill: PALETTE.coneSuspect, edge: 'rgba(255, 140, 40, 0.7)' };
  }
  return { fill: PALETTE.coneCalm, edge: PALETTE.coneCalmEdge };
}

function drawCone(ctx, x, y, facing, halfAngle, range, suspicion) {
  const { fill, edge } = coneColor(suspicion);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawGuard(ctx, g) {
  drawCone(ctx, g.x, g.y, g.facing, GUARD.halfAngle, GUARD.range, g.suspicion);
  ctx.beginPath();
  ctx.arc(g.x, g.y, GUARD.radius + 3, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.guard;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(g.x, g.y, GUARD.radius - 3, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.guardBody;
  ctx.fill();
  // Facing tick.
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(g.facing) * (GUARD.radius + 7), g.y + Math.sin(g.facing) * (GUARD.radius + 7));
  ctx.strokeStyle = PALETTE.guard;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Suspicion arc above the head.
  if (g.suspicion > 0.02) {
    ctx.beginPath();
    ctx.arc(g.x, g.y, GUARD.radius + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g.suspicion);
    ctx.strokeStyle = g.suspicion >= GUARD.suspectAt ? '#ff8c28' : '#ffd640';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

function drawCamera(ctx, cam) {
  drawCone(ctx, cam.x, cam.y, cam.facing, cam.halfAngle, cam.range, cam.suspicion);
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.rotate(cam.facing);
  ctx.fillStyle = '#3a4358';
  ctx.fillRect(-7, -5, 14, 10);
  ctx.fillStyle = cam.suspicion > 0.3 ? '#ff5a4e' : '#ffd640';
  ctx.beginPath();
  ctx.arc(8, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, ox: 0, oy: 0, w: 0, h: 0 };

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const scale = Math.min(w / FIELD.width, h / FIELD.height) * dpr;
    view.scale = scale;
    view.ox = (canvas.width - FIELD.width * scale) / 2;
    view.oy = (canvas.height - FIELD.height * scale) / 2;
    view.w = w;
    view.h = h;
  }

  function toWorld(sx, sy) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    return {
      x: (sx * dpr - view.ox) / view.scale,
      y: (sy * dpr - view.oy) / view.scale,
    };
  }

  function drawWorld(world) {
    const { cells } = world;
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Floor.
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const c = cells[y][x];
        if (c === 'wall') continue;
        ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        if (c === 'grass') {
          ctx.fillStyle = PALETTE.grass;
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
          ctx.strokeStyle = PALETTE.grassBlade;
          ctx.lineWidth = 1.5;
          for (let b = 0; b < 5; b += 1) {
            const h = hash2(x * 5 + b, y);
            const bx = x * TILE + 6 + h * (TILE - 12);
            const by = y * TILE + 8 + hash2(x, y * 5 + b) * (TILE - 16);
            ctx.beginPath();
            ctx.moveTo(bx, by + 8);
            ctx.lineTo(bx + 3, by - 6);
            ctx.stroke();
          }
        }
      }
    }
    // Floor grid lines.
    ctx.strokeStyle = PALETTE.floorLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x += 1) {
      ctx.moveTo(x * TILE + 0.5, 0);
      ctx.lineTo(x * TILE + 0.5, FIELD.height);
    }
    for (let y = 0; y <= ROWS; y += 1) {
      ctx.moveTo(0, y * TILE + 0.5);
      ctx.lineTo(FIELD.width, y * TILE + 0.5);
    }
    ctx.stroke();
    // Walls and crates.
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const c = cells[y][x];
        if (c === 'wall') {
          ctx.fillStyle = PALETTE.wall;
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
          if (y + 1 >= ROWS || cells[y + 1][x] !== 'wall') {
            ctx.fillStyle = PALETTE.wallTop;
            ctx.fillRect(x * TILE, y * TILE + TILE - 5, TILE, 5);
          }
        } else if (c === 'crate') {
          ctx.fillStyle = PALETTE.crate;
          ctx.fillRect(x * TILE + 3, y * TILE + 3, TILE - 6, TILE - 6);
          ctx.strokeStyle = PALETTE.crateEdge;
          ctx.lineWidth = 2;
          ctx.strokeRect(x * TILE + 3, y * TILE + 3, TILE - 6, TILE - 6);
          ctx.beginPath();
          ctx.moveTo(x * TILE + 3, y * TILE + 3);
          ctx.lineTo(x * TILE + TILE - 3, y * TILE + TILE - 3);
          ctx.moveTo(x * TILE + TILE - 3, y * TILE + 3);
          ctx.lineTo(x * TILE + 3, y * TILE + TILE - 3);
          ctx.stroke();
        }
      }
    }
    // Intel files.
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 280);
    for (const f of world.intel) {
      if (f.taken) continue;
      ctx.save();
      ctx.shadowColor = PALETTE.intel;
      ctx.shadowBlur = 18 * pulse;
      ctx.fillStyle = PALETTE.intel;
      ctx.fillRect(f.x - 8, f.y - 11, 16, 22);
      ctx.fillStyle = '#0b0e14';
      ctx.fillRect(f.x - 4, f.y - 6, 8, 3);
      ctx.fillRect(f.x - 4, f.y, 8, 3);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(f.x, f.y, 20 + 6 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = PALETTE.intelGlow;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Exit door.
    const ex = world.exit;
    ctx.save();
    ctx.shadowColor = ex.open ? PALETTE.exit : PALETTE.exitLocked;
    ctx.shadowBlur = ex.open ? 22 : 8;
    ctx.fillStyle = ex.open ? PALETTE.exit : PALETTE.exitLocked;
    ctx.fillRect(ex.x - 16, ex.y - 18, 32, 36);
    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(ex.x - 10, ex.y - 12, 20, 24);
    ctx.restore();
    if (ex.open) {
      ctx.fillStyle = PALETTE.exit;
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', ex.x, ex.y - 26);
    } else {
      ctx.fillStyle = PALETTE.exitLocked;
      ctx.font = `bold 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('LOCKED', ex.x, ex.y - 26);
    }
    // Thrown coins.
    for (const c of world.coins) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.coin;
      ctx.fill();
      if (c.clinked) {
        const rr = 8 + (c.t - 0.35) * 90;
        ctx.beginPath();
        ctx.arc(c.x, c.y, Math.min(rr, 60), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 214, 64, ${Math.max(0, 0.7 - (c.t - 0.35))})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    // Cameras under guards, guards over the floor.
    for (const cam of world.cameras) drawCamera(ctx, cam);
    for (const g of world.guards) drawGuard(ctx, g);
    // Player.
    const p = world.player;
    ctx.save();
    if (p.hidden) ctx.globalAlpha = 0.55;
    if (p.grace > 0 && Math.floor(performance.now() / 150) % 2 === 0) ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 13 + 4, 0, Math.PI * 2);
    ctx.strokeStyle = PALETTE.playerRing;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.player;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.facing) * 18, p.y + Math.sin(p.facing) * 18);
    ctx.strokeStyle = '#0b0e14';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    if (p.hidden) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN', p.x, p.y - 24);
    }
  }

  function drawHud(world, best, muted) {
    ctx.fillStyle = 'rgba(11, 14, 20, 0.82)';
    ctx.fillRect(0, 0, FIELD.width, 44);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(0, 44, FIELD.width, 1);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 17px ${FONT}`;
    ctx.fillText(`${world.def.name}  ·  Wing ${world.levelIndex + 1}/3`, 14, 23);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(`SCORE ${world.score}`, FIELD.width / 2, 23);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `16px ${FONT}`;
    const mins = Math.floor(world.time / 60);
    const secs = Math.floor(world.time % 60);
    const timeText = `${mins}:${String(secs).padStart(2, '0')}`;
    let right = FIELD.width - 14;
    ctx.fillText(timeText, right, 23);
    right -= 62;
    ctx.fillStyle = '#ff5a4e';
    ctx.fillText(`♥`.repeat(Math.max(0, world.lives)), right, 23);
    right -= 58;
    ctx.fillStyle = PALETTE.intel;
    ctx.fillText(`⬢ ${world.intelGot}/${world.intel.length}`, right, 23);
    right -= 92;
    ctx.fillStyle = PALETTE.coin;
    ctx.fillText(`◉ ${world.player.coins}`, right, 23);
    // Suspicion eye, top centre under the score.
    let maxS = 0;
    for (const g of world.guards) maxS = Math.max(maxS, g.suspicion);
    for (const c of world.cameras) maxS = Math.max(maxS, c.suspicion);
    const eyeW = 150;
    const eyeX = FIELD.width / 2 - eyeW / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(eyeX, 50, eyeW, 7);
    ctx.fillStyle = maxS >= 1 ? '#ff3b30' : maxS >= 0.45 ? '#ff8c28' : '#ffd640';
    ctx.fillRect(eyeX, 50, eyeW * Math.max(0, Math.min(1, maxS)), 7);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(maxS >= 1 ? 'SPOTTED — RUN' : maxS >= 0.45 ? 'SUSPICIOUS' : 'UNSEEN', FIELD.width / 2, 66);
    // Announcement banner.
    if (world.messageT > 0 && world.message) {
      ctx.fillStyle = 'rgba(22, 27, 38, 0.92)';
      const bw = Math.min(FIELD.width - 120, 40 + world.message.length * 7.5);
      ctx.fillRect(FIELD.width / 2 - bw / 2, 78, bw, 30);
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.strokeRect(FIELD.width / 2 - bw / 2, 78, bw, 30);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(world.message, FIELD.width / 2, 94);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `12px ${FONT}`;
    ctx.fillText(muted ? 'MUTED (M)' : 'WASD move · SHIFT sneak · E/click coin · P pause · M mute', 14, FIELD.height - 12);
    ctx.textAlign = 'right';
    ctx.fillText(`BEST ${best}`, FIELD.width - 14, FIELD.height - 12);
    ctx.textAlign = 'left';
  }

  function panel(title, lines, accent) {
    ctx.fillStyle = 'rgba(11, 14, 20, 0.86)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = `bold 52px ${FONT}`;
    ctx.fillText(title, FIELD.width / 2, 210);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `19px ${FONT}`;
    let y = 268;
    for (const line of lines) {
      ctx.fillText(line, FIELD.width / 2, y);
      y += 32;
    }
  }

  function draw(state) {
    resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    const world = state.world;
    if (world) drawWorld(world);
    if (state.screen === SCREEN_PLAY || state.screen === SCREEN_PAUSED) {
      if (world) drawHud(world, state.best, state.muted);
    }
    if (state.screen === SCREEN_TITLE) {
      panel('SHADOWLINE', [
        'You are Wren, slipping through the Meridian Museum after dark.',
        'Three wings. Three intel files a wing. One green exit — it opens',
        'only when every file is yours. Guards patrol with sweeping yellow',
        'cones; a camera never sleeps. Hide in the tall grass, slip behind',
        'crates, and throw a coin to pull a guard away from your path.',
        '',
        'WASD / arrows — move      SHIFT — sneak (slow, quiet, hard to see)',
        'E or click — throw a coin (3 a wing)      P — pause      M — mute',
        '',
        `BEST SCORE  ${state.best}`,
        '',
        'Press ENTER or click to begin.',
      ], PALETTE.player);
    } else if (state.screen === SCREEN_PAUSED) {
      panel('PAUSED', ['The museum waits. The guards do not.', '', 'P or Esc — resume      M — mute'], PALETTE.text);
    } else if (state.screen === SCREEN_LEVEL) {
      const clear = world.lastClear ?? { timeBonus: 0, ghostBonus: 0 };
      panel('WING CLEARED', [
        'That wing is behind you.',
        `Time bonus  +${clear.timeBonus}`,
        clear.ghostBonus > 0
          ? 'Ghost bonus  +500  — never seen.'
          : 'You were seen — no ghost bonus this wing.',
        '',
        `SCORE  ${world.score}`,
        '',
        'Press ENTER for the next wing.',
      ], PALETTE.exit);
    } else if (state.screen === SCREEN_OVER) {
      panel('CAUGHT', [
        'The museum keeps its secrets — this time.',
        '',
        `SCORE  ${world.score}      BEST  ${state.best}`,
        '',
        'Press ENTER to try again.',
      ], PALETTE.danger);
    } else if (state.screen === SCREEN_WIN) {
      panel('YOU VANISHED', [
        'Every file. Every wing. Never caught for good.',
        'The Meridian Museum never knew you were there.',
        '',
        `FINAL SCORE  ${world.score}      BEST  ${state.best}`,
        '',
        'Press ENTER to play again.',
      ], PALETTE.gold);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { view, resize, draw, toWorld };
}
