import * as THREE from 'three';
import { PathSegment } from '../maze/PathGenerator';
import { BALL } from '../constants';

export type BeatCallback = (position: THREE.Vector3) => void;

export class BallController {
  public readonly mesh: THREE.Mesh;
  public readonly light: THREE.PointLight;
  private currentBeatIndex = -1;
  private onBeat: BeatCallback | null = null;

  constructor() {
    const geometry = new THREE.SphereGeometry(BALL.radius, BALL.segments, BALL.segments);
    const material = new THREE.MeshStandardMaterial({
      color: BALL.color,
      emissive: BALL.emissiveColor,
      emissiveIntensity: BALL.baseEmissiveIntensity,
      roughness: BALL.roughness,
      metalness: BALL.metalness,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = BALL.baseHeight;
    this.mesh.castShadow = true;

    this.light = new THREE.PointLight(BALL.lightColor, BALL.lightIntensity, BALL.lightDistance);
    this.light.position.set(0, 0, 0);
    this.mesh.add(this.light);
  }

  setOnBeat(callback: BeatCallback): void {
    this.onBeat = callback;
  }

  reset(): void {
    this.currentBeatIndex = -1;
  }

  get lastBeatIndex(): number {
    return this.currentBeatIndex;
  }

  update(time: number, segments: PathSegment[]): void {
    if (segments.length === 0) return;

    let segIndex = 0;
    for (let i = 0; i < segments.length; i++) {
      if (time >= segments[i].timestamp) {
        segIndex = i;
      } else {
        break;
      }
    }

    const segment = segments[segIndex];
    const nextTimestamp = segIndex < segments.length - 1
      ? segments[segIndex + 1].timestamp
      : segment.timestamp + BALL.lastSegmentFallbackDuration;

    if (segIndex < this.currentBeatIndex) {
      this.currentBeatIndex = segIndex;
    }

    if (segIndex > this.currentBeatIndex && segIndex > 0) {
      this.onBeat?.(new THREE.Vector3(segment.start.x, 0, segment.start.y));
      this.currentBeatIndex = segIndex;
    }

    const duration = nextTimestamp - segment.timestamp;
    const progress = duration > 0
      ? THREE.MathUtils.clamp((time - segment.timestamp) / duration, 0, 1)
      : 1;

    this.mesh.position.x = THREE.MathUtils.lerp(segment.start.x, segment.end.x, progress);
    this.mesh.position.z = THREE.MathUtils.lerp(segment.start.y, segment.end.y, progress);

    const segmentLength = segment.start.distanceTo(segment.end);
    const dynamicAmplitude = BALL.bounceAmplitude + (segmentLength * 0.08);
    this.mesh.position.y = BALL.baseHeight + Math.abs(Math.sin(progress * Math.PI)) * dynamicAmplitude;
  }

  setReactiveGlow(midEnvelope: number): void {
    const material = this.mesh.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = BALL.baseEmissiveIntensity + midEnvelope * BALL.emissiveReactivityScale;
    this.light.intensity = BALL.lightIntensity + midEnvelope * BALL.lightReactivityScale;
  }
}
