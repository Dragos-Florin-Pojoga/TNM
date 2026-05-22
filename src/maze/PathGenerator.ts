import * as THREE from 'three';
import { PATH_GENERATION } from '../constants';
import { segmentToSegmentDistance } from '../util/GeometryUtils';

export interface Point {
  x: number;
  y: number;
}

export interface PathSegment {
  start: THREE.Vector2;
  end: THREE.Vector2;
  angle: number;
  timestamp: number;
}

function createRng(seed: number): () => number {
  let state = seed;
  return () => {
    let t = (state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(array: T[], rng: () => number): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const TURN_ANGLES = [
  0,
  -Math.PI / 6, Math.PI / 6,
  -Math.PI / 4, Math.PI / 4,
  -Math.PI / 3, Math.PI / 3,
  -Math.PI / 2, Math.PI / 2,
];

export class PathGenerator {
  public corridorWidth: number;
  private segments: PathSegment[] = [];
  private rng: () => number = Math.random;

  constructor(corridorWidth: number) {
    this.corridorWidth = corridorWidth;
  }

  generate(timestamps: number[], speed: number, seed: number = 12345): PathSegment[] {
    this.rng = createRng(seed);
    this.segments = [];

    if (timestamps.length < 2) return [];

    const origin = new THREE.Vector2(0, 0);
    let heading = 0;
    let position = origin.clone();

    const minClearance = this.corridorWidth + PATH_GENERATION.collisionPadding;
    let collisions = 0;

    for (let i = 1; i < timestamps.length; i++) {
      const dt = timestamps[i] - timestamps[i - 1];
      const distance = speed * dt;
      const directions = TURN_ANGLES.map(turn => {
        const h = heading + turn;
        return {
          turn,
          heading: h,
          dir: new THREE.Vector2(Math.cos(h), Math.sin(h)),
        };
      });

      shuffleInPlace(directions, this.rng);

      let bestDir = directions[0];
      let bestPos = position.clone().add(bestDir.dir.clone().multiplyScalar(distance));
      let bestClearance = this.minClearance(bestPos);

      for (const d of directions) {
        const pos = position.clone().add(d.dir.clone().multiplyScalar(distance));
        const c = this.minClearance(pos);
        if (c >= minClearance) {
          bestDir = d;
          bestPos = pos;
          break;
        }
        if (c > bestClearance) {
          bestClearance = c;
          bestDir = d;
          bestPos = pos;
        }
      }

      if (bestClearance < minClearance) collisions++;

      this.segments.push({
        start: position.clone(),
        end: bestPos,
        angle: bestDir.heading,
        timestamp: timestamps[i - 1],
      });

      position = bestPos;
      heading = bestDir.heading;
    }

    if (collisions > 0) {
      console.warn(`Path: ${collisions}/${timestamps.length} segments use fallback clearance (below ${minClearance.toFixed(1)}u)`);
    }

    return this.segments;
  }

  private minClearance(candidatePos: THREE.Vector2): number {
    let best = Infinity;
    const lastEnd = this.segments.length > 0
      ? this.segments[this.segments.length - 1].end
      : new THREE.Vector2(0, 0);
    const candidate = { start: lastEnd, end: candidatePos };
    for (let i = 0; i < Math.max(0, this.segments.length - 1); i++) {
      const existing = this.segments[i];
      const d = segmentToSegmentDistance(
        candidate.start, candidate.end,
        existing.start, existing.end,
      );
      if (d < best) best = d;
    }
    return best;
  }
}


