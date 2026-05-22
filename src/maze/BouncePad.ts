import * as THREE from 'three';
import { PathSegment } from './PathGenerator';
import { PAD } from '../constants';

export interface BouncePadData {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

export function computeBouncePads(segments: PathSegment[]): BouncePadData[] {
  const pads: BouncePadData[] = [];
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < segments.length - 1; i++) {
    const I = new THREE.Vector3(
      segments[i].end.x - segments[i].start.x, 0,
      segments[i].end.y - segments[i].start.y,
    ).normalize();

    const O = new THREE.Vector3(
      segments[i + 1].end.x - segments[i + 1].start.x, 0,
      segments[i + 1].end.y - segments[i + 1].start.y,
    ).normalize();

    const dot = THREE.MathUtils.clamp(I.dot(O), -1, 1);
    const turnAngle = Math.acos(dot);

    const Nh = O.clone().sub(I);
    const hLen = Nh.length();
    if (hLen < 0.001) {
      pads.push({
        position: new THREE.Vector3(segments[i].end.x, 0, segments[i].end.y),
        quaternion: new THREE.Quaternion().identity(),
      });
      continue;
    }
    Nh.normalize();

    const t = turnAngle / Math.PI;

    const N = new THREE.Vector3()
      .addScaledVector(up, 1 - t)
      .addScaledVector(Nh, t)
      .normalize();

    const q = new THREE.Quaternion().setFromUnitVectors(up, N);

    pads.push({
      position: new THREE.Vector3(segments[i].end.x, 0, segments[i].end.y),
      quaternion: q,
    });
  }

  return pads;
}

let cachedPoleGeom: THREE.BufferGeometry | null = null;
let cachedDiskGeom: THREE.BufferGeometry | null = null;

function getPoleGeometry(): THREE.BufferGeometry {
  if (!cachedPoleGeom) {
    cachedPoleGeom = new THREE.CylinderGeometry(
      PAD.poleRadius, PAD.poleRadius, PAD.poleHeight, 8,
    );
    cachedPoleGeom.translate(0, PAD.poleHeight / 2, 0);
  }
  return cachedPoleGeom;
}

function getDiskGeometry(): THREE.BufferGeometry {
  if (!cachedDiskGeom) {
    cachedDiskGeom = new THREE.CylinderGeometry(
      PAD.diskRadius, PAD.diskRadius, PAD.diskThickness, 20,
    );
  }
  return cachedDiskGeom;
}

function padMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: PAD.color,
    emissive: PAD.emissiveColor,
    emissiveIntensity: PAD.emissiveIntensity,
    roughness: 0.25,
    metalness: 0.1,
  });
}

export interface PadMeshes {
  poles: THREE.InstancedMesh;
  disks: THREE.InstancedMesh;
}

export function buildPadInstances(pads: BouncePadData[]): PadMeshes | null {
  if (pads.length === 0) return null;

  const poleGeom = getPoleGeometry();
  const diskGeom = getDiskGeometry();
  const mat = padMaterial();

  const poles = new THREE.InstancedMesh(poleGeom, mat, pads.length);
  poles.frustumCulled = false;
  const disks = new THREE.InstancedMesh(diskGeom, mat.clone(), pads.length);
  disks.frustumCulled = false;

  const d = new THREE.Object3D();

  for (let i = 0; i < pads.length; i++) {
    const { position, quaternion } = pads[i];

    d.position.copy(position);
    d.quaternion.identity();
    d.updateMatrix();
    poles.setMatrixAt(i, d.matrix);

    d.position.set(position.x, PAD.poleHeight, position.z);
    d.quaternion.copy(quaternion);
    d.updateMatrix();
    disks.setMatrixAt(i, d.matrix);
  }

  poles.instanceMatrix.needsUpdate = true;
  disks.instanceMatrix.needsUpdate = true;

  return { poles, disks };
}
