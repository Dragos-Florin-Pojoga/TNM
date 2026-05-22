import { AUDIO } from '../constants';

declare global {
  function maze_audio_Module(): Promise<any>;
}

export interface AudioEnvelope {
  bass: number;
  mid: number;
  treble: number;
}

export class AudioEngine {
  public audioContext: AudioContext | null = null;
  public audioBuffer: AudioBuffer | null = null;
  public sourceNode: AudioBufferSourceNode | null = null;
  public startTime = 0;

  public readonly env: AudioEnvelope = { bass: 0, mid: 0, treble: 0 };

  private heavyLoader: any = null;
  private heavyStarted = false;
  private sourceStarted = false;
  private gainNode: GainNode | null = null;

  get isInitialized(): boolean {
    return this.audioContext !== null;
  }

  get playTime(): number {
    if (!this.audioContext || !this.sourceStarted) return 0;
    return Math.max(0, this.audioContext.currentTime - this.startTime);
  }

  async init(): Promise<void> {
    this.audioContext = new AudioContext();

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.75;
    this.gainNode.connect(this.audioContext.destination);

    const heavyModule = await maze_audio_Module();
    this.heavyLoader = new heavyModule.AudioLibLoader();

    await this.heavyLoader.init({
      blockSize: AUDIO.blockSize,
      webAudioContext: this.audioContext,
      sendHook: (sendName: string, value: number) => {
        if (sendName === 'bass_env') this.env.bass = value;
        else if (sendName === 'mid_env') this.env.mid = value;
        else if (sendName === 'high_env') this.env.treble = value;
      },
    });

    if (this.audioContext.state !== 'suspended') {
      await this.audioContext.suspend();
    }
  }

  setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  get volume(): number {
    return this.gainNode?.gain.value ?? 0.75;
  }

  async loadAudioBuffer(file: File): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('AudioEngine not initialized. Call init() first.');
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    return this.audioBuffer;
  }

  play(): void {
    this.startSource(0);
  }

  pause(): void {
    this.audioContext?.suspend();
  }

  async resume(): Promise<void> {
    await this.audioContext?.resume();
  }

  seekTo(timeSec: number): void {
    this.startSource(timeSec);
  }

  private startSource(offsetSec: number): void {
    if (!this.audioBuffer || !this.audioContext) return;

    this.stopCurrentSource();

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;

    const heavyNode = this.getHeavyNode();

    if (heavyNode) {
      if (!this.heavyStarted) {
        this.sourceNode.connect(heavyNode);
        this.heavyLoader.start();
        this.heavyStarted = true;

        heavyNode.disconnect();
        heavyNode.connect(this.gainNode!);
      } else {
        this.sourceNode.connect(heavyNode);
      }
    } else {
      this.sourceNode.connect(this.gainNode!);
    }

    this.sourceNode.start(0, offsetSec);
    this.startTime = this.audioContext.currentTime - offsetSec;
    this.sourceStarted = true;
    this.audioContext.resume();
  }

  private stopCurrentSource(): void {
    if (!this.sourceNode) return;
    try { this.sourceNode.stop(); } catch { /* already stopped */ }
    try { this.sourceNode.disconnect(); } catch { /* already disconnected */ }
    this.sourceNode = null;
  }

  private getHeavyNode(): AudioNode | null {
    return (this.heavyLoader as any)?.webAudioWorklet
      ?? (this.heavyLoader as any)?.webAudioProcessor
      ?? null;
  }
}
