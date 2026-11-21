// SHADOWLINE — keyboard and mouse. Reads WASD/arrows, SHIFT to sneak,
// E or a click to throw a coin, P/Esc to pause, M to mute, Enter/Space
// to confirm on menus. Produces one frame of intent per tick.

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_THROW = 'throw';

const KEYS = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'sneak',
  ShiftRight: 'sneak',
  KeyE: 'throwKey',
  KeyP: 'pause',
  Escape: 'pause',
  KeyM: 'mute',
  Enter: 'confirm',
  Space: 'confirm',
};

export function createInput(canvas, onThrowAt) {
  const held = new Set();
  const pressed = new Set();
  let mouse = { x: 0, y: 0, down: false };

  function codeOf(e) {
    return KEYS[e.code] ?? null;
  }

  function onKeyDown(e) {
    const action = codeOf(e);
    if (!action) return;
    if (['up', 'down', 'left', 'right', 'confirm'].includes(action)) e.preventDefault();
    if (!e.repeat) pressed.add(action);
    held.add(action);
  }

  function onKeyUp(e) {
    const action = codeOf(e);
    if (action) held.delete(action);
  }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top, down: mouse.down };
  }

  function onMouseDown(e) {
    onMouseMove(e);
    mouse.down = true;
    if (onThrowAt) onThrowAt(mouse.x, mouse.y);
  }

  function onMouseUp() {
    mouse.down = false;
  }

  function onBlur() {
    held.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    /** Move direction for this tick: { mx, my } in -1..1, plus sneak. */
    readMove() {
      let mx = 0;
      let my = 0;
      if (held.has('left')) mx -= 1;
      if (held.has('right')) mx += 1;
      if (held.has('up')) my -= 1;
      if (held.has('down')) my += 1;
      return { mx, my, sneak: held.has('sneak') };
    },
    /** True once for each press of an action key (menus, pause, mute). */
    wasPressed(action) {
      return pressed.has(action);
    },
    /** Clear the one-shot presses; call once per frame after reading. */
    endFrame() {
      pressed.clear();
    },
    get mouse() {
      return mouse;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    },
  };
}
