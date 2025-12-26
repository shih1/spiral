# Audio Hooks Architecture

This document describes the modular hook architecture for the Microtonal Spiral synthesizer's audio engine.

---

## 📊 Dependency Graph

```
                        ┌─────────────┐
                        │   App.js    │
                        └─────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
      │AudioManager │ │  Keyboard   │ │  Musical    │
      │             │ │  Controls   │ │   Space     │
      └─────────────┘ └─────────────┘ └─────────────┘
              │
              │
              ▼
      ┌─────────────┐
      │AudioContext │
      └─────────────┘
              │
              ├─────────────────┬─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
      ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
      │ReverbEffect │   │  SynthFX    │   │ PitchClass  │
      │             │   │             │   │    Anim     │
      └─────────────┘   └─────────────┘   └─────────────┘
              │                 │
              └────────┬────────┘
                       │
                       ▼
               ┌─────────────┐
               │    Note     │
               │  Lifecycle  │
               └─────────────┘
```

---

## 🎯 Hook Descriptions

### 1. **useAudioManager** (Orchestrator)

**Purpose:** Thin wrapper that connects all specialized hooks together  
**Dependencies:** All other hooks  
**Lines:** ~60  
**State:** None (just passes through)

**Responsibilities:**

- Initialize all audio subsystems in correct order
- Wire dependencies between hooks
- Export unified public API
- No business logic

**Exports:**

```javascript
{
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
    analyser,
    audioContext;
}
```

---

### 2. **useAudioContext** (Foundation Layer)

**Purpose:** Creates and manages the Web Audio API context  
**Dependencies:** ❌ None (foundation layer)  
**Lines:** ~80  
**State:** Refs only (audioContext, masterGain, analyser, etc.)

**Responsibilities:**

- Initialize `AudioContext`
- Create master gain node
- Create analyser node for visualization
- Set up reverb infrastructure (convolver, wet/dry gains)
- Generate impulse response
- Handle cleanup on unmount
- Update master volume

**Exports:**

```javascript
{
  audioContext, masterGain, reverbNode, reverbGain, dryGain, analyser;
}
```

**Why it's independent:** Foundation layer that everything else builds on. Has no dependencies on other hooks.

---

### 3. **useReverbEffect** (Dependent Effect)

**Purpose:** Manages reverb wet/dry mix and decay  
**Dependencies:** ✅ useAudioContext (needs audio nodes)  
**Lines:** ~50  
**State:** None (purely reactive)

**Responsibilities:**

- Update wet/dry gain mix
- Regenerate impulse response when decay changes
- Enable/disable reverb bypass

**Exports:** Nothing (side effects only)

**Why it depends on useAudioContext:** Needs the `audioContext`, `reverbNode`, `reverbGain`, and `dryGain` nodes to operate on. Can't create reverb effects without these nodes.

---

### 4. **useSynthFX** (Dependent Effect Bundle)

**Purpose:** Manages all synthesis effects (waveform, filter, drive, unison)  
**Dependencies:** ✅ useAudioContext (needs audioContext for updates)  
**Lines:** ~200  
**State:** Refs only (activeFiltersMapRef, activeDriveMapRef)

**Responsibilities:**

- **Waveform morphing:** Create PeriodicWaves (sine → triangle → saw → square)
- **Filter management:** Update all active filters in real-time
- **Drive/saturation:** Generate and apply distortion curves
- **Unison:** Update detune, blend, and pan for all voices

**Exports:**

```javascript
{
  createMorphedWave, makeDistortionCurve, activeFiltersMapRef, activeDriveMapRef;
}
```

**Why it depends on useAudioContext:** Needs `audioContext` for timing when updating active filters and creating PeriodicWaves. Also needs access to `currentTime` for scheduling parameter changes.

---

### 5. **useNoteLifecycle** (Core Business Logic)

**Purpose:** Manages complete note lifecycle from birth to death  
**Dependencies:** ✅ useAudioContext, useSynthFX  
**Lines:** ~350  
**State:** All note-related state

**Responsibilities:**

- **playNote:** Create multi-voice notes with ADSR, filter envelope, unison
- **stopNote:** Handle release phase and cleanup
- **releaseNote:** Mark notes for visual fadeout
- **handleNotePlay:** User-facing note trigger function
- Manage all note state (active, held, released notes)
- Track active oscillators
- Schedule cleanup timers

**Exports:**

```javascript
{
  activeNote,
    activePitchClasses,
    heldNotes,
    releasedNotes,
    activeOscillators,
    setActiveOscillators,
    setActiveNote,
    setActivePitchClasses,
    handleNotePlay,
    stopNote,
    releaseNote,
    playNote;
}
```

**Why it depends on useAudioContext:** Needs `audioContext`, `dryGain`, and `reverbGain` to create and route audio nodes.

**Why it depends on useSynthFX:** Needs `createMorphedWave()` and `makeDistortionCurve()` to create notes with the correct waveform and distortion. Also needs `activeFiltersMapRef` and `activeDriveMapRef` to track filters/drive nodes for real-time updates.

---

### 6. **usePitchClassAnimation** (Visual Layer)

**Purpose:** Manages continuous animation loop for pitch class fading  
**Dependencies:** ❌ None (operates on passed state only)  
**Lines:** ~50  
**State:** None (operates on passed state)

**Responsibilities:**

- Run requestAnimationFrame loop
- Calculate fade progress based on release time
- Update pitch class opacity over time
- Remove completely faded notes

**Exports:** Nothing (side effects only)

**Why it's independent:** Pure visual effect. Takes `config` and pitch class state as parameters and updates it. No audio dependencies. Could work with any note visualization system.

---

## 🔄 Data Flow

```
User Action (keyboard/click)
        ↓
handleNotePlay (useNoteLifecycle)
        ↓
playNote (useNoteLifecycle)
        ↓
    ┌───┴───┐
    ↓       ↓
createMorphedWave    makeDistortionCurve
(useSynthFX)         (useSynthFX)
    ↓       ↓
    └───┬───┘
        ↓
Web Audio Nodes Created
        ↓
    ┌───┴───┐
    ↓       ↓
dryGain     reverbGain
(useAudioContext)
    ↓       ↓
    └───┬───┘
        ↓
masterGain → analyser → speakers
```

---

## 🎨 Hook Dependencies Summary

### ❌ Zero Dependencies (Foundation & Utilities)

- **useAudioContext** - Creates Web Audio API context and nodes
- **useKeyboardControls** - Listens to keyboard events (called from App.js)
- **useMusicalSpace** - Pure math calculations for note coordinates (called from App.js)

### ✅ Single Dependency (Direct consumers of AudioContext)

- **useReverbEffect** - Depends on: useAudioContext (needs audio nodes)
- **useSynthFX** - Depends on: useAudioContext (needs context for timing)
- **usePitchClassAnimation** - Depends on: config + state (no hooks)

### 🔗 Multiple Dependencies (Complex integrations)

- **useNoteLifecycle** - Depends on: useAudioContext + useSynthFX
- **useAudioManager** - Depends on: all 5 hooks (orchestrator)

---

## 🛠️ Adding New Effects

Want to add a new effect like chorus, delay, or compression?

**If it only needs audio nodes (like reverb):**

1. Create `useNewEffect.js` similar to `useReverbEffect.js`
2. Have it take nodes from `useAudioContext` as parameters
3. Call it from `useAudioManager.js`
4. Done! No other hooks need changes

**If it needs real-time parameter updates:**

1. Add it to `useSynthFX.js` alongside filter/drive updates
2. Use refs to track active effect nodes
3. Update them in a `useEffect` when parameters change

**If it needs lifecycle integration:**

1. Add effect creation in `useNoteLifecycle.playNote()`
2. Add effect cleanup in `useNoteLifecycle.stopNote()`
3. Store effect nodes in the voices array

---

## 📝 Design Principles

1. **Separation of Concerns:** Each hook has one clear responsibility
2. **Minimal Dependencies:** Most hooks are independent
3. **Pure Functions:** Effects are side-effect based, not stateful
4. **Refs for Performance:** Audio nodes stored in refs, not state
5. **Single Source of Truth:** State lives in one place
6. **Composability:** Hooks can be mixed and matched

---

## 🧪 Testing Strategy

- **useAudioContext:** Mock Web Audio API
- **useReverbEffect:** Test gain value changes
- **useSynthFX:** Test waveform generation, filter curves
- **useNoteLifecycle:** Test note creation, cleanup, state updates
- **usePitchClassAnimation:** Test fade calculations
- **useAudioManager:** Integration test with all hooks

---

## 📦 File Structure

```
src/hooks/
├── useAudioManager.js          # Orchestrator (imports all)
├── useAudioContext.js          # Foundation (no imports)
├── useReverbEffect.js          # Independent FX (no imports)
├── useSynthFX.js               # Independent FX (no imports)
├── useNoteLifecycle.js         # Core logic (no imports)
└── usePitchClassAnimation.js   # Visual FX (no imports)
```

Notice: Only `useAudioManager.js` imports other hooks!

---

## 🚀 Future Improvements

- [ ] Add TypeScript types for all hooks
- [ ] Create visual debug panel for each subsystem
- [ ] Add unit tests for each hook
- [ ] Document Web Audio API node graph
- [ ] Add performance profiling
- [ ] Create hook composition examples
