import { RuntimeParams } from '../util/types';
import { CameraMode } from '../scene/CameraController';
import { PARAM_DEFAULTS } from '../constants';

export type FileSelectedCallback = (file: File) => void;
export type ParamChangeCallback = (params: RuntimeParams) => void;
export type VoidCallback = () => void;

export class ControlPanel {
  private readonly panel: HTMLDivElement;
  private readonly fileInput: HTMLInputElement;
  private readonly controls: HTMLDivElement;

  private readonly paramSpeed: HTMLInputElement;
  private readonly paramWidth: HTMLInputElement;
  private readonly paramHeight: HTMLInputElement;
  private readonly paramSeed: HTMLInputElement;
  private readonly paramSensitivity: HTMLInputElement;
  private readonly paramPeakThreshold: HTMLInputElement;
  private readonly paramMinBeatSpacing: HTMLInputElement;
  private readonly paramAttackMs: HTMLInputElement;
  private readonly paramReleaseMs: HTMLInputElement;
  private readonly paramLight: HTMLInputElement;
  private readonly paramCamMode: HTMLSelectElement;

  readonly loading: HTMLDivElement;

  onFileSelected: FileSelectedCallback | null = null;
  onParamChange: ParamChangeCallback | null = null;
  onHideUI: VoidCallback | null = null;
  onLightChange: ((value: number) => void) | null = null;

  constructor() {
    this.panel = document.getElementById('ui') as HTMLDivElement;
    this.fileInput = document.getElementById('audio-input') as HTMLInputElement;
    this.controls = document.getElementById('controls') as HTMLDivElement;
    this.paramSpeed = document.getElementById('param-speed') as HTMLInputElement;
    this.paramWidth = document.getElementById('param-width') as HTMLInputElement;
    this.paramHeight = document.getElementById('param-height') as HTMLInputElement;
    this.paramSeed = document.getElementById('param-seed') as HTMLInputElement;
    this.paramSensitivity = document.getElementById('param-sensitivity') as HTMLInputElement;
    this.paramPeakThreshold = document.getElementById('param-peak-threshold') as HTMLInputElement;
    this.paramMinBeatSpacing = document.getElementById('param-min-beat-spacing') as HTMLInputElement;
    this.paramAttackMs = document.getElementById('param-attack-ms') as HTMLInputElement;
    this.paramReleaseMs = document.getElementById('param-release-ms') as HTMLInputElement;
    this.paramLight = document.getElementById('param-light') as HTMLInputElement;
    this.paramCamMode = document.getElementById('param-cam-mode') as HTMLSelectElement;
    this.loading = document.getElementById('loading') as HTMLDivElement;

    this.paramSpeed.value = String(PARAM_DEFAULTS.speed);
    this.paramWidth.value = String(PARAM_DEFAULTS.corridorWidth);
    this.paramHeight.value = String(PARAM_DEFAULTS.wallHeight);
    this.paramSeed.value = String(PARAM_DEFAULTS.seed);
    this.paramSensitivity.value = String(PARAM_DEFAULTS.sensitivity);
    this.paramPeakThreshold.value = String(PARAM_DEFAULTS.peakThreshold);
    this.paramMinBeatSpacing.value = String(PARAM_DEFAULTS.minBeatSpacing);
    this.paramAttackMs.value = String(PARAM_DEFAULTS.attackMs);
    this.paramReleaseMs.value = String(PARAM_DEFAULTS.releaseMs);
    this.paramLight.value = String(PARAM_DEFAULTS.light);

    this.bindEvents();
  }

  get cameraMode(): CameraMode {
    return (this.paramCamMode.value as CameraMode) || CameraMode.Follow;
  }

  getParams(): RuntimeParams {
    return {
      speed: parseFloat(this.paramSpeed.value) || PARAM_DEFAULTS.speed,
      corridorWidth: parseFloat(this.paramWidth.value) || PARAM_DEFAULTS.corridorWidth,
      wallHeight: parseFloat(this.paramHeight.value) || PARAM_DEFAULTS.wallHeight,
      seed: parseInt(this.paramSeed.value, 10) || PARAM_DEFAULTS.seed,
      sensitivity: parseFloat(this.paramSensitivity.value) || PARAM_DEFAULTS.sensitivity,
      peakThreshold: parseFloat(this.paramPeakThreshold.value) || PARAM_DEFAULTS.peakThreshold,
      minBeatSpacing: parseFloat(this.paramMinBeatSpacing.value) || PARAM_DEFAULTS.minBeatSpacing,
      attackMs: parseFloat(this.paramAttackMs.value) || PARAM_DEFAULTS.attackMs,
      releaseMs: parseFloat(this.paramReleaseMs.value) || PARAM_DEFAULTS.releaseMs,
    };
  }

  showControls(): void {
    this.controls.style.display = 'block';
  }

  showLoading(visible: boolean, message?: string): void {
    this.loading.style.display = visible ? 'block' : 'none';
    if (visible && message) {
      const p = this.loading.querySelector('p');
      if (p) p.textContent = message;
    }
  }

  show(): void {
    this.panel.style.display = '';
  }

  hide(): void {
    this.panel.style.display = 'none';
  }

  private bindEvents(): void {
    this.fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.onFileSelected?.(file);
    });

    const notifyParamChange = () => this.onParamChange?.(this.getParams());

    this.paramSpeed.addEventListener('change', notifyParamChange);
    this.paramWidth.addEventListener('change', notifyParamChange);
    this.paramHeight.addEventListener('change', notifyParamChange);
    this.paramSeed.addEventListener('change', notifyParamChange);
    this.paramSensitivity.addEventListener('change', notifyParamChange);
    this.paramPeakThreshold.addEventListener('change', notifyParamChange);
    this.paramMinBeatSpacing.addEventListener('change', notifyParamChange);
    this.paramAttackMs.addEventListener('change', notifyParamChange);
    this.paramReleaseMs.addEventListener('change', notifyParamChange);

    const bindHoverTitle = (input: HTMLInputElement) => {
      input.title = input.value;
      input.addEventListener('input', () => {
        input.title = input.value;
      });
    };

    bindHoverTitle(this.paramSpeed);
    bindHoverTitle(this.paramWidth);
    bindHoverTitle(this.paramHeight);
    bindHoverTitle(this.paramSeed);
    bindHoverTitle(this.paramSensitivity);
    bindHoverTitle(this.paramPeakThreshold);
    bindHoverTitle(this.paramMinBeatSpacing);
    bindHoverTitle(this.paramAttackMs);
    bindHoverTitle(this.paramReleaseMs);
    bindHoverTitle(this.paramLight);

    this.paramLight.addEventListener('input', () => {
      const val = parseFloat(this.paramLight.value) || 1.0;
      this.onLightChange?.(val);
    });

    const btnHideUI = document.getElementById('btn-hide-ui') as HTMLButtonElement;
    btnHideUI.addEventListener('click', () => this.onHideUI?.());
  }
}
