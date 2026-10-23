/**
 * Algorithmic stereo impulse response for Web Audio ConvolverNode.
 * Tuned with ultra-fast exponential decay (0.35s) to eliminate any lingering echo/delay tails ("rabo de voz").
 */
export function createReverbImpulseResponse(
  audioCtx: AudioContext,
  duration = 0.35,
  decay = 6.5,
  reverse = false
): AudioBuffer {
  const sampleRate = audioCtx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const impulse = audioCtx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = reverse ? length - 1 - i : i;
    // Ultra-steep exponential decay drops to zero fast to avoid any delayed ghost reflections
    const envelope = Math.pow(Math.max(0, 1 - n / length), decay);
    left[i] = ((Math.random() * 2) - 1) * envelope;
    right[i] = ((Math.random() * 2) - 1) * envelope;
  }

  return impulse;
}
