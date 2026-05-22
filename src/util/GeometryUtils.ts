import * as THREE from 'three';
import { MATH } from '../constants';

export function segmentToSegmentDistance(
  a1: THREE.Vector2, a2: THREE.Vector2,
  b1: THREE.Vector2, b2: THREE.Vector2,
): number {
  const dA = a2.clone().sub(a1);
  const dB = b2.clone().sub(b1);
  const r = a1.clone().sub(b1);

  const lenASq = dA.lengthSq();
  const lenBSq = dB.lengthSq();
  const f = dB.dot(r);

  if (lenASq <= MATH.EPSILON && lenBSq <= MATH.EPSILON) return a1.distanceTo(b1);
  if (lenASq <= MATH.EPSILON) return a1.distanceTo(closestPointOnSegment(b1, b2, a1));
  if (lenBSq <= MATH.EPSILON) return b1.distanceTo(closestPointOnSegment(a1, a2, b1));

  const c = dA.dot(r);
  const b = dA.dot(dB);
  const denom = lenASq * lenBSq - b * b;

  let s = denom !== 0
    ? Math.max(0, Math.min(1, (b * f - c * lenBSq) / denom))
    : 0;

  let t = (c + b * s) / lenBSq;

  if (t < 0) {
    t = 0;
    s = Math.max(0, Math.min(1, -c / lenASq));
  } else if (t > 1) {
    t = 1;
    s = Math.max(0, Math.min(1, (b - c) / lenASq));
  }

  const closestOnA = a1.clone().add(dA.clone().multiplyScalar(s));
  const closestOnB = b1.clone().add(dB.clone().multiplyScalar(Math.max(0, Math.min(1, t))));
  return closestOnA.distanceTo(closestOnB);
}

export function closestPointOnSegment(a: THREE.Vector2, b: THREE.Vector2, p: THREE.Vector2): THREE.Vector2 {
  const ab = b.clone().sub(a);
  const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()));
  return a.clone().add(ab.multiplyScalar(t));
}
