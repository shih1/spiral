// ============================================
// FILE 1: src/hooks/useAudioManager.js
// ============================================

import { useState, useRef, useEffect } from 'react';

export const useAudioManager = (config) => {
  const [activeNote, setActiveNote] = useState(null);
  const [activePitchClasses, setActivePitchClasses] = useState([]);
  const [heldNotes, setHeldNotes] = useState([]);
  const [releasedNotes, setReleasedNotes] = useState([]);
  const [activeOscillators, setActiveOscillators] = useState({});

  const audioContextRef = useRef(null);

  // Initialize Audio Context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Play a note
  const playNote = (freq, duration = 0.5, sustained = false) => {
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
  };

  // Stop a note
  const stopNote = (oscillator, gainNode) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    gainNode.gain.cancelScheduledValues(ctx.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    oscillator.stop(ctx.currentTime + 0.1);
  };

  // Release a note (handles fade out)
  const releaseNote = (noteId, pitchClass) => {
    const now = Date.now();
    setHeldNotes((prev) => prev.filter((n) => n.id !== noteId));
    setReleasedNotes((prev) => [...prev, { pitch: pitchClass, time: now, id: noteId }]);

    const fadeStartDelay = Math.min(500, config.releaseTime * 0.25);
    const fadeDuration = config.releaseTime - fadeStartDelay;
    const fadeSteps = fadeDuration / 50;

    setTimeout(() => {
      const fadeInterval = setInterval(() => {
        setActivePitchClasses((prev) => {
          const updated = prev.map((pc) =>
            pc.id === noteId ? { ...pc, opacity: Math.max(0, pc.opacity - 1 / fadeSteps) } : pc
          );
          const filtered = updated.filter((pc) => pc.opacity > 0);
          if (!filtered.find((pc) => pc.id === noteId)) {
            clearInterval(fadeInterval);
          }
          return filtered;
        });
      }, 50);
    }, fadeStartDelay);
  };

  // Handle note play (click or keyboard)
  const handleNotePlay = (note, sustained = false) => {
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

    const newPitchClass = { pitch: note.step, opacity: 1, id: noteId, sustained };
    setActivePitchClasses((prev) => [...prev, newPitchClass]);

    if (!sustained) {
      setTimeout(() => setActiveNote(null), 500);
      setTimeout(() => releaseNote(noteId, note.step), 500);
    }

    return nodes;
  };

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
