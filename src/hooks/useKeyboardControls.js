// ============================================
// FILE 2: src/hooks/useKeyboardControls.js
// ============================================

import { useEffect } from 'react';

export const useKeyboardControls = ({
  enabled,
  notes,
  activeOscillators,
  setActiveOscillators,
  handleNotePlay,
  stopNote,
  releaseNote,
  setActiveNote,
}) => {
  const keyboardMapping = {
    z: 0,
    x: 1,
    c: 2,
    v: 3,
    b: 4,
    n: 5,
    m: 6,
    ',': 7,
    '.': 8,
    '/': 9,
    a: 12,
    s: 13,
    d: 14,
    f: 15,
    g: 16,
    h: 17,
    j: 18,
    k: 19,
    l: 20,
    ';': 21,
  };

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (keyboardMapping[key] !== undefined) {
        e.preventDefault();
        const noteIndex = keyboardMapping[key];
        if (noteIndex >= notes.length) return;
        const note = notes[noteIndex];
        const nodes = handleNotePlay(note, true);
        if (nodes) {
          setActiveOscillators((prev) => ({ ...prev, [key]: nodes }));
        }
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (activeOscillators[key]) {
        const { oscillator, gainNode, id } = activeOscillators[key];
        const noteIndex = keyboardMapping[key];
        const note = notes[noteIndex];
        stopNote(oscillator, gainNode);
        releaseNote(id, note.step);
        setActiveOscillators((prev) => {
          const newOsc = { ...prev };
          delete newOsc[key];
          return newOsc;
        });
        setActiveNote(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, notes, activeOscillators]);
};
