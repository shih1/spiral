import { useState, useRef, useEffect, useCallback } from 'react';

export const useAudioManager = (config, mixer, reverb, adsr, waveform) => {
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

  // Play a note with ADSR envelope and morphed waveform
  const playNote = useCallback(
    (freq, duration = 0.5, sustained = false) => {
      const ctx = audioContextRef.current;
      if (!ctx || !dryGainRef.current || !reverbGainRef.current) return null;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);

      // Split signal to both dry and wet (reverb) paths
      gainNode.connect(dryGainRef.current);
      gainNode.connect(reverbGainRef.current);

      oscillator.frequency.value = freq;

      // Use morphed periodic wave
      const periodicWave = createMorphedWave(waveform);
      if (periodicWave) {
        oscillator.setPeriodicWave(periodicWave);
      }

      const now = ctx.currentTime;
      const attackTime = adsr.attack;
      const decayTime = adsr.decay;
      const sustainLevel = adsr.sustain;
      const peakLevel = 0.3; // Maximum volume

      // ADSR Envelope
      // Start at 0
      gainNode.gain.setValueAtTime(0, now);

      // Attack: ramp up to peak
      gainNode.gain.linearRampToValueAtTime(peakLevel, now + attackTime);

      // Decay: ramp down to sustain level
      gainNode.gain.linearRampToValueAtTime(peakLevel * sustainLevel, now + attackTime + decayTime);

      // If not sustained (one-shot note), schedule release
      if (!sustained) {
        const releaseStart = now + attackTime + decayTime + duration;
        gainNode.gain.setValueAtTime(peakLevel * sustainLevel, releaseStart);
        gainNode.gain.linearRampToValueAtTime(0.001, releaseStart + adsr.release);
      }

      const id = Date.now() + Math.random();

      oscillator.start(now);
      if (!sustained) {
        oscillator.stop(now + attackTime + decayTime + duration + adsr.release);
        // Remove from active oscillators when done
        setTimeout(() => {
          activeOscillatorsMapRef.current.delete(id);
        }, (attackTime + decayTime + duration + adsr.release) * 1000);
      }

      // Store oscillator for real-time waveform updates
      activeOscillatorsMapRef.current.set(id, oscillator);

      return { oscillator, gainNode, id };
    },
    [adsr, waveform, createMorphedWave]
  );

  // Stop a note with ADSR release
  const stopNote = useCallback(
    (oscillator, gainNode) => {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      const now = ctx.currentTime;

      // Cancel any scheduled changes and start release from current value
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);

      // Apply ADSR release
      gainNode.gain.linearRampToValueAtTime(0.001, now + adsr.release);
      oscillator.stop(now + adsr.release);

      // Remove from active oscillators map
      setTimeout(() => {
        activeOscillatorsMapRef.current.forEach((osc, key) => {
          if (osc === oscillator) {
            activeOscillatorsMapRef.current.delete(key);
          }
        });
      }, adsr.release * 1000);
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
