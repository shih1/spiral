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
  setPressedKeys,
}) => {
  const { divisions } = config;

  // Tier 1: Bottom two rows (continuous 0-20)
  // Tier 2: Top two rows (continuous starting from divisions)
  const keyboardLayout = {
    // LOWER TIER
    // Row 0 (Bottom)
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
    // Row 1 (Middle-Lower)
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

    // UPPER TIER
    // Row 2 (Middle-Upper)
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
    // Row 3 (Top/Numbers)
    1: divisions + 13,
    2: divisions + 14,
    3: divisions + 15,
    4: divisions + 16,
    5: divisions + 17,
    6: divisions + 18,
    7: divisions + 19,
    8: divisions + 20,
    9: divisions + 21,
    0: divisions + 22,
    '-': divisions + 23,
    '=': divisions + 24,
  };

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      if (e.repeat) return;
      const keyChar = e.key.toLowerCase();
      const noteIndex = keyboardLayout[keyChar];

      if (noteIndex === undefined || noteIndex >= notes.length) return;

      e.preventDefault();
      const note = notes[noteIndex];
      const nodes = handleNotePlay(note, true);

      if (nodes) {
        setActiveOscillators((prev) => ({ ...prev, [e.code]: nodes }));

        if (setPressedKeys) {
          setPressedKeys((prev) => {
            const newSet = new Set(prev);
            newSet.add(e.code);
            return newSet;
          });
        }
      }
    };

    const handleKeyUp = (e) => {
      if (activeOscillators[e.code]) {
        const { oscillator, gainNode, id } = activeOscillators[e.code];
        const keyChar = e.key.toLowerCase();
        const noteIndex = keyboardLayout[keyChar];

        if (noteIndex !== undefined) {
          const note = notes[noteIndex];
          stopNote(oscillator, gainNode);
          releaseNote(id, note.step);
        }

        setActiveOscillators((prev) => {
          const newOsc = { ...prev };
          delete newOsc[e.code];
          return newOsc;
        });

        if (setPressedKeys) {
          setPressedKeys((prev) => {
            const newSet = new Set(prev);
            newSet.delete(e.code);
            return newSet;
          });
        }
        setActiveNote(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    enabled,
    notes,
    activeOscillators,
    divisions,
    setPressedKeys,
    handleNotePlay,
    stopNote,
    releaseNote,
    setActiveNote,
  ]);
};
