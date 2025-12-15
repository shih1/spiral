# Microtonal Spiral Piano - Technical Documentation

## Overview

An interactive web-based musical instrument that visualizes and plays microtonal tuning systems in a spiral keyboard layout with real-time pitch class analysis.

---

## Architecture

### Component Structure

```
MicrotonalSpiral (Main App)
├── useAudioEngine (Custom Hook)
│   └── Web Audio API management
├── SpiralKeyboard (Component)
│   └── Canvas-based keyboard rendering
├── PitchClassVisualizer (Component)
│   └── Real-time chord visualization
└── SettingsPanel (Component)
    └── Configuration UI
```

---

## Core Components

### 1. **useAudioEngine** (Custom Hook)

**Purpose:** Manages Web Audio API for sound synthesis

**Key Functions:**

- `playNote(freq, duration, sustained)` - Creates oscillator and gain nodes, plays a sine wave at the specified frequency
- `stopNote(oscillator, gainNode)` - Gracefully fades out and stops audio

**Audio Pipeline:**

```
Oscillator → GainNode → AudioContext.destination (speakers)
```

**Parameters:**

- `freq`: Frequency in Hz
- `duration`: Note length in seconds (ignored if sustained)
- `sustained`: Boolean - if true, note plays until explicitly stopped

---

### 2. **SpiralKeyboard** (Component)

**Purpose:** Renders the spiral keyboard using HTML5 Canvas

**Key Features:**

- **Logarithmic spiral layout** - Notes arranged in a spiral where one full rotation = one octave
- **Rectangular keys** - Each key is a rotated rectangle positioned radially
- **Click detection** - Transforms click coordinates to local key space for hit detection
- **Multiple color modes** - Piano, alternating, grayscale, interval-based, octave-based

**Mathematical Layout:**

```javascript
freq = baseFreq × 2^(semitoneRatio)
baseR = 80 + log2(freq/baseFreq) × 60
theta = (noteIndex/divisions) × 2π
spiralR = baseR + theta × spiralTightness × 15
x = centerX + spiralR × cos(theta)
y = centerY + spiralR × sin(theta)
```

**Click Detection Algorithm:**

1. Get click coordinates relative to canvas
2. For each note, calculate distance to note center
3. Transform to note's local coordinate system (inverse rotation)
4. Check if click is within rectangular bounds

---

### 3. **PitchClassVisualizer** (Component)

**Purpose:** Real-time visualization of active pitch classes and chord shapes

**Visualization Elements:**

- **Pitch class circle** - 12 o'clock = pitch class 0, clockwise progression
- **Active note lines** - Green lines from center to active pitch classes with opacity fade
- **Chord polygons** - Cyan polygon connecting 2+ active notes
- **Numeric labels** - Pitch class numbers around the perimeter

**Note State Management:**

- `heldNotes` - Notes currently being held (keyboard keys down)
- `releasedNotes` - Notes in release phase (within releaseTime window)
- `activePitchClasses` - Visual representation with opacity for fade effects

**Release Time Behavior:**

1. Note pressed → Added to `heldNotes`, opacity = 1.0
2. Note released → Moved to `releasedNotes` with timestamp
3. Fade begins after `releaseTime × 0.25` delay
4. Opacity decreases linearly over remaining time
5. Note removed when opacity reaches 0

---

### 4. **SettingsPanel** (Component)

**Purpose:** Configuration UI for all tuning and visual parameters

**Configurable Parameters:**

| Parameter       | Type  | Range     | Description                        |
| --------------- | ----- | --------- | ---------------------------------- |
| divisions       | int   | 12-53     | Notes per octave (TET system)      |
| octaves         | int   | 2-6       | Number of octaves to display       |
| baseFreq        | float | any       | Base frequency in Hz (default 440) |
| spiralTightness | float | 0-1       | How tightly spiral winds           |
| keyWidth        | int   | 20-50     | Key width in pixels                |
| keyHeight       | int   | 50-120    | Key height in pixels               |
| releaseTime     | int   | 500-5000  | Visual fade time in milliseconds   |
| colorMode       | enum  | 5 options | Key coloring scheme                |
| showLabels      | bool  | -         | Display frequency labels           |

---

## State Management

### Main Application State

```javascript
{
  activeNote: number | null,           // Currently playing frequency
  activePitchClasses: Array<{          // Visual state for pitch classes
    pitch: number,                     // Pitch class (0-divisions)
    opacity: number,                   // Current opacity (0-1)
    id: number,                        // Unique identifier
    sustained: boolean                 // Is note currently held?
  }>,
  heldNotes: Array<{                   // Notes with keys held down
    pitch: number,
    time: number,                      // Timestamp when note started
    id: number
  }>,
  releasedNotes: Array<{               // Notes in release phase
    pitch: number,
    time: number,                      // Timestamp when released
    id: number
  }>,
  keyboardEnabled: boolean,            // Keyboard input toggle
  activeOscillators: Object<{          // Active audio nodes by key
    [key: string]: {
      oscillator: OscillatorNode,
      gainNode: GainNode,
      id: number
    }
  }>,
  notes: Array<{                       // Calculated note positions
    x, y, freq, octave, step, theta, r, index, angle
  }>,
  config: ConfigObject,                // See SettingsPanel section
  showSettings: boolean                // Settings panel visibility
}
```

---

## Keyboard Mapping

### Layout

```
Top Row (Home Row):    A S D F G H J K L ;
Notes:                12 13 14 15 16 17 18 19 20 21

Bottom Row:           Z X C V B N M , . /
Notes:                0 1 2 3 4 5 6 7 8 9
```

### Event Flow

1. **Key Down** → `handleKeyDown()`

   - Checks if key is mapped
   - Calls `handleNotePlay(note, sustained=true)`
   - Stores oscillator in `activeOscillators[key]`
   - Note added to `heldNotes`

2. **Key Up** → `handleKeyUp()`
   - Retrieves oscillator from `activeOscillators[key]`
   - Calls `stopNote()` for audio fade
   - Calls `releaseNote()` to start visual fade
   - Moves note from `heldNotes` to `releasedNotes`

---

## Tuning Systems

### Equal Temperament (TET)

The app supports any equal temperament system where the octave is divided into N equal steps.

**Frequency Calculation:**

```
freq(n) = baseFreq × 2^(n/divisions)
```

**Common Systems:**

- **12-TET**: Standard Western tuning (piano, guitar)
- **19-TET**: Includes better thirds
- **24-TET**: Quarter-tone system (Middle Eastern music)
- **31-TET**: Very close to just intonation
- **53-TET**: Extremely fine divisions

---

## Visual Design

### Spiral Layout

- **Logarithmic spacing** - Matches human pitch perception
- **One rotation = one octave** - Visually represents octave equivalence
- **Green connection lines** - Link octave-equivalent notes

### Color Modes

1. **Piano**: Mimics piano keyboard (white/black pattern)
2. **Alternating**: Simple black/white alternation
3. **Grayscale**: Gradient across octave
4. **Interval**: Rainbow hue by pitch class
5. **Octave**: Rainbow hue by octave number

---

## Performance Considerations

### Canvas Rendering

- Full redraw on config change
- Click detection uses transformation matrix for efficiency
- Gradient caching where possible

### Audio Management

- Web Audio API oscillators are disposed after use
- Gain envelopes prevent clicks/pops
- Maximum polyphony limited by browser (typically 32+ voices)

### State Updates

- React state batching for multiple simultaneous updates
- Fade intervals use 50ms steps (20fps) for smooth animation
- Released notes filtered by timestamp to prevent memory leaks

---

## Browser Compatibility

**Requirements:**

- Web Audio API support
- HTML5 Canvas support
- ES6+ JavaScript

**Tested On:**

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

---

## Future Enhancement Ideas

1. **MIDI Support**: Connect MIDI keyboards
2. **Recording**: Capture performances
3. **Preset Tunings**: Save/load custom scales
4. **Waveform Selection**: Sine, square, sawtooth, triangle
5. **Effects**: Reverb, delay, filters
6. **Keyboard Visualization**: Actual image overlay
7. **Touch Support**: Multi-touch for mobile devices
8. **Just Intonation**: Non-equal temperament systems

---
