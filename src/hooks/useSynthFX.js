import { useRef, useEffect, useCallback } from 'react';

/**
 * Manages all synth effects: waveform morphing, filter, drive/saturation, and unison
 */
export const useSynthFX = (
  audioContext,
  waveform,
  filter,
  unison,
  activeOscillators,
  setActiveOscillators
) => {
  const activeFiltersMapRef = useRef(new Map());
  const activeDriveMapRef = useRef(new Map());

  // Create PeriodicWave for morphing between waveforms
  const createMorphedWave = useCallback(
    (position) => {
      if (!audioContext) return null;

      const size = 2048;
      const real = new Float32Array(size);
      const imag = new Float32Array(size);

      // Generate harmonics based on position
      if (position <= 0.33) {
        // Between sine and triangle
        const blend = position / 0.33;

        // Sine: fundamental only
        // Triangle: odd harmonics with 1/n^2 amplitude
        for (let n = 1; n < size; n++) {
          if (n % 2 === 1) {
            // Odd harmonics
            const triangleAmp = 1 / (n * n);
            imag[n] = blend * triangleAmp + (1 - blend) * (n === 1 ? 1 : 0);
          }
        }
      } else if (position <= 0.67) {
        // Between triangle and sawtooth
        const blend = (position - 0.33) / 0.34;

        // Triangle: odd harmonics 1/n^2
        // Sawtooth: all harmonics 1/n
        for (let n = 1; n < size; n++) {
          const sawAmp = 1 / n;
          if (n % 2 === 1) {
            const triangleAmp = 1 / (n * n);
            imag[n] = (1 - blend) * triangleAmp + blend * sawAmp;
          } else {
            imag[n] = blend * sawAmp;
          }
        }
      } else {
        // Between sawtooth and square
        const blend = (position - 0.67) / 0.33;

        // Sawtooth: all harmonics 1/n
        // Square: odd harmonics 1/n
        for (let n = 1; n < size; n++) {
          const sawAmp = 1 / n;
          if (n % 2 === 1) {
            const squareAmp = 1 / n;
            imag[n] = sawAmp; // Both have odd harmonics
          } else {
            imag[n] = (1 - blend) * sawAmp; // Fade out even harmonics
          }
        }
      }

      return audioContext.createPeriodicWave(real, imag, { disableNormalization: false });
    },
    [audioContext]
  );

  // Generate distortion curve for drive/saturation
  const makeDistortionCurve = useCallback((amount) => {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);

    // Ensure amount is a valid number to prevent NaN silence
    const k = typeof amount !== 'number' || amount <= 0 ? 0 : amount;

    for (let i = 0; i < n_samples; ++i) {
      // Standardize x from -1 to 1
      const x = (i * 2) / n_samples - 1;

      if (k === 0) {
        // Linear identity curve (No distortion, full volume)
        curve[i] = x;
      } else {
        // Classic Soft-Clipping formula
        // This maintains volume while adding harmonics/saturation
        curve[i] = ((3 + k) * x * Math.PI) / (Math.PI + k * Math.abs(x));
      }
    }
    return curve;
  }, []);

  // Update all active oscillators when waveform changes
  useEffect(() => {
    const periodicWave = createMorphedWave(waveform);
    if (!periodicWave) return;

    // Update all currently playing oscillators
    setActiveOscillators((prev) => {
      Object.values(prev).forEach((oscData) => {
        if (oscData?.voices) {
          oscData.voices.forEach(({ oscillator }) => {
            try {
              oscillator.setPeriodicWave(periodicWave);
            } catch (e) {
              // Oscillator might have already stopped
            }
          });
        }
      });
      return prev;
    });
  }, [waveform, createMorphedWave, setActiveOscillators]);

  // Update all active filters when filter settings change
  useEffect(() => {
    if (!audioContext) return;

    const now = audioContext.currentTime;

    activeFiltersMapRef.current.forEach((filterNode) => {
      try {
        filterNode.type = filter.type;
        filterNode.frequency.cancelScheduledValues(now);
        filterNode.frequency.setValueAtTime(filterNode.frequency.value, now);
        filterNode.frequency.exponentialRampToValueAtTime(
          Math.max(20, filter.frequency),
          now + 0.02
        );

        filterNode.Q.cancelScheduledValues(now);
        filterNode.Q.setValueAtTime(filterNode.Q.value, now);
        filterNode.Q.linearRampToValueAtTime(filter.Q, now + 0.02);

        if (filterNode.gain) {
          filterNode.gain.cancelScheduledValues(now);
          filterNode.gain.setValueAtTime(filterNode.gain.value, now);
          filterNode.gain.linearRampToValueAtTime(filter.gain, now + 0.02);
        }
      } catch (e) {
        // Filter might have been disconnected
      }
    });
  }, [filter.type, filter.frequency, filter.Q, filter.gain, audioContext]);

  // Update all active drive nodes when drive/saturation changes
  useEffect(() => {
    if (!audioContext || !activeDriveMapRef.current) return;

    // Generate the curve based on the module settings
    const currentCurve = makeDistortionCurve(filter.enabled ? filter.drive : 0);

    // Update every active Drive node instantly
    activeDriveMapRef.current.forEach((driveNode) => {
      try {
        if (driveNode) {
          driveNode.curve = currentCurve;
        }
      } catch (e) {
        // Node might have been cleaned up
      }
    });
  }, [filter.drive, filter.enabled, audioContext, makeDistortionCurve]);

  // Update unison settings for all active voices
  useEffect(() => {
    if (!audioContext) return;

    const now = audioContext.currentTime;

    // Loop through all active notes
    Object.values(activeOscillators).forEach((noteData) => {
      if (!noteData.voices) return;

      const numVoices = noteData.voices.length;
      const centerIndex = (numVoices - 1) / 2;

      noteData.voices.forEach((voice, i) => {
        try {
          const offset = numVoices > 1 ? (i - centerIndex) / centerIndex : 0;
          const isMiddle = Math.abs(i - centerIndex) < 0.6;

          // Dynamic Detune Update
          voice.oscillator.detune.setTargetAtTime(offset * unison.detune, now, 0.05);

          // Dynamic Blend Update
          const voiceLevel = isMiddle ? 1.0 : unison.blend;
          voice.voiceGain.gain.setTargetAtTime(voiceLevel, now, 0.05);

          // Dynamic Pan Update
          voice.panner.pan.setTargetAtTime(offset, now, 0.05);
        } catch (e) {
          // Voice might have been released during the loop
        }
      });
    });
  }, [unison.detune, unison.blend, activeOscillators, audioContext]);

  return {
    createMorphedWave,
    makeDistortionCurve,
    activeFiltersMapRef,
    activeDriveMapRef,
  };
};
