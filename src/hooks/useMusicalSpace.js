import { useMemo, useCallback } from 'react';

export const useMusicalSpace = (config) => {
  const { divisions } = config;

  const getCoordinates = useCallback(
    (noteIndex) => {
      if (noteIndex === null || noteIndex === undefined) return null;

      const pitchClass = noteIndex % divisions;
      // Continuous Z: each step is 1/N of an octave height
      const continuousZ = noteIndex / divisions;

      // Angle (Theta) remains the same for pitch class alignment
      const theta = (pitchClass / divisions) * 2 * Math.PI - Math.PI / 2;

      return {
        x: Math.cos(theta),
        y: Math.sin(theta),
        z: continuousZ, // Now a float (0.0, 0.083, 0.166...)
        pitchClass,
        octave: Math.floor(continuousZ),
        theta,
      };
    },
    [divisions]
  );

  return { getCoordinates };
};
