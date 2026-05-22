import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MAZE_GEOMETRY, BUILDINGS } from '../constants';
import { hash } from '../util/MathUtils';

export interface DecorationResult {
  grass: THREE.InstancedMesh | null;
  palmTrunks: THREE.InstancedMesh | null;
  palmCrowns: THREE.InstancedMesh | null;
  buildings: THREE.Group | null;
}

function buildPalmTrunkGeometry(): THREE.BufferGeometry {
  const segments = 12;
  const segH = 2.0;
  const gap = 0.5;
  const radiusBase = 1.1;
  const radiusTop = 0.55;
  const pieces: THREE.BufferGeometry[] = [];

  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const y = i * (segH + gap);
    const r = radiusBase + (radiusTop - radiusBase) * t;
    const ox = Math.sin(t * 2.0) * 1.5;
    const oz = Math.cos(t * 1.5) * 0.8;

    const cyl = new THREE.CylinderGeometry(r, r, segH, 8);
    cyl.translate(ox, y + segH / 2, oz);
    pieces.push(cyl);
  }

  return mergeGeometries(pieces, false);
}

function buildPalmCrownGeometry(): THREE.BufferGeometry {
  const trunkTop = 12 * (2.0 + 0.5);
  const pieces: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const m4 = new THREE.Matrix4();

  const hub = new THREE.SphereGeometry(0.9, 8, 6);
  m4.identity().setPosition(0, trunkTop, 0);
  hub.applyMatrix4(m4);
  pieces.push(hub);

  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2 + hash(i, 1, 501) * 0.4;
    const elevation = 0.25 + hash(i, 2, 502) * 0.3;
    const dir = new THREE.Vector3(
      Math.cos(angle) * Math.cos(elevation),
      Math.sin(elevation),
      Math.sin(angle) * Math.cos(elevation),
    ).normalize();
    q.setFromUnitVectors(up, dir);

    const frond = new THREE.ConeGeometry(0.5, 10.0, 6, 3);
    m4.compose(
      new THREE.Vector3(0, trunkTop + 1.2, 0),
      q,
      new THREE.Vector3(1, 1, 1),
    );
    frond.applyMatrix4(m4);
    pieces.push(frond);
  }

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + 0.5;
    const elevation = 0.55 + hash(i, 3, 503) * 0.25;
    const dir = new THREE.Vector3(
      Math.cos(angle) * Math.cos(elevation),
      Math.sin(elevation),
      Math.sin(angle) * Math.cos(elevation),
    ).normalize();
    q.setFromUnitVectors(up, dir);

    const frond = new THREE.ConeGeometry(0.35, 7.0, 5, 3);
    m4.compose(
      new THREE.Vector3(0, trunkTop + 2.0, 0),
      q,
      new THREE.Vector3(1, 1, 1),
    );
    frond.applyMatrix4(m4);
    pieces.push(frond);
  }

  return mergeGeometries(pieces, false);
}
export function createDecorations(
  heightmap: ImageData,
  worldSize: number,
  boundingBox: THREE.Box3,
  wallHeight: number,
): DecorationResult {
  const res = MAZE_GEOMETRY.canvasResolution;
  const hm = heightmap.data;

  const worldToCanvas = (worldVal: number, worldMin: number): number =>
    ((worldVal - worldMin) / worldSize) * res;

  function terrainY(cx: number, cy: number): number {
    const px = Math.min(Math.floor(cx), res - 1);
    const py = Math.min(Math.floor(cy), res - 1);
    return (hm[(py * res + px) * 4] / 255) * wallHeight;
  }

  const gcfg = MAZE_GEOMETRY;
  const worldMinX = boundingBox.min.x;
  const worldMinZ = boundingBox.min.z;

  let grass: THREE.InstancedMesh | null = null;
  const grassPos: { x: number; z: number; y: number }[] = [];
  const step = gcfg.grassSpacing;

  for (let wx = 0; wx < worldSize; wx += step) {
    for (let wz = 0; wz < worldSize; wz += step) {
      const cx = worldToCanvas(wx + worldMinX, worldMinX);
      const cy = worldToCanvas(wz + worldMinZ, worldMinZ);
      if (cx < 0 || cx >= res || cy < 0 || cy >= res) continue;
      const h = hm[(Math.floor(cy) * res + Math.floor(cx)) * 4] / 255;
      if (h >= gcfg.grassHeightMin && h <= gcfg.grassHeightMax && hash(cx, cy, 301) < gcfg.grassDensity3D) {
        const jx = wx + (hash(cx, cy, 302) - 0.5) * step;
        const jz = wz + (hash(cx, cy, 303) - 0.5) * step;
        const jcx = Math.min(Math.floor(worldToCanvas(jx + worldMinX, worldMinX)), res - 1);
        const jcy = Math.min(Math.floor(worldToCanvas(jz + worldMinZ, worldMinZ)), res - 1);
        if (jcx < 0 || jcx >= res || jcy < 0 || jcy >= res) continue;
        grassPos.push({ x: jx + worldMinX, z: jz + worldMinZ, y: terrainY(jcx, jcy) });
      }
    }
  }

  if (grassPos.length > 0) {
    const geom = new THREE.CylinderGeometry(gcfg.grassBladeRadius, gcfg.grassBladeRadius, gcfg.grassBladeHeight, 4);
    const mat = new THREE.MeshStandardMaterial({
      color: gcfg.grassBladeColor, emissive: gcfg.grassBladeEmissive, emissiveIntensity: 0.3, roughness: 0.3,
    });
    grass = new THREE.InstancedMesh(geom, mat, grassPos.length);
    grass.frustumCulled = false;
    const d = new THREE.Object3D();
    for (let i = 0; i < grassPos.length; i++) {
      d.position.set(grassPos[i].x, grassPos[i].y + gcfg.grassBladeHeight / 2, grassPos[i].z);
      d.updateMatrix();
      grass.setMatrixAt(i, d.matrix);
    }
    grass.instanceMatrix.needsUpdate = true;
  }

  let palmTrunks: THREE.InstancedMesh | null = null;
  let palmCrowns: THREE.InstancedMesh | null = null;
  const palmPos: { x: number; z: number; y: number }[] = [];
  const pstep = gcfg.palmSpacing;

  for (let wx = 0; wx < worldSize; wx += pstep) {
    for (let wz = 0; wz < worldSize; wz += pstep) {
      const cx = worldToCanvas(wx + worldMinX, worldMinX);
      const cy = worldToCanvas(wz + worldMinZ, worldMinZ);
      if (cx < 0 || cx >= res || cy < 0 || cy >= res) continue;
      const h = hm[(Math.floor(cy) * res + Math.floor(cx)) * 4] / 255;
      if (h >= gcfg.palmHeightMin && h <= gcfg.palmHeightMax && hash(cx, cy, 401) < gcfg.palmDensity) {
        const jx = wx + (hash(cx, cy, 402) - 0.5) * pstep;
        const jz = wz + (hash(cx, cy, 403) - 0.5) * pstep;
        const jcx = Math.min(Math.floor(worldToCanvas(jx + worldMinX, worldMinX)), res - 1);
        const jcy = Math.min(Math.floor(worldToCanvas(jz + worldMinZ, worldMinZ)), res - 1);
        if (jcx < 0 || jcx >= res || jcy < 0 || jcy >= res) continue;
        palmPos.push({ x: jx + worldMinX, z: jz + worldMinZ, y: terrainY(jcx, jcy) });
      }
    }
  }

  if (palmPos.length > 0) {
    const trunkGeom = buildPalmTrunkGeometry();
    const trunkMat = new THREE.MeshStandardMaterial({
      color: gcfg.palmTrunkColor, emissive: gcfg.palmTrunkEmissive, emissiveIntensity: 0.4, roughness: 0.6,
    });
    palmTrunks = new THREE.InstancedMesh(trunkGeom, trunkMat, palmPos.length);
    palmTrunks.frustumCulled = false;

    const crownGeom = buildPalmCrownGeometry();
    const crownMat = new THREE.MeshStandardMaterial({
      color: gcfg.palmCrownColor, emissive: gcfg.palmCrownEmissive, emissiveIntensity: 2.0, roughness: 0.15,
    });
    palmCrowns = new THREE.InstancedMesh(crownGeom, crownMat, palmPos.length);
    palmCrowns.frustumCulled = false;

    const trunkTop = 12 * (2.0 + 0.5);
    const d = new THREE.Object3D();
    for (let i = 0; i < palmPos.length; i++) {
      const hVar = hash(palmPos[i].x, palmPos[i].z, 404);
      const tVar = hash(palmPos[i].x, palmPos[i].z, 405);
      const lVar = hash(palmPos[i].x, palmPos[i].z, 406);
      const heightScale = 0.65 + hVar * 0.75;
      const thicknessScale = 0.7 + tVar * 0.6;
      const leafScale = 0.7 + lVar * 0.6;

      d.scale.set(thicknessScale, heightScale, thicknessScale);
      d.position.set(palmPos[i].x, palmPos[i].y, palmPos[i].z);
      d.updateMatrix();
      palmTrunks.setMatrixAt(i, d.matrix);

      d.scale.set(leafScale, leafScale, leafScale);
      d.position.set(
        palmPos[i].x,
        palmPos[i].y + trunkTop * (heightScale - leafScale),
        palmPos[i].z,
      );
      d.updateMatrix();
      palmCrowns.setMatrixAt(i, d.matrix);
    }
    palmTrunks.instanceMatrix.needsUpdate = true;
    palmCrowns.instanceMatrix.needsUpdate = true;
  }

  const buildings = createBuildings(heightmap, worldSize, boundingBox, wallHeight);

  return { grass, palmTrunks, palmCrowns, buildings };
}

let cachedWindowTexture: THREE.CanvasTexture | null = null;

function getWindowTexture(): THREE.CanvasTexture {
  if (cachedWindowTexture) return cachedWindowTexture;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#050810';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(15, 22, 45, 0.4)';
  ctx.lineWidth = 1;
  for (let x = 0; x < size; x += size / 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  const cols = 8;
  const rows = 20;
  const cellW = size / cols;
  const cellH = size / rows;
  const winColors = ['#0088aa', '#0077aa', '#006699', '#aa3366', '#aa6611', '#228877'];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (Math.random() < 0.50) continue;

      const wx = col * cellW + cellW * 0.18;
      const wy = row * cellH + cellH * 0.25;
      const ww = cellW * 0.44;
      const wh = cellH * 0.30;

      ctx.fillStyle = winColors[Math.floor(Math.random() * winColors.length)];
      ctx.fillRect(wx, wy, ww, wh);

      ctx.fillStyle = 'rgba(0, 150, 220, 0.06)';
      ctx.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  cachedWindowTexture = texture;
  return texture;
}

function makeBuildingMaterial(emissiveIntensity: number): THREE.MeshStandardMaterial {
  const texture = getWindowTexture();
  return new THREE.MeshStandardMaterial({
    map: texture,
    color: BUILDINGS.baseColor,
    emissive: BUILDINGS.windowEmissive,
    emissiveMap: texture,
    emissiveIntensity,
    roughness: BUILDINGS.roughness,
    metalness: BUILDINGS.metalness,
  });
}

function createBuildings(
  heightmap: ImageData,
  worldSize: number,
  boundingBox: THREE.Box3,
  wallHeight: number,
): THREE.Group | null {
  const res = MAZE_GEOMETRY.canvasResolution;
  const hm = heightmap.data;
  const cfg = BUILDINGS;

  const worldToCanvas = (worldVal: number, worldMin: number): number =>
    ((worldVal - worldMin) / worldSize) * res;

  function terrainY(cx: number, cy: number): number {
    const px = Math.min(Math.floor(cx), res - 1);
    const py = Math.min(Math.floor(cy), res - 1);
    return (hm[(py * res + px) * 4] / 255) * wallHeight;
  }

  const worldMinX = boundingBox.min.x;
  const worldMinZ = boundingBox.min.z;
  const brightBoxes: THREE.BufferGeometry[] = [];
  const dimBoxes: THREE.BufferGeometry[] = [];

  for (let wx = 0; wx < worldSize; wx += cfg.spacing) {
    for (let wz = 0; wz < worldSize; wz += cfg.spacing) {
      const cx = worldToCanvas(wx + worldMinX, worldMinX);
      const cy = worldToCanvas(wz + worldMinZ, worldMinZ);
      if (cx < 0 || cx >= res || cy < 0 || cy >= res) continue;

      const h = hm[(Math.floor(cy) * res + Math.floor(cx)) * 4] / 255;
      if (h < cfg.heightMin || h > cfg.heightMax) continue;
      if (hash(cx, cy, 701) >= cfg.density) continue;

      const clusterCenterX = wx + (hash(cx, cy, 702) - 0.5) * cfg.spacing * 0.6;
      const clusterCenterZ = wz + (hash(cx, cy, 703) - 0.5) * cfg.spacing * 0.6;
      const clusterCount = cfg.clusterMin + Math.floor(hash(cx, cy, 710) * (cfg.clusterMax - cfg.clusterMin + 1));

      for (let b = 0; b < clusterCount; b++) {
        const angle = hash(cx, cy, 711 + b) * Math.PI * 2;
        const dist = hash(cx, cy, 720 + b) * cfg.clusterRadius;
        const bx = clusterCenterX + Math.cos(angle) * dist;
        const bz = clusterCenterZ + Math.sin(angle) * dist;

        const bjx = bx + worldMinX;
        const bjz = bz + worldMinZ;
        const bjcx = Math.min(Math.floor(worldToCanvas(bjx, worldMinX)), res - 1);
        const bjcy = Math.min(Math.floor(worldToCanvas(bjz, worldMinZ)), res - 1);
        if (bjcx < 0 || bjcx >= res || bjcy < 0 || bjcy >= res) continue;

        const bh = hm[(bjcy * res + bjcx) * 4] / 255;
        if (bh < cfg.heightMin - 0.08 || bh > cfg.heightMax) continue;

        const halfW = cfg.halfWidthMin + hash(bjcx, bjcy, 730 + b) * (cfg.halfWidthMax - cfg.halfWidthMin);
        const bldgH = cfg.buildingHeightMin + hash(bjcx, bjcy, 740 + b) * (cfg.buildingHeightMax - cfg.buildingHeightMin);
        const baseY = terrainY(bjcx, bjcy);

        const geom = new THREE.BoxGeometry(halfW * 2, bldgH, halfW * 2);
        geom.translate(bjx, baseY + bldgH / 2, bjz);

        if (hash(bjcx, bjcy, 750 + b) < 0.4) {
          brightBoxes.push(geom);
        } else {
          dimBoxes.push(geom);
        }
      }
    }
  }

  const totalBoxes = brightBoxes.length + dimBoxes.length;
  if (totalBoxes === 0) return null;

  const group = new THREE.Group();

  if (brightBoxes.length > 0) {
    const mergedGeom = mergeGeometries(brightBoxes, false);
    const mat = makeBuildingMaterial(cfg.emissiveBright);
    const mesh = new THREE.Mesh(mergedGeom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  if (dimBoxes.length > 0) {
    const mergedGeom = mergeGeometries(dimBoxes, false);
    const mat = makeBuildingMaterial(cfg.emissiveDim);
    const mesh = new THREE.Mesh(mergedGeom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return group;
}
