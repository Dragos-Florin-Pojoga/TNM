import { AUDIO } from '../constants';

declare global {
  function maze_audio_Module(): Promise<any>;
}

export interface BeatExtractionResult {
  beatTimestamps: number[];
  onsetArray: Float32Array | null;
  renderedBuffer: AudioBuffer | null;
}

export class BeatDetector {
  async extractBeats(
    audioBuffer: AudioBuffer,
    sensitivity: number,
    peakThreshold: number,
    minBeatSpacing: number,
    attackMs: number,
    releaseMs: number,
  ): Promise<BeatExtractionResult> {
    const channels = 8;
    const offlineCtx = new OfflineAudioContext(
      channels,
      audioBuffer.length,
      audioBuffer.sampleRate,
    );

    const heavyModule = await maze_audio_Module();
    const offlineLoader = new heavyModule.AudioLibLoader();

    await offlineLoader.init({
      blockSize: AUDIO.blockSize,
      webAudioContext: offlineCtx,
    });

    const heavyNode = offlineLoader.webAudioWorklet ?? offlineLoader.webAudioProcessor;
    if (!heavyNode) {
      console.warn('Heavy DSP could not be loaded.');
      return { beatTimestamps: [], onsetArray: null, renderedBuffer: null };
    }

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(heavyNode);
    heavyNode.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();

    if (renderedBuffer.numberOfChannels < channels) {
      console.warn(`Expected ${channels} channels, got ${renderedBuffer.numberOfChannels}`);
      return { beatTimestamps: [], onsetArray: null, renderedBuffer: null };
    }

    const beatTimestamps = this.processPerceptualBeats(renderedBuffer, sensitivity, peakThreshold, minBeatSpacing, attackMs, releaseMs);

    const combinedOnset = new Float32Array(renderedBuffer.length);
    const c2 = renderedBuffer.getChannelData(2);
    const c3 = renderedBuffer.getChannelData(3);
    const c4 = renderedBuffer.getChannelData(4);
    const c5 = renderedBuffer.getChannelData(5);
    for (let i = 0; i < combinedOnset.length; i++) {
      combinedOnset[i] = Math.max(c2[i], c3[i], c4[i], c5[i]);
    }

    return { beatTimestamps, onsetArray: combinedOnset, renderedBuffer };
  }

  public processPerceptualBeats(
    buffer: AudioBuffer,
    sensitivity: number,
    peakThreshold: number,
    minBeatSpacingSec: number,
    attackMs: number,
    releaseMs: number,
  ): number[] {
    const fps = 100;
    const dsRate = buffer.sampleRate / fps;
    const numFrames = Math.floor(buffer.length / dsRate);

    const envs = Array.from({ length: 4 }, () => new Float32Array(numFrames));
    const onsets = Array.from({ length: 4 }, () => new Float32Array(numFrames));

    const attackSec = attackMs / 1000;
    const releaseSec = releaseMs / 1000;
    const attackCoef = Math.exp(-1.0 / (buffer.sampleRate * attackSec));
    const releaseCoef = Math.exp(-1.0 / (buffer.sampleRate * releaseSec));

    for (let b = 0; b < 4; b++) {
      const rawAudio = buffer.getChannelData(2 + b);
      let env = 0;

      for (let i = 0; i < numFrames; i++) {
        let maxEnvInFrame = 0;
        const start = Math.floor(i * dsRate);
        const end = Math.floor((i + 1) * dsRate);

        for (let j = start; j < end; j++) {
          const v = Math.abs(rawAudio[j]);
          if (v > env) {
            env = attackCoef * env + (1 - attackCoef) * v;
          } else {
            env = releaseCoef * env + (1 - releaseCoef) * v;
          }
          if (env > maxEnvInFrame) maxEnvInFrame = env;
        }
        envs[b][i] = maxEnvInFrame;
      }
    }

    let globalMaxEnv = 0.001;
    for (let b = 0; b < 4; b++) {
      for (let i = 0; i < numFrames; i++) {
        if (envs[b][i] > globalMaxEnv) globalMaxEnv = envs[b][i];
      }
    }
    for (let b = 0; b < 4; b++) {
      for (let i = 0; i < numFrames; i++) {
        envs[b][i] /= globalMaxEnv;
      }
    }

    for (let b = 0; b < 4; b++) {
      onsets[b][0] = 0;
      for (let i = 1; i < numFrames; i++) {
        onsets[b][i] = Math.max(0, envs[b][i] - envs[b][i - 1]);
      }

      const smoothed = new Float32Array(numFrames);
      for (let i = 1; i < numFrames - 1; i++) {
        smoothed[i] = (onsets[b][i-1] + onsets[b][i] + onsets[b][i+1]) / 3.0;
      }
      for (let i = 1; i < numFrames - 1; i++) {
        onsets[b][i] = smoothed[i];
      }
    }

    const noveltyWindow = 2 * fps;
    const salienceScores = Array.from({ length: 4 }, () => new Float32Array(numFrames));

    const freqBias = [1.0, 1.1, 1.4, 1.0];

    for (let b = 0; b < 4; b++) {
      for (let i = 0; i < numFrames; i++) {
        let activitySum = 0;
        const startAct = Math.max(0, i - Math.floor(fps * 1.5));
        for (let j = startAct; j <= i; j++) {
          activitySum += onsets[b][j];
        }

        const energy = envs[b][i];
        const transient = onsets[b][i];

        salienceScores[b][i] = (energy * freqBias[b] * 0.2) + (activitySum * 1.2) + (transient * 2.5);
      }
    }

    const minSpacingFrames = Math.floor(minBeatSpacingSec * fps);
    const lookWindow = Math.round(fps * 0.07);
    const timestamps: number[] = [];
    let lastBeatFrame = -minSpacingFrames;

    let currentFocus = 0;

    for (let i = lookWindow; i < numFrames - lookWindow; i++) {
      let bestBand = currentFocus;
      let maxSalience = salienceScores[currentFocus][i] * 1.2;

      for (let b = 0; b < 4; b++) {
        if (salienceScores[b][i] > maxSalience) {
          maxSalience = salienceScores[b][i];
          bestBand = b;
        }
      }
      currentFocus = bestBand;

      if (maxSalience < 0.05) continue;

      let localMaxOnset = 0.005;
      const startLocal = Math.max(0, i - noveltyWindow);
      for (let j = startLocal; j < i; j++) {
        if (onsets[currentFocus][j] > localMaxOnset) {
          localMaxOnset = onsets[currentFocus][j];
        }
      }

      const v = onsets[currentFocus][i];
      const dynamicThreshold = Math.max(0.015, localMaxOnset * peakThreshold) / Math.max(0.1, sensitivity);

      if (v < dynamicThreshold) continue;
      if (i - lastBeatFrame < minSpacingFrames) continue;

      let isMax = true;
      for (let j = i - lookWindow; j <= i + lookWindow; j++) {
        if (onsets[currentFocus][j] > onsets[currentFocus][i]) {
          isMax = false;
          break;
        }
      }

      if (isMax) {
        timestamps.push(i / fps);
        lastBeatFrame = i;
      }
    }

    return timestamps;
  }
}
