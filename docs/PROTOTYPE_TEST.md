# Drift Evolution — single-car physics test

The first playable test slice is served at `/prototype/`. It is separate from the legacy game's main start page and uses the new RWD vehicle-dynamics module.

## What is in this build

- One orange, top-down placeholder vehicle using a rear-wheel-drive setup.
- A compact oval drift loop with cones and a start/finish stripe.
- A simulation-led handling profile and a more assisted Arcade profile.
- Keyboard and touch controls.
- Speed, RPM, drift angle, score, front/rear slip and lateral-speed readouts.
- Procedural Web Audio for a synthetic engine-like tone and tyre-slip noise.

The vehicle parameters are a test baseline inspired by a 2019 Dodge Charger Scat Pack specification. They are not a claim that the prototype is an exact replica of that car's dynamics. The on-screen car is a generic placeholder silhouette, not a Charger model. The audio is synthetic placeholder sound, not a real HEMI recording.

## Controls

| Input | Action |
|---|---|
| W / Up | Throttle |
| S / Down | Brake |
| A / Left | Steer left |
| D / Right | Steer right |
| Space | Handbrake |
| R | Reset car |
| P / Escape | Pause / resume |
| Touch buttons | Steering, throttle, brake and handbrake |

Press the start button once to enable the sound. Browsers commonly suspend Web Audio until a user gesture, so audio is deliberately started from the button press.

## Build and run

The existing browser server currently requires the original repository's compatible game-data folder at startup. From a development checkout with the prerequisites and game data configured:

```sh
web/start.sh --data "/path/to/Need for Speed Underground 2"
```

Open `http://localhost:8080/prototype/` in a browser. For a remote device, serve it from a secure HTTPS origin so the browser's security requirements are met.

The prototype's page assets are copied by `web/build.mjs` into `web/dist/prototype/`; its script is bundled as `web/dist/prototype/main.js`.

## Current limitations

This is an early top-down dynamics sandbox, not the full game. It does not yet include 3D vehicle models, gears or a measured torque curve, differential tuning, suspension travel, road-surface variation, collisions, tyre temperature, traffic, a finished city, career events or multiplayer. The tyre model is deliberately compact and must be tuned against repeatable tests and real driving references before it is used for production gameplay.

Use this scene to report whether launch, turn-in, counter-steer, handbrake rotation, straight-line stability and sound response feel believable. Do not treat the current score as a final drift scoring system.
