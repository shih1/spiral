import React from 'react';

const Instructions = () => {
  return (
    <div className="p-6 bg-gray-950 border-t border-gray-800 text-gray-300 text-xs leading-relaxed">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Concept Section */}
        <div>
          <h3 className="text-white font-semibold mb-2 uppercase tracking-wider">
            Musical Frontier
          </h3>
          <p className="mb-4">
            This project is the culmination of years of global travel and a desire to bridge the gap
            between Western musical foundations and the vast world of non-Western and historical
            scales. By dividing the octave into different numbers of equal steps (N-TET), we
            rediscover lost intervals and cross-cultural harmonies.
          </p>
          <div className="grid grid-cols-1 gap-1">
            <p>
              <strong className="text-white">12-TET:</strong> Modern Western standard.
            </p>
            <p>
              <strong className="text-white">19-TET:</strong> Renaissance-adjacent tuning with
              improved thirds.
            </p>
            <p>
              <strong className="text-white">24-TET:</strong> Quarter-tones essential for Arabic
              Maqam.
            </p>
            <p>
              <strong className="text-white">31-TET:</strong> The lost temperament of the
              Renaissance and early Baroque.
            </p>
            <p>
              <strong className="text-white">53-TET:</strong> Precision for Turkish Makam and Indian
              Raga nuances.
            </p>
          </div>
        </div>

        {/* Technical Section */}
        <div>
          <h3 className="text-white font-semibold mb-2 uppercase tracking-wider">Quick Start</h3>
          <ul className="space-y-2">
            <li>
              <strong className="text-white">Interaction:</strong> Click/tap keys or drag across the
              spiral for a microtonal glissando.
            </li>
            <li>
              <strong className="text-white">Keyboard Map:</strong> Reference the Keyboard
              Visualizer below for real-time key assignments (Z-/ for lower octaves, Q-P for
              higher).
            </li>
            <li>
              <strong className="text-white">Sound Design:</strong> Use Synth Controls to adjust
              Unison voice stacking, Filters, ADSR, and Wavetable morphing.
            </li>
            <li>
              <strong className="text-white">Visuals:</strong> Toggle 2D Circle for chord geometry
              or 3D Tower for vertical harmonic structure.
            </li>
          </ul>
          <div className="mt-6 border-t border-gray-800 pt-4 flex items-end gap-2">
            <div>
              <p className="font-medium text-blue-400 uppercase tracking-widest italic">
                Please enjoy.
              </p>
              <p className="text-whiet-500 mt-1 font-serif">— yoshih</p>
            </div>
            <img
              src={process.env.PUBLIC_URL + '/yoshih_walk.gif'}
              alt="yoshih"
              className="w-10 h-10 object-contain"
            />{' '}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Instructions;
