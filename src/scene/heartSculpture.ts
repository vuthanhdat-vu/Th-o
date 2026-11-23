import * as THREE from 'three';
import { createBirthdayCake, type BirthdayCakeRig } from './birthdayCake';

export type HeartSculptureRig = BirthdayCakeRig;

/**
 * Evaluates a point on the classic smooth heart contour for angle u in [0, 2π].
 */
function sampleHeartContour(u: number, scale: number): { x: number; y: number } {
  const s = Math.sin(u);
  const x = 16 * s * s * s * 0.078 * scale;
  const y =
    (13 * Math.cos(u) -
      5 * Math.cos(2 * u) -
      2 * Math.cos(3 * u) -
      Math.cos(4 * u)) *
    0.078 *
    scale;
  return { x, y };
}

/**
 * Keeps exported 2D shape helper for particles.
 */
export function createHeartShape(scale = 1): THREE.Shape {
  const shape = new THREE.Shape();
  const segments = 64;
  for (let i = 0; i <= segments; i += 1) {
    const u = (i / segments) * Math.PI * 2;
    const pt = sampleHeartContour(u, scale);
    if (i === 0) shape.moveTo(pt.x, pt.y);
    else shape.lineTo(pt.x, pt.y);
  }
  shape.closePath();
  return shape;
}

/**
 * Replaces the old heart sculpture with the gorgeous 3D Birthday Cake.
 */
export function createHeartSculpture(
  isSoftwareGl: boolean,
  maxAnisotropy: number,
): HeartSculptureRig {
  return createBirthdayCake(isSoftwareGl, maxAnisotropy);
}
