import { useRef, useEffect, useCallback } from 'react';

/**
 * Manages all synth effects: waveform morphing, filter, drive/saturation, and unison
 * OPTIMIZED VERSION - reduces redundant updates and batches parameter changes
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

  // Cache the current filter settings to avoid redundant updates
  const lastFilterSettingsRef = useRef({});
  const lastDriveSettingRef = useRef(null);
  const lastUnisonSettingsRef = useRef({});

  // Throttle filter updates to avoid excessive calls
  const filterUpdateTimeoutRef = useRef(null);
  const unisonUpdateTimeoutRef = useRef(null);

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

  // Batch update filter nodes - only update what changed
  const updateFilterNodes = useCallback(
    (filterSettings, now) => {
      if (!audioContext) return;

      const last = lastFilterSettingsRef.current;
      const typeChanged = last.type !== filterSettings.type;
      const freqChanged = last.frequency !== filterSettings.frequency;
      const qChanged = last.Q !== filterSettings.Q;
      const gainChanged = last.gain !== filterSettings.gain;

      // Skip if nothing changed
      if (!typeChanged && !freqChanged && !qChanged && !gainChanged) {
        return;
      }

      // Single loop through all filters, only updating changed parameters
      activeFiltersMapRef.current.forEach((filterNode) => {
        try {
          if (typeChanged) {
            filterNode.type = filterSettings.type;
          }

          if (freqChanged) {
            filterNode.frequency.cancelScheduledValues(now);
            filterNode.frequency.setValueAtTime(filterNode.frequency.value, now);
            filterNode.frequency.exponentialRampToValueAtTime(
              Math.max(20, filterSettings.frequency),
              now + 0.02
            );
          }

          if (qChanged) {
            filterNode.Q.cancelScheduledValues(now);
            filterNode.Q.setValueAtTime(filterNode.Q.value, now);
            filterNode.Q.linearRampToValueAtTime(filterSettings.Q, now + 0.02);
          }

          if (gainChanged && filterNode.gain) {
            filterNode.gain.cancelScheduledValues(now);
            filterNode.gain.setValueAtTime(filterNode.gain.value, now);
            filterNode.gain.linearRampToValueAtTime(filterSettings.gain, now + 0.02);
          }
        } catch (e) {
          // Filter might have been disconnected
        }
      });

      lastFilterSettingsRef.current = { ...filterSettings };
    },
    [audioContext]
  );

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

  // OPTIMIZED: Throttled filter updates
  useEffect(() => {
    if (!audioContext) return;

    // Clear any pending update
    if (filterUpdateTimeoutRef.current) {
      clearTimeout(filterUpdateTimeoutRef.current);
    }

    // Throttle to avoid excessive updates during slider dragging
    filterUpdateTimeoutRef.current = setTimeout(() => {
      const now = audioContext.currentTime;
      updateFilterNodes(
        {
          type: filter.type,
          frequency: filter.frequency,
          Q: filter.Q,
          gain: filter.gain,
        },
        now
      );
    }, 16); // ~60fps throttle

    return () => {
      if (filterUpdateTimeoutRef.current) {
        clearTimeout(filterUpdateTimeoutRef.current);
      }
    };
  }, [filter.type, filter.frequency, filter.Q, filter.gain, audioContext, updateFilterNodes]);

  // OPTIMIZED: Update drive nodes only when drive actually changes
  useEffect(() => {
    if (!audioContext || !activeDriveMapRef.current) return;

    const currentDrive = filter.enabled ? filter.drive : 0;

    // Skip if drive hasn't changed
    if (lastDriveSettingRef.current === currentDrive) {
      return;
    }

    // Generate the curve once
    const currentCurve = makeDistortionCurve(currentDrive);

    // Update every active Drive node
    activeDriveMapRef.current.forEach((driveNode) => {
      try {
        if (driveNode) {
          driveNode.curve = currentCurve;
        }
      } catch (e) {
        // Node might have been cleaned up
      }
    });

    lastDriveSettingRef.current = currentDrive;
  }, [filter.drive, filter.enabled, audioContext, makeDistortionCurve]);

  // OPTIMIZED: Throttled unison updates
  useEffect(() => {
    if (!audioContext) return;

    const last = lastUnisonSettingsRef.current;
    const detuneChanged = last.detune !== unison.detune;
    const blendChanged = last.blend !== unison.blend;

    // Skip if nothing changed
    if (!detuneChanged && !blendChanged) {
      return;
    }

    // Clear any pending update
    if (unisonUpdateTimeoutRef.current) {
      clearTimeout(unisonUpdateTimeoutRef.current);
    }

    // Throttle updates
    unisonUpdateTimeoutRef.current = setTimeout(() => {
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

            // Only update detune if it changed
            if (detuneChanged) {
              voice.oscillator.detune.setTargetAtTime(offset * unison.detune, now, 0.05);
            }

            // Only update blend if it changed
            if (blendChanged) {
              const voiceLevel = isMiddle ? 1.0 : unison.blend;
              voice.voiceGain.gain.setTargetAtTime(voiceLevel, now, 0.05);
            }

            // Pan is constant, don't update it
            // voice.panner.pan.setTargetAtTime(offset, now, 0.05);
          } catch (e) {
            // Voice might have been released during the loop
          }
        });
      });

      lastUnisonSettingsRef.current = { detune: unison.detune, blend: unison.blend };
    }, 16); // ~60fps throttle

    return () => {
      if (unisonUpdateTimeoutRef.current) {
        clearTimeout(unisonUpdateTimeoutRef.current);
      }
    };
  }, [unison.detune, unison.blend, activeOscillators, audioContext]);

  return {
    createMorphedWave,
    makeDistortionCurve,
    activeFiltersMapRef,
    activeDriveMapRef,
  };
};
