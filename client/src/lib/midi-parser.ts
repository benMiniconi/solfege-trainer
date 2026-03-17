import { Midi } from '@tonejs/midi';
import { midiToNoteName } from './music';

export interface MidiNote {
  midi: number;
  name: string;
  time: number;
  duration: number;
  velocity: number;
  measure: number;
  ticks: number;
}

export interface MidiTrack {
  name: string;
  notes: MidiNote[];
  instrument: string;
  channel: number;
}

export interface MidiScore {
  name: string;
  duration: number;
  bpm: number;
  timeSignature: [number, number];
  tracks: MidiTrack[];
  ticksPerBeat: number;
}

export interface NoteEvent {
  index: number;
  notes: MidiNote[];
  time: number;
  measure: number;
}

export function parseMidiFile(arrayBuffer: ArrayBuffer, fileName: string): MidiScore {
  const midi = new Midi(arrayBuffer);

  const bpm = midi.header.tempos.length > 0 ? Math.round(midi.header.tempos[0].bpm) : 120;
  const timeSig = midi.header.timeSignatures.length > 0
    ? midi.header.timeSignatures[0]
    : null;
  const timeSignature: [number, number] = timeSig
    ? [timeSig.timeSignature[0], timeSig.timeSignature[1]]
    : [4, 4];

  const ticksPerBeat = midi.header.ppq;
  const ticksPerMeasure = ticksPerBeat * timeSignature[0] * (4 / timeSignature[1]);

  const tracks: MidiTrack[] = midi.tracks
    .filter(track => track.notes.length > 0)
    .map((track, i) => {
      const notes: MidiNote[] = track.notes.map(note => {
        const { note: noteName, octave, accidental } = midiToNoteName(note.midi);
        const fullName = noteName + accidental + octave;
        const measure = Math.floor(note.ticks / ticksPerMeasure) + 1;

        return {
          midi: note.midi,
          name: fullName,
          time: note.time,
          duration: note.duration,
          velocity: note.velocity,
          measure,
          ticks: note.ticks,
        };
      });

      notes.sort((a, b) => a.time - b.time || a.midi - b.midi);

      return {
        name: track.name || `Track ${i + 1}`,
        notes,
        instrument: track.instrument?.name || 'Piano',
        channel: track.channel,
      };
    });

  const duration = midi.duration;

  return {
    name: fileName.replace(/\.(mid|midi)$/i, ''),
    duration,
    bpm,
    timeSignature,
    tracks,
    ticksPerBeat,
  };
}

/**
 * Group notes into events (chords = notes within a time tolerance).
 * Returns an array of NoteEvent, each containing simultaneous notes.
 */
export function groupNotesIntoEvents(notes: MidiNote[], toleranceMs: number = 0.03): NoteEvent[] {
  if (notes.length === 0) return [];

  const sorted = [...notes].sort((a, b) => a.time - b.time);
  const events: NoteEvent[] = [];
  let currentGroup: MidiNote[] = [sorted[0]];
  let groupStart = sorted[0].time;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].time - groupStart <= toleranceMs) {
      currentGroup.push(sorted[i]);
    } else {
      events.push({
        index: events.length,
        notes: currentGroup,
        time: groupStart,
        measure: currentGroup[0].measure,
      });
      currentGroup = [sorted[i]];
      groupStart = sorted[i].time;
    }
  }

  events.push({
    index: events.length,
    notes: currentGroup,
    time: groupStart,
    measure: currentGroup[0].measure,
  });

  return events;
}

/** Get the total number of measures in a track */
export function getMeasureCount(notes: MidiNote[]): number {
  if (notes.length === 0) return 0;
  return Math.max(...notes.map(n => n.measure));
}

/** Get notes in a specific measure range */
export function getNotesInRange(notes: MidiNote[], startMeasure: number, endMeasure: number): MidiNote[] {
  return notes.filter(n => n.measure >= startMeasure && n.measure <= endMeasure);
}
