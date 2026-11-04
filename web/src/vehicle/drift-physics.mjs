/**
 * Stand-alone vehicle-dynamics prototype for the original Drift Evolution mode.
 *
 * Coordinate system: X/Z is the world plane; positive yaw turns toward +Z.
 * Body-space vx is forward speed and vy is speed to the vehicle's right.
 * Inputs and outputs use SI units (metres, seconds, kilograms, newtons, radians).
 *
 * This module deliberately does not read or write NFSU2 guest memory. It is an
 * isolated simulation kernel to validate vehicle data and handling before any
 * renderer, input system, or legacy-game integration is attempted.
 */

const G = 9.80665;
const AIR_DENSITY = 1.225;
const EPSILON = 1e-6;
const MAX_STEP_SECONDS = 0.1;
const MAX_SUBSTEP_SECONDS = 1 / 120;

export const DEFAULT_VEHICLE_CONFIG = Object.freeze({
  massKg: 1480,
  wheelbaseM: 2.92,
  frontWeightRatio: 0.54,
  cgHeightM: 0.52,
  yawInertiaKgM2: 2850,
  maxSteerAngleRad: 0.52,
  enginePowerKw: 360,
  maxDriveForceN: 7200,
  drivetrainEfficiency: 0.88,
  maxBrakeForceN: 15500,
  rollingResistance: 0.014,
  dragCoefficient: 0.32,
  frontalAreaM2: 2.25,
  frontCorneringStiffnessNPerRad: 82000,
  rearCorneringStiffnessNPerRad: 90000,
  tireFriction: 1.08,
  handbrakeRearFriction: 0.24,
  lowSpeedSlipReferenceMps: 2.5,
});

const CONFIG_RANGES = Object.freeze({
  massKg: [500, 4000],
  wheelbaseM: [1.8, 4.5],
  frontWeightRatio: [0.35, 0.7],
  cgHeightM: [0.2, 1.2],
  yawInertiaKgM2: [400, 12000],
  maxSteerAngleRad: [0.15, 0.9],
  enginePowerKw: [20, 1500],
  maxDriveForceN: [500, 30000],
  drivetrainEfficiency: [0.5, 1],
  maxBrakeForceN: [1000, 50000],
  rollingResistance: [0.001, 0.06],
  dragCoefficient: [0.15, 0.8],
  frontalAreaM2: [1, 4],
  frontCorneringStiffnessNPerRad: [10000, 250000],
  rearCorneringStiffnessNPerRad: [10000, 250000],
  tireFriction: [0.35, 2],
  handbrakeRearFriction: [0.05, 1.2],
  lowSpeedSlipReferenceMps: [0.5, 8],
});

/** Clamp a finite numeric control to its documented range. */
function control(value, min, max) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : 0;
}

/**
 * Create a validated, frozen vehicle setup. Unknown properties are ignored so
 * imported car data cannot accidentally override simulation internals.
 * @param {Partial<typeof DEFAULT_VEHICLE_CONFIG>} [overrides]
 */
export function createVehicleConfig(overrides = {}) {
  const config = {};
  for (const [key, fallback] of Object.entries(DEFAULT_VEHICLE_CONFIG)) {
    const value = overrides[key] ?? fallback;
    const range = CONFIG_RANGES[key];
    if (!Number.isFinite(value) || value < range[0] || value > range[1]) {
      throw new RangeError(`${key} must be between ${range[0]} and ${range[1]}`);
    }
    config[key] = value;
  }
  return Object.freeze(config);
}

/**
 * Create a clean vehicle state. Body velocities are initially zero.
 * @param {Partial<{x: number, z: number, yaw: number, vx: number, vy: number, yawRate: number}>} [initial]
 */
export function createVehicleState(initial = {}) {
  const state = {
    x: initial.x ?? 0,
    z: initial.z ?? 0,
    yaw: initial.yaw ?? 0,
    vx: initial.vx ?? 0,
    vy: initial.vy ?? 0,
    yawRate: initial.yawRate ?? 0,
    ax: 0,
    ay: 0,
    driftAngleRad: 0,
    frontSlipRad: 0,
    rearSlipRad: 0,
  };
  for (const [key, value] of Object.entries(state)) {
    if (!Number.isFinite(value)) throw new TypeError(`${key} must be a finite number`);
  }
  return Object.freeze(state);
}

/**
 * Advance one RWD vehicle simulation step.
 * @param {ReturnType<typeof createVehicleConfig>} config
 * @param {ReturnType<typeof createVehicleState>} state
 * @param {{throttle?: number, brake?: number, steering?: number, handbrake?: number}} input
 * @param {number} dtSeconds
 */
export function stepVehicle(config, state, input = {}, dtSeconds = 1 / 60) {
  if (!Number.isFinite(dtSeconds) || dtSeconds < 0) throw new RangeError('dtSeconds must be a finite, non-negative number');
  if (dtSeconds === 0) return state;

  const dt = Math.min(dtSeconds, MAX_STEP_SECONDS);
  const n = Math.max(1, Math.ceil(dt / MAX_SUBSTEP_SECONDS));
  const h = dt / n;
  const throttle = control(input.throttle ?? 0, 0, 1);
  const brake = control(input.brake ?? 0, 0, 1);
  const steering = control(input.steering ?? 0, -1, 1);
  const handbrake = control(input.handbrake ?? 0, 0, 1);

  let x = state.x, z = state.z, yaw = state.yaw;
  let vx = state.vx, vy = state.vy, yawRate = state.yawRate;
  let ax = state.ax, ay = state.ay;
  let frontSlip = 0, rearSlip = 0;

  const lf = config.wheelbaseM * (1 - config.frontWeightRatio);
  const lr = config.wheelbaseM * config.frontWeightRatio;
  const steerAngle = steering * config.maxSteerAngleRad;

  for (let i = 0; i < n; i++) {
    const speedForSlip = Math.max(Math.abs(vx), config.lowSpeedSlipReferenceMps);
    const speedFactor = Math.min(1, Math.abs(vx) / config.lowSpeedSlipReferenceMps);

    frontSlip = Math.atan2(vy + lf * yawRate, speedForSlip) - steerAngle;
    rearSlip = Math.atan2(vy - lr * yawRate, speedForSlip);

    const totalLoad = config.massKg * G;
    const transfer = config.massKg * ax * config.cgHeightM / config.wheelbaseM;
    const frontLoad = Math.max(totalLoad * 0.08, totalLoad * config.frontWeightRatio - transfer);
    const rearLoad = Math.max(totalLoad * 0.08, totalLoad - frontLoad);

    const rearMu = config.tireFriction + (config.handbrakeRearFriction - config.tireFriction) * handbrake;
    const frontLimit = config.tireFriction * frontLoad * speedFactor;
    const rearLimit = rearMu * rearLoad * speedFactor;
    const rearTractionLimit = rearMu * rearLoad;
    const fyFront = clampForce(-frontSlip * config.frontCorneringStiffnessNPerRad, frontLimit);
    const fyRear = clampForce(-rearSlip * config.rearCorneringStiffnessNPerRad, rearLimit);

    const engineForce = Math.min(
      config.maxDriveForceN,
      config.enginePowerKw * 1000 * config.drivetrainEfficiency / Math.max(Math.abs(vx), 5),
    ) * throttle;
    const rearLongitudinalLimit = Math.sqrt(Math.max(0, rearTractionLimit * rearTractionLimit - fyRear * fyRear));
    const driveForce = Math.min(engineForce, rearLongitudinalLimit);

    const brakeMagnitude = brake * config.maxBrakeForceN;
    const brakeForce = vx > EPSILON ? -brakeMagnitude : vx < -EPSILON ? brakeMagnitude : 0;
    const handbrakeForce = handbrake * config.maxBrakeForceN * 0.42;
    const handbrakeBrake = vx > EPSILON ? -handbrakeForce : vx < -EPSILON ? handbrakeForce : 0;

    const drag = 0.5 * AIR_DENSITY * config.dragCoefficient * config.frontalAreaM2 * vx * Math.abs(vx);
    const rolling = Math.abs(vx) > EPSILON ? config.rollingResistance * totalLoad * Math.sign(vx) : 0;
    const fx = driveForce + brakeForce + handbrakeBrake - drag - rolling;

    const longitudinalAccel = fx / config.massKg + vy * yawRate;
    const lateralAccel = (fyFront + fyRear) / config.massKg - vx * yawRate;
    const yawAccel = (lf * fyFront - lr * fyRear) / config.yawInertiaKgM2;

    ax = longitudinalAccel;
    ay = lateralAccel;
    vx += longitudinalAccel * h;
    vy += lateralAccel * h;
    yawRate += yawAccel * h;
    if (Math.abs(vx) < 0.015 && throttle === 0 && brake > 0) vx = 0;
    if (Math.abs(vx) < 0.015 && Math.abs(vy) < 0.015 && throttle === 0) { vx = 0; vy = 0; }

    yaw += yawRate * h;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    x += (vx * cos - vy * sin) * h;
    z += (vx * sin + vy * cos) * h;
  }

  const driftAngleRad = Math.atan2(vy, Math.max(Math.abs(vx), 0.1));
  const next = { x, z, yaw, vx, vy, yawRate, ax, ay, driftAngleRad, frontSlipRad: frontSlip, rearSlipRad: rearSlip };
  for (const [key, value] of Object.entries(next)) {
    if (!Number.isFinite(value)) throw new Error(`vehicle simulation produced a non-finite ${key}`);
  }
  return Object.freeze(next);
}

function clampForce(value, limit) {
  return Math.min(limit, Math.max(-limit, value));
}
