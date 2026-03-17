import { useRef, useEffect, useMemo } from 'react';
import { midiToNoteName, noteToStaffPosition, toSolfege, type ClefType } from '@/lib/music';
import type { NoteEvent } from '@/lib/midi-parser';

interface ScrollingStaffProps {
  events: NoteEvent[];
  currentEventIndex: number;
  matchedNotes: Set<number>;
  wrongNotes: Set<number>;
  clef: ClefType;
  showLabels?: boolean;
  loopStart: number | null;
  loopEnd: number | null;
  isPlaying: boolean;
}

const STAFF_HEIGHT = 200;
const LINE_SPACING = 12;
const STAFF_LINES = 5;
const STAFF_SPAN = LINE_SPACING * (STAFF_LINES - 1); // 48
const STAFF_TOP = 60;
const NOTE_SPACING = 60;
const CURSOR_X = 200;
const LOOK_AHEAD = 10; // events ahead to show
const LOOK_BEHIND = 3; // events behind to show

const trebleLinePositions = [2, 4, 6, 8, 10];
const bassLinePositions = [-12, -10, -8, -6, -4];

export function ScrollingStaff({
  events,
  currentEventIndex,
  matchedNotes,
  wrongNotes,
  clef,
  showLabels = false,
  loopStart,
  loopEnd,
  isPlaying,
}: ScrollingStaffProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const linePositions = clef === 'treble' ? trebleLinePositions : bassLinePositions;

  const positionToY = (pos: number) => {
    const bottomLinePos = linePositions[0];
    const halfStep = LINE_SPACING / 2;
    const bottomLineY = STAFF_TOP + STAFF_SPAN;
    return bottomLineY - (pos - bottomLinePos) * halfStep;
  };

  const getLedgerLines = (pos: number): number[] => {
    const ledgers: number[] = [];
    const bottomLine = linePositions[0];
    const topLine = linePositions[4];

    for (let p = bottomLine - 2; p >= pos; p -= 2) {
      ledgers.push(p);
    }
    for (let p = topLine + 2; p <= pos; p += 2) {
      ledgers.push(p);
    }
    if (clef === 'treble' && pos <= 0 && pos % 2 === 0) {
      if (!ledgers.includes(pos)) ledgers.push(pos);
    }
    if (clef === 'bass' && pos >= -2 && pos % 2 === 0) {
      if (!ledgers.includes(pos)) ledgers.push(pos);
    }
    return ledgers;
  };

  // Determine visible range of events
  const visibleStart = Math.max(0, currentEventIndex - LOOK_BEHIND);
  const visibleEnd = Math.min(events.length, currentEventIndex + LOOK_AHEAD + 1);
  const visibleEvents = events.slice(visibleStart, visibleEnd);

  const totalWidth = Math.max(800, (LOOK_BEHIND + LOOK_AHEAD + 1) * NOTE_SPACING + CURSOR_X + 100);

  // Auto-detect clef if needed (based on note range)
  const detectedClef = useMemo(() => {
    if (events.length === 0) return clef;
    const allMidi = events.flatMap(e => e.notes.map(n => n.midi));
    const avg = allMidi.reduce((a, b) => a + b, 0) / allMidi.length;
    return avg >= 60 ? 'treble' : 'bass';
  }, [events, clef]);

  const actualClef = clef || detectedClef;
  const actualLinePositions = actualClef === 'treble' ? trebleLinePositions : bassLinePositions;

  const actualPositionToY = (pos: number) => {
    const bottomLinePos = actualLinePositions[0];
    const halfStep = LINE_SPACING / 2;
    const bottomLineY = STAFF_TOP + STAFF_SPAN;
    return bottomLineY - (pos - bottomLinePos) * halfStep;
  };

  const getActualLedgerLines = (pos: number): number[] => {
    const ledgers: number[] = [];
    const bottomLine = actualLinePositions[0];
    const topLine = actualLinePositions[4];

    for (let p = bottomLine - 2; p >= pos; p -= 2) {
      ledgers.push(p);
    }
    for (let p = topLine + 2; p <= pos; p += 2) {
      ledgers.push(p);
    }
    if (actualClef === 'treble' && pos <= 0 && pos % 2 === 0) {
      if (!ledgers.includes(pos)) ledgers.push(pos);
    }
    if (actualClef === 'bass' && pos >= -2 && pos % 2 === 0) {
      if (!ledgers.includes(pos)) ledgers.push(pos);
    }
    return ledgers;
  };

  const getNoteColor = (eventIdx: number, midiNote: number) => {
    if (eventIdx < currentEventIndex) {
      // Already played - dim
      return 'hsl(var(--muted-foreground))';
    }
    if (eventIdx === currentEventIndex) {
      if (matchedNotes.has(midiNote)) return '#22c55e'; // green
      if (wrongNotes.has(midiNote)) return '#ef4444'; // red
      return 'hsl(var(--primary))'; // highlighted/current
    }
    // Future notes
    return 'hsl(var(--foreground))';
  };

  const getNoteOpacity = (eventIdx: number) => {
    if (eventIdx < currentEventIndex) return 0.3;
    if (eventIdx === currentEventIndex) return 1;
    return 0.7;
  };

  return (
    <div ref={containerRef} className="w-full overflow-hidden rounded-lg bg-card border border-border">
      <svg
        viewBox={`0 0 ${totalWidth} ${STAFF_HEIGHT}`}
        className="w-full select-none"
        style={{ minHeight: '160px' }}
      >
        {/* Staff lines */}
        {actualLinePositions.map((pos, i) => (
          <line
            key={`line-${i}`}
            x1={40}
            y1={actualPositionToY(pos)}
            x2={totalWidth - 20}
            y2={actualPositionToY(pos)}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={0.8}
            opacity={0.4}
          />
        ))}

        {/* Clef symbol */}
        {actualClef === 'treble' ? (
          <g transform={`translate(42, ${STAFF_TOP - 10}) scale(0.32)`}>
            <text fontSize="120" fontFamily="serif" fill="hsl(var(--foreground))" y="115" x="-5">
              {'\u{1D11E}'}
            </text>
          </g>
        ) : (
          <g transform={`translate(42, ${STAFF_TOP - 2}) scale(0.32)`}>
            <text fontSize="100" fontFamily="serif" fill="hsl(var(--foreground))" y="100" x="-5">
              {'\u{1D122}'}
            </text>
          </g>
        )}

        {/* Cursor line */}
        {isPlaying && (
          <line
            x1={CURSOR_X}
            y1={STAFF_TOP - 15}
            x2={CURSOR_X}
            y2={STAFF_TOP + STAFF_SPAN + 15}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            opacity={0.6}
          />
        )}

        {/* Loop markers */}
        {loopStart !== null && (
          <g>
            {/* Find x position for loop start measure */}
            {visibleEvents.map((evt, vi) => {
              if (evt.measure === loopStart && evt === events.find(e => e.measure >= loopStart!)) {
                const x = CURSOR_X + (visibleStart + vi - currentEventIndex) * NOTE_SPACING;
                return (
                  <g key="loop-start">
                    <line
                      x1={x - 5}
                      y1={STAFF_TOP - 15}
                      x2={x - 5}
                      y2={STAFF_TOP + STAFF_SPAN + 15}
                      stroke="#22c55e"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      opacity={0.6}
                    />
                    <text x={x - 3} y={STAFF_TOP - 18} fontSize="10" fill="#22c55e" fontWeight="bold">A</text>
                  </g>
                );
              }
              return null;
            })}
          </g>
        )}

        {loopEnd !== null && (
          <g>
            {visibleEvents.map((evt, vi) => {
              if (evt.measure === loopEnd && evt === events.findLast(e => e.measure <= loopEnd!)) {
                const x = CURSOR_X + (visibleStart + vi - currentEventIndex) * NOTE_SPACING;
                return (
                  <g key="loop-end">
                    <line
                      x1={x + 15}
                      y1={STAFF_TOP - 15}
                      x2={x + 15}
                      y2={STAFF_TOP + STAFF_SPAN + 15}
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      opacity={0.6}
                    />
                    <text x={x + 17} y={STAFF_TOP - 18} fontSize="10" fill="#ef4444" fontWeight="bold">B</text>
                  </g>
                );
              }
              return null;
            })}
          </g>
        )}

        {/* Notes */}
        {visibleEvents.map((event, vi) => {
          const eventIdx = visibleStart + vi;
          const x = CURSOR_X + (eventIdx - currentEventIndex) * NOTE_SPACING;

          if (x < 30 || x > totalWidth - 30) return null;

          return (
            <g key={`event-${eventIdx}`} opacity={getNoteOpacity(eventIdx)}>
              {/* Measure number at the start of new measures */}
              {(vi === 0 || event.measure !== visibleEvents[vi - 1]?.measure) && (
                <text
                  x={x}
                  y={STAFF_TOP - 20}
                  fontSize="9"
                  fill="hsl(var(--muted-foreground))"
                  textAnchor="middle"
                  opacity={0.6}
                >
                  {event.measure}
                </text>
              )}

              {event.notes.map((note, ni) => {
                const { note: noteName, octave, accidental } = midiToNoteName(note.midi);
                const pos = noteToStaffPosition(noteName, octave);
                const y = actualPositionToY(pos);
                const color = getNoteColor(eventIdx, note.midi);
                const ledgers = getActualLedgerLines(pos);

                // Offset adjacent notes in the same chord
                const xOffset = ni > 0 && event.notes.length > 1
                  ? (() => {
                    const prevNote = event.notes[ni - 1];
                    const prevPos = noteToStaffPosition(
                      midiToNoteName(prevNote.midi).note,
                      midiToNoteName(prevNote.midi).octave
                    );
                    return Math.abs(pos - prevPos) <= 1 ? 16 : 0;
                  })()
                  : 0;

                return (
                  <g key={`note-${eventIdx}-${ni}`}>
                    {/* Ledger lines */}
                    {ledgers.map(lp => (
                      <line
                        key={`ledger-${lp}`}
                        x1={x + xOffset - 12}
                        y1={actualPositionToY(lp)}
                        x2={x + xOffset + 12}
                        y2={actualPositionToY(lp)}
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={0.8}
                        opacity={0.4}
                      />
                    ))}

                    {/* Note head */}
                    <ellipse
                      cx={x + xOffset}
                      cy={y}
                      rx={6}
                      ry={4.5}
                      fill={color}
                      transform={`rotate(-10, ${x + xOffset}, ${y})`}
                    />

                    {/* Accidental */}
                    {accidental && (
                      <text
                        x={x + xOffset - 14}
                        y={y + 4}
                        fontSize="12"
                        fill={color}
                        fontFamily="serif"
                      >
                        {accidental === '#' ? '\u266F' : '\u266D'}
                      </text>
                    )}

                    {/* Solfège label */}
                    {showLabels && eventIdx === currentEventIndex && (
                      <text
                        x={x + xOffset}
                        y={y > STAFF_TOP + STAFF_SPAN / 2 ? y - 12 : y + 16}
                        fontSize="9"
                        fill="hsl(var(--primary))"
                        textAnchor="middle"
                        fontWeight="600"
                        fontFamily="var(--font-sans)"
                      >
                        {toSolfege(noteName, accidental)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* "End" indicator if near end */}
        {currentEventIndex >= events.length - 1 && events.length > 0 && (
          <text
            x={CURSOR_X + NOTE_SPACING}
            y={STAFF_TOP + STAFF_SPAN / 2 + 4}
            fontSize="12"
            fill="hsl(var(--muted-foreground))"
            textAnchor="middle"
            fontStyle="italic"
          >
            Fin
          </text>
        )}
      </svg>
    </div>
  );
}
