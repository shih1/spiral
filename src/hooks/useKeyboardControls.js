// ============================================
// FILE: src/hooks/useKeyboardControls.js
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
  config,
}) => {
  const { divisions } = config;

  // Dynamic keyboard mapping: each row is chromatic, each row is one octave higher
  // Row 0 (ZXCV...): octave 0, steps 0-9
  // Row 1 (ASDF...): octave 1, steps 0-10
  // Row 2 (QWERTY...): octave 2, steps 0-12
  // Row 3 (1234...): octave 3, steps 0-11

  const keyboardLayout = {
    // Row 0 - Base octave
    z: { octave: 0, step: 0 },
    x: { octave: 0, step: 1 },
    c: { octave: 0, step: 2 },
    v: { octave: 0, step: 3 },
    b: { octave: 0, step: 4 },
    n: { octave: 0, step: 5 },
    m: { octave: 0, step: 6 },
    ',': { octave: 0, step: 7 },
    '.': { octave: 0, step: 8 },
    '/': { octave: 0, step: 9 },

    // Row 1 - One octave up
    a: { octave: 1, step: 0 },
    s: { octave: 1, step: 1 },
    d: { octave: 1, step: 2 },
    f: { octave: 1, step: 3 },
    g: { octave: 1, step: 4 },
    h: { octave: 1, step: 5 },
    j: { octave: 1, step: 6 },
    k: { octave: 1, step: 7 },
    l: { octave: 1, step: 8 },
    ';': { octave: 1, step: 9 },
    "'": { octave: 1, step: 10 },

    // Row 2 - Two octaves up
    q: { octave: 2, step: 0 },
    w: { octave: 2, step: 1 },
    e: { octave: 2, step: 2 },
    r: { octave: 2, step: 3 },
    t: { octave: 2, step: 4 },
    y: { octave: 2, step: 5 },
    u: { octave: 2, step: 6 },
    i: { octave: 2, step: 7 },
    o: { octave: 2, step: 8 },
    p: { octave: 2, step: 9 },
    '[': { octave: 2, step: 10 },
    ']': { octave: 2, step: 11 },
    '\\': { octave: 2, step: 12 },

    // Row 3 - Three octaves up
    1: { octave: 3, step: 0 },
    2: { octave: 3, step: 1 },
    3: { octave: 3, step: 2 },
    4: { octave: 3, step: 3 },
    5: { octave: 3, step: 4 },
    6: { octave: 3, step: 5 },
    7: { octave: 3, step: 6 },
    8: { octave: 3, step: 7 },
    9: { octave: 3, step: 8 },
    0: { octave: 3, step: 9 },
    '-': { octave: 3, step: 10 },
    '=': { octave: 3, step: 11 },
  };

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      const mapping = keyboardLayout[key];

      if (!mapping) return;

      // Check if this step is valid for current TET system
      if (mapping.step >= divisions) return;

      e.preventDefault();

      // Calculate absolute note index: octave * divisions + step
      const noteIndex = mapping.octave * divisions + mapping.step;

      if (noteIndex >= notes.length) return;

      const note = notes[noteIndex];
      const nodes = handleNotePlay(note, true);

      if (nodes) {
        setActiveOscillators((prev) => ({ ...prev, [key]: nodes }));
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();

      if (activeOscillators[key]) {
        const { oscillator, gainNode, id } = activeOscillators[key];
        const mapping = keyboardLayout[key];

        if (!mapping) return;

        const noteIndex = mapping.octave * divisions + mapping.step;
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
  }, [enabled, notes, activeOscillators, divisions]);
};
