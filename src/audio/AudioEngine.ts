import { createReverbImpulseResponse } from './reverbGenerator';
import type { ConnectedMicInfo, EffectPresetId, EffectSettings } from './types';

export const PRESET_DEFAULTS: Record<EffectPresetId, EffectSettings> = {
  show: {
    preset: 'show',
    reverbWet: 0.16,
    delayWet: 0.0,
    delayTime: 0.0,
    delayFeedback: 0.0,
    bassGain: 1.5,
    midGain: 2.0,
    trebleGain: 2.5,
    compression: true,
    robotMod: false,
    telephoneMod: false,
  },
  studio: {
    preset: 'studio',
    reverbWet: 0.10,
    delayWet: 0.0,
    delayTime: 0.0,
    delayFeedback: 0.0,
    bassGain: 0.5,
    midGain: 1.5,
    trebleGain: 3.5,
    compression: true,
    robotMod: false,
    telephoneMod: false,
  },
  arena: {
    preset: 'arena',
    reverbWet: 0.65,
    delayWet: 0.48,
    delayTime: 0.35,
    delayFeedback: 0.45,
    bassGain: 2.0,
    midGain: 0.0,
    trebleGain: 1.0,
    compression: true,
    robotMod: false,
    telephoneMod: false,
  },
  warm: {
    preset: 'warm',
    reverbWet: 0.28,
    delayWet: 0.08,
    delayTime: 0.12,
    delayFeedback: 0.15,
    bassGain: 4.5,
    midGain: 1.0,
    trebleGain: -1.0,
    compression: true,
    robotMod: false,
    telephoneMod: false,
  },
  radio: {
    preset: 'radio',
    reverbWet: 0.05,
    delayWet: 0.0,
    delayTime: 0.0,
    delayFeedback: 0.0,
    bassGain: -10.0,
    midGain: 6.0,
    trebleGain: -8.0,
    compression: true,
    robotMod: false,
    telephoneMod: true,
  },
  robot: {
    preset: 'robot',
    reverbWet: 0.25,
    delayWet: 0.20,
    delayTime: 0.15,
    delayFeedback: 0.25,
    bassGain: 0.0,
    midGain: 0.0,
    trebleGain: 0.0,
    compression: false,
    robotMod: true,
    telephoneMod: false,
  },
  clean: {
    preset: 'clean',
    reverbWet: 0.0,
    delayWet: 0.0,
    delayTime: 0.0,
    delayFeedback: 0.0,
    bassGain: 0.0,
    midGain: 0.0,
    trebleGain: 0.0,
    compression: false,
    robotMod: false,
    telephoneMod: false,
  },
};

interface MicInternalGraph {
  id: string;
  shortName: string;
  label: string;
  deviceId: string;
  stream: MediaStream;
  sourceNode: MediaStreamAudioSourceNode;
  highpassFilter: BiquadFilterNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  bypassCompressorGain: GainNode;
  compressorWetGain: GainNode;
  inputGainNode: GainNode;
  analyserNode: AnalyserNode;
  
  // Reverb
  reverbConvolver: ConvolverNode;
  reverbGain: GainNode;
  
  // Delay
  delayNode: DelayNode;
  delayFeedbackGain: GainNode;
  delayGain: GainNode;
  
  // Modulations
  telephoneFilter: BiquadFilterNode;
  telephoneGain: GainNode;
  normalFilterGain: GainNode;
  
  ringModOsc: OscillatorNode | null;
  ringModGain: GainNode;
  
  // Channel controls
  dryGainNode: GainNode;
  channelGainNode: GainNode;
  monitorGainNode: GainNode; // Retorno de voz
  muteGainNode: GainNode;
  
  // State
  volume: number;
  monitorVoice: boolean;
  muted: boolean;
  effects: EffectSettings;
  dataArray: Uint8Array<ArrayBuffer>;
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private micMap = new Map<string, MicInternalGraph>();
  private micCounter = 1;
  private selectedOutputDeviceId = 'default';
  private sharedReverbBuffer: AudioBuffer | null = null;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public getContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      // latencyHint: 0 requests the lowest possible buffer size from the audio hardware
      this.audioCtx = new AudioCtxClass({
        latencyHint: 0,
      });
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);

      // Pre-synthesize shared tight impulse response (1.0s decay) to prevent trailing ghost echoes
      this.sharedReverbBuffer = createReverbImpulseResponse(this.audioCtx, 1.0, 3.2);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public getProcessedOutputStream(): MediaStream {
    const ctx = this.getContext();
    if (!this.streamDestination) {
      this.streamDestination = ctx.createMediaStreamDestination();
      if (this.masterGain) {
        this.masterGain.connect(this.streamDestination);
      }
    }
    return this.streamDestination.stream;
  }

  public async setMasterVolume(vol: number): Promise<void> {
    const ctx = this.getContext();
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(vol, 1.5)), ctx.currentTime, 0.02);
    }
  }

  public async setOutputDevice(deviceId: string): Promise<boolean> {
    const ctx = this.getContext();
    this.selectedOutputDeviceId = deviceId;
    try {
      if ('setSinkId' in ctx && typeof (ctx as unknown as { setSinkId: (id: string) => Promise<void> }).setSinkId === 'function') {
        await (ctx as unknown as { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Browser does not support AudioContext.setSinkId or permission denied', err);
      return false;
    }
  }

  public getSelectedOutputDeviceId(): string {
    return this.selectedOutputDeviceId;
  }

  public async getAvailableInputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      // Ensure permissions request to get valid device labels
      await navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        stream.getTracks().forEach(track => track.stop());
      }).catch(() => {});
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'audioinput');
    } catch {
      return [];
    }
  }

  public async getAvailableOutputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'audiooutput');
    } catch {
      return [];
    }
  }

  public async addMicrophone(deviceId: string, customLabel?: string): Promise<ConnectedMicInfo> {
    const ctx = this.getContext();
    
    // Acquire the media stream for the selected mic with zero browser DSP latency
    const targetDeviceId = (deviceId && deviceId !== 'default') ? { exact: deviceId } : undefined;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: targetDeviceId,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          latency: 0,
          channelCount: 1,
          // Chromium legacy WebRTC audio processing flags (bypasses software buffer queue)
          googEchoCancellation: false,
          googAutoGainControl: false,
          googNoiseSuppression: false,
          googHighpassFilter: false,
          googTypingNoiseDetection: false,
        } as MediaTrackConstraints,
      });
    } catch (err) {
      console.warn('Ultra-low latency mic constraints not accepted by driver, falling back to minimal constraints:', err);
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: targetDeviceId,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    }

    const shortName = `Microfone ${this.micCounter++}`;
    const id = `mic-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const label = customLabel || stream.getAudioTracks()[0]?.label || shortName;

    // Build DSP graph
    const sourceNode = ctx.createMediaStreamSource(stream);

    // 1. Rumble cutoff (High-pass 75Hz)
    const highpassFilter = ctx.createBiquadFilter();
    highpassFilter.type = 'highpass';
    highpassFilter.frequency.setValueAtTime(75, ctx.currentTime);

    // 2. 3-Band Equalizer
    const eqLow = ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.setValueAtTime(250, ctx.currentTime);

    const eqMid = ctx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.setValueAtTime(2500, ctx.currentTime);
    eqMid.Q.setValueAtTime(1.2, ctx.currentTime);

    const eqHigh = ctx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.setValueAtTime(8000, ctx.currentTime);

    // 3. Dynamic Vocal Compressor with ultra-fast release (0.06s) to eliminate tail pumping
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-22, ctx.currentTime);
    compressor.knee.setValueAtTime(10, ctx.currentTime);
    compressor.ratio.setValueAtTime(3.5, ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    compressor.release.setValueAtTime(0.06, ctx.currentTime);

    const bypassCompressorGain = ctx.createGain();
    const compressorWetGain = ctx.createGain();

    // 4. Input Gain & Level Analyser (for live VU meter)
    const inputGainNode = ctx.createGain();
    inputGainNode.gain.setValueAtTime(1.0, ctx.currentTime);

    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.5;

    // 5. Effects - Reverb
    const reverbConvolver = ctx.createConvolver();
    if (this.sharedReverbBuffer) {
      reverbConvolver.buffer = this.sharedReverbBuffer;
    }
    const reverbGain = ctx.createGain();
    reverbGain.gain.setValueAtTime(0.16, ctx.currentTime);

    // 6. Effects - Delay
    const delayNode = ctx.createDelay(2.0);
    delayNode.delayTime.setValueAtTime(0.0, ctx.currentTime);
    const delayFeedbackGain = ctx.createGain();
    delayFeedbackGain.gain.setValueAtTime(0.0, ctx.currentTime);
    const delayGain = ctx.createGain();
    delayGain.gain.setValueAtTime(0.0, ctx.currentTime);

    // Connect delay feedback loop
    delayNode.connect(delayFeedbackGain);
    delayFeedbackGain.connect(delayNode);
    delayNode.connect(delayGain);

    // 7. Modulations (Telephone / Radio)
    const telephoneFilter = ctx.createBiquadFilter();
    telephoneFilter.type = 'bandpass';
    telephoneFilter.frequency.setValueAtTime(1200, ctx.currentTime);
    telephoneFilter.Q.setValueAtTime(2.5, ctx.currentTime);

    const telephoneGain = ctx.createGain();
    telephoneGain.gain.setValueAtTime(0.0, ctx.currentTime);
    const normalFilterGain = ctx.createGain();
    normalFilterGain.gain.setValueAtTime(1.0, ctx.currentTime);

    // Dry gain
    const dryGainNode = ctx.createGain();
    dryGainNode.gain.setValueAtTime(1.0, ctx.currentTime);

    // Master per-channel controls
    const channelGainNode = ctx.createGain();
    const monitorGainNode = ctx.createGain(); // Retorno de voz (caixas de som)
    monitorGainNode.gain.setValueAtTime(1.0, ctx.currentTime);

    const muteGainNode = ctx.createGain();
    muteGainNode.gain.setValueAtTime(1.0, ctx.currentTime);

    // Hook up signal chain:
    sourceNode.connect(highpassFilter);
    highpassFilter.connect(inputGainNode);
    inputGainNode.connect(analyserNode);

    // inputGain -> EQ chain
    inputGainNode.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);

    // EQ -> compressor path / bypass path
    eqHigh.connect(compressor);
    compressor.connect(compressorWetGain);
    eqHigh.connect(bypassCompressorGain);

    // Combined EQ signal to normal / telephone paths
    const preEffectMixer = ctx.createGain();
    compressorWetGain.connect(preEffectMixer);
    bypassCompressorGain.connect(preEffectMixer);

    // Telephone route vs Normal route
    preEffectMixer.connect(normalFilterGain);
    preEffectMixer.connect(telephoneFilter);
    telephoneFilter.connect(telephoneGain);

    const vocalBus = ctx.createGain();
    normalFilterGain.connect(vocalBus);
    telephoneGain.connect(vocalBus);

    // Vocal bus -> Dry, Reverb, Delay
    vocalBus.connect(dryGainNode);
    vocalBus.connect(reverbConvolver);
    reverbConvolver.connect(reverbGain);
    vocalBus.connect(delayNode);

    // Mix effects to channel output
    dryGainNode.connect(channelGainNode);
    reverbGain.connect(channelGainNode);
    delayGain.connect(channelGainNode);

    // Channel output -> Mute -> Monitor (Retorno) -> Master Destination
    channelGainNode.connect(muteGainNode);
    muteGainNode.connect(monitorGainNode);
    
    if (this.masterGain) {
      monitorGainNode.connect(this.masterGain);
    }

    const defaultEffects = { ...PRESET_DEFAULTS.show };

    const micGraph: MicInternalGraph = {
      id,
      shortName,
      label,
      deviceId,
      stream,
      sourceNode,
      highpassFilter,
      eqLow,
      eqMid,
      eqHigh,
      compressor,
      bypassCompressorGain,
      compressorWetGain,
      inputGainNode,
      analyserNode,
      reverbConvolver,
      reverbGain,
      delayNode,
      delayFeedbackGain,
      delayGain,
      telephoneFilter,
      telephoneGain,
      normalFilterGain,
      ringModOsc: null,
      ringModGain: ctx.createGain(),
      dryGainNode,
      channelGainNode,
      monitorGainNode,
      muteGainNode,
      volume: 100,
      monitorVoice: true,
      muted: false,
      effects: defaultEffects,
      dataArray: new Uint8Array(analyserNode.frequencyBinCount) as Uint8Array<ArrayBuffer>,
    };

    this.micMap.set(id, micGraph);
    this.applyEffects(micGraph, defaultEffects);

    return this.getMicInfo(micGraph);
  }

  public removeMicrophone(id: string): void {
    const mic = this.micMap.get(id);
    if (!mic) return;

    mic.stream.getTracks().forEach(track => track.stop());
    if (mic.ringModOsc) {
      try {
        mic.ringModOsc.stop();
        mic.ringModOsc.disconnect();
      } catch {}
    }
    mic.sourceNode.disconnect();
    mic.monitorGainNode.disconnect();
    mic.channelGainNode.disconnect();
    this.micMap.delete(id);
  }

  public setMicVolume(id: string, volumePercent: number): void {
    const mic = this.micMap.get(id);
    if (!mic || !this.audioCtx) return;
    mic.volume = volumePercent;
    // 0 to 200% maps to gain 0 to 2.0
    const gainVal = Math.max(0, Math.min(volumePercent / 100, 2.0));
    mic.inputGainNode.gain.setTargetAtTime(gainVal, this.audioCtx.currentTime, 0.02);
  }

  public setMicMonitor(id: string, monitor: boolean): void {
    const mic = this.micMap.get(id);
    if (!mic || !this.audioCtx) return;
    mic.monitorVoice = monitor;
    mic.monitorGainNode.gain.setTargetAtTime(monitor ? 1.0 : 0.0, this.audioCtx.currentTime, 0.02);
  }

  public setMicMute(id: string, muted: boolean): void {
    const mic = this.micMap.get(id);
    if (!mic || !this.audioCtx) return;
    mic.muted = muted;
    mic.muteGainNode.gain.setTargetAtTime(muted ? 0.0 : 1.0, this.audioCtx.currentTime, 0.02);
  }

  public applyPreset(id: string, preset: EffectPresetId): void {
    const mic = this.micMap.get(id);
    if (!mic) return;
    const settings = { ...PRESET_DEFAULTS[preset] };
    this.applyEffects(mic, settings);
  }

  public updateEffectSettings(id: string, partial: Partial<EffectSettings>): void {
    const mic = this.micMap.get(id);
    if (!mic) return;
    const newSettings: EffectSettings = {
      ...mic.effects,
      ...partial,
    };
    this.applyEffects(mic, newSettings);
  }

  private applyEffects(mic: MicInternalGraph, settings: EffectSettings): void {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    mic.effects = settings;

    // EQ
    mic.eqLow.gain.setTargetAtTime(settings.bassGain, ctx.currentTime, 0.05);
    mic.eqMid.gain.setTargetAtTime(settings.midGain, ctx.currentTime, 0.05);
    mic.eqHigh.gain.setTargetAtTime(settings.trebleGain, ctx.currentTime, 0.05);

    // Compressor
    if (settings.compression) {
      mic.compressorWetGain.gain.setTargetAtTime(1.0, ctx.currentTime, 0.05);
      mic.bypassCompressorGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.05);
    } else {
      mic.compressorWetGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.05);
      mic.bypassCompressorGain.gain.setTargetAtTime(1.0, ctx.currentTime, 0.05);
    }

    // Reverb
    mic.reverbGain.gain.setTargetAtTime(settings.reverbWet, ctx.currentTime, 0.05);

    // Delay
    mic.delayGain.gain.setTargetAtTime(settings.delayWet, ctx.currentTime, 0.05);
    mic.delayNode.delayTime.setTargetAtTime(Math.max(0.01, Math.min(settings.delayTime, 1.5)), ctx.currentTime, 0.05);
    mic.delayFeedbackGain.gain.setTargetAtTime(Math.max(0, Math.min(settings.delayFeedback, 0.8)), ctx.currentTime, 0.05);

    // Telephone / Radio mod
    if (settings.telephoneMod) {
      mic.telephoneGain.gain.setTargetAtTime(1.0, ctx.currentTime, 0.05);
      mic.normalFilterGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.05);
    } else {
      mic.telephoneGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.05);
      mic.normalFilterGain.gain.setTargetAtTime(1.0, ctx.currentTime, 0.05);
    }

    // Robot ring modulation
    if (settings.robotMod) {
      if (!mic.ringModOsc) {
        mic.ringModOsc = ctx.createOscillator();
        mic.ringModOsc.type = 'sine';
        mic.ringModOsc.frequency.setValueAtTime(50, ctx.currentTime);
        mic.ringModOsc.connect(mic.ringModGain.gain);
        mic.ringModOsc.start();
      }
    } else {
      if (mic.ringModOsc) {
        try {
          mic.ringModOsc.stop();
          mic.ringModOsc.disconnect();
        } catch {}
        mic.ringModOsc = null;
      }
    }
  }

  public getMicLevel(id: string): number {
    const mic = this.micMap.get(id);
    if (!mic || mic.muted) return 0;

    mic.analyserNode.getByteTimeDomainData(mic.dataArray as any);
    let sum = 0;
    for (let i = 0; i < mic.dataArray.length; i++) {
      const val = (mic.dataArray[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / mic.dataArray.length);
    // Scale RMS nicely into 0-100 range with sensitivity boost for singing
    const level = Math.min(100, Math.round(rms * 280));
    return level;
  }

  public getOverallVoiceLevel(): number {
    let maxLevel = 0;
    this.micMap.forEach(mic => {
      if (!mic.muted) {
        const lvl = this.getMicLevel(mic.id);
        if (lvl > maxLevel) maxLevel = lvl;
      }
    });
    return maxLevel;
  }

  public getAllMics(): ConnectedMicInfo[] {
    return Array.from(this.micMap.values()).map(mic => this.getMicInfo(mic));
  }

  private getMicInfo(mic: MicInternalGraph): ConnectedMicInfo {
    return {
      id: mic.id,
      shortName: mic.shortName,
      label: mic.label,
      deviceId: mic.deviceId,
      volume: mic.volume,
      monitorVoice: mic.monitorVoice,
      muted: mic.muted,
      effects: { ...mic.effects },
      audioLevel: 0,
    };
  }
}
