// SHADOWLINE — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area (32 by 18 tiles of 40 px);
// the renderer scales it to the window, so no rule below depends on screen size.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const FIELD = { width: COLS * TILE, height: ROWS * TILE };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 205,
  sneakSpeed: 105,
  /** How far running footsteps carry, in pixels. */
  noiseRadius: 170,
  /** How far sneaking footsteps carry, in pixels. */
  sneakNoiseRadius: 55,
};

export const LIVES = 3;
export const COINS_PER_LEVEL = 3;
/** How far a thrown coin flies, in pixels, and the radius its clink carries. */
export const COIN = { throwDistance: 190, noiseRadius: 210 };

export const GUARD = {
  radius: 14,
  /** Half-angle of a vision cone, in radians. */
  halfAngle: 0.61,
  /** How far a guard can see, in pixels. */
  range: 235,
  /** Seconds a guard waits at each patrol waypoint, looking around. */
  pauseTime: 1.1,
  /** How fast suspicion (0..1) rises while the player is seen, per second. */
  detectRate: 0.85,
  /** How fast suspicion falls while the player is unseen, per second. */
  calmRate: 0.3,
  /** Above this, a guard is suspicious and walks to where it last saw you. */
  suspectAt: 0.45,
  /** At 1.0 a guard raises the alarm and chases. */
  alarmAt: 1.0,
  chaseSpeed: 235,
  searchSpeed: 150,
  patrolSpeed: 95,
};

export const CAMERA = {
  range: 215,
  halfAngle: 0.5,
  detectRate: 0.9,
  calmRate: 0.35,
};

export const SCORE = {
  intel: 100,
  levelTimeBonus: 400,
  ghostBonus: 500,
  caughtPenalty: 150,
};

export const PALETTE = {
  backdrop: '#0b0e14',
  floorA: '#171c26',
  floorB: '#1b212e',
  floorLine: '#222a3a',
  wall: '#2c3550',
  wallTop: '#46537a',
  crate: '#7a5a33',
  crateEdge: '#a67c44',
  grass: '#1e3d24',
  grassBlade: '#2c5a33',
  player: '#37e0c8',
  playerRing: '#9ff5e8',
  guard: '#ff5a4e',
  guardBody: '#c93a30',
  coneCalm: 'rgba(255, 214, 64, 0.20)',
  coneCalmEdge: 'rgba(255, 214, 64, 0.55)',
  coneSuspect: 'rgba(255, 140, 40, 0.30)',
  coneAlarm: 'rgba(255, 60, 50, 0.35)',
  intel: '#7dff5e',
  intelGlow: 'rgba(125, 255, 94, 0.35)',
  exit: '#3dff7a',
  exitLocked: '#ff5a4e',
  coin: '#ffd640',
  text: '#eef1f5',
  muted: '#8b93a3',
  panel: '#161b26',
  panelEdge: '#2c3550',
  danger: '#ff5a4e',
  gold: '#ffd640',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'shadowline.best';
