import React from 'react';

const Instructions = () => {
  return (
    <div className="p-4 bg-gray-900 border-t border-gray-800 text-white text-sm">
      <p>
        <strong>How to use:</strong>
      </p>
      <ul className="list-disc list-inside mt-2 space-y-1">
        <li>
          <strong>Click any key</strong> to play its note (Web Audio API synthesizer)
        </li>
        <li>
          <strong>Touch Support:</strong> Tap keys on mobile/tablet - use multiple fingers for
          chords!
        </li>
        <li>
          <strong>Keyboard Control:</strong> Enable the toggle to play with your computer keyboard
        </li>
        <li>
          <strong>Bottom row (Z-/):</strong> Lower octave notes | <strong>Top row (A-;):</strong>{' '}
          Higher octave notes
        </li>
        <li>
          <strong>Polyphonic:</strong> Hold multiple keys simultaneously to play chords!
        </li>
        <li>Keys are arranged in a spiral - one full rotation = one octave</li>
        <li>Green lines connect octave-equivalent notes (same pitch class)</li>
        <li>
          <strong>Pitch Class Visualizer:</strong> Green lines show active notes (bright when held,
          fading after release)
        </li>
        <li>
          <strong>Release Time:</strong> Controls how long notes remain visible after release
        </li>
        <li>
          <strong>Hold notes</strong> to build chords, then release to see them fade over the
          release time!
        </li>
        <li>Try different tuning systems to hear microtonal intervals!</li>
      </ul>
    </div>
  );
};

export default Instructions;
