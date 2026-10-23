/**
 * Generates an algorithmic stereo impulse response for Web Audio ConvolverNode.
 * Produces smooth, tight concert hall and plate reverb without lingering echo tails.
 */
export function createReverbImpulseResponse(
  audioCtx: AudioContext,
  duration = 1.0,
  decay = 3.2,
  reverse = false
): AudioBuffer {
  const sampleRate = audioCtx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const impulse = audioCtx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = reverse ? length - 1 - i : i;
    // Exponential decay envelope - steep decay prevents trailing echo tail
    const envelope = Math.pow(1 - n / length, decay);
    // Stereo decorrelated noise
    left[i] = ((Math.random() * 2) - 1) * envelope;
    right[i] = ((Math.random() * 2) - 1) * envelope;
  }

  return impulse;
}
