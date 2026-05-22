export type VoidCallback = () => void;
export type SeekCallback = (fraction: number) => void;
export type VolumeCallback = (value: number) => void;

export class TimelineScrubber {
  private readonly range: HTMLInputElement;
  private readonly volumeSlider: HTMLInputElement;
  private readonly playPauseBtn: HTMLButtonElement;
  private isScrubbing = false;

  onSeek: SeekCallback | null = null;
  onPlayPause: VoidCallback | null = null;
  onVolumeChange: VolumeCallback | null = null;

  constructor() {
    this.range = document.getElementById('timeline-scrubber') as HTMLInputElement;
    this.playPauseBtn = document.getElementById('btn-scrubber-playpause') as HTMLButtonElement;
    this.volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;

    const doSeek = () => {
      const fraction = parseFloat(this.range.value) / 1000;
      this.onSeek?.(fraction);
    };
    this.range.addEventListener('mousedown', () => { this.isScrubbing = true; });
    this.range.addEventListener('mouseup', () => { this.isScrubbing = false; });
    this.range.addEventListener('input', doSeek);
    this.range.addEventListener('change', doSeek);

    this.playPauseBtn.addEventListener('click', () => this.onPlayPause?.());

    this.volumeSlider.addEventListener('input', () => {
      const vol = parseFloat(this.volumeSlider.value) / 100;
      this.onVolumeChange?.(vol);
    });
  }

  setProgress(fraction: number): void {
    if (!this.isScrubbing) {
      this.range.value = String(Math.round(fraction * 1000));
    }
  }

  get scrubbing(): boolean {
    return this.isScrubbing;
  }

  setPlaying(isPlaying: boolean): void {
    this.playPauseBtn.innerText = isPlaying ? '⏸' : '▶';
  }
}
