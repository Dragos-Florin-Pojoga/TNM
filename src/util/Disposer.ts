import * as THREE from 'three';

interface Disposable {
  dispose(): void;
}

export class Disposer {
  private items: Disposable[] = [];

  track(obj: THREE.Object3D): void {
    if (obj instanceof THREE.Mesh) {
      if (obj.geometry) this.items.push(obj.geometry);
      const mat = obj.material;
      if (Array.isArray(mat)) {
        mat.forEach(m => this.items.push(m));
      } else if (mat) {
        for (const key of Object.keys(mat)) {
          const val = (mat as Record<string, unknown>)[key];
          if (val instanceof THREE.Texture) this.items.push(val);
        }
        this.items.push(mat);
      }
    }
  }

  trackRaw(disposable: Disposable): void {
    this.items.push(disposable);
  }

  disposeAll(): void {
    for (const item of this.items) item.dispose();
    this.items.length = 0;
  }
}
