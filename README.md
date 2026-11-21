# SHADOWLINE — a stealth game

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/nuraliana/misty-heron-41/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/nuraliana/misty-heron-41/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A quiet thief. Three wings. One way out.

You are Wren, slipping through the Meridian Museum after dark. Each wing
holds three intel files and one green exit — and the exit only opens once
every file is yours. Guards patrol with sweeping yellow vision cones, and
a security camera never sleeps. Stay out of the cones, hide in the tall
grass, sneak behind the crates, and if a guard gets too close, throw a
coin and watch them walk away to investigate the clink.

## How to play

- **Move:** WASD or arrow keys.
- **Sneak:** hold SHIFT — slower, quieter, harder to spot. Running is loud:
  guards nearby will come to look at the noise.
- **Throw a coin:** E, or click where you want it to land. You carry 3 per
  level. A coin's clink pulls the nearest guard to investigate.
- **Intel:** walk over a glowing green file to take it (100 points each).
  All 3 open the exit.
- **Exit:** the green doorway. Reach it with all 3 files to clear the wing.
- **Pause:** P or Esc. **Mute:** M.

## The detection system

A guard's suspicion rises while you are inside its cone and in its line of
sight — faster up close, slower while you sneak, never while you stand in
grass or behind a crate. Let it fall by breaking line of sight: at half
suspicion a guard walks over to search where it last saw you; at full
suspicion it raises the alarm and chases. Lose it for a few seconds and it
falls back to searching, then to its patrol. Cameras sweep on their own and
call every guard to you when they are sure.

Get caught and you lose a life and return to the wing's entrance — the files
you already took stay taken. Three lives. Clear a wing without ever being
seen for a +500 ghost bonus.

## The three wings

1. **The Gallery** — three patrolling guards, open halls, learn the routes.
2. **The Vault** — four guards, a camera, and a single door between the halls.
3. **The Rotunda** — five guards, two cameras, and no easy road to the exit.

## Play it

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome — no build step, no network request:

```
node serve.ts
```

then open http://localhost:8080. `?seed=N` fixes the level's random choices;
`?shot=start|play|alert|win` stages a scene for a screenshot.

## How it is built

Plain ES modules under `game/src/`, one clear job each: `config` holds every
tuning number, `levels` the three wings, `vision` the line-of-sight test,
`world` the simulation (guards, cameras, noise, scoring), `input` the
keyboard and mouse, `audio` the synthesized WebAudio sounds, `render` the
canvas painting, `shots` the staged screenshot scenes, and `main` the boot
and fixed-step loop. `main.ts` at the root hands the game in by copying
`game/` and `screenshots/` and writing `dossier.json`.
