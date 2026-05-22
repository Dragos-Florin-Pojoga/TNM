import * as THREE from 'three';
import { PathSegment } from './PathGenerator';
import { computeBouncePads, BouncePadData } from './BouncePad';
import { MAZE_GEOMETRY, MATH } from '../constants';
import { createDecorations, DecorationResult } from './Decorations';
import { hash, smoothNoise } from '../util/MathUtils';

export interface TerrainBuildResult {
  mesh: THREE.Mesh;
  pads: BouncePadData[];
  boundingBox: THREE.Box3;
  worldSize: number;
  minimapDataUrl: string;
  decorations: DecorationResult;
}


export class TerrainBuilder {
  build(
    segments: PathSegment[],
    corridorWidth: number,
    wallHeight: number,
  ): TerrainBuildResult {
    if (segments.length === 0) {
      return {
        mesh: new THREE.Mesh(),
        pads: [],
        boundingBox: new THREE.Box3(),
        worldSize: 1,
        minimapDataUrl: '',
        decorations: { grass: null, palmTrunks: null, palmCrowns: null, buildings: null },
      };
    }

    const boundingBox = this.computeBoundingBox(segments, corridorWidth);
    const worldSize = Math.max(
      boundingBox.max.x - boundingBox.min.x,
      boundingBox.max.z - boundingBox.min.z,
    );

    const pads = computeBouncePads(segments);

    const { imageData } = this.renderHeightmap(segments, corridorWidth, boundingBox, worldSize);

    const colorTexture = this.bakeColorTexture(imageData, pads, corridorWidth, boundingBox, worldSize);

    const minimapDataUrl = this.renderMinimap(imageData);

    const geometry = this.buildDisplacedGeometry(imageData, worldSize, wallHeight);

    const material = new THREE.MeshStandardMaterial({
      map: colorTexture,
      roughness: MAZE_GEOMETRY.terrainRoughness,
      metalness: MAZE_GEOMETRY.terrainMetalness,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      boundingBox.min.x + worldSize / 2,
      0,
      boundingBox.min.z + worldSize / 2,
    );
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    const decorations = createDecorations(imageData, worldSize, boundingBox, wallHeight);

    return { mesh, pads, boundingBox, worldSize, minimapDataUrl, decorations };
  }

  private computeBoundingBox(segments: PathSegment[], corridorWidth: number): THREE.Box3 {
    const box = new THREE.Box3();
    for (const seg of segments) {
      box.expandByPoint(new THREE.Vector3(seg.start.x, 0, seg.start.y));
      box.expandByPoint(new THREE.Vector3(seg.end.x, 0, seg.end.y));
    }
    box.expandByScalar(corridorWidth * MAZE_GEOMETRY.paddingMultiplier);
    return box;
  }

  private renderHeightmap(
    segments: PathSegment[],
    corridorWidth: number,
    boundingBox: THREE.Box3,
    worldSize: number,
  ): { imageData: ImageData } {
    const res = MAZE_GEOMETRY.canvasResolution;
    const canvas = document.createElement('canvas');
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d')!;

    const toCanvas = (worldVal: number, worldMin: number): number =>
      ((worldVal - worldMin) / worldSize) * res;

    const baseWidth = (corridorWidth / worldSize) * res;

    ctx.fillStyle = MAZE_GEOMETRY.wallColor;
    ctx.fillRect(0, 0, res, res);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(
      toCanvas(segments[0].start.x, boundingBox.min.x),
      toCanvas(segments[0].start.y, boundingBox.min.z),
    );
    for (const seg of segments) {
      ctx.lineTo(
        toCanvas(seg.end.x, boundingBox.min.x),
        toCanvas(seg.end.y, boundingBox.min.z),
      );
    }

    for (const pass of MAZE_GEOMETRY.slopePasses) {
      ctx.strokeStyle = pass.color;
      ctx.lineWidth = baseWidth * pass.widthMul;
      ctx.stroke();
    }
    ctx.strokeStyle = MAZE_GEOMETRY.floorColor;
    ctx.lineWidth = baseWidth;
    ctx.stroke();

    const imageData = ctx.getImageData(0, 0, res, res);
    const px = imageData.data;
    const {
      noiseAmplitude, noiseFrequency,
      pillarDensity, pillarRadius, pillarHeight,
      lightPillarDensity, lightPillarRadius, lightPillarHeight,
    } = MAZE_GEOMETRY;

    const wallBase = 160;

    for (let i = 0; i < px.length; i += 4) {
      const h = px[i];
      if (h > 30) {
        const cx = (i / 4) % res;
        const cy = Math.floor((i / 4) / res);
        const n = smoothNoise(cx * noiseFrequency, cy * noiseFrequency, 13);
        const wallFactor = Math.min(h / wallBase, 1.0);
        const delta = Math.round((n - 0.5) * 2 * noiseAmplitude * wallFactor);
        px[i] = Math.max(0, Math.min(255, h + delta));
        px[i + 1] = px[i];
        px[i + 2] = px[i];
      }
    }

    for (let i = 0; i < px.length; i += 4) {
      if (px[i] >= wallBase - 15) {
        const cx = (i / 4) % res;
        const cy = Math.floor((i / 4) / res);
        const gs = pillarRadius * 4;
        const gx = Math.floor(cx / gs);
        const gy = Math.floor(cy / gs);
        if (hash(gx, gy, 77) < pillarDensity) {
          const pcx = gx * gs + gs / 2;
          const pcy = gy * gs + gs / 2;
          if (Math.hypot(cx - pcx, cy - pcy) < pillarRadius) {
            const val = Math.round(255 * pillarHeight);
            px[i] = val;
            px[i + 1] = val;
            px[i + 2] = val;
          }
        }
      }
    }

    for (let i = 0; i < px.length; i += 4) {
      if (px[i] >= wallBase - 15) {
        const cx = (i / 4) % res;
        const cy = Math.floor((i / 4) / res);
        const gs = lightPillarRadius * 6;
        const gx = Math.floor(cx / gs);
        const gy = Math.floor(cy / gs);
        if (hash(gx, gy, 133) < lightPillarDensity) {
          const pcx = gx * gs + gs / 2;
          const pcy = gy * gs + gs / 2;
          if (Math.hypot(cx - pcx, cy - pcy) < lightPillarRadius) {
            const val = Math.round(255 * lightPillarHeight);
            px[i] = val;
            px[i + 1] = val;
            px[i + 2] = val;
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return { imageData };
  }

  private bakeColorTexture(
    hmImageData: ImageData,
    pads: BouncePadData[],
    corridorWidth: number,
    boundingBox: THREE.Box3,
    worldSize: number,
  ): THREE.CanvasTexture {
    const res = MAZE_GEOMETRY.canvasResolution;
    const canvas = document.createElement('canvas');
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d')!;

    const toCanvas = (worldVal: number, worldMin: number): number =>
      ((worldVal - worldMin) / worldSize) * res;

    const hm = hmImageData.data;
    const {
      floorR, floorG, floorB, wallR, wallG, wallB,
      edgeR, edgeG, edgeB, vignetteStrength,
    } = MAZE_GEOMETRY;

    const colorData = ctx.createImageData(res, res);
    const out = colorData.data;

    for (let i = 0; i < hm.length; i += 4) {
      const h = hm[i] / 255;

      if (h > 0.58) {
        const e = (h - 0.58) / 0.42;
        out[i]     = Math.round(wallR + (edgeR - wallR) * e);
        out[i + 1] = Math.round(wallG + (edgeG - wallG) * e);
        out[i + 2] = Math.round(wallB + (edgeB - wallB) * e);
      } else {
        const t = h / 0.58;
        out[i]     = Math.round(floorR + (wallR - floorR) * t);
        out[i + 1] = Math.round(floorG + (wallG - floorG) * t);
        out[i + 2] = Math.round(floorB + (wallB - floorB) * t);
      }

      if (h > 0.1) {
        const v = (h - 0.1) / 0.9 * vignetteStrength;
        out[i]     = Math.round(out[i]     * (1 - v));
        out[i + 1] = Math.round(out[i + 1] * (1 - v));
        out[i + 2] = Math.round(out[i + 2] * (1 - v));
      }

      out[i + 3] = 255;
    }
    ctx.putImageData(colorData, 0, 0);

    const { circuitColor, circuitSpacing } = MAZE_GEOMETRY;
    ctx.strokeStyle = circuitColor;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let d = -res; d < res * 2; d += circuitSpacing) {
      ctx.moveTo(d, 0);
      ctx.lineTo(d - res, res);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let d = 0; d < res * 2; d += circuitSpacing) {
      ctx.moveTo(d, 0);
      ctx.lineTo(d - res, res);
    }
    ctx.stroke();

    const gs = MAZE_GEOMETRY.gridSize;
    ctx.strokeStyle = MAZE_GEOMETRY.gridColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x <= res; x += gs) {
      ctx.moveTo(x, 0); ctx.lineTo(x, res);
    }
    for (let y = 0; y <= res; y += gs) {
      ctx.moveTo(0, y); ctx.lineTo(res, y);
    }
    ctx.stroke();

    ctx.globalCompositeOperation = 'screen';
    const glowRad = (corridorWidth * MAZE_GEOMETRY.padGlowRadiusMultiplier / worldSize) * res;
    for (const pad of pads) {
      const cx = toCanvas(pad.position.x, boundingBox.min.x);
      const cy = toCanvas(pad.position.z, boundingBox.min.z);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRad);
      g.addColorStop(0, MAZE_GEOMETRY.padGlowCenter);
      g.addColorStop(0.35, MAZE_GEOMETRY.padGlowMid);
      g.addColorStop(1, MAZE_GEOMETRY.padGlowEdge);
      ctx.fillStyle = g;
      ctx.fillRect(cx - glowRad, cy - glowRad, glowRad * 2, glowRad * 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    return texture;
  }

  private renderMinimap(hmImageData: ImageData): string {
    const res = MAZE_GEOMETRY.canvasResolution;
    const canvas = document.createElement('canvas');
    canvas.width = res;
    canvas.height = res;
    canvas.getContext('2d')!.putImageData(hmImageData, 0, 0);
    return canvas.toDataURL();
  }

  private buildDisplacedGeometry(
    imageData: ImageData,
    worldSize: number,
    wallHeight: number,
  ): THREE.PlaneGeometry {
    const res = MAZE_GEOMETRY.canvasResolution;
    const sub = MAZE_GEOMETRY.planeSubdivisions;

    const geometry = new THREE.PlaneGeometry(worldSize, worldSize, sub, sub);
    geometry.rotateX(-Math.PI / 2);

    const posAttr = geometry.getAttribute('position');
    const uvAttr = geometry.getAttribute('uv');
    const pixels = imageData.data;

    for (let i = 0; i < posAttr.count; i++) {
      const u = uvAttr.getX(i);
      const v = uvAttr.getY(i);
      const px = Math.min(Math.floor(u * res), res - 1);
      const py = Math.min(Math.floor((1 - v) * res), res - 1);
      const pixelIndex = (py * res + px) * 4;
      const h = pixels[pixelIndex] / MATH.MAX_COLOR_8BIT;

      posAttr.setY(i, posAttr.getY(i) + h * wallHeight);
    }

    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }
}
