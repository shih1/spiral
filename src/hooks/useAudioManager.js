import { useState, useRef, useEffect, useCallback } from 'react';

export const useAudioManager = (
  config,
  mixer,
  reverb,
  adsr,
  waveform,
  filter,
  filterEnv,
  unison
) => {
  const [activeNote, setActiveNote] = useState(null);
  const [activePitchClasses, setActivePitchClasses] = useState([]);
  const [heldNotes, setHeldNotes] = useState([]);
  const [releasedNotes, setReleasedNotes] = useState([]);
  const [activeOscillators, setActiveOscillators] = useState({});

  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  const reverbNodeRef = useRef(null);
  const reverbGainRef = useRef(null);
  const dryGainRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const activeOscillatorsMapRef = useRef(new Map()); // Track active oscillators for real-time updates
  const activeFiltersMapRef = useRef(new Map()); // Track active filters for real-time updates

  // Initialize Audio Context with Master Gain and Reverb
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioContextRef.current;

    // Create master gain node
    masterGainRef.current = ctx.createGain();
    masterGainRef.current.gain.value = mixer.masterVolume;

    // Create analyser node
    analyserRef.current = ctx.createAnalyser();
    analyserRef.current.fftSize = 2048;
    analyserRef.current.smoothingTimeConstant = 0.8;

    // Connect masterGain -> analyser -> destination
    masterGainRef.current.connect(analyserRef.current);
    analyserRef.current.connect(ctx.destination);

    // Create reverb convolver node
    reverbNodeRef.current = ctx.createConvolver();

    // Create wet/dry gain nodes
    dryGainRef.current = ctx.createGain();
    reverbGainRef.current = ctx.createGain();

    // Connect dry path: dryGain -> master -> analyser -> destination
    dryGainRef.current.connect(masterGainRef.current);

    // Connect wet path: reverbGain -> reverb -> master -> analyser -> destination
    reverbGainRef.current.connect(reverbNodeRef.current);
    reverbNodeRef.current.connect(masterGainRef.current);

    // Generate impulse response for reverb
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

    reverbNodeRef.current.buffer = generateImpulseResponse(2.0, 2.0);

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update master volume when mixer changes
  useEffect(() => {
    if (masterGainRef.current) {
      const targetVolume = mixer.muted ? 0 : mixer.masterVolume;
      masterGainRef.current.gain.setValueAtTime(targetVolume, audioContextRef.current.currentTime);
    }
  }, [mixer.masterVolume, mixer.muted]);

  // Update reverb settings when reverb changes
  useEffect(() => {
    if (!dryGainRef.current || !reverbGainRef.current || !reverbNodeRef.current) return;

    const ctx = audioContextRef.current;

    if (reverb.enabled) {
      // Wet/dry mix
      dryGainRef.current.gain.setValueAtTime(1 - reverb.wet, ctx.currentTime);
      reverbGainRef.current.gain.setValueAtTime(reverb.wet, ctx.currentTime);

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

      reverbNodeRef.current.buffer = generateImpulseResponse(reverb.decay, 2.0);
    } else {
      // Bypass reverb
      dryGainRef.current.gain.setValueAtTime(1, ctx.currentTime);
      reverbGainRef.current.gain.setValueAtTime(0, ctx.currentTime);
    }
  }, [reverb.enabled, reverb.wet, reverb.decay]);

  // Create PeriodicWave for morphing between waveforms
  const createMorphedWave = useCallback((position) => {
    const ctx = audioContextRef.current;
    if (!ctx) return null;

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

    return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }, []);

  // Update all active oscillators when waveform changes
  useEffect(() => {
    const periodicWave = createMorphedWave(waveform);
    if (!periodicWave) return;

    // Update all currently playing oscillators
    activeOscillatorsMapRef.current.forEach((osc) => {
      try {
        osc.setPeriodicWave(periodicWave);
      } catch (e) {
        // Oscillator might have already stopped
      }
    });
  }, [waveform, createMorphedWave]);

  // Update all active filters when filter settings change
  useEffect(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;

    activeFiltersMapRef.current.forEach((filterNode) => {
      try {
        filterNode.type = filter.type;
        // Use exponentialRampToValueAtTime for smoother frequency changes
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
  }, [filter.type, filter.frequency, filter.Q, filter.gain]);

  // Handle filter enable/disable separately by reconnecting the audio graph
  useEffect(() => {
    // Note: This is a limitation - we can't easily reconnect active nodes
    // The filter enable/disable will only affect new notes
    // For real-time bypass, we'd need to use gain nodes instead
  }, [filter.enabled]);

  // Continuous animation loop for fading - ALWAYS RUNNING
  useEffect(() => {
    const animate = () => {
      const now = Date.now();

      setActivePitchClasses((prev) => {
        return prev
          .map((pc) => {
            // Skip sustained notes (held down keys)
            if (pc.sustained) return pc;

            // Calculate fade based on fadeStartTime
            if (pc.fadeStartTime) {
              const elapsed = now - pc.fadeStartTime;
              const fadeProgress = Math.min(1, elapsed / (config.releaseTime - 500));
              const newOpacity = Math.max(0, 1 - fadeProgress);

              if (newOpacity <= 0) {
                return null; // Remove completely faded notes
              }

              return { ...pc, opacity: newOpacity };
            }

            return pc;
          })
          .filter(Boolean);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [config.releaseTime]);

  // Play a note with ADSR envelope, morphed waveform, filter, filter envelope, and unison
  const playNote = useCallback(
    (freq, duration = 0.5, sustained = false) => {
      const ctx = audioContextRef.current;
      if (!ctx || !dryGainRef.current || !reverbGainRef.current) return null;

      const voices = [];
      const numVoices = unison.voices;
      const id = Date.now() + Math.random();

      // Create a master gain for this note (controls all voices together)
      const masterNoteGain = ctx.createGain();
      masterNoteGain.connect(dryGainRef.current);
      masterNoteGain.connect(reverbGainRef.current);

      const now = ctx.currentTime;
      const attackTime = adsr.attack;
      const decayTime = adsr.decay;
      const sustainLevel = adsr.sustain;
      const peakLevel = 0.3 / Math.sqrt(numVoices); // Reduce volume per voice to prevent clipping

      // === AMPLITUDE ADSR ENVELOPE (applied to master gain) ===
      masterNoteGain.gain.setValueAtTime(0, now);
      masterNoteGain.gain.linearRampToValueAtTime(peakLevel, now + attackTime);
      masterNoteGain.gain.linearRampToValueAtTime(
        peakLevel * sustainLevel,
        now + attackTime + decayTime
      );

      // Create multiple voices with detune and stereo spread
      for (let i = 0; i < numVoices; i++) {
        const oscillator = ctx.createOscillator();
        const voiceGain = ctx.createGain();
        const filterNode = ctx.createBiquadFilter();
        const panner = ctx.createStereoPanner();

        // Calculate detune amount for this voice
        const centerIndex = (numVoices - 1) / 2;
        const offset = (i - centerIndex) / (numVoices > 1 ? centerIndex : 1);
        const detuneAmount = offset * unison.detune; // in cents
        const panAmount = offset * unison.spread; // -1 to 1

        // Add phase randomization to prevent phasing artifacts
        const phaseOffset = Math.random() * Math.PI * 2;

        // Apply detune
        oscillator.detune.value = detuneAmount;

        // Calculate voice blend (center voice is always full, others blend in)
        const isCenter = i === Math.floor(centerIndex);
        const voiceLevel = isCenter ? 1.0 : unison.blend;
        voiceGain.gain.value = voiceLevel;

        // Setup filter
        const baseFreq = filter.frequency;
        filterNode.type = filter.type;
        filterNode.Q.value = filter.Q;
        if (filterNode.gain) {
          filterNode.gain.value = filter.gain;
        }

        // Setup panning
        panner.pan.value = Math.max(-1, Math.min(1, panAmount));

        // Audio chain: oscillator -> filter -> voiceGain -> panner -> masterNoteGain
        oscillator.connect(filterNode);

        if (filter.enabled) {
          filterNode.connect(voiceGain);
        } else {
          oscillator.disconnect();
          oscillator.connect(voiceGain);
        }

        voiceGain.connect(panner);
        panner.connect(masterNoteGain);

        oscillator.frequency.value = freq;

        // Use morphed periodic wave
        const periodicWave = createMorphedWave(waveform);
        if (periodicWave) {
          oscillator.setPeriodicWave(periodicWave);
        }

        // === FILTER ENVELOPE (modulates frequency) ===
        if (filter.enabled && filterEnv.amount !== 0) {
          const envAttack = filterEnv.attack;
          const envDecay = filterEnv.decay;
          const envSustain = filterEnv.sustain;
          const envAmount = filterEnv.amount;

          // Calculate target frequencies
          const startFreq = Math.max(20, Math.min(20000, baseFreq));
          const peakFreq = Math.max(20, Math.min(20000, baseFreq + envAmount));
          const sustainFreq = Math.max(20, Math.min(20000, baseFreq + envAmount * envSustain));

          // Apply filter envelope
          filterNode.frequency.setValueAtTime(startFreq, now);
          filterNode.frequency.exponentialRampToValueAtTime(peakFreq, now + envAttack);
          filterNode.frequency.exponentialRampToValueAtTime(
            sustainFreq,
            now + envAttack + envDecay
          );

          if (!sustained) {
            const releaseStart = now + attackTime + decayTime + duration;
            filterNode.frequency.setValueAtTime(sustainFreq, releaseStart);
            filterNode.frequency.exponentialRampToValueAtTime(
              Math.max(20, startFreq),
              releaseStart + filterEnv.release
            );
          }
        } else {
          // No envelope - just use base frequency
          filterNode.frequency.setValueAtTime(baseFreq, now);
        }

        // Start oscillator with phase offset
        oscillator.start(now + (phaseOffset / (Math.PI * 2)) * 0.001);

        voices.push({ oscillator, filterNode, voiceGain, panner });

        // Store for real-time updates
        activeOscillatorsMapRef.current.set(`${id}_${i}`, oscillator);
        activeFiltersMapRef.current.set(`${id}_${i}`, filterNode);
      }

      // If not sustained (one-shot note), schedule amplitude release
      if (!sustained) {
        const releaseStart = now + attackTime + decayTime + duration;
        masterNoteGain.gain.setValueAtTime(peakLevel * sustainLevel, releaseStart);
        masterNoteGain.gain.linearRampToValueAtTime(0.001, releaseStart + adsr.release);

        const stopTime = Math.max(
          releaseStart + adsr.release,
          now + filterEnv.attack + filterEnv.decay + duration + filterEnv.release
        );

        // Stop all voices at the same time
        voices.forEach(({ oscillator }) => {
          try {
            oscillator.stop(stopTime);
          } catch (e) {
            // Oscillator might have already been stopped
          }
        });

        // Clean up references after stop time
        const cleanupDelay = (stopTime - now) * 1000 + 100; // Add 100ms buffer
        setTimeout(() => {
          voices.forEach((_, i) => {
            activeOscillatorsMapRef.current.delete(`${id}_${i}`);
            activeFiltersMapRef.current.delete(`${id}_${i}`);
          });
        }, cleanupDelay);
      }

      return {
        oscillator: voices[0]?.oscillator, // Return first voice for compatibility
        gainNode: masterNoteGain,
        filterNode: voices[0]?.filterNode,
        voices,
        id,
        masterGain: masterNoteGain, // Expose master gain for sustained note control
      };
    },
    [adsr, waveform, filter, filterEnv, unison, createMorphedWave]
  );

  // Stop a note with ADSR release (handles multiple voices)
  const stopNote = useCallback(
    (oscillator, gainNode, noteData) => {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      const now = ctx.currentTime;

      // If this is a multi-voice note, stop all voices
      if (noteData?.voices) {
        noteData.voices.forEach(({ oscillator: voiceOsc }) => {
          try {
            voiceOsc.stop(now + adsr.release);
          } catch (e) {
            // Already stopped
          }
        });

        // Apply release to master gain
        if (noteData.masterGain) {
          noteData.masterGain.gain.cancelScheduledValues(now);
          noteData.masterGain.gain.setValueAtTime(noteData.masterGain.gain.value, now);
          noteData.masterGain.gain.linearRampToValueAtTime(0.001, now + adsr.release);
        }

        // Clean up all voice references
        setTimeout(() => {
          noteData.voices.forEach((_, i) => {
            activeOscillatorsMapRef.current.delete(`${noteData.id}_${i}`);
            activeFiltersMapRef.current.delete(`${noteData.id}_${i}`);
          });
        }, adsr.release * 1000 + 100);
      } else {
        // Single voice (legacy support)
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0.001, now + adsr.release);

        try {
          oscillator.stop(now + adsr.release);
        } catch (e) {
          // Already stopped
        }

        // Remove from active maps
        setTimeout(() => {
          activeOscillatorsMapRef.current.forEach((osc, key) => {
            if (osc === oscillator) {
              activeOscillatorsMapRef.current.delete(key);
              activeFiltersMapRef.current.delete(key);
            }
          });
        }, adsr.release * 1000 + 100);
      }
    },
    [adsr]
  );

  // Release a note (mark it to start fading)
  const releaseNote = useCallback(
    (noteId, pitchClass) => {
      const now = Date.now();

      setHeldNotes((prev) => prev.filter((n) => n.id !== noteId));
      setReleasedNotes((prev) => [...prev, { pitch: pitchClass, time: now, id: noteId }]);

      // Mark the pitch class to start fading after a delay
      // Use ADSR release time for visual fade
      const fadeStartDelay = Math.min(500, adsr.release * 1000 * 0.25);

      setTimeout(() => {
        setActivePitchClasses((prev) => {
          return prev.map((pc) => {
            if (pc.id === noteId) {
              return {
                ...pc,
                sustained: false,
                fadeStartTime: Date.now(),
              };
            }
            return pc;
          });
        });
      }, fadeStartDelay);
    },
    [adsr.release]
  );

  // Handle note play (click or keyboard)
  const handleNotePlay = useCallback(
    (note, sustained = false) => {
      const nodes = playNote(note.freq, 0.5, sustained);
      if (!nodes) return null;

      const now = Date.now();
      const noteId = nodes.id;

      setActiveNote(note.freq);

      if (sustained) {
        setHeldNotes((prev) => [
          ...prev,
          { pitch: note.step, octave: note.octave, time: now, id: noteId },
        ]);
      } else {
        setReleasedNotes((prev) => [...prev, { pitch: note.step, time: now, id: noteId }]);
      }

      const newPitchClass = {
        pitch: note.step,
        opacity: 1,
        id: noteId,
        sustained,
        fadeStartTime: null,
      };

      setActivePitchClasses((prev) => [...prev, newPitchClass]);

      if (!sustained) {
        setTimeout(() => setActiveNote(null), 500);
        setTimeout(() => releaseNote(noteId, note.step), 500);
      }

      return nodes;
    },
    [playNote, releaseNote]
  );

  return {
    activeNote,
    activePitchClasses,
    heldNotes,
    releasedNotes,
    activeOscillators,
    setActiveOscillators,
    setActiveNote,
    handleNotePlay,
    stopNote,
    releaseNote,
    analyser: analyserRef.current,
    audioContext: audioContextRef.current,
  };
};
