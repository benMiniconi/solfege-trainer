import { useState, useCallback } from 'react';
import { parseMidiFile, groupNotesIntoEvents, getMeasureCount, type MidiScore, type MidiTrack, type NoteEvent } from '@/lib/midi-parser';

interface RecentScore {
  name: string;
  trackCount: number;
  date: string;
  data: string; // base64 encoded
}

const RECENT_SCORES_KEY = 'solfege-recent-scores';
const MAX_RECENT = 5;

function getRecentScores(): RecentScore[] {
  try {
    const raw = localStorage.getItem(RECENT_SCORES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentScore(name: string, trackCount: number, arrayBuffer: ArrayBuffer) {
  const recent = getRecentScores();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  const entry: RecentScore = {
    name,
    trackCount,
    date: new Date().toISOString(),
    data: base64,
  };
  const filtered = recent.filter(r => r.name !== name);
  filtered.unshift(entry);
  localStorage.setItem(RECENT_SCORES_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
}

export function useMidiScore() {
  const [score, setScore] = useState<MidiScore | null>(null);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number>(0);
  const [events, setEvents] = useState<NoteEvent[]>([]);
  const [measureCount, setMeasureCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const parsed = parseMidiFile(arrayBuffer, file.name);

      if (parsed.tracks.length === 0) {
        setError('No playable tracks found in this MIDI file.');
        setIsLoading(false);
        return;
      }

      setScore(parsed);
      setSelectedTrackIndex(0);

      const track = parsed.tracks[0];
      const noteEvents = groupNotesIntoEvents(track.notes);
      setEvents(noteEvents);
      setMeasureCount(getMeasureCount(track.notes));

      saveRecentScore(parsed.name, parsed.tracks.length, arrayBuffer);
    } catch (e) {
      setError('Failed to parse MIDI file. Please ensure it is a valid .mid file.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadFromRecent = useCallback((recent: RecentScore) => {
    try {
      const binary = atob(recent.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const parsed = parseMidiFile(bytes.buffer, recent.name + '.mid');
      if (parsed.tracks.length === 0) {
        setError('No playable tracks found.');
        return;
      }
      setScore(parsed);
      setSelectedTrackIndex(0);
      const track = parsed.tracks[0];
      const noteEvents = groupNotesIntoEvents(track.notes);
      setEvents(noteEvents);
      setMeasureCount(getMeasureCount(track.notes));
    } catch {
      setError('Failed to load recent score.');
    }
  }, []);

  const selectTrack = useCallback((index: number) => {
    if (!score || index < 0 || index >= score.tracks.length) return;
    setSelectedTrackIndex(index);
    const track = score.tracks[index];
    const noteEvents = groupNotesIntoEvents(track.notes);
    setEvents(noteEvents);
    setMeasureCount(getMeasureCount(track.notes));
  }, [score]);

  const selectedTrack: MidiTrack | null = score ? score.tracks[selectedTrackIndex] : null;

  const reset = useCallback(() => {
    setScore(null);
    setSelectedTrackIndex(0);
    setEvents([]);
    setMeasureCount(0);
    setError(null);
  }, []);

  return {
    score,
    selectedTrack,
    selectedTrackIndex,
    events,
    measureCount,
    error,
    isLoading,
    loadFile,
    loadFromRecent,
    selectTrack,
    reset,
    recentScores: getRecentScores(),
  };
}
