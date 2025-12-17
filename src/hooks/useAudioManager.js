// ============================================
// FILE: src/hooks/useAudioManager.js
// OPTIMIZED VERSION - Single RAF loop for all fades
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react';

export const useAudioManager = (config) => {
  const [activeNote, setActiveNote] = useState(null);
  const [activePitchClasses, setActivePitchClasses] = useState([]);
  const [heldNotes, setHeldNotes] = useState([]);
  const [releasedNotes, setReleasedNotes] = useState([]);
  const [activeOscillators, setActiveOscillators] = useState({});

  const audioContextRef = useRef(null);
  const fadeAnimationRef = useRef(null);
  const fadingNotesRef = useRef(new Map());
  const isAnimatingRef = useRef(false); // Track all fading notes

  // Initialize Audio Context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (fadeAnimationRef.current) {
        cancelAnimationFrame(fadeAnimationRef.current);
      }
    };
  }, []);

  // Single RAF loop to handle ALL fading notes at once
  useEffect(() => {
    if (fadingNotesRef.current.size === 0) {
      if (fadeAnimationRef.current) {
        cancelAnimationFrame(fadeAnimationRef.current);
        fadeAnimationRef.current = null;
      }
      return;
    }

    const animate = () => {
      const now = Date.now();
      let hasActiveFades = false;

      // Update all fading notes in one go
      setActivePitchClasses((prev) => {
        const updated = prev
          .map((pc) => {
            const fadeInfo = fadingNotesRef.current.get(pc.id);
            if (!fadeInfo) return pc;

            const elapsed = now - fadeInfo.startTime;
            const fadeProgress = Math.min(1, elapsed / fadeInfo.duration);
            const newOpacity = Math.max(0, 1 - fadeProgress);

            if (newOpacity <= 0) {
              fadingNotesRef.current.delete(pc.id);
              return null;
            }

            hasActiveFades = true;
            return { ...pc, opacity: newOpacity };
          })
          .filter(Boolean);

        return updated;
      });

      // Continue loop if there are still fading notes
      if (hasActiveFades && fadingNotesRef.current.size > 0) {
        fadeAnimationRef.current = requestAnimationFrame(animate);
      } else {
        fadeAnimationRef.current = null;
        fadingNotesRef.current.clear();
      }
    };

    if (!fadeAnimationRef.current) {
      fadeAnimationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (fadeAnimationRef.current) {
        cancelAnimationFrame(fadeAnimationRef.current);
        fadeAnimationRef.current = null;
      }
    };
  }, [fadingNotesRef.current.size]); // Trigger when fades are added/removed

  // Play a note
  const playNote = useCallback((freq, duration = 0.5, sustained = false) => {
    const ctx = audioContextRef.current;
    if (!ctx) return null;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = freq;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);

    if (!sustained) {
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    }

    oscillator.start(ctx.currentTime);
    if (!sustained) {
      oscillator.stop(ctx.currentTime + duration);
    }

    return { oscillator, gainNode, id: Date.now() + Math.random() };
  }, []);

  // Stop a note
  const stopNote = useCallback((oscillator, gainNode) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    gainNode.gain.cancelScheduledValues(ctx.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    oscillator.stop(ctx.currentTime + 0.1);
  }, []);

  // Release a note (start fade animation)
  const releaseNote = useCallback(
    (noteId, pitchClass) => {
      const now = Date.now();

      setHeldNotes((prev) => prev.filter((n) => n.id !== noteId));
      setReleasedNotes((prev) => [...prev, { pitch: pitchClass, time: now, id: noteId }]);

      // Add to fading notes map
      const fadeStartDelay = Math.min(500, config.releaseTime * 0.25);

      setTimeout(() => {
        fadingNotesRef.current.set(noteId, {
          startTime: Date.now(),
          duration: config.releaseTime - fadeStartDelay,
        });

        // Trigger the animation loop if not already running
        if (!fadeAnimationRef.current) {
          const animate = () => {
            const now = Date.now();
            let hasActiveFades = false;

            setActivePitchClasses((prev) => {
              const updated = prev
                .map((pc) => {
                  const fadeInfo = fadingNotesRef.current.get(pc.id);
                  if (!fadeInfo) return pc;

                  const elapsed = now - fadeInfo.startTime;
                  const fadeProgress = Math.min(1, elapsed / fadeInfo.duration);
                  const newOpacity = Math.max(0, 1 - fadeProgress);

                  if (newOpacity <= 0) {
                    fadingNotesRef.current.delete(pc.id);
                    return null;
                  }

                  hasActiveFades = true;
                  return { ...pc, opacity: newOpacity };
                })
                .filter(Boolean);

              return updated;
            });

            if (hasActiveFades && fadingNotesRef.current.size > 0) {
              fadeAnimationRef.current = requestAnimationFrame(animate);
            } else {
              fadeAnimationRef.current = null;
              fadingNotesRef.current.clear();
            }
          };

          fadeAnimationRef.current = requestAnimationFrame(animate);
        }
      }, fadeStartDelay);
    },
    [config.releaseTime]
  );

  // Handle note play (click or keyboard)
  const handleNotePlay = useCallback(
    (note, sustained = false) => {
      const nodes = playNote(note.freq, 0.5, sustained);
      if (!nodes) return null;

      const now = Date.now();
      const noteId = nodes.id;

      setActiveNote(note.freq);

      if (sustained) {
        setHeldNotes((prev) => [
          ...prev,
          { pitch: note.step, octave: note.octave, time: now, id: noteId },
        ]);
      } else {
        setReleasedNotes((prev) => [...prev, { pitch: note.step, time: now, id: noteId }]);
      }

      const newPitchClass = { pitch: note.step, opacity: 1, id: noteId, sustained };
      setActivePitchClasses((prev) => [...prev, newPitchClass]);

      if (!sustained) {
        setTimeout(() => setActiveNote(null), 500);
        setTimeout(() => releaseNote(noteId, note.step), 500);
      }

      return nodes;
    },
    [playNote, releaseNote]
  );

  return {
    activeNote,
    activePitchClasses,
    heldNotes,
    releasedNotes,
    activeOscillators,
    setActiveOscillators,
    setActiveNote,
    handleNotePlay,
    stopNote,
    releaseNote,
  };
};
