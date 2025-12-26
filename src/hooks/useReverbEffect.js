import { useEffect } from 'react';

/**
 * Manages reverb wet/dry mix and decay settings
 */
export const useReverbEffect = (reverb, audioContext, reverbNode, reverbGain, dryGain) => {
  useEffect(() => {
    if (!dryGain || !reverbGain || !reverbNode || !audioContext) return;

    const ctx = audioContext;

    if (reverb.enabled) {
      // Wet/dry mix
      dryGain.gain.setValueAtTime(1 - reverb.wet, ctx.currentTime);
      reverbGain.gain.setValueAtTime(reverb.wet, ctx.currentTime);

      // Regenerate impulse response with new decay
      const generateImpulseResponse = (duration, decay) => {
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * duration;
        const impulse = ctx.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
          const channelData = impulse.getChannelData(channel);
          for (let i = 0; i < length; i++) {
            channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
          }
        }

        return impulse;
      };

      reverbNode.buffer = generateImpulseResponse(reverb.decay, 2.0);
    } else {
      // Bypass reverb
      dryGain.gain.setValueAtTime(1, ctx.currentTime);
      reverbGain.gain.setValueAtTime(0, ctx.currentTime);
    }
  }, [reverb.enabled, reverb.wet, reverb.decay, audioContext, reverbNode, reverbGain, dryGain]);
};
