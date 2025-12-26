import { useEffect, useRef } from 'react';

/**
 * Manages reverb wet/dry mix and decay settings
 * OPTIMIZED: Debounces buffer regeneration and decouples wet/dry from buffer updates
 */
export const useReverbEffect = (reverb, audioContext, reverbNode, reverbGain, dryGain) => {
  const debounceTimerRef = useRef(null);

  // 1. Handle Wet/Dry Mix - Updates instantly without glitching
  useEffect(() => {
    if (!dryGain || !reverbGain || !audioContext) return;

    const now = audioContext.currentTime;
    const wetValue = reverb.enabled ? reverb.wet : 0;

    // Smoothly transition the mix to avoid clicks
    dryGain.gain.setTargetAtTime(1 - wetValue, now, 0.02);
    reverbGain.gain.setTargetAtTime(wetValue, now, 0.02);
  }, [reverb.enabled, reverb.wet, audioContext, reverbGain, dryGain]);

  // 2. Handle Impulse Response (Decay) - Debounced to prevent CPU spikes
  useEffect(() => {
    if (!reverb.enabled || !reverbNode || !audioContext) return;

    // Clear existing timer if user is still moving the slider
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Delay regeneration by 150ms
    debounceTimerRef.current = setTimeout(() => {
      const ctx = audioContext;
      const duration = reverb.decay;
      const decayCurve = 2.0; // Fixed decay math complexity

      const sampleRate = ctx.sampleRate;
      const length = sampleRate * duration;
      const impulse = ctx.createBuffer(2, length, sampleRate);

      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          // Math.pow is expensive; doing it once per sample is heavy
          channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decayCurve);
        }
      }

      // Setting the buffer on a ConvolverNode that is already playing
      // can cause a brief silence or pop; we do it only when necessary.
      reverbNode.buffer = impulse;
    }, 150);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [reverb.decay, reverb.enabled, audioContext, reverbNode]);
};
