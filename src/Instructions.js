import React from 'react';

const Instructions = () => {
  return (
    /* Increased padding to p-12 and base text size to text-lg */
    <div className="p-12 bg-gray-950 border-t border-gray-800 text-gray-300 text-lg leading-relaxed">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Concept Section */}
        <div>
          {/* Section titles bumped to text-2xl */}
          <h3 className="text-white text-2xl font-semibold mb-4 uppercase tracking-wider">
            Musical Mission
          </h3>
          <p className="mb-6 text-xl">
            This project is the culmination of years of global travel and a desire to bridge the gap
            between Western musical foundations and the vast world of non-Western and historical
            scales. By dividing the octave into different numbers of equal steps (N-TET), rediscover
            lost intervals and cross-cultural harmonies.
          </p>
          <div className="grid grid-cols-1 gap-2">
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
          <h3 className="text-white text-2xl font-semibold mb-4 uppercase tracking-wider">
            Quick Start
          </h3>
          <ul className="space-y-4 text-xl">
            <li>
              <strong className="text-white">Interaction:</strong> Click/tap keys or drag across the
              spiral for a microtonal glissando.
            </li>
            <li>
              <strong className="text-white">Keyboard Input:</strong> Reference the Keyboard Input
              above for real-time key assignments (Z-/ for lower octaves, Q-P for higher).
              Guitarists should be able to adapt if you visualize Z and Q as the string roots.
            </li>
            <li>
              <strong className="text-white">Sound Design:</strong> Adjust Wavetable, Unison,
              Filters, and ADSR.
            </li>
            <li>
              <strong className="text-white">Visuals:</strong> 2D Circle for chord geometry or 3D
              Tower for vertical harmonic structure.
            </li>
          </ul>

          {/* Signature Area - Scaled up with text-white */}
          <div className="mt-10 border-t border-gray-800 pt-6 flex items-end gap-4">
            <div>
              <p className="text-cyan-500/80 text-sm font-mono tracking-tight">please enjoy.</p>
              <p className="text-white-500 text-xs font-mono lowercase opacity-70">— yoshih</p>
            </div>
            <img
              src={process.env.PUBLIC_URL + '/yoshih_walk.gif'}
              alt="yoshih"
              className="w-16 h-16 object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Instructions;
