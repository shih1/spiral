import React from 'react';

const KeyboardVisualizer = ({ activePitchClasses, heldNotes, releasedNotes, config }) => {
  const { divisions } = config;

  // Physical keyboard layout - each row maps to sequential chromatic steps
  const keyboardLayout = [
    // Row 3 (top number row) - 3 octaves up
    {
      row: 3,
      octave: 3,
      keys: [
        { code: 'Digit1', key: '1', step: 0 },
        { code: 'Digit2', key: '2', step: 1 },
        { code: 'Digit3', key: '3', step: 2 },
        { code: 'Digit4', key: '4', step: 3 },
        { code: 'Digit5', key: '5', step: 4 },
        { code: 'Digit6', key: '6', step: 5 },
        { code: 'Digit7', key: '7', step: 6 },
        { code: 'Digit8', key: '8', step: 7 },
        { code: 'Digit9', key: '9', step: 8 },
        { code: 'Digit0', key: '0', step: 9 },
        { code: 'Minus', key: '-', step: 10 },
        { code: 'Equal', key: '=', step: 11 },
      ],
    },
    // Row 2 (QWERTY row) - 2 octaves up
    {
      row: 2,
      octave: 2,
      keys: [
        { code: 'KeyQ', key: 'Q', step: 0 },
        { code: 'KeyW', key: 'W', step: 1 },
        { code: 'KeyE', key: 'E', step: 2 },
        { code: 'KeyR', key: 'R', step: 3 },
        { code: 'KeyT', key: 'T', step: 4 },
        { code: 'KeyY', key: 'Y', step: 5 },
        { code: 'KeyU', key: 'U', step: 6 },
        { code: 'KeyI', key: 'I', step: 7 },
        { code: 'KeyO', key: 'O', step: 8 },
        { code: 'KeyP', key: 'P', step: 9 },
        { code: 'BracketLeft', key: '[', step: 10 },
        { code: 'BracketRight', key: ']', step: 11 },
        { code: 'Backslash', key: '\\', step: 12 },
      ],
    },
    // Row 1 (ASDF row) - 1 octave up
    {
      row: 1,
      octave: 1,
      keys: [
        { code: 'KeyA', key: 'A', step: 0 },
        { code: 'KeyS', key: 'S', step: 1 },
        { code: 'KeyD', key: 'D', step: 2 },
        { code: 'KeyF', key: 'F', step: 3 },
        { code: 'KeyG', key: 'G', step: 4 },
        { code: 'KeyH', key: 'H', step: 5 },
        { code: 'KeyJ', key: 'J', step: 6 },
        { code: 'KeyK', key: 'K', step: 7 },
        { code: 'KeyL', key: 'L', step: 8 },
        { code: 'Semicolon', key: ';', step: 9 },
        { code: 'Quote', key: "'", step: 10 },
      ],
    },
    // Row 0 (ZXCV row) - Base octave
    {
      row: 0,
      octave: 0,
      keys: [
        { code: 'KeyZ', key: 'Z', step: 0 },
        { code: 'KeyX', key: 'X', step: 1 },
        { code: 'KeyC', key: 'C', step: 2 },
        { code: 'KeyV', key: 'V', step: 3 },
        { code: 'KeyB', key: 'B', step: 4 },
        { code: 'KeyN', key: 'N', step: 5 },
        { code: 'KeyM', key: 'M', step: 6 },
        { code: 'Comma', key: ',', step: 7 },
        { code: 'Period', key: '.', step: 8 },
        { code: 'Slash', key: '/', step: 9 },
      ],
    },
  ];

  // Get note label as a fraction
  const getNoteLabel = (step, octave) => {
    // Only show keys that are within the current TET system
    if (step >= divisions) return null;

    const absoluteStep = octave * divisions + step;
    return `${absoluteStep}/${divisions}`;
  };

  // Check if a note is currently active by matching step
  const isNoteActive = (step, octave) => {
    if (step >= divisions) return false;
    const absoluteStep = octave * divisions + step;
    return activePitchClasses.some((pc) => pc.step === absoluteStep % divisions);
  };

  // Check if note is held vs releasing
  const isNoteHeld = (step, octave) => {
    if (step >= divisions) return false;
    const absoluteStep = octave * divisions + step;
    return heldNotes.some((n) => n.step === absoluteStep);
  };

  // Get key style based on state
  const getKeyStyle = (step, octave, isValid) => {
    if (!isValid) {
      return 'bg-gray-800/30 text-gray-600 border-gray-800 cursor-not-allowed opacity-30';
    }

    const isActive = isNoteActive(step, octave);
    const isHeld = isNoteHeld(step, octave);

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

  // Row offset for visual layout (indent rows)
  const getRowOffset = (row) => {
    const offsets = { 3: 0, 2: 0, 1: 24, 0: 40 };
    return offsets[row] || 0;
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-2xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white mb-1">Keyboard Input</h2>
        <p className="text-sm text-gray-400">{divisions}-TET Chromatic Layout</p>
      </div>

      <div className="space-y-2">
        {keyboardLayout.map((rowData) => (
          <div
            key={rowData.row}
            className="flex gap-1"
            style={{ paddingLeft: `${getRowOffset(rowData.row)}px` }}
          >
            {rowData.keys.map((keyData) => {
              const noteLabel = getNoteLabel(keyData.step, rowData.octave);
              const isValid = noteLabel !== null;

              return (
                <div
                  key={keyData.code}
                  className={`
                    relative flex flex-col items-center justify-center
                    w-12 h-16 rounded-md
                    font-semibold text-sm
                    transition-all duration-150 ease-out
                    border-2
                    ${getKeyStyle(keyData.step, rowData.octave, isValid)}
                  `}
                >
                  {isValid ? (
                    <>
                      <div className="text-xs font-bold leading-tight text-center">{noteLabel}</div>
                      <div className="text-xs mt-1 text-gray-400">{keyData.key}</div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-600">{keyData.key}</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Press keys on your keyboard • Each row is one octave higher
      </div>
    </div>
  );
};

export default KeyboardVisualizer;
