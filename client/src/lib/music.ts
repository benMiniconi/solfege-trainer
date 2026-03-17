// Music theory utilities for the solfège app

// Note names in French solfège
export const SOLFEGE_NAMES: Record<string, string> = {
  'C': 'DO',
  'D': 'RÉ',
  'E': 'MI',
  'F': 'FA',
  'G': 'SOL',
  'A': 'LA',
  'B': 'SI',
};

// Sharp/flat display
export const ACCIDENTAL_DISPLAY: Record<string, string> = {
  '#': '♯',
  'b': '♭',
  '': '',
};

// All chromatic notes
export const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Natural notes only (no sharps/flats) for beginner mode
export const NATURAL_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// MIDI note number to note name
export function midiToNoteName(midi: number): { note: string; octave: number; accidental: string } {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  const noteName = CHROMATIC_NOTES[noteIndex];
  const base = noteName.charAt(0);
  const accidental = noteName.length > 1 ? noteName.charAt(1) : '';
  return { note: base, octave, accidental };
}

// Note name + octave to MIDI number
export function noteToMidi(note: string, octave: number, accidental: string = ''): number {
  const noteWithAccidental = note + accidental;
  const index = CHROMATIC_NOTES.indexOf(noteWithAccidental);
  if (index === -1) return -1;
  return (octave + 1) * 12 + index;
}

// Convert to French solfège display
export function toSolfege(note: string, accidental: string = ''): string {
  const solfege = SOLFEGE_NAMES[note] || note;
  const acc = ACCIDENTAL_DISPLAY[accidental] || '';
  return solfege + acc;
}

// Staff position: how many steps above middle C (C4) on the treble clef
// Returns the Y position on the staff (0 = middle line, positive = up, negative = down)
export function noteToStaffPosition(note: string, octave: number): number {
  const naturalOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const noteIndex = naturalOrder.indexOf(note);
  if (noteIndex === -1) return 0;
  // C4 = position 0 (below the treble clef staff, first ledger line below)
  // B4 = position 6
  // C5 = position 7
  // Position relative to C4
  return (octave - 4) * 7 + noteIndex;
}

// Staff position to note info
export function staffPositionToNote(position: number): { note: string; octave: number } {
  const naturalOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const octave = 4 + Math.floor(position / 7);
  let noteIndex = position % 7;
  if (noteIndex < 0) noteIndex += 7;
  return { note: naturalOrder[noteIndex], octave };
}

// Generate a random note within a range
export function randomNote(
  minMidi: number,
  maxMidi: number,
  useAccidentals: boolean = false
): { note: string; octave: number; accidental: string; midi: number } {
  const candidates: number[] = [];
  for (let m = minMidi; m <= maxMidi; m++) {
    const { accidental } = midiToNoteName(m);
    if (!useAccidentals && accidental) continue;
    candidates.push(m);
  }
  const midi = candidates[Math.floor(Math.random() * candidates.length)];
  const { note, octave, accidental } = midiToNoteName(midi);
  return { note, octave, accidental, midi };
}

// Generate a random chord (2 or 3 notes)
export function randomChord(
  noteCount: 2 | 3,
  minMidi: number,
  maxMidi: number,
  useAccidentals: boolean = false
): Array<{ note: string; octave: number; accidental: string; midi: number }> {
  // Generate first note
  const first = randomNote(minMidi, maxMidi - (noteCount === 3 ? 8 : 4), useAccidentals);
  
  // Common intervals for musical chords
  const intervals2 = [3, 4, 5, 7]; // minor 3rd, major 3rd, perfect 4th, perfect 5th
  const intervals3 = [
    [4, 7],  // major triad
    [3, 7],  // minor triad
    [4, 8],  // augmented (less common, skip for now)
    [3, 6],  // diminished
  ];
  
  const notes = [first];
  
  if (noteCount === 2) {
    const interval = intervals2[Math.floor(Math.random() * intervals2.length)];
    const secondMidi = first.midi + interval;
    if (secondMidi <= maxMidi) {
      const second = midiToNoteName(secondMidi);
      notes.push({ ...second, midi: secondMidi });
    } else {
      // Fallback: just go down
      const secondMidi2 = first.midi - interval;
      const second = midiToNoteName(secondMidi2);
      notes.push({ ...second, midi: secondMidi2 });
    }
  } else {
    // 3-note chord
    const chordType = intervals3[Math.floor(Math.random() * 3)]; // skip augmented
    const secondMidi = first.midi + chordType[0];
    const thirdMidi = first.midi + chordType[1];
    
    if (thirdMidi <= maxMidi) {
      const second = midiToNoteName(secondMidi);
      const third = midiToNoteName(thirdMidi);
      notes.push({ ...second, midi: secondMidi });
      notes.push({ ...third, midi: thirdMidi });
    } else {
      // Shift everything down
      const baseMidi = first.midi - chordType[1];
      const base = midiToNoteName(baseMidi);
      const second = midiToNoteName(baseMidi + chordType[0]);
      notes.splice(0, 1, { ...base, midi: baseMidi });
      notes.push({ ...second, midi: baseMidi + chordType[0] });
      notes.push(first); // original becomes the top
    }
  }
  
  // Filter out accidentals if not wanted
  if (!useAccidentals) {
    const filtered = notes.filter(n => !n.accidental);
    if (filtered.length < noteCount) {
      // Retry if we got accidentals in chord intervals
      return randomChord(noteCount, minMidi, maxMidi, useAccidentals);
    }
    return filtered.slice(0, noteCount).sort((a, b) => a.midi - b.midi);
  }
  
  return notes.sort((a, b) => a.midi - b.midi);
}

// Check if a set of MIDI notes matches the expected notes (order independent)
export function checkAnswer(
  expected: Array<{ midi: number }>,
  played: number[]
): boolean {
  if (expected.length !== played.length) return false;
  const expectedSet = new Set(expected.map(n => n.midi));
  const playedSet = new Set(played);
  for (const n of expectedSet) {
    if (!playedSet.has(n)) return false;
  }
  return true;
}

// Clef types
export type ClefType = 'treble' | 'bass';
