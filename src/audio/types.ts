export type EffectPresetId = 
  | 'show' 
  | 'studio' 
  | 'arena' 
  | 'radio' 
  | 'robot' 
  | 'warm' 
  | 'clean';

export interface EffectSettings {
  preset: EffectPresetId;
  reverbWet: number;    // 0 to 1
  delayWet: number;     // 0 to 1
  delayTime: number;    // in seconds (e.g. 0.05 to 0.8)
  delayFeedback: number;// 0 to 0.8
  bassGain: number;     // -12dB to +12dB
  midGain: number;      // -12dB to +12dB
  trebleGain: number;   // -12dB to +12dB
  compression: boolean; // on/off
  robotMod: boolean;    // on/off
  telephoneMod: boolean;// on/off
}

export interface ConnectedMicInfo {
  id: string;
  shortName: string;      // e.g. "Microfone 1"
  label: string;          // device label e.g. "Microfone USB Audio Codec"
  deviceId: string;
  volume: number;         // 0 to 200 (%)
  monitorVoice: boolean;  // Retorno de voz (Ouvir a voz nas caixas de som)
  muted: boolean;         // Mudo
  effects: EffectSettings;
  audioLevel: number;     // 0 to 100 (%) for reactive VU meter
}

export interface AudioOutputDeviceInfo {
  deviceId: string;
  label: string;
  groupId: string;
}

export interface VideoItem {
  id: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
  url: string;
}
