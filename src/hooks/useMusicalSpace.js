import { useMemo, useCallback } from 'react';

/**
 * Translates musical notes into a 3D coordinate system.
 * X/Y: Represents the Pitch Class (0 to 1 normalized circle)
 * Z: Represents the Octave (linear height)
 */
export const useMusicalSpace = (config) => {
  const { divisions } = config;

  const getCoordinates = useCallback(
    (noteIndex) => {
      if (noteIndex === null || noteIndex === undefined) return null;

      const pitchClass = noteIndex % divisions;
      const octave = Math.floor(noteIndex / divisions);

      // Calculate Angle (Theta)
      // -Math.PI / 2 rotates the circle so 0/C is at the top (12 o'clock)
      const theta = (pitchClass / divisions) * 2 * Math.PI - Math.PI / 2;

      return {
        x: Math.cos(theta), // Normalized -1 to 1
        y: Math.sin(theta), // Normalized -1 to 1
        z: octave, // Discrete octave index
        pitchClass,
        octave,
        theta,
      };
    },
    [divisions]
  );

  return { getCoordinates };
};
