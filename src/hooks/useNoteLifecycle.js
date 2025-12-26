import { useState, useCallback } from 'react';

/**
 * Manages note lifecycle: playing, stopping, releasing notes with full state management
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

  // Play a note with ADSR envelope, morphed waveform, filter, filter envelope, and unison
  const playNote = useCallback(
    (freq, duration = 0.5, sustained = false) => {
      if (!audioContext || !dryGain || !reverbGain) return null;

      const voices = [];
      const numVoices = unison.voices;
      const id = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log(`🎵 Creating note ${id} with ${numVoices} unison voices`);

      // Create a master gain for this note (controls all voices together)
      const masterNoteGain = audioContext.createGain();
      masterNoteGain.connect(dryGain);
      masterNoteGain.connect(reverbGain);

      const now = audioContext.currentTime;
      const attackTime = adsr.attack;
      const decayTime = adsr.decay;
      const sustainLevel = adsr.sustain;
      const peakLevel = 0.3 / Math.sqrt(numVoices);

      // === AMPLITUDE ADSR ENVELOPE (applied to master gain) ===
      masterNoteGain.gain.setValueAtTime(0, now);
      masterNoteGain.gain.linearRampToValueAtTime(peakLevel, now + attackTime);
      masterNoteGain.gain.linearRampToValueAtTime(
        peakLevel * sustainLevel,
        now + attackTime + decayTime
      );

      // Create multiple voices with detune and stereo spread
      for (let i = 0; i < numVoices; i++) {
        const voiceKey = `${id}_voice_${i}`;

        const oscillator = audioContext.createOscillator();
        const voiceGain = audioContext.createGain();
        const filterNode = audioContext.createBiquadFilter();
        const panner = audioContext.createStereoPanner();

        // 1. Calculate normalized offset (-1 to 1)
        const centerIndex = (numVoices - 1) / 2;
        const offset = numVoices > 1 ? (i - centerIndex) / centerIndex : 0;

        // 2. Identify "Middle" voices
        const isMiddle = Math.abs(i - centerIndex) < 0.6;

        // 3. Pitch: Apply detune based on position
        oscillator.detune.value = offset * unison.detune;

        // 4. Pan: Link stereo width to the voice index position
        panner.pan.value = offset;

        // 5. Gain: Center stays full (1.0), sides scale with the Blend setting
        const voiceLevel = isMiddle ? 1.0 : unison.blend;
        voiceGain.gain.value = voiceLevel;

        // 6. Drive: create drive nodes
        const driveNode = audioContext.createWaveShaper();
        driveNode.curve = makeDistortionCurve(filter.enabled ? filter.drive : 0);
        driveNode.oversample = '4x';

        // Add phase randomization to prevent phasing artifacts
        const phaseOffset = Math.random() * Math.PI * 2;

        // Setup filter
        const baseFreq = filter.frequency;
        filterNode.type = filter.type;
        filterNode.Q.value = filter.Q;
        if (filterNode.gain) {
          filterNode.gain.value = filter.gain;
        }

        // Update routing to ensure no "dead ends"
        if (filter.enabled) {
          oscillator.connect(filterNode);
          filterNode.connect(driveNode);
          driveNode.connect(voiceGain);
        } else {
          // If filter is off, we skip filter AND drive to be safe
          oscillator.connect(voiceGain);
        }

        // Standard exit chain
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

        // Store filter for real-time updates
        activeFiltersMapRef.current.set(voiceKey, filterNode);
        activeDriveMapRef.current.set(voiceKey, driveNode);
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

      // Add to activeOscillators state immediately
      setActiveOscillators((prev) => {
        const updated = { ...prev, [id]: noteData };
        console.log(
          `✅ Added note ${id} to state. Total oscillators:`,
          Object.keys(updated).length
        );
        return updated;
      });

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
        const cleanupDelay = (stopTime - now) * 1000 + 100;
        setTimeout(() => {
          console.log(`🧹 Cleaning up note ${id}`);
          setActiveOscillators((prev) => {
            const updated = { ...prev };
            delete updated[id];
            console.log(
              `✅ Removed note ${id}. Remaining oscillators:`,
              Object.keys(updated).length
            );
            return updated;
          });

          voices.forEach((_, i) => {
            activeFiltersMapRef.current.delete(`${id}_voice_${i}`);
            activeDriveMapRef.current.delete(`${id}_voice_${i}`);
          });
        }, cleanupDelay);
      }

      return noteData;
    },
    [
      audioContext,
      dryGain,
      reverbGain,
      adsr,
      waveform,
      filter,
      filterEnv,
      unison,
      createMorphedWave,
      makeDistortionCurve,
      activeFiltersMapRef,
      activeDriveMapRef,
    ]
  );

  // Stop a note with ADSR release (handles multiple voices)
  const stopNote = useCallback(
    (oscillator, gainNode, noteData) => {
      if (!audioContext) return;

      const now = audioContext.currentTime;

      console.log(`🛑 Stopping note ${noteData?.id} with ${noteData?.numVoices || 1} voices`);

      // Multi-voice note cleanup
      if (noteData?.voices && noteData.voices.length > 0) {
        console.log(`  Stopping ${noteData.voices.length} individual voice oscillators...`);

        noteData.voices.forEach(({ oscillator: voiceOsc }, i) => {
          try {
            console.log(`    Voice ${i}: Scheduling stop at ${(now + adsr.release).toFixed(3)}s`);
            voiceOsc.stop(now + adsr.release);
          } catch (e) {
            console.warn(`    Voice ${i}: Already stopped or error:`, e.message);
          }
        });

        // Apply release to master gain
        if (noteData.masterGain) {
          try {
            noteData.masterGain.gain.cancelScheduledValues(now);
            noteData.masterGain.gain.setValueAtTime(noteData.masterGain.gain.value, now);
            noteData.masterGain.gain.linearRampToValueAtTime(0.001, now + adsr.release);
            console.log(`  Master gain envelope applied`);
          } catch (e) {
            console.warn(`  Master gain error:`, e.message);
          }
        }

        // Clean up all voice references
        const cleanupTime = adsr.release * 1000 + 100;
        console.log(`  Scheduling cleanup in ${cleanupTime}ms`);

        setTimeout(() => {
          console.log(`🧹 Cleanup executing for note ${noteData.id}`);

          // Disconnect all nodes to ensure cleanup
          noteData.voices.forEach(({ oscillator: voiceOsc, filterNode, voiceGain, panner }, i) => {
            try {
              voiceOsc.disconnect();
              filterNode.disconnect();
              voiceGain.disconnect();
              panner.disconnect();
              console.log(`    Voice ${i}: Disconnected all nodes`);
            } catch (e) {
              console.warn(`    Voice ${i}: Disconnect error:`, e.message);
            }
          });

          // Disconnect master gain
          if (noteData.masterGain) {
            try {
              noteData.masterGain.disconnect();
              console.log(`  Master gain disconnected`);
            } catch (e) {
              console.warn(`  Master gain disconnect error:`, e.message);
            }
          }

          // Remove from state
          setActiveOscillators((prev) => {
            const updated = { ...prev };
            delete updated[noteData.id];
            console.log(
              `✅ Removed note ${noteData.id}. Remaining oscillators:`,
              Object.keys(updated).length
            );
            return updated;
          });

          // Clean up filter refs
          noteData.voices.forEach((_, i) => {
            const voiceKey = `${noteData.id}_voice_${i}`;
            activeFiltersMapRef.current.delete(voiceKey);
            activeDriveMapRef.current.delete(voiceKey);
          });
        }, cleanupTime);
      }
    },
    [audioContext, adsr, activeFiltersMapRef, activeDriveMapRef]
  );

  // Release a note (mark it to start fading)
  const releaseNote = useCallback(
    (noteId, pitchClass) => {
      const now = Date.now();

      setHeldNotes((prev) => prev.filter((n) => n.id !== noteId));
      setReleasedNotes((prev) => [...prev, { pitch: pitchClass, time: now, id: noteId }]);

      // Mark the pitch class to start fading after a delay
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

      console.log(`🎹 Note ${sustained ? 'HELD' : 'RELEASED'}: ${note.freq}Hz, ID: ${noteId}`);

      setActiveNote(note.freq);

      if (sustained) {
        setHeldNotes((prev) => [
          ...prev,
          { pitch: note.step, octave: note.octave, time: now, id: noteId, noteData: nodes },
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
    setActivePitchClasses,
    handleNotePlay,
    stopNote,
    releaseNote,
    playNote,
  };
};
