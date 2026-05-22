import * as THREE from 'three';
import { SceneContext } from '../SceneSetup';
import { Disposer } from '../util/Disposer';
import { TerrainBuildResult, TerrainBuilder } from '../maze/TerrainBuilder';
import { buildPadInstances } from '../maze/BouncePad';
import { BallController } from './BallController';
import { MinimapOverlay } from '../ui/MinimapOverlay';
import { CAMERA_DEFAULTS } from '../constants';
import { PathSegment } from '../maze/PathGenerator';

export class LevelManager {
  private disposer = new Disposer();
  private sceneObjects: THREE.Object3D[] = [];
  public mazeResult: TerrainBuildResult | null = null;
  private terrainBuilder = new TerrainBuilder();

  constructor(
    private sceneCtx: SceneContext,
    private ballController: BallController,
    private minimap: MinimapOverlay,
  ) {}

  public buildScene(segments: PathSegment[], corridorWidth: number, wallHeight: number): void {
    this.clearScene();

    if (segments.length === 0) return;

    const result = this.terrainBuilder.build(segments, corridorWidth, wallHeight);
    this.mazeResult = result;

    this.addTrackedObject(result.mesh);

    const padMeshes = buildPadInstances(result.pads);
    if (padMeshes) {
      this.addTrackedObject(padMeshes.poles);
      this.addTrackedObject(padMeshes.disks);
    }

    for (const deco of [
      result.decorations.grass,
      result.decorations.palmTrunks,
      result.decorations.palmCrowns,
      result.decorations.buildings,
    ]) {
      if (deco) {
        this.addTrackedObject(deco);
      }
    }

    this.minimap.setImage(result.minimapDataUrl);

    this.ballController.reset();
    this.ballController.update(0, segments);

    const { x, z } = this.ballController.mesh.position;
    this.sceneCtx.camera.position.set(
      x + CAMERA_DEFAULTS.initialPosition.x,
      CAMERA_DEFAULTS.initialPosition.y,
      z + CAMERA_DEFAULTS.initialPosition.z,
    );
    this.sceneCtx.camera.lookAt(this.ballController.mesh.position);
  }

  private addTrackedObject(obj: THREE.Object3D): void {
    this.sceneCtx.scene.add(obj);
    this.sceneObjects.push(obj);
    this.disposer.track(obj);
  }

  public clearScene(): void {
    for (const obj of this.sceneObjects) {
      this.sceneCtx.scene.remove(obj);
    }
    this.sceneObjects.length = 0;
    this.disposer.disposeAll();
    this.mazeResult = null;
  }

  public getUV(position: THREE.Vector3): { u: number; v: number } | null {
    if (!this.mazeResult) return null;
    const { boundingBox, worldSize } = this.mazeResult;
    const u = (position.x - boundingBox.min.x) / worldSize;
    const v = (position.z - boundingBox.min.z) / worldSize;
    return { u, v };
  }
}
