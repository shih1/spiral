// ============================================
// FILE: src/hooks/useAudioManager.js
// FIXED VERSION - Continuous RAF loop
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react';

export const useAudioManager = (config) => {
  const [activeNote, setActiveNote] = useState(null);
  const [activePitchClasses, setActivePitchClasses] = useState([]);
  const [heldNotes, setHeldNotes] = useState([]);
  const [releasedNotes, setReleasedNotes] = useState([]);
  const [activeOscillators, setActiveOscillators] = useState({});

  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialize Audio Context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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

              console.log(`Fading note ${pc.id}: opacity=${newOpacity.toFixed(2)}`);

              if (newOpacity <= 0) {
                console.log(`✅ Removed note ${pc.id}`);
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

  // Play a note
  const playNote = useCallback((freq, duration = 0.5, sustained = false) => {
    const ctx = audioContextRef.current;
    if (!ctx) return null;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = freq;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);

    if (!sustained) {
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    }

    oscillator.start(ctx.currentTime);
    if (!sustained) {
      oscillator.stop(ctx.currentTime + duration);
    }

    return { oscillator, gainNode, id: Date.now() + Math.random() };
  }, []);

  // Stop a note
  const stopNote = useCallback((oscillator, gainNode) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    gainNode.gain.cancelScheduledValues(ctx.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    oscillator.stop(ctx.currentTime + 0.1);
  }, []);

  // Release a note (mark it to start fading)
  const releaseNote = useCallback(
    (noteId, pitchClass) => {
      const now = Date.now();

      console.log('🔵 Releasing note:', noteId);

      setHeldNotes((prev) => prev.filter((n) => n.id !== noteId));
      setReleasedNotes((prev) => [...prev, { pitch: pitchClass, time: now, id: noteId }]);

      // Mark the pitch class to start fading after a delay
      const fadeStartDelay = Math.min(500, config.releaseTime * 0.25);

      setTimeout(() => {
        console.log('🟢 Starting fade for note:', noteId);
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
    [config.releaseTime]
  );

  // Handle note play (click or keyboard)
  const handleNotePlay = useCallback(
    (note, sustained = false) => {
      const nodes = playNote(note.freq, 0.5, sustained);
      if (!nodes) return null;

      const now = Date.now();
      const noteId = nodes.id;

      console.log('🎵 Playing note:', noteId, 'sustained:', sustained);

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
        fadeStartTime: null, // Will be set when released
      };

      setActivePitchClasses((prev) => {
        console.log('Adding pitch class, total will be:', prev.length + 1);
        return [...prev, newPitchClass];
      });

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
  };
};
