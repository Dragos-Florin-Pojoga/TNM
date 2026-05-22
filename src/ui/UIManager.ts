import { ControlPanel } from './ControlPanel';
import { TimelineScrubber } from './TimelineScrubber';
import { MinimapOverlay } from './MinimapOverlay';
import { RuntimeParams } from '../util/types';
import { CameraMode } from '../scene/CameraController';

export class UIManager {
  public readonly controlPanel = new ControlPanel();
  public readonly timeline = new TimelineScrubber();
  public readonly minimap = new MinimapOverlay();
  private btnShowUI: HTMLButtonElement;

  constructor() {
    this.btnShowUI = document.getElementById('btn-show-ui') as HTMLButtonElement;
    this.wireInternal();
  }

  private wireInternal(): void {
    this.controlPanel.onHideUI = () => {
      this.controlPanel.hide();
      this.btnShowUI.style.display = 'block';
    };

    this.btnShowUI.addEventListener('click', () => {
      this.controlPanel.show();
      this.btnShowUI.style.display = 'none';
    });
  }

  showLoading(visible: boolean, message?: string): void {
    this.controlPanel.showLoading(visible, message);
  }

  showControls(): void {
    this.controlPanel.showControls();
  }

  getParams(): RuntimeParams {
    return this.controlPanel.getParams();
  }

  get cameraMode(): CameraMode {
    return this.controlPanel.cameraMode;
  }
}
