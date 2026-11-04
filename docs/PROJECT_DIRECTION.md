# Drift Evolution — project direction and technical foundation

> The repository name is a working project identifier, not the final game title. The final title and visual identity will be selected separately.

## Product direction

Build an original street-drifting game with its own city, vehicle roster, handling, sound identity, UI, progression and presentation. The intended driving feel is simulation-led, with an optional Arcade assistance preset. The target is a polished experience on desktop browsers and mobile devices; performance and handling quality must be demonstrated on real hardware rather than promised from a specification.

### Confirmed design decisions

- The existing Bayview setting is not the destination city. The new game will use an original city layout and original place names.
- Vehicle handling is RWD-first. The final playable roster should not include FWD cars. An AWD candidate may be converted to RWD only after its power delivery, differential, suspension and handling data are intentionally re-authored and tested; it must not be treated as a cosmetic flag change.
- The roster should favour Japanese and American vehicles, especially RWD platforms, with room for additional classes later.
- Tuning should eventually cover wheels, body parts, engine, suspension, tyres and exhaust.
- Each vehicle should retain a recognisable engine character. Exhaust upgrades should alter tone and response without replacing the underlying engine identity. Audio should be original or properly licensed for this project.
- Drift handling should account for weight transfer, front/rear grip, steering, counter-steer, handbrake, throttle and vehicle setup. Arcade assistance is a separate tuning layer, not a replacement for the simulation model.

## Repository reality and separation boundary

This repository currently hosts a browser port/recompilation of the PC release of Need for Speed: Underground 2. It expects the player to supply a compatible copy of that game; it does not contain the game's executable or data. Its current `runtime/drift.c` enables the legacy game's drift-event behaviour, and `runtime/carsfx.c` reproduces engine sounds for remote cars using the legacy game's sound assets.

Those systems are useful research references, but they are not yet the independent vehicle simulation, vehicle catalogue, city or audio library described above. New Drift Evolution systems must live behind a clean boundary and must not require the original game's executable, assets or data to run. Existing browser-port functionality should remain intact while the new mode is developed.

## First implementation slice: independent RWD vehicle dynamics

`web/src/vehicle/drift-physics.mjs` is the first isolated simulation kernel. It:

- uses SI units and a documented X/Z world plane;
- models a rear-wheel-drive powertrain force, aerodynamic drag and rolling resistance;
- calculates front/rear slip angles and lateral tyre forces;
- approximates longitudinal load transfer and the handbrake's rear-grip reduction;
- advances the vehicle with bounded substeps and returns immutable state;
- has no dependency on legacy guest memory, renderer state, or copyrighted game data.

This is a prototype foundation, not a finished tyre model. It does not yet model gears, a measured engine torque curve, differential behaviour, suspension travel, road surface changes, tyre temperature, collisions, reverse driving or a full combined-slip tyre model. Those are deliberate follow-on tasks.

## Delivery phases

1. **Foundation and verification** — preserve the existing browser build, document boundaries, establish deterministic vehicle-state tests, and audit the current game/runtime integration points.
2. **Playable handling slice** — connect the new RWD kernel to a dedicated test scene and input layer; add counter-steer and Arcade assistance; measure repeatable manoeuvres and tune against real driving references.
3. **Vehicle pipeline** — define data-driven vehicle specifications, torque curves, gearbox and differential setups; add a first licensed/original test vehicle and validate it before scaling the roster.
4. **Sound and customisation** — create per-engine sound profiles and layered load/overrun recordings; implement exhaust tone variations and a modular parts/tuning model.
5. **Original city and presentation** — build a new blockout, road surfaces, drift areas, lighting, camera behaviour, UI and progression using original or licensed assets.
6. **Modes and platforms** — add events and multiplayer after the single-player vehicle loop is stable; profile desktop and mobile separately and set realistic graphics presets.

## Asset and licensing rules

- Do not commit or redistribute the original game's executable, extracted content, music, vehicle models or textures.
- Do not copy or scrape vehicle models from 3D Tuning or another catalogue unless the relevant licence explicitly permits use in this project. Prefer commissioned, self-created or clearly licensed models and sounds.
- Keep attribution and licence notices for the MIT-licensed code already in this repository. The MIT code licence does not grant rights to EA's game content or third-party vehicle assets.

## Validation gates

A feature is not considered complete merely because it compiles. Vehicle work must pass deterministic unit tests, avoid non-finite states at supported time steps, and be exercised in a repeatable test scene. Performance changes must be measured on the target browsers and representative mobile hardware. The existing browser-port build and test suite must continue to pass independently of the new game mode.
