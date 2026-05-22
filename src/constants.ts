export const SCENE_BACKGROUND = '#020510';

export const MAX_FRAME_DT = 0.05;

export const TARGET_FPS = 60.0;

export const CAMERA_DEFAULTS = {
  frustumSize: 300,
  near: -5000,
  far: 10000,
  initialPosition: { x: 200, y: 200, z: 200 },
} as const;

export const CAMERA_ORBIT = {
  defaultAzimuth: Math.PI / 4,
  defaultElevation: Math.PI / 4,
  defaultRadius: 120,
  minElevation: -Math.PI / 2 + 0.01,
  maxElevation: Math.PI / 2 - 0.01,
  mouseSensitivity: 0.01,
  scrollSensitivity: 0.5,
  followLerp: 0.1,
  autoTurnLerp: 0.03,
  keyboardOrbitSpeed: 2.0,
  freeCamMoveSpeed: 150,
  freeCamDefaults: {
    position: { x: 80, y: 100, z: 80 },
    yaw: Math.PI / 4,
    pitch: -0.6,
  },
} as const;
export const ZOOM_RANGE = { min: 30, max: 800 } as const;

export const LIGHTING = {
  ambientColor: 0xffffff,
  ambientIntensity: 0.40,
  hemisphereColorSky: 0x4466aa,
  hemisphereColorGround: 0x222233,
  hemisphereIntensity: 0.25,
  directionalColor: 0xddeeff,
  directionalIntensity: 0.0,
  directionalPosition: { x: 60, y: 300, z: 60 },
  followOffset: { x: 60, z: 60 },
  shadowMapSize: 2048,
  shadowFrustum: 2000,
  shadowNear: 0.5,
  shadowFar: 3000,
  shadowBias: -0.002,
  shadowNormalBias: 0.5,
} as const;

export const BLOOM = {
  threshold: 0.5,
  strength: 0.3,
  radius: 0.4,
} as const;

export const BALL = {
  radius: 3.6,
  segments: 32,
  color: 0x006688,
  emissiveColor: 0x00ccdd,
  baseEmissiveIntensity: 1.2,
  roughness: 0.05,
  metalness: 0.3,
  baseHeight: 6,
  bounceAmplitude: 9,
  lastSegmentFallbackDuration: 1.0,
  emissiveReactivityScale: 3.0,
  lightColor: 0x00cccc,
  lightIntensity: 40,
  lightDistance: 120,
  lightReactivityScale: 20,
} as const;

export const PAD = {
  poleRadius: 0.35,
  poleHeight: 2.0,
  diskRadius: 1.8,
  diskThickness: 0.35,
  color: 0xff44aa,
  emissiveColor: 0xff44aa,
  emissiveIntensity: 0.8,
} as const;

export const PARTICLES = {
  maxCount: 200,
  burstCount: 8,
  cubeSize: 0.4,
  color: 0xffff00,
  originYOffset: 4.5,
  horizontalSpeedMin: 15,
  horizontalSpeedRange: 15,
  verticalSpeedMin: 15,
  verticalSpeedRange: 30,
  decayRate: 1.5,
  gravity: 90,
  hideY: -3000,
} as const;

export const MAZE_GEOMETRY = {
  canvasResolution: 2048,
  planeSubdivisions: 700,
  wallHeightDefault: 32,
  paddingMultiplier: 6,
  terrainRoughness: 0.45,
  terrainMetalness: 0.30,
  slopePasses: [
    { color: '#8e8e8e', widthMul: 4.5 },
    { color: '#707070', widthMul: 3.6 },
    { color: '#555555', widthMul: 2.8 },
    { color: '#3a3a3a', widthMul: 2.1 },
    { color: '#202020', widthMul: 1.5 },
    { color: '#080808', widthMul: 1.1 },
  ],
  wallColor: '#a0a0a0',
  floorColor: '#000000',

  floorR: 0x04, floorG: 0x06, floorB: 0x14,
  wallR: 0x0d, wallG: 0x0f, wallB: 0x2d,
  edgeR: 0x18, edgeG: 0x1a, edgeB: 0x48,
  gridColor: '#0d1540',
  gridSize: 32,
  circuitColor: '#111a3a',
  circuitSpacing: 48,

  noiseAmplitude: 25,
  noiseFrequency: 0.04,
  pillarDensity: 0.12,
  pillarRadius: 6,
  pillarHeight: 1.0,
  lightPillarDensity: 0.06,
  lightPillarRadius: 3,
  lightPillarHeight: 1.0,
  vignetteStrength: 0.15,

  grassBladeRadius: 0.25,
  grassBladeHeight: 2.0,
  grassBladeColor: 0x00ffaa,
  grassBladeEmissive: 0x00ffaa,
  grassDensity3D: 0.40,
  grassSpacing: 4.0,
  grassHeightMin: 0.04,
  grassHeightMax: 0.28,

  palmTrunkColor: 0x5e2602,
  palmTrunkEmissive: 0x0a0500,
  palmCrownColor: 0x00ff88,
  palmCrownEmissive: 0x00ff88,
  palmDensity: 0.15,
  palmSpacing: 16.0,
  palmHeightMin: 0.65,
  palmHeightMax: 1.0,

  padGlowRadiusMultiplier: 2.5,
  padGlowCenter: 'rgba(0, 180, 255, 0.35)',
  padGlowMid: 'rgba(0, 100, 200, 0.12)',
  padGlowEdge: 'rgba(0, 40, 120, 0.0)',
} as const;

export const BUILDINGS = {
  spacing: 55,
  density: 0.10,
  clusterMin: 4,
  clusterMax: 9,
  clusterRadius: 36,
  heightMin: 0.68,
  heightMax: 0.95,
  halfWidthMin: 3.0,
  halfWidthMax: 7.0,
  buildingHeightMin: 10,
  buildingHeightMax: 45,
  baseColor: 0x080a14,
  roughness: 0.6,
  metalness: 0.4,
  windowEmissive: 0x0099cc,
  emissiveBright: 1.3,
  emissiveDim: 0.45,
} as const;

export const FOG = {
  color: '#020510',
  density: 0.000025,
} as const;

export const PATH_GENERATION = {
  collisionPadding: 1.5,
  maxBacktrackDepth: 800,
} as const;

export const BEAT_DETECTION = {
  windowDurationSec: 0.05,
  thresholdFraction: 0.45,
  minBeatSpacingSec: 0.10,
  minBeatCount: 5,
  fallbackIntervalSec: 0.5,
  attackMs: 5,
  releaseMs: 50,
} as const;

export const PARAM_DEFAULTS = {
  speed: 105.0,
  corridorWidth: 15.0,
  wallHeight: 32.0,
  seed: 12345,
  sensitivity: 1.5,
  peakThreshold: 0.5,
  minBeatSpacing: 0.15,
  attackMs: 5,
  releaseMs: 60,
  light: 1.0,
} as const;

export const WALL_HEIGHT_RANGE = { min: 4, max: 72 } as const;

export const MATH = {
  EPSILON: 1e-5,
  MAX_COLOR_8BIT: 255.0,
} as const;

export const AUDIO = {
  blockSize: 2048,
} as const;
