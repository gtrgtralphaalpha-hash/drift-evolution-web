import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVehicleConfig,
  createVehicleState,
  stepVehicle,
} from '../src/vehicle/drift-physics.mjs';

const config = createVehicleConfig();
const finiteState = state => Object.values(state).every(Number.isFinite);

test('vehicle configuration rejects impossible setup values', () => {
  assert.throws(() => createVehicleConfig({ massKg: -10 }), RangeError);
  assert.throws(() => createVehicleConfig({ frontWeightRatio: 0.9 }), RangeError);
});

test('vehicle state starts at rest and is immutable', () => {
  const state = createVehicleState();
  assert.equal(state.vx, 0);
  assert.equal(state.vy, 0);
  assert.equal(Object.isFrozen(state), true);
});

test('RWD throttle accelerates the vehicle forward', () => {
  let state = createVehicleState();
  for (let i = 0; i < 120; i++) state = stepVehicle(config, state, { throttle: 1 }, 1 / 60);
  assert.ok(state.vx > 8, `expected forward speed > 8 m/s, got ${state.vx}`);
  assert.ok(state.x > 0);
  assert.equal(state.z, 0);
});

test('coasting drag and rolling resistance reduce forward speed', () => {
  let state = createVehicleState({ vx: 25 });
  for (let i = 0; i < 120; i++) state = stepVehicle(config, state, {}, 1 / 60);
  assert.ok(state.vx < 25);
  assert.ok(state.vx > 0);
});

test('steering creates a finite yaw response at speed', () => {
  const state = stepVehicle(config, createVehicleState({ vx: 22 }), { steering: 0.6 }, 1 / 60);
  assert.ok(state.yawRate > 0, `expected positive yaw rate, got ${state.yawRate}`);
  assert.ok(finiteState(state));
});

test('handbrake reduces rear grip and allows a larger drift angle', () => {
  const initial = createVehicleState({ vx: 24, vy: 5, yawRate: 0.1 });
  const normal = stepVehicle(config, initial, { steering: -0.3 }, 1 / 60);
  const hb = stepVehicle(config, initial, { steering: -0.3, handbrake: 1 }, 1 / 60);
  assert.ok(Math.abs(hb.driftAngleRad) > Math.abs(normal.driftAngleRad));
  assert.ok(finiteState(hb));
});

test('invalid time steps are rejected; a zero step preserves state', () => {
  const state = createVehicleState({ vx: 10 });
  assert.throws(() => stepVehicle(config, state, {}, -0.01), RangeError);
  assert.equal(stepVehicle(config, state, {}, 0), state);
});

test('oversized frames are capped and do not create non-finite state', () => {
  const state = stepVehicle(config, createVehicleState({ vx: 30 }), { throttle: 1, steering: 1 }, 0.5);
  assert.ok(finiteState(state));
});
