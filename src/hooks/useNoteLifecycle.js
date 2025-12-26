import { useState, useCallback, useRef } from 'react';

/**
 * Manages note lifecycle: playing, stopping, releasing notes with full state management
 * OPTIMIZED VERSION - reduces re-renders, batches updates, removes redundant node creation
 */
export const useNoteLifecycle = (
  audioContext,
  dryGain,
  reverbGain,
  adsr,
  filter,
  filterEnv,
  unison,
  waveform,
  createMorphedWave,
  makeDistortionCurve,
  activeFiltersMapRef,
  activeDriveMapRef
) => {
  const [activeNote, setActiveNote] = useState(null);
  const [activePitchClasses, setActivePitchClasses] = useState([]);
  const [heldNotes, setHeldNotes] = useState([]);
  const [releasedNotes, setReleasedNotes] = useState([]);
  const [activeOscillators, setActiveOscillators] = useState({});

  // Cache current settings to avoid reading from props in async callbacks
  const currentSettingsRef = useRef({
    adsr: null,
    filter: null,
    filterEnv: null,
    unison: null,
    waveform: null,
  });

  // Update settings cache when they change
  currentSettingsRef.current = {
    adsr,
    filter,
    filterEnv,
    unison,
    waveform,
  };

  // Play a note with ADSR envelope, morphed waveform, filter, filter envelope, and unison
  const playNote = useCallback(
    (freq, duration = 0.5, sustained = false) => {
      if (!audioContext || !dryGain || !reverbGain) return null;

      const voices = [];

      // Read from ref to get current values (won't cause re-creation of callback)
      const {
        adsr: currentADSR,
        filter: currentFilter,
        filterEnv: currentFilterEnv,
        unison: currentUnison,
        waveform: currentWaveform,
      } = currentSettingsRef.current;

      const numVoices = currentUnison.voices;
      const id = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create a master gain for this note (controls all voices together)
      const masterNoteGain = audioContext.createGain();
      masterNoteGain.connect(dryGain);
      masterNoteGain.connect(reverbGain);

      const now = audioContext.currentTime;
      const attackTime = currentADSR.attack;
      const decayTime = currentADSR.decay;
      const sustainLevel = currentADSR.sustain;
      const peakLevel = 0.3 / Math.sqrt(numVoices);

      // === AMPLITUDE ADSR ENVELOPE (applied to master gain) ===
      masterNoteGain.gain.setValueAtTime(0, now);
      masterNoteGain.gain.linearRampToValueAtTime(peakLevel, now + attackTime);
      masterNoteGain.gain.linearRampToValueAtTime(
        peakLevel * sustainLevel,
        now + attackTime + decayTime
      );

      // Pre-create periodic wave once for all voices
      const periodicWave = createMorphedWave(currentWaveform);

      // Create multiple voices with detune and stereo spread
      for (let i = 0; i < numVoices; i++) {
        const voiceKey = `${id}_voice_${i}`;

        const oscillator = audioContext.createOscillator();
        const voiceGain = audioContext.createGain();
        const panner = audioContext.createStereoPanner();

        // 1. Calculate normalized offset (-1 to 1)
        const centerIndex = (numVoices - 1) / 2;
        const offset = numVoices > 1 ? (i - centerIndex) / centerIndex : 0;

        // 2. Identify "Middle" voices
        const isMiddle = Math.abs(i - centerIndex) < 0.6;

        // 3. Pitch: Apply detune based on position
        oscillator.detune.value = offset * currentUnison.detune;

        // 4. Pan: Link stereo width to the voice index position
        panner.pan.value = offset;

        // 5. Gain: Center stays full (1.0), sides scale with the Blend setting
        const voiceLevel = isMiddle ? 1.0 : currentUnison.blend;
        voiceGain.gain.value = voiceLevel;

        oscillator.frequency.value = freq;

        // Use pre-created morphed periodic wave
        if (periodicWave) {
          oscillator.setPeriodicWave(periodicWave);
        }

        // OPTIMIZATION: Only create filter/drive nodes if filter is enabled
        let filterNode = null;
        let driveNode = null;

        if (currentFilter.enabled) {
          // Create filter
          filterNode = audioContext.createBiquadFilter();
          const baseFreq = currentFilter.frequency;
          filterNode.type = currentFilter.type;
          filterNode.Q.value = currentFilter.Q;
          if (filterNode.gain) {
            filterNode.gain.value = currentFilter.gain;
          }

          // === FILTER ENVELOPE (modulates frequency) ===
          if (currentFilterEnv.amount !== 0) {
            const envAttack = currentFilterEnv.attack;
            const envDecay = currentFilterEnv.decay;
            const envSustain = currentFilterEnv.sustain;
            const envAmount = currentFilterEnv.amount;

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
                releaseStart + currentFilterEnv.release
              );
            }
          } else {
            // No envelope - just use base frequency
            filterNode.frequency.setValueAtTime(baseFreq, now);
          }

          // Create drive/distortion node if drive > 0
          if (currentFilter.drive > 0) {
            driveNode = audioContext.createWaveShaper();
            driveNode.curve = makeDistortionCurve(currentFilter.drive);
            driveNode.oversample = '4x';
          }

          // Route: oscillator → filter → drive (if exists) → voiceGain → panner → master
          oscillator.connect(filterNode);

          if (driveNode) {
            filterNode.connect(driveNode);
            driveNode.connect(voiceGain);
          } else {
            filterNode.connect(voiceGain);
          }
        } else {
          // Filter disabled: direct connection
          oscillator.connect(voiceGain);
        }

        // Standard exit chain
        voiceGain.connect(panner);
        panner.connect(masterNoteGain);

        // Add phase randomization to prevent phasing artifacts (smaller offset for less jitter)
        const phaseOffset = Math.random() * 0.001;

        // Start oscillator with phase offset
        oscillator.start(now + phaseOffset);

        voices.push({ oscillator, filterNode, voiceGain, panner, driveNode });

        // Store filter/drive for real-time updates (only if they exist)
        if (filterNode) {
          activeFiltersMapRef.current.set(voiceKey, filterNode);
        }
        if (driveNode) {
          activeDriveMapRef.current.set(voiceKey, driveNode);
        }
      }

      const noteData = {
        id,
        oscillator: voices[0]?.oscillator,
        gainNode: masterNoteGain,
        filterNode: voices[0]?.filterNode,
        voices,
        masterGain: masterNoteGain,
        numVoices,
      };

      // OPTIMIZATION: Batch state update to avoid multiple re-renders
      setActiveOscillators((prev) => ({
        ...prev,
        [id]: noteData,
      }));

      // If not sustained (one-shot note), schedule amplitude release
      if (!sustained) {
        const releaseStart = now + attackTime + decayTime + duration;
        masterNoteGain.gain.setValueAtTime(peakLevel * sustainLevel, releaseStart);
        masterNoteGain.gain.linearRampToValueAtTime(0.001, releaseStart + currentADSR.release);

        const stopTime = Math.max(
          releaseStart + currentADSR.release,
          now +
            currentFilterEnv.attack +
            currentFilterEnv.decay +
            duration +
            currentFilterEnv.release
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
        const cleanupDelay = (stopTime - now) * 1000 + 100;
        setTimeout(() => {
          setActiveOscillators((prev) => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });

          // Clean up filter/drive refs
          voices.forEach((voice, i) => {
            const voiceKey = `${id}_voice_${i}`;
            activeFiltersMapRef.current.delete(voiceKey);
            activeDriveMapRef.current.delete(voiceKey);
          });
        }, cleanupDelay);
      }

      return noteData;
    },
    [
      audioContext,
      dryGain,
      reverbGain,
      createMorphedWave,
      makeDistortionCurve,
      activeFiltersMapRef,
      activeDriveMapRef,
    ]
  );

  // Stop a note with ADSR release (handles multiple voices)
  const stopNote = useCallback(
    (oscillator, gainNode, noteData) => {
      if (!audioContext || !noteData) return;

      const now = audioContext.currentTime;
      const releaseTime = currentSettingsRef.current.adsr.release;

      // Multi-voice note cleanup
      if (noteData.voices && noteData.voices.length > 0) {
        noteData.voices.forEach(({ oscillator: voiceOsc }) => {
          try {
            voiceOsc.stop(now + releaseTime);
          } catch (e) {
            // Already stopped
          }
        });

        // Apply release to master gain
        if (noteData.masterGain) {
          try {
            noteData.masterGain.gain.cancelScheduledValues(now);
            noteData.masterGain.gain.setValueAtTime(noteData.masterGain.gain.value, now);
            noteData.masterGain.gain.linearRampToValueAtTime(0.001, now + releaseTime);
          } catch (e) {
            // Gain node already released
          }
        }

        // Clean up all voice references
        const cleanupTime = releaseTime * 1000 + 100;

        setTimeout(() => {
          // Disconnect all nodes
          noteData.voices.forEach(
            ({ oscillator: voiceOsc, filterNode, voiceGain, panner, driveNode }) => {
              try {
                voiceOsc.disconnect();
                if (filterNode) filterNode.disconnect();
                if (driveNode) driveNode.disconnect();
                voiceGain.disconnect();
                panner.disconnect();
              } catch (e) {
                // Already disconnected
              }
            }
          );

          // Disconnect master gain
          if (noteData.masterGain) {
            try {
              noteData.masterGain.disconnect();
            } catch (e) {
              // Already disconnected
            }
          }

          // Remove from state
          setActiveOscillators((prev) => {
            const updated = { ...prev };
            delete updated[noteData.id];
            return updated;
          });

          // Clean up filter/drive refs
          noteData.voices.forEach((_, i) => {
            const voiceKey = `${noteData.id}_voice_${i}`;
            activeFiltersMapRef.current.delete(voiceKey);
            activeDriveMapRef.current.delete(voiceKey);
          });
        }, cleanupTime);
      }
    },
    [audioContext, activeFiltersMapRef, activeDriveMapRef]
  );

  // Release a note (mark it to start fading)
  const releaseNote = useCallback((noteId, pitchClass) => {
    const now = Date.now();
    const releaseTime = currentSettingsRef.current.adsr.release;

    setHeldNotes((prev) => prev.filter((n) => n.id !== noteId));
    setReleasedNotes((prev) => [...prev, { pitch: pitchClass, time: now, id: noteId }]);

    // Mark the pitch class to start fading after a delay
    const fadeStartDelay = Math.min(500, releaseTime * 1000 * 0.25);

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
  }, []);

  // Handle note play (click or keyboard)
  const handleNotePlay = useCallback(
    (note, sustained = false) => {
      const nodes = playNote(note.freq, 0.5, sustained);
      if (!nodes) return null;

      const now = Date.now();
      const noteId = nodes.id;

      // OPTIMIZATION: Batch all state updates together
      setActiveNote(note.freq);

      const newPitchClass = {
        pitch: note.step,
        opacity: 1,
        id: noteId,
        sustained,
        fadeStartTime: null,
      };

      if (sustained) {
        setHeldNotes((prev) => [
          ...prev,
          { pitch: note.step, octave: note.octave, time: now, id: noteId, noteData: nodes },
        ]);
        setActivePitchClasses((prev) => [...prev, newPitchClass]);
      } else {
        setReleasedNotes((prev) => [...prev, { pitch: note.step, time: now, id: noteId }]);
        setActivePitchClasses((prev) => [...prev, newPitchClass]);

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
    setActivePitchClasses,
    handleNotePlay,
    stopNote,
    releaseNote,
    playNote,
  };
};
