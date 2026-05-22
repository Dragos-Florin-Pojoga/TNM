import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {
  SCENE_BACKGROUND, CAMERA_DEFAULTS, LIGHTING, BLOOM, FOG,
} from './constants';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  directionalLight: THREE.DirectionalLight;
}

export function createScene(): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE_BACKGROUND);
  scene.fog = new THREE.FogExp2(FOG.color, FOG.density);

  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.OrthographicCamera(
    (CAMERA_DEFAULTS.frustumSize * aspect) / -2,
    (CAMERA_DEFAULTS.frustumSize * aspect) / 2,
    CAMERA_DEFAULTS.frustumSize / 2,
    CAMERA_DEFAULTS.frustumSize / -2,
    CAMERA_DEFAULTS.near,
    CAMERA_DEFAULTS.far,
  );
  camera.position.set(
    CAMERA_DEFAULTS.initialPosition.x,
    CAMERA_DEFAULTS.initialPosition.y,
    CAMERA_DEFAULTS.initialPosition.z,
  );
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  document.body.appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    BLOOM.strength, BLOOM.radius, BLOOM.threshold,
  );
  composer.addPass(bloomPass);

  const ambientLight = new THREE.AmbientLight(LIGHTING.ambientColor, LIGHTING.ambientIntensity);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(
    LIGHTING.hemisphereColorSky, LIGHTING.hemisphereColorGround, LIGHTING.hemisphereIntensity,
  );
  scene.add(hemiLight);

  const directionalLight = new THREE.DirectionalLight(
    LIGHTING.directionalColor, LIGHTING.directionalIntensity,
  );
  directionalLight.position.set(
    LIGHTING.directionalPosition.x, LIGHTING.directionalPosition.y, LIGHTING.directionalPosition.z,
  );
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(LIGHTING.shadowMapSize, LIGHTING.shadowMapSize);
  directionalLight.shadow.camera.left = -LIGHTING.shadowFrustum;
  directionalLight.shadow.camera.right = LIGHTING.shadowFrustum;
  directionalLight.shadow.camera.top = LIGHTING.shadowFrustum;
  directionalLight.shadow.camera.bottom = -LIGHTING.shadowFrustum;
  directionalLight.shadow.camera.near = LIGHTING.shadowNear;
  directionalLight.shadow.camera.far = LIGHTING.shadowFar;
  directionalLight.shadow.bias = LIGHTING.shadowBias;
  directionalLight.shadow.normalBias = LIGHTING.shadowNormalBias;
  scene.add(directionalLight);

  return { scene, camera, renderer, composer, directionalLight };
}
