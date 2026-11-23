import * as THREE from 'three';
import { REALM_ANCHORS } from './realms';

export interface SkyConvoySample {
  phoenixPos: THREE.Vector3;
  phoenixQuat: THREE.Quaternion;
  framePos: THREE.Vector3;
  frameQuat: THREE.Quaternion;
}

// Module-level preallocated math objects (Zero GC in animation loop)
const _pPos = new THREE.Vector3();
const _fPos = new THREE.Vector3();
const _tan = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _lookMatrix = new THREE.Matrix4();
const _upVec = new THREE.Vector3(0, 1, 0);
const _quatRoll = new THREE.Quaternion();

/**
 * High-fidelity triangle wave approximation with smooth rounded crests and troughs.
 * Creates an unmistakable crisp ZIGZAG flight trajectory.
 */
function smoothedZigzag(theta: number): number {
  // Harmonic series for triangle wave: (8 / pi^2) * [sin(theta) - (1/9)*sin(3*theta) + (1/25)*sin(5*theta)]
  return 0.810569 * (Math.sin(theta) - 0.111111 * Math.sin(3 * theta) + 0.04 * Math.sin(5 * theta));
}

function smoothedZigzagDerivative(theta: number): number {
  return 0.810569 * (Math.cos(theta) - 0.333333 * Math.cos(3 * theta) + 0.20 * Math.cos(5 * theta));
}

/**
 * Evaluates the closed 3D sky flight trajectory at progress u in [0, 1).
 * - u in [0, 0.78]: Display Leg — 5 phoenixes flying head-to-tail strictly from LEFT to RIGHT in a bold zigzag.
 * - u in [0.78, 1.0]: Return Leg — soaring gracefully high up through the upper cloud deck in the background.
 */
function evaluateFlightTrajectory(
  u: number,
  outPos: THREE.Vector3,
  outTan: THREE.Vector3,
): void {
  // Wrap u to [0, 1)
  const normU = ((u % 1.0) + 1.0) % 1.0;

  if (normU < 0.78) {
    // -------------------------------------------------------------
    // DISPLAY LEG: Left-to-right bold zigzag traversing the sky
    // -------------------------------------------------------------
    const w = normU / 0.78; // 0.0 to 1.0

    // X travels monotonically from Left (-8.8) to Right (+8.8)
    const xSpan = 17.6;
    outPos.x = -8.8 + xSpan * w;
    outTan.x = xSpan / 0.78;

    // Y: 2 full zigzag oscillations (Up -> Down -> Up -> Down)
    // theta ranges from -PI/2 to 7*PI/2 (spanning 4*PI)
    const theta = w * Math.PI * 4.0 - Math.PI * 0.5;
    const yAmp = 1.05; // Total vertical swing ~ 2.1m
    const yCenter = 0.55;
    outPos.y = yCenter + yAmp * smoothedZigzag(theta);

    const dYdTheta = yAmp * smoothedZigzagDerivative(theta);
    outTan.y = dYdTheta * (Math.PI * 4.0 / 0.78);

    // Z: Gentle crescent arc concave toward the camera
    const zCurve = 1.45;
    const zBase = -0.75;
    const zOffset = -(1.0 - Math.cos((w - 0.5) * Math.PI)) * zCurve;
    outPos.z = zBase + zOffset;
    outTan.z = (Math.PI * Math.sin((w - 0.5) * Math.PI) * zCurve) / 0.78;
  } else {
    // -------------------------------------------------------------
    // RETURN LEG: Wide, high-altitude celestial gliding loop in the background
    // -------------------------------------------------------------
    const r = (normU - 0.78) / 0.22; // 0.0 to 1.0
    const rAngle = r * Math.PI;

    // X glides smoothly from +8.8 back to -8.8
    outPos.x = 8.8 - 17.6 * r;
    outTan.x = -17.6 / 0.22;

    // Y soars high into the cloud deck (up to +3.6)
    outPos.y = -0.5 + 4.2 * Math.sin(rAngle);
    outTan.y = (4.2 * Math.PI * Math.cos(rAngle)) / 0.22;

    // Z sweeps deep into the celestial background (down to -7.5)
    outPos.z = -2.2 - 5.5 * Math.sin(rAngle);
    outTan.z = (-5.5 * Math.PI * Math.cos(rAngle)) / 0.22;
  }

  outTan.normalize();
}

/**
 * Samples the full transform for bird i and its suspended photo frame i.
 * Ensures the 5 phoenixes fly single-file (nối đuôi nhau) along the zigzag trajectory.
 */
export function sampleSkyConvoy(
  birdIndex: number,
  elapsed: number,
  totalBirds: number,
  outSample: SkyConvoySample,
): void {
  // Flight loop duration: ~42 seconds for a peaceful, majestic glide
  const loopDuration = 42.0;
  const loopProgress = (elapsed / loopDuration) % 1.0;

  // Single-file convoy spacing: 0.105 in u produces ~2.4m spacing between birds
  // Generous spacing prevents photo frames (width 1.62m) from ever overlapping!
  const convoySpacing = 0.105;
  const birdProgress = loopProgress - birdIndex * convoySpacing;

  // 1. Evaluate trajectory position and forward tangent velocity
  evaluateFlightTrajectory(birdProgress, _pPos, _tan);

  // Subtle individual wing-beat bobbing
  const wingBob = Math.sin(elapsed * 2.2 + birdIndex * 0.95) * 0.07;
  const wingSway = Math.cos(elapsed * 1.8 + birdIndex * 0.85) * 0.04;

  outSample.phoenixPos.set(_pPos.x + wingSway, _pPos.y + wingBob, _pPos.z);

  // 2. Compute Phoenix orientation along flight tangent
  // Head faces along flight tangent vector (+X when traversing left to right)
  _lookTarget.copy(outSample.phoenixPos).add(_tan);
  _lookMatrix.lookAt(_lookTarget, outSample.phoenixPos, _upVec);
  outSample.phoenixQuat.setFromRotationMatrix(_lookMatrix);

  // Aerodynamic banking into curves and vertical climbs/dives
  const bank = -_tan.y * 0.28 + Math.cos(elapsed * 1.8 + birdIndex) * 0.04;
  _quatRoll.setFromAxisAngle(_tan, bank);
  outSample.phoenixQuat.premultiply(_quatRoll);

  // 3. Compute Frame position (suspended below phoenix via tether)
  // Tether length ~1.65m; photo trails slightly behind the bird's flight velocity vector
  const tetherDrop = 1.76;
  const trailDrag = 0.16; // Aerodynamic drag trail
  _fPos.set(
    outSample.phoenixPos.x - _tan.x * trailDrag,
    outSample.phoenixPos.y - tetherDrop,
    outSample.phoenixPos.z - _tan.z * trailDrag,
  );
  outSample.framePos.copy(_fPos);

  // 4. Compute Frame orientation (facing toward the camera view)
  const camPos = REALM_ANCHORS.sky.cameraPos;
  const skyCenter = REALM_ANCHORS.sky.center;
  // Local camera target in skyGroup space
  _lookTarget.set(
    camPos[0] - skyCenter[0],
    camPos[1] - skyCenter[1] + 0.4,
    camPos[2] - skyCenter[2],
  );

  _lookMatrix.lookAt(_lookTarget, _fPos, _upVec);
  outSample.frameQuat.setFromRotationMatrix(_lookMatrix);
}
