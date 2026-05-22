import * as THREE from 'three';
import { PARTICLES } from '../constants';

interface Particle {
  active: boolean;
  life: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
}

export class ParticleSystem {
  private readonly instancedMesh: THREE.InstancedMesh;
  private readonly dummy = new THREE.Object3D();
  private readonly particles: Particle[] = [];

  constructor() {
    const geometry = new THREE.BoxGeometry(
      PARTICLES.cubeSize, PARTICLES.cubeSize, PARTICLES.cubeSize
    );
    const material = new THREE.MeshBasicMaterial({ color: PARTICLES.color });

    this.instancedMesh = new THREE.InstancedMesh(geometry, material, PARTICLES.maxCount);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.frustumCulled = false;

    for (let i = 0; i < PARTICLES.maxCount; i++) {
      this.particles.push({
        active: false,
        life: 0,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
      });
      this.dummy.position.set(0, PARTICLES.hideY, 0);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  get mesh(): THREE.InstancedMesh {
    return this.instancedMesh;
  }

  burst(origin: THREE.Vector3): void {
    let spawned = 0;
    for (let i = 0; i < PARTICLES.maxCount && spawned < PARTICLES.burstCount; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.life = 1.0;
        p.position.copy(origin).add(new THREE.Vector3(0, PARTICLES.originYOffset, 0));

        const theta = Math.random() * Math.PI * 2;
        const hSpeed = Math.random() * PARTICLES.horizontalSpeedRange + PARTICLES.horizontalSpeedMin;
        const vSpeed = Math.random() * PARTICLES.verticalSpeedRange + PARTICLES.verticalSpeedMin;
        p.velocity.set(Math.cos(theta) * hSpeed, vSpeed, Math.sin(theta) * hSpeed);
        spawned++;
      }
    }
  }

  update(dt: number): void {
    let anyActive = false;

    for (let i = 0; i < PARTICLES.maxCount; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      anyActive = true;
      p.life -= dt * PARTICLES.decayRate;

      if (p.life <= 0) {
        p.active = false;
        this.dummy.position.set(0, PARTICLES.hideY, 0);
      } else {
        p.position.addScaledVector(p.velocity, dt);
        p.velocity.y -= PARTICLES.gravity * dt;

        this.dummy.position.copy(p.position);
        this.dummy.scale.setScalar(p.life);
      }

      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }

    if (anyActive) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }
}
