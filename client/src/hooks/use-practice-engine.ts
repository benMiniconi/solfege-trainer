import { useState, useCallback, useRef, useEffect } from 'react';
import type { NoteEvent } from '@/lib/midi-parser';

export type SpeedMode = 'wait' | 'slow' | 'normal';

export interface PracticeStats {
  correct: number;
  wrong: number;
  total: number;
  noteTimings: Map<number, number[]>; // eventIndex -> array of attempt durations
  troubleSpots: number[]; // measure numbers with high error rates
}

interface PracticeEngineState {
  currentEventIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  speedMode: SpeedMode;
  loopStart: number | null;
  loopEnd: number | null;
  loopEnabled: boolean;
  stats: PracticeStats;
  wrongNotes: Set<number>; // currently wrong midi notes (for red flash)
  matchedNotes: Set<number>; // currently matched midi notes in a chord
  isComplete: boolean;
}

const CHORD_TOLERANCE_MS = 300;
const WRONG_FLASH_MS = 300;
const CORRECT_ADVANCE_MS = 100;

export function usePracticeEngine(events: NoteEvent[]) {
  const [state, setState] = useState<PracticeEngineState>({
    currentEventIndex: 0,
    isPlaying: false,
    isPaused: false,
    speedMode: 'wait',
    loopStart: null,
    loopEnd: null,
    loopEnabled: false,
    stats: { correct: 0, wrong: 0, total: 0, noteTimings: new Map(), troubleSpots: [] },
    wrongNotes: new Set(),
    matchedNotes: new Set(),
    isComplete: false,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const eventsRef = useRef(events);
  eventsRef.current = events;

  const chordBufferRef = useRef<number[]>([]);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const noteStartTimeRef = useRef<number>(Date.now());
  const tempoTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Get the current event
  const currentEvent: NoteEvent | null = events.length > 0 && state.currentEventIndex < events.length
    ? events[state.currentEventIndex]
    : null;

  // Get expected MIDI note numbers for current event
  const expectedNotes: number[] = currentEvent ? currentEvent.notes.map(n => n.midi) : [];

  const clearTimers = useCallback(() => {
    if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
    if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    if (tempoTimerRef.current) clearTimeout(tempoTimerRef.current);
  }, []);

  // Advance to next event
  const advanceToEvent = useCallback((index: number) => {
    const evts = eventsRef.current;
    const s = stateRef.current;

    // Check loop bounds
    if (s.loopEnabled && s.loopEnd !== null && index < evts.length) {
      const nextEvent = evts[index];
      if (nextEvent && nextEvent.measure > s.loopEnd) {
        // Loop back to start
        const loopStartMeasure = s.loopStart || 1;
        const loopIdx = evts.findIndex(e => e.measure >= loopStartMeasure);
        if (loopIdx >= 0) {
          index = loopIdx;
        }
      }
    }

    if (index >= evts.length) {
      setState(prev => ({ ...prev, isComplete: true, isPlaying: false }));
      return;
    }

    chordBufferRef.current = [];
    noteStartTimeRef.current = Date.now();

    setState(prev => ({
      ...prev,
      currentEventIndex: index,
      wrongNotes: new Set(),
      matchedNotes: new Set(),
    }));
  }, []);

  // Start or resume practice
  const start = useCallback(() => {
    if (events.length === 0) return;

    const startIndex = stateRef.current.isPaused ? stateRef.current.currentEventIndex : 0;

    chordBufferRef.current = [];
    noteStartTimeRef.current = Date.now();

    setState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
      isComplete: false,
      currentEventIndex: startIndex,
      wrongNotes: new Set(),
      matchedNotes: new Set(),
      stats: prev.isPaused ? prev.stats : { correct: 0, wrong: 0, total: 0, noteTimings: new Map(), troubleSpots: [] },
    }));
  }, [events]);

  // Pause
  const pause = useCallback(() => {
    clearTimers();
    setState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
  }, [clearTimers]);

  // Stop and reset
  const stop = useCallback(() => {
    clearTimers();
    chordBufferRef.current = [];
    setState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      isComplete: false,
      currentEventIndex: 0,
      wrongNotes: new Set(),
      matchedNotes: new Set(),
    }));
  }, [clearTimers]);

  // Restart from beginning
  const restart = useCallback(() => {
    clearTimers();
    chordBufferRef.current = [];
    noteStartTimeRef.current = Date.now();

    // If loop is set, start from loop start
    let startIdx = 0;
    const s = stateRef.current;
    if (s.loopEnabled && s.loopStart !== null) {
      const idx = events.findIndex(e => e.measure >= s.loopStart!);
      if (idx >= 0) startIdx = idx;
    }

    setState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
      isComplete: false,
      currentEventIndex: startIdx,
      wrongNotes: new Set(),
      matchedNotes: new Set(),
      stats: { correct: 0, wrong: 0, total: 0, noteTimings: new Map(), troubleSpots: [] },
    }));
  }, [clearTimers, events]);

  // Handle note input from MIDI or on-screen piano
  const handleNoteInput = useCallback((midiNote: number) => {
    const s = stateRef.current;
    if (!s.isPlaying || s.isComplete) return;

    const evts = eventsRef.current;
    if (s.currentEventIndex >= evts.length) return;

    const event = evts[s.currentEventIndex];
    const expected = new Set(event.notes.map(n => n.midi));

    if (expected.has(midiNote)) {
      // Correct note
      const newMatched = new Set(s.matchedNotes);
      newMatched.add(midiNote);

      setState(prev => ({ ...prev, matchedNotes: newMatched }));

      // Check if all notes in the chord are matched
      const allMatched = [...expected].every(n => newMatched.has(n));

      if (allMatched) {
        // Record timing
        const timeTaken = Date.now() - noteStartTimeRef.current;
        const newTimings = new Map(s.stats.noteTimings);
        const existing = newTimings.get(s.currentEventIndex) || [];
        newTimings.set(s.currentEventIndex, [...existing, timeTaken]);

        setState(prev => ({
          ...prev,
          matchedNotes: new Set(expected),
          stats: {
            ...prev.stats,
            correct: prev.stats.correct + 1,
            total: prev.stats.total + 1,
            noteTimings: newTimings,
          },
        }));

        // Advance after short delay
        advanceTimerRef.current = setTimeout(() => {
          advanceToEvent(s.currentEventIndex + 1);
        }, CORRECT_ADVANCE_MS);
      }
    } else {
      // Wrong note
      const newWrong = new Set(s.wrongNotes);
      newWrong.add(midiNote);

      // Track error for trouble spots
      const measure = event.measure;

      setState(prev => ({
        ...prev,
        wrongNotes: newWrong,
        stats: {
          ...prev.stats,
          wrong: prev.stats.wrong + 1,
          total: prev.stats.total + 1,
          troubleSpots: prev.stats.troubleSpots.includes(measure)
            ? prev.stats.troubleSpots
            : [...prev.stats.troubleSpots, measure],
        },
      }));

      // Clear wrong feedback after delay
      wrongTimerRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          wrongNotes: new Set(),
        }));
      }, WRONG_FLASH_MS);
    }
  }, [advanceToEvent]);

  // Set speed mode
  const setSpeedMode = useCallback((mode: SpeedMode) => {
    setState(prev => ({ ...prev, speedMode: mode }));
  }, []);

  // Set loop points
  const setLoopStart = useCallback((measure: number | null) => {
    setState(prev => ({ ...prev, loopStart: measure }));
  }, []);

  const setLoopEnd = useCallback((measure: number | null) => {
    setState(prev => ({ ...prev, loopEnd: measure }));
  }, []);

  const toggleLoop = useCallback(() => {
    setState(prev => ({ ...prev, loopEnabled: !prev.loopEnabled }));
  }, []);

  const clearLoop = useCallback(() => {
    setState(prev => ({
      ...prev,
      loopStart: null,
      loopEnd: null,
      loopEnabled: false,
    }));
  }, []);

  // Tempo-based auto-advance for slow/normal modes
  useEffect(() => {
    const s = stateRef.current;
    if (!s.isPlaying || s.speedMode === 'wait' || s.isComplete) return;

    const evts = eventsRef.current;
    if (s.currentEventIndex >= evts.length - 1) return;

    const currentTime = evts[s.currentEventIndex].time;
    const nextTime = evts[s.currentEventIndex + 1].time;
    const timeDiff = nextTime - currentTime;

    const speedMultiplier = s.speedMode === 'slow' ? 2 : 1;
    const delayMs = timeDiff * 1000 * speedMultiplier;

    tempoTimerRef.current = setTimeout(() => {
      const current = stateRef.current;
      if (current.isPlaying && !current.isComplete) {
        // Record as missed if not matched
        const event = evts[current.currentEventIndex];
        const expected = new Set(event.notes.map(n => n.midi));
        const allMatched = [...expected].every(n => current.matchedNotes.has(n));

        if (!allMatched) {
          setState(prev => ({
            ...prev,
            stats: {
              ...prev.stats,
              wrong: prev.stats.wrong + 1,
              total: prev.stats.total + 1,
            },
          }));
        }

        advanceToEvent(current.currentEventIndex + 1);
      }
    }, delayMs);

    return () => {
      if (tempoTimerRef.current) clearTimeout(tempoTimerRef.current);
    };
  }, [state.currentEventIndex, state.isPlaying, state.speedMode, state.isComplete, advanceToEvent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // Reset when events change
  useEffect(() => {
    stop();
  }, [events, stop]);

  const accuracy = state.stats.total > 0
    ? Math.round((state.stats.correct / state.stats.total) * 100)
    : 0;

  return {
    currentEventIndex: state.currentEventIndex,
    currentEvent,
    expectedNotes,
    isPlaying: state.isPlaying,
    isPaused: state.isPaused,
    isComplete: state.isComplete,
    speedMode: state.speedMode,
    loopStart: state.loopStart,
    loopEnd: state.loopEnd,
    loopEnabled: state.loopEnabled,
    stats: state.stats,
    accuracy,
    wrongNotes: state.wrongNotes,
    matchedNotes: state.matchedNotes,
    start,
    pause,
    stop,
    restart,
    handleNoteInput,
    setSpeedMode,
    setLoopStart,
    setLoopEnd,
    toggleLoop,
    clearLoop,
  };
}
