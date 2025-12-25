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

  const keyboardLayout = {
    // LOWER TIER
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
      // Ignore if repeating or if system modifiers (Cmd, Ctrl, Alt) are active
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;

      const keyChar = e.key.toLowerCase();
      const noteIndex = keyboardLayout[keyChar];

      if (noteIndex === undefined || noteIndex >= notes.length) return;

      e.preventDefault();
      const note = notes[noteIndex];
      const nodes = handleNotePlay(note, true);

      if (nodes) {
        console.log(`⌨️ Key ${e.code} pressed, storing noteData with ID: ${nodes.id}`);
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
      const keyData = activeOscillators[e.code];

      if (keyData) {
        console.log(`⌨️ Key ${e.code} released`);

        // 🔴 CRITICAL FIX: Pass the entire noteData object as the third parameter
        const { oscillator, gainNode, id } = keyData;
        const keyChar = e.key.toLowerCase();
        const noteIndex = keyboardLayout[keyChar];

        if (noteIndex !== undefined) {
          const note = notes[noteIndex];

          console.log(`  Calling stopNote with noteData:`, keyData);
          // Pass the full keyData object which contains voices, masterGain, etc.
          stopNote(oscillator, gainNode, keyData);
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
      } else {
        console.log(`⌨️ Key ${e.code} released but no active oscillator found`);
      }
    };

    // Emergency release for when the window loses focus (Cmd+Tab, Cmd+L, etc.)
    const handleBlur = () => {
      console.log('🚨 Window blur - stopping all active notes');

      Object.entries(activeOscillators).forEach(([key, nodeGroup]) => {
        console.log(`  Stopping ${key}:`, nodeGroup);
        const { oscillator, gainNode, id } = nodeGroup;

        // 🔴 CRITICAL FIX: Pass the full nodeGroup object
        stopNote(oscillator, gainNode, nodeGroup);
        releaseNote(id); // Release without specific step to clear all
      });

      setActiveOscillators({});
      if (setPressedKeys) setPressedKeys(new Set());
      setActiveNote(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
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
    setActiveOscillators,
    config,
  ]);
};
