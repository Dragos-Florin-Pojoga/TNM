import * as THREE from 'three';
import { CAMERA_ORBIT, ZOOM_RANGE, TARGET_FPS } from '../constants';

export enum CameraMode {
  Follow = 'follow',
  AutoTurn = 'autoturn',
  Fixed = 'fixed',
  TopDown = 'topdown',
  ThirdPerson = 'thirdperson',
  Free = 'free',
}

export class CameraController {
  public azimuth = CAMERA_ORBIT.defaultAzimuth;
  public elevation = CAMERA_ORBIT.defaultElevation;
  public radius = CAMERA_ORBIT.defaultRadius;
  public mode = CameraMode.Follow;
  public frustumSize: number;

  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private readonly keys = new Set<string>();

  private freePosition = new THREE.Vector3(
    CAMERA_ORBIT.freeCamDefaults.position.x,
    CAMERA_ORBIT.freeCamDefaults.position.y,
    CAMERA_ORBIT.freeCamDefaults.position.z,
  );
  private freeYaw: number = CAMERA_ORBIT.freeCamDefaults.yaw;
  private freePitch: number = CAMERA_ORBIT.freeCamDefaults.pitch;

  private thirdPersonOffset = new THREE.Vector3(
    CAMERA_ORBIT.freeCamDefaults.position.x,
    CAMERA_ORBIT.freeCamDefaults.position.y,
    CAMERA_ORBIT.freeCamDefaults.position.z,
  );

  private fixedSet = false;

  constructor(
    private camera: THREE.OrthographicCamera,
    initialFrustumSize: number,
  ) {
    this.frustumSize = initialFrustumSize;
    this.bindEvents();
  }

  private onContextMenu = (e: MouseEvent): void => { e.preventDefault(); };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 2) {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    const sens = CAMERA_ORBIT.mouseSensitivity;

    if (this.mode === CameraMode.Free) {
      this.freeYaw -= dx * sens;
      this.freePitch = THREE.MathUtils.clamp(
        this.freePitch + dy * sens,
        -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01,
      );
    } else {
      this.azimuth += dx * sens;
      this.elevation = THREE.MathUtils.clamp(
        this.elevation + dy * sens,
        CAMERA_ORBIT.minElevation, CAMERA_ORBIT.maxElevation,
      );
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 2) this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    this.frustumSize = THREE.MathUtils.clamp(
      this.frustumSize + e.deltaY * CAMERA_ORBIT.scrollSensitivity,
      ZOOM_RANGE.min, ZOOM_RANGE.max,
    );
    this.updateProjection();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.key);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key);
  };

  private bindEvents(): void {
    window.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('wheel', this.onWheel, { passive: true });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  dispose(): void {
    window.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private processKeyboard(dt: number): void {
    if (this.mode === CameraMode.Free) {
      const moveSpeed = CAMERA_ORBIT.freeCamMoveSpeed * dt;
      const fullForward = this.computeFreeCamForward();
      const forward = new THREE.Vector3(fullForward.x, 0, fullForward.z).normalize();
      const right = new THREE.Vector3(-Math.cos(this.freeYaw), 0, Math.sin(this.freeYaw));

      if (this.keys.has('w') || this.keys.has('W')) this.freePosition.addScaledVector(forward, moveSpeed);
      if (this.keys.has('s') || this.keys.has('S')) this.freePosition.addScaledVector(forward, -moveSpeed);
      if (this.keys.has('a') || this.keys.has('A')) this.freePosition.addScaledVector(right, moveSpeed);
      if (this.keys.has('d') || this.keys.has('D')) this.freePosition.addScaledVector(right, -moveSpeed);
      if (this.keys.has('Shift')) this.freePosition.y += moveSpeed;
      if (this.keys.has('Control')) this.freePosition.y -= moveSpeed;
    } else if (this.mode !== CameraMode.ThirdPerson && this.mode !== CameraMode.Fixed) {
      const orbitSpeed = CAMERA_ORBIT.keyboardOrbitSpeed * dt;
      if (this.keys.has('a') || this.keys.has('A')) this.azimuth += orbitSpeed;
      if (this.keys.has('d') || this.keys.has('D')) this.azimuth -= orbitSpeed;
      if (this.keys.has('w') || this.keys.has('W')) {
        this.elevation = THREE.MathUtils.clamp(
          this.elevation + orbitSpeed,
          CAMERA_ORBIT.minElevation, CAMERA_ORBIT.maxElevation,
        );
      }
      if (this.keys.has('s') || this.keys.has('S')) {
        this.elevation = THREE.MathUtils.clamp(
          this.elevation - orbitSpeed,
          CAMERA_ORBIT.minElevation, CAMERA_ORBIT.maxElevation,
        );
      }
    }
  }

  private computeFreeCamForward(): THREE.Vector3 {
    return new THREE.Vector3(
      -Math.sin(this.freeYaw) * Math.cos(this.freePitch),
      -Math.sin(this.freePitch),
      -Math.cos(this.freeYaw) * Math.cos(this.freePitch),
    );
  }

  updateProjection(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.left = (this.frustumSize * aspect) / -2;
    this.camera.right = (this.frustumSize * aspect) / 2;
    this.camera.top = this.frustumSize / 2;
    this.camera.bottom = this.frustumSize / -2;
    this.camera.updateProjectionMatrix();
  }

  private sphericalOffset(): THREE.Vector3 {
    return new THREE.Vector3(
      this.radius * Math.cos(this.elevation) * Math.cos(this.azimuth),
      this.radius * Math.sin(this.elevation),
      this.radius * Math.cos(this.elevation) * Math.sin(this.azimuth),
    );
  }

  update(target: THREE.Vector3, dt: number, segmentDirection?: THREE.Vector3): void {
    this.processKeyboard(dt);

    const lerpFactor = 1 - Math.pow(1 - CAMERA_ORBIT.followLerp, dt * TARGET_FPS);

    if (this.mode !== CameraMode.Fixed) {
      this.fixedSet = false;
    }

    if (this.mode === CameraMode.Free) {
      this.camera.position.copy(this.freePosition);
      const lookDir = this.computeFreeCamForward();
      this.camera.lookAt(this.freePosition.clone().add(lookDir));
      return;
    }

    if (this.mode === CameraMode.AutoTurn && segmentDirection && !this.isDragging) {
      const autoLerp = 1 - Math.pow(1 - CAMERA_ORBIT.autoTurnLerp, dt * TARGET_FPS);
      const targetAzimuth = Math.atan2(segmentDirection.z, segmentDirection.x) + Math.PI;
      let diff = targetAzimuth - this.azimuth;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.azimuth += diff * autoLerp;
    }

    switch (this.mode) {
      case CameraMode.TopDown: {
        const topPos = new THREE.Vector3(target.x, this.radius * 2, target.z);
        this.camera.position.lerp(topPos, lerpFactor);
        this.camera.lookAt(target);
        break;
      }

      case CameraMode.Fixed: {
        if (!this.fixedSet) {
          this.camera.position.set(
            target.x,
            target.y + this.radius * 2,
            target.z + 10,
          );
          this.fixedSet = true;
        }
        this.camera.lookAt(target);
        break;
      }

      case CameraMode.ThirdPerson: {
        if (segmentDirection) {
          const behind = segmentDirection.clone().multiplyScalar(-this.radius * 0.8);
          behind.y = this.radius * 0.5;
          this.thirdPersonOffset.lerp(behind, lerpFactor);
        }
        const desiredPos = target.clone().add(this.thirdPersonOffset);
        this.camera.position.lerp(desiredPos, lerpFactor);
        this.camera.lookAt(target);
        break;
      }

      case CameraMode.Follow:
      case CameraMode.AutoTurn:
      default: {
        const offset = this.sphericalOffset();
        const orbitPos = target.clone().add(offset);
        this.camera.position.lerp(orbitPos, lerpFactor);
        this.camera.lookAt(target);
        break;
      }
    }
  }
}
