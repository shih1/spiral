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

  // Two octaves across 4 rows:
  // Rows 0+1 (ZXCV + ASDF): Lower octave (steps 0 to divisions-1)
  // Rows 2+3 (QWERTY + 1234): Upper octave (steps divisions to 2*divisions-1)

  const keyboardLayout = {
    // Row 0 - Lower octave part 1 (steps 0-9)
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

    // Row 1 - Lower octave part 2 (steps 10+)
    a: 10,
    s: 11,
    d: 12,
    f: 13,
    g: 14,
    h: 15,
    j: 16,
    k: 17,
    l: 18,
    ';': 19,
    "'": 20,

    // Row 2 - Upper octave part 1 (steps 0-12 of next octave)
    q: divisions + 0,
    w: divisions + 1,
    e: divisions + 2,
    r: divisions + 3,
    t: divisions + 4,
    y: divisions + 5,
    u: divisions + 6,
    i: divisions + 7,
    o: divisions + 8,
    p: divisions + 9,
    '[': divisions + 10,
    ']': divisions + 11,
    '\\': divisions + 12,

    // Row 3 - Upper octave part 2 (steps 0-11 of next octave)
    1: divisions + 10,
    2: divisions + 11,
    3: divisions + 12,
    4: divisions + 13,
    5: divisions + 14,
    6: divisions + 15,
    7: divisions + 16,
    8: divisions + 17,
    9: divisions + 18,
    0: divisions + 19,
    '-': divisions + 20,
    '=': divisions + 21,
  };

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      const noteIndex = keyboardLayout[key];

      if (noteIndex === undefined) return;
      if (noteIndex >= notes.length) return;

      e.preventDefault();

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
        const noteIndex = keyboardLayout[key];

        if (noteIndex === undefined) return;

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
