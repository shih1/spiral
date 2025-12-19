import React from 'react';

const Instructions = () => {
  return (
    <div className="p-4 bg-gray-900 border-t border-gray-800 text-white text-sm">
      <p>
        <strong>How to use:</strong>
      </p>
      <ul className="list-disc list-inside mt-2 space-y-1">
        <li>
          <strong>Interactive Spiral:</strong> Click or tap keys to play notes. Drag your mouse or
          finger across the keys to "glide" between notes.
        </li>
        <li>
          <strong>Keyboard Controls:</strong> Play with your computer keyboard using the reference
          map at the bottom. The bottom rows (Z-/) handle lower octaves, while upper rows (Q-P)
          handle higher octaves.
        </li>
        <li>
          <strong>3D Visualizer:</strong> Switch between 2D and 3D visualization modes. Click and
          drag on the 3D Tower to rotate and inspect the harmonic structure.
        </li>
        <li>
          <strong>Microtonal Presets:</strong> Use the Settings panel to explore 12, 19, 24, 31, or
          53-TET (Equal Temperament) tuning systems.
        </li>
        <li>
          <strong>Chord Detection:</strong> The 2D Visualizer automatically detects and labels
          complex chords based on an expanded library.
        </li>
        <li>
          <strong>Mixer & Reverb:</strong> Use the Mixer panel to adjust master volume, toggle mute,
          or control reverb wetness and decay for a spacious sound.
        </li>
        <li>
          <strong>Visual Feedback:</strong> Active notes pulse and shimmer. Pitch classes are
          highlighted with green lines, and trailing "released" notes fade based on your Release
          Time setting.
        </li>
      </ul>
    </div>
  );
};

export default Instructions;
