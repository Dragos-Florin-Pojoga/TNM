export class MinimapOverlay {
  private readonly wrapper: HTMLDivElement;
  private readonly image: HTMLImageElement;
  private readonly dot: HTMLDivElement;

  constructor() {
    this.wrapper = document.getElementById('minimap-wrapper') as HTMLDivElement;
    this.image = document.getElementById('debug-canvas') as HTMLImageElement;
    this.dot = document.getElementById('minimap-dot') as HTMLDivElement;

    const btnHide = document.getElementById('btn-hide-minimap') as HTMLButtonElement;
    const btnShow = document.getElementById('btn-show-minimap') as HTMLButtonElement;

    btnHide.addEventListener('click', () => this.hide());
    btnShow.addEventListener('click', () => this.show());
  }

  setImage(dataUrl: string): void {
    this.image.src = dataUrl;
  }

  setDotPosition(u: number, v: number): void {
    this.dot.style.left = `${u * 100}%`;
    this.dot.style.top = `${v * 100}%`;
  }

  show(): void {
    this.wrapper.style.display = '';
    const btnHide = document.getElementById('btn-hide-minimap') as HTMLButtonElement;
    const btnShow = document.getElementById('btn-show-minimap') as HTMLButtonElement;
    btnHide.style.display = '';
    btnShow.style.display = 'none';
  }

  hide(): void {
    this.wrapper.style.display = 'none';
    const btnHide = document.getElementById('btn-hide-minimap') as HTMLButtonElement;
    const btnShow = document.getElementById('btn-show-minimap') as HTMLButtonElement;
    btnHide.style.display = 'none';
    btnShow.style.display = 'block';
  }
}
