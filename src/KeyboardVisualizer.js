import React from 'react';

const KeyboardVisualizer = ({ activePitchClasses, config, pressedKeys }) => {
  const { divisions } = config;

  const keyboardLayout = [
    {
      row: 3,
      keys: [
        { code: 'Backquote', key: '`', noteIndex: null, disabled: true },
        { code: 'Digit1', key: '1', noteIndex: divisions + 13 },
        { code: 'Digit2', key: '2', noteIndex: divisions + 14 },
        { code: 'Digit3', key: '3', noteIndex: divisions + 15 },
        { code: 'Digit4', key: '4', noteIndex: divisions + 16 },
        { code: 'Digit5', key: '5', noteIndex: divisions + 17 },
        { code: 'Digit6', key: '6', noteIndex: divisions + 18 },
        { code: 'Digit7', key: '7', noteIndex: divisions + 19 },
        { code: 'Digit8', key: '8', noteIndex: divisions + 20 },
        { code: 'Digit9', key: '9', noteIndex: divisions + 21 },
        { code: 'Digit0', key: '0', noteIndex: divisions + 22 },
        { code: 'Minus', key: '-', noteIndex: divisions + 23 },
        { code: 'Equal', key: '=', noteIndex: divisions + 24 },
        { code: 'Backspace', key: '⌫', noteIndex: null, disabled: true, wide: true },
      ],
    },
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

  const isExactKeyPressed = (code) => pressedKeys && pressedKeys.has(code);

  const isNoteActive = (noteIndex) => {
    if (noteIndex === null) return false;
    const pitchClass = noteIndex % divisions;
    return activePitchClasses.some((pc) => pc.pitch === pitchClass);
  };

  const isNoteHeld = (noteIndex) => {
    if (noteIndex === null) return false;
    const pitchClass = noteIndex % divisions;
    return activePitchClasses.some((pc) => pc.pitch === pitchClass && pc.sustained === true);
  };

  const getKeyStyle = (noteIndex, disabled, code) => {
    if (disabled || noteIndex === null) {
      return 'bg-gray-800/30 text-gray-600 border-gray-800/50 cursor-not-allowed opacity-40';
    }

    const isExactMatch = isExactKeyPressed(code);
    const isActive = isNoteActive(noteIndex);
    const isHeld = isNoteHeld(noteIndex);

    if (isExactMatch) {
      return 'bg-cyan-400 text-gray-900 shadow-xl shadow-cyan-400/70 scale-95 border-white font-bold z-10';
    } else if (isActive && isHeld) {
      return 'bg-blue-600/60 text-white shadow-lg shadow-blue-500/30 border-blue-400/50';
    } else if (isActive) {
      return 'bg-blue-900/40 text-blue-200 border-blue-800/50';
    } else {
      return 'bg-gray-700 text-gray-200 hover:bg-gray-600 border-gray-600';
    }
  };

  const getKeyWidth = (keyData) => {
    if (keyData.key === '⇧') return 'w-24';
    if (keyData.key === '⏎') return 'w-20';
    if (keyData.key === '⇥') return 'w-16';
    if (keyData.key === '⇪') return 'w-20';
    if (keyData.key === '⌫') return 'w-20';
    return 'w-12';
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-2xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white mb-1">Keyboard Input</h2>
        <p className="text-sm text-gray-400">
          {divisions}-TET • 2 Octave Tiers (Bottom: 0-20, Top: Octave+0-24)
        </p>
      </div>

      <div className="space-y-2">
        {keyboardLayout.map((rowData) => (
          <div key={rowData.row} className="flex gap-1">
            {rowData.keys.map((keyData) => {
              const noteLabel =
                keyData.noteIndex !== null ? `${keyData.noteIndex}/${divisions}` : null;
              const disabled = keyData.disabled || keyData.noteIndex === null;

              return (
                <div
                  key={keyData.code}
                  className={`
                    relative flex flex-col items-center justify-center
                    ${getKeyWidth(keyData)} h-16 rounded-md
                    font-semibold text-sm transition-all duration-75 ease-out border-2
                    ${getKeyStyle(keyData.noteIndex, disabled, keyData.code)}
                  `}
                >
                  {!disabled && noteLabel ? (
                    <>
                      <div className="text-[10px] font-bold leading-tight opacity-80">
                        {noteLabel}
                      </div>
                      <div className="text-xs mt-1">{keyData.key}</div>
                    </>
                  ) : (
                    <div className="text-sm">{keyData.key}</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default KeyboardVisualizer;
