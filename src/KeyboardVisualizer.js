import React from 'react';

const KeyboardVisualizer = ({ activePitchClasses, heldNotes, releasedNotes, config }) => {
  const { divisions } = config;

  // Complete keyboard layout with all keys
  const keyboardLayout = [
    // Row 3 (top number row) - Upper octave continuation
    {
      row: 3,
      keys: [
        { code: 'Backquote', key: '`', noteIndex: null, disabled: true },
        { code: 'Digit1', key: '1', noteIndex: divisions + 10 },
        { code: 'Digit2', key: '2', noteIndex: divisions + 11 },
        { code: 'Digit3', key: '3', noteIndex: divisions + 12 },
        { code: 'Digit4', key: '4', noteIndex: divisions + 13 },
        { code: 'Digit5', key: '5', noteIndex: divisions + 14 },
        { code: 'Digit6', key: '6', noteIndex: divisions + 15 },
        { code: 'Digit7', key: '7', noteIndex: divisions + 16 },
        { code: 'Digit8', key: '8', noteIndex: divisions + 17 },
        { code: 'Digit9', key: '9', noteIndex: divisions + 18 },
        { code: 'Digit0', key: '0', noteIndex: divisions + 19 },
        { code: 'Minus', key: '-', noteIndex: divisions + 20 },
        { code: 'Equal', key: '=', noteIndex: divisions + 21 },
        { code: 'Backspace', key: '⌫', noteIndex: null, disabled: true, wide: true },
      ],
    },
    // Row 2 (QWERTY row) - Upper octave start
    {
      row: 2,
      keys: [
        { code: 'Tab', key: '⇥', noteIndex: null, disabled: true, wide: true },
        { code: 'KeyQ', key: 'Q', noteIndex: divisions + 0 },
        { code: 'KeyW', key: 'W', noteIndex: divisions + 1 },
        { code: 'KeyE', key: 'E', noteIndex: divisions + 2 },
        { code: 'KeyR', key: 'R', noteIndex: divisions + 3 },
        { code: 'KeyT', key: 'T', noteIndex: divisions + 4 },
        { code: 'KeyY', key: 'Y', noteIndex: divisions + 5 },
        { code: 'KeyU', key: 'U', noteIndex: divisions + 6 },
        { code: 'KeyI', key: 'I', noteIndex: divisions + 7 },
        { code: 'KeyO', key: 'O', noteIndex: divisions + 8 },
        { code: 'KeyP', key: 'P', noteIndex: divisions + 9 },
        { code: 'BracketLeft', key: '[', noteIndex: divisions + 10 },
        { code: 'BracketRight', key: ']', noteIndex: divisions + 11 },
        { code: 'Backslash', key: '\\', noteIndex: divisions + 12 },
      ],
    },
    // Row 1 (ASDF row) - Lower octave continuation
    {
      row: 1,
      keys: [
        { code: 'CapsLock', key: '⇪', noteIndex: null, disabled: true, wide: true },
        { code: 'KeyA', key: 'A', noteIndex: 10 },
        { code: 'KeyS', key: 'S', noteIndex: 11 },
        { code: 'KeyD', key: 'D', noteIndex: 12 },
        { code: 'KeyF', key: 'F', noteIndex: 13 },
        { code: 'KeyG', key: 'G', noteIndex: 14 },
        { code: 'KeyH', key: 'H', noteIndex: 15 },
        { code: 'KeyJ', key: 'J', noteIndex: 16 },
        { code: 'KeyK', key: 'K', noteIndex: 17 },
        { code: 'KeyL', key: 'L', noteIndex: 18 },
        { code: 'Semicolon', key: ';', noteIndex: 19 },
        { code: 'Quote', key: "'", noteIndex: 20 },
        { code: 'Enter', key: '⏎', noteIndex: null, disabled: true, wide: true },
      ],
    },
    // Row 0 (ZXCV row) - Lower octave start
    {
      row: 0,
      keys: [
        { code: 'ShiftLeft', key: '⇧', noteIndex: null, disabled: true, extraWide: true },
        { code: 'KeyZ', key: 'Z', noteIndex: 0 },
        { code: 'KeyX', key: 'X', noteIndex: 1 },
        { code: 'KeyC', key: 'C', noteIndex: 2 },
        { code: 'KeyV', key: 'V', noteIndex: 3 },
        { code: 'KeyB', key: 'B', noteIndex: 4 },
        { code: 'KeyN', key: 'N', noteIndex: 5 },
        { code: 'KeyM', key: 'M', noteIndex: 6 },
        { code: 'Comma', key: ',', noteIndex: 7 },
        { code: 'Period', key: '.', noteIndex: 8 },
        { code: 'Slash', key: '/', noteIndex: 9 },
        { code: 'ShiftRight', key: '⇧', noteIndex: null, disabled: true, extraWide: true },
      ],
    },
  ];

  // Get note label as a fraction
  const getNoteLabel = (noteIndex) => {
    if (noteIndex === null) return null;
    return `${noteIndex}/${divisions}`;
  };

  // Check if a note at this index is currently active
  const isNoteActive = (noteIndex) => {
    if (noteIndex === null) return false;
    // activePitchClasses contains {pitch, opacity, id, sustained, fadeStartTime}
    // pitch is the pitch class (0-11 for 12-TET)
    const pitchClass = noteIndex % divisions;
    return activePitchClasses.some((pc) => pc.pitch === pitchClass);
  };

  // Check if note is held vs releasing
  const isNoteHeld = (noteIndex) => {
    if (noteIndex === null) return false;
    // Check if the note is actively held (not just fading)
    const pitchClass = noteIndex % divisions;
    return activePitchClasses.some((pc) => pc.pitch === pitchClass && pc.sustained === true);
  };

  // Get key style based on state
  const getKeyStyle = (noteIndex, disabled) => {
    if (disabled || noteIndex === null) {
      return 'bg-gray-800/30 text-gray-600 border-gray-800/50 cursor-not-allowed opacity-40';
    }

    const isActive = isNoteActive(noteIndex);
    const isHeld = isNoteHeld(noteIndex);

    if (isActive && isHeld) {
      // Held note - bright glow
      return 'bg-blue-500 text-white shadow-lg shadow-blue-500/50 scale-95 border-blue-400';
    } else if (isActive) {
      // Releasing note - dimmer glow
      return 'bg-blue-600/60 text-white shadow-md shadow-blue-600/30 border-blue-500/50';
    } else {
      // Inactive
      return 'bg-gray-700 text-gray-200 hover:bg-gray-600 border-gray-600';
    }
  };

  // Get key width (scaled to standard key = 48px)
  const getKeyWidth = (keyData) => {
    if (keyData.key === '⇧') return 'w-24'; // Shift keys - 2x width
    if (keyData.key === '⏎') return 'w-20'; // Enter - 1.67x width
    if (keyData.key === '⇥') return 'w-16'; // Tab - 1.33x width
    if (keyData.key === '⇪') return 'w-20'; // Caps Lock - 1.67x width
    if (keyData.key === '⌫') return 'w-20'; // Backspace - 1.67x width
    return 'w-12'; // Standard key
  };

  // Row offset for visual layout (indent rows)
  const getRowOffset = (row) => {
    const offsets = { 3: 0, 2: 0, 1: 0, 0: 0 };
    return offsets[row] || 0;
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-2xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white mb-1">Keyboard Input</h2>
        <p className="text-sm text-gray-400">{divisions}-TET • 2 Octaves across 4 rows</p>
      </div>

      <div className="space-y-2">
        {keyboardLayout.map((rowData) => (
          <div
            key={rowData.row}
            className="flex gap-1"
            style={{ paddingLeft: `${getRowOffset(rowData.row)}px` }}
          >
            {rowData.keys.map((keyData) => {
              const noteLabel = getNoteLabel(keyData.noteIndex);
              const disabled = keyData.disabled || keyData.noteIndex === null;

              return (
                <div
                  key={keyData.code}
                  className={`
                    relative flex flex-col items-center justify-center
                    ${getKeyWidth(keyData)} h-16 rounded-md
                    font-semibold text-sm
                    transition-all duration-150 ease-out
                    border-2
                    ${getKeyStyle(keyData.noteIndex, disabled)}
                  `}
                >
                  {!disabled && noteLabel ? (
                    <>
                      <div className="text-xs font-bold leading-tight text-center">{noteLabel}</div>
                      <div className="text-xs mt-1 text-gray-400">{keyData.key}</div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-600">{keyData.key}</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Lower octave: Z-/ + A-' • Upper octave: Q-\ + 1-=
      </div>
    </div>
  );
};

export default KeyboardVisualizer;
