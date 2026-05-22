import * as THREE from 'three';
import { createScene, SceneContext } from './SceneSetup';
import { AppState } from './state/AppState';
import { RuntimeParams } from './util/types';
import { AudioEngine } from './audio/AudioEngine';
import { BeatDetector } from './audio/BeatDetector';
import { PathGenerator, PathSegment } from './maze/PathGenerator';
import { LevelManager } from './scene/LevelManager';
import { BallController } from './scene/BallController';
import { CameraController } from './scene/CameraController';
import { ParticleSystem } from './scene/ParticleSystem';
import { UIManager } from './ui/UIManager';
import { CAMERA_DEFAULTS, MAX_FRAME_DT } from './constants';

export class App {
  private state = new AppState();
  private sceneCtx!: SceneContext;
  
  private audioEngine = new AudioEngine();
  private beatDetector = new BeatDetector();
  private pathGenerator: PathGenerator;
  
  private ballController = new BallController();
  private cameraController!: CameraController;
  private particleSystem = new ParticleSystem();
  
  private uiManager = new UIManager();
  private levelManager!: LevelManager;

  private segments: PathSegment[] = [];
  private renderedBuffer: AudioBuffer | null = null;
  private generationId = 0;
  private lastFrameTime = 0;

  constructor() {
    this.pathGenerator = new PathGenerator(15.0);
  }

async init(): Promise<void> {
    try {
      this.sceneCtx = createScene();
      this.levelManager = new LevelManager(this.sceneCtx, this.ballController, this.uiManager.minimap);

      this.cameraController = new CameraController(
        this.sceneCtx.camera,
        CAMERA_DEFAULTS.frustumSize,
      );

      this.sceneCtx.scene.add(this.ballController.mesh);
      this.sceneCtx.scene.add(this.particleSystem.mesh);

      this.ballController.setOnBeat((position) => this.particleSystem.burst(position));

      this.wireUI();
      this.bindKeyboard();

      await this.audioEngine.init();

      const savedVol = localStorage.getItem('maze-volume');
      if (savedVol !== null) {
        const vol = parseFloat(savedVol);
        this.audioEngine.setVolume(vol);
        const volSlider = document.getElementById('volume-slider') as HTMLInputElement;
        if (volSlider) volSlider.value = String(Math.round(vol * 100));
      }

      this.lastFrameTime = performance.now();
      requestAnimationFrame(() => this.animate());
    } catch (err) {
      console.error('Fatal initialization error:', err);
      this.state.transition('error');
    }
  }

  private wireUI(): void {
    const cp = this.uiManager.controlPanel;
    const tl = this.uiManager.timeline;

    cp.onFileSelected = (file) => this.handleFileSelected(file);

    cp.onParamChange = (params) => {
      const current = this.state.current;
      if (current === 'ready' || current === 'playing' || current === 'paused') {
        this.regenerate(params);
      }
    };

    cp.onLightChange = (value) => {
      this.sceneCtx.directionalLight.intensity = value;
    };

    tl.onSeek = (fraction) => {
      if (!this.audioEngine.audioBuffer) return;
      const seekTime = fraction * this.audioEngine.audioBuffer.duration;
      this.audioEngine.seekTo(seekTime);
      if (this.state.current !== 'playing') {
        this.audioEngine.pause();
        if (this.state.current === 'ready') {
          this.state.transition('paused');
        }
        this.ballController.update(seekTime, this.segments);
      }
      this.updatePlayButtonLabel();
    };

    tl.onPlayPause = () => this.togglePlayPause();

    tl.onVolumeChange = (value) => {
      this.audioEngine.setVolume(value);
      try { localStorage.setItem('maze-volume', String(value)); } catch { /* quota */ }
    };
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement && e.target.type === 'number') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          this.togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.skip(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.skip(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.adjustVolume(0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.adjustVolume(-0.05);
          break;
      }
    });
  }

  private skip(seconds: number): void {
    if (!this.audioEngine.audioBuffer) return;
    const wasPlaying = this.state.current === 'playing';
    const currentTime = this.audioEngine.playTime;
    const duration = this.audioEngine.audioBuffer.duration;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    this.audioEngine.seekTo(newTime);
    if (!wasPlaying) {
      this.audioEngine.pause();
      if (this.state.current === 'ready') {
        this.state.transition('paused');
      }
      this.ballController.update(newTime, this.segments);
    }
    this.uiManager.timeline.setProgress(newTime / duration);
    this.updatePlayButtonLabel();
  }

  private adjustVolume(delta: number): void {
    const newVol = Math.max(0, Math.min(1, this.audioEngine.volume + delta));
    this.audioEngine.setVolume(newVol);
    const volSlider = document.getElementById('volume-slider') as HTMLInputElement;
    if (volSlider) volSlider.value = String(Math.round(newVol * 100));
  }

  private async handleFileSelected(file: File): Promise<void> {
    if (!this.state.transition('loading')) return;

    this.uiManager.showLoading(true, 'Decoding audio...');
    await new Promise(r => requestAnimationFrame(r));

    try {
      const params = this.uiManager.getParams();

      this.uiManager.showLoading(true, 'Decoding audio...');
      await new Promise(r => requestAnimationFrame(r));
      const audioBuffer = await this.audioEngine.loadAudioBuffer(file);

      this.uiManager.showLoading(true, 'Analyzing beats...');
      await new Promise(r => requestAnimationFrame(r));
      const extraction = await this.beatDetector.extractBeats(
        audioBuffer, params.sensitivity, params.peakThreshold,
        params.minBeatSpacing, params.attackMs, params.releaseMs,
      );
      this.renderedBuffer = extraction.renderedBuffer;

      this.uiManager.showLoading(true, 'Building maze...');
      await new Promise(r => requestAnimationFrame(r));
      this.pathGenerator.corridorWidth = params.corridorWidth;
      this.segments = this.pathGenerator.generate(
        extraction.beatTimestamps, params.speed, params.seed,
      );

      this.levelManager.buildScene(this.segments, params.corridorWidth, params.wallHeight);

      this.uiManager.showLoading(false);
      this.uiManager.showControls();
      this.state.transition('ready');
    } catch (err) {
      console.error('Maze generation failed:', err);
      this.state.transition('error');
      this.uiManager.showLoading(true, 'Error! Select another file to try again.');
    }
  }

  private async regenerate(params: RuntimeParams): Promise<void> {
    if (!this.state.transition('regenerating')) return;
    this.generationId++;
    const genId = this.generationId;

    try {
      if (this.renderedBuffer && this.audioEngine.audioBuffer) {
        const beats = this.beatDetector.processPerceptualBeats(
          this.renderedBuffer,
          params.sensitivity,
          params.peakThreshold,
          params.minBeatSpacing,
          params.attackMs,
          params.releaseMs,
        );

        this.pathGenerator.corridorWidth = params.corridorWidth;
        this.segments = this.pathGenerator.generate(beats, params.speed, params.seed);
      }

      if (genId !== this.generationId) return;
      this.levelManager.buildScene(this.segments, params.corridorWidth, params.wallHeight);
      if (genId !== this.generationId) return;
      this.state.transition('ready');
    } catch (err) {
      console.error('Regeneration failed:', err);
      if (genId === this.generationId) {
        this.state.transition('error');
      }
    }
  }

  private togglePlayPause(): void {
    const current = this.state.current;

    if (current === 'paused') {
      this.audioEngine.resume();
      this.state.transition('playing');
    } else if (current === 'playing') {
      this.audioEngine.pause();
      this.state.transition('paused');
    } else if (current === 'ready') {
      this.audioEngine.play();
      this.ballController.reset();
      this.state.transition('playing');
    }
    this.updatePlayButtonLabel();
  }

  private updatePlayButtonLabel(): void {
    this.uiManager.timeline.setPlaying(this.state.current === 'playing');
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, MAX_FRAME_DT);
    this.lastFrameTime = now;

    this.particleSystem.update(dt);

    const isPlaying = this.state.current === 'playing';

    if (isPlaying) {
      const playTime = this.audioEngine.playTime;
      this.ballController.update(playTime, this.segments);
      this.ballController.setReactiveGlow(this.audioEngine.env.mid);

      const uv = this.levelManager.getUV(this.ballController.mesh.position);
      if (uv) {
        this.uiManager.minimap.setDotPosition(uv.u, uv.v);
      }

      if (!this.uiManager.timeline.scrubbing && this.audioEngine.audioBuffer) {
        const progress = playTime / this.audioEngine.audioBuffer.duration;
        this.uiManager.timeline.setProgress(progress);
      }

      if (this.audioEngine.audioBuffer &&
          this.audioEngine.playTime >= this.audioEngine.audioBuffer.duration) {
        this.audioEngine.pause();
        this.state.transition('ready');
        this.updatePlayButtonLabel();
      }
    }

    this.cameraController.mode = this.uiManager.cameraMode;

    let segmentDirection: THREE.Vector3 | undefined;
    if (this.segments.length > 0) {
      const idx = Math.max(0, this.ballController.lastBeatIndex);
      if (idx < this.segments.length) {
        const seg = this.segments[idx];
        segmentDirection = new THREE.Vector3(
          seg.end.x - seg.start.x, 0, seg.end.y - seg.start.y,
        ).normalize();
      }
    }
    this.cameraController.update(this.ballController.mesh.position, dt, segmentDirection);

    this.sceneCtx.composer.render();

    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    if (this.sceneCtx.renderer.domElement.width !== w * dpr) {
      this.cameraController.updateProjection();
      this.sceneCtx.renderer.setSize(w, h);
      this.sceneCtx.composer.setSize(w, h);
    }
  };
}
