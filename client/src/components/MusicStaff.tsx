import { noteToStaffPosition, toSolfege, type ClefType } from '@/lib/music';

interface NoteDisplay {
  note: string;
  octave: number;
  accidental: string;
  midi: number;
  highlight?: 'correct' | 'wrong' | 'neutral';
}

interface MusicStaffProps {
  notes: NoteDisplay[];
  clef: ClefType;
  showLabels?: boolean;
  animate?: boolean;
}

export function MusicStaff({ notes, clef, showLabels = false, animate = true }: MusicStaffProps) {
  // Staff dimensions
  const width = 280;
  const height = 220;
  const staffTop = 50;
  const lineSpacing = 14;
  const staffHeight = lineSpacing * 4;
  const noteX = width / 2;

  // Treble clef: lines are E4, G4, B4, D5, F5 (positions 2, 4, 6, 8, 10)
  // Bass clef: lines are G2, B2, D3, F3, A3 (positions -12, -10, -8, -6, -4)
  const trebleLinePositions = [2, 4, 6, 8, 10]; // E4, G4, B4, D5, F5
  const bassLinePositions = [-12, -10, -8, -6, -4]; // G2, B2, D3, F3, A3

  const linePositions = clef === 'treble' ? trebleLinePositions : bassLinePositions;

  // Convert staff position to Y coordinate
  // Higher position = lower Y (higher on screen)
  const positionToY = (pos: number) => {
    // For treble clef: E4 (pos 2) is line 1 (bottom), F5 (pos 10) is line 5 (top)
    // For bass clef: G2 (pos -12) is line 1 (bottom), A3 (pos -4) is line 5 (top)
    const bottomLinePos = linePositions[0];
    const halfStep = lineSpacing / 2;
    const bottomLineY = staffTop + staffHeight;
    return bottomLineY - (pos - bottomLinePos) * halfStep;
  };

  // Draw ledger lines for a note
  const getLedgerLines = (pos: number): number[] => {
    const ledgers: number[] = [];
    const bottomLine = linePositions[0];
    const topLine = linePositions[4];

    // Below the staff
    for (let p = bottomLine - 2; p >= pos; p -= 2) {
      ledgers.push(p);
    }
    // Above the staff  
    for (let p = topLine + 2; p <= pos; p += 2) {
      ledgers.push(p);
    }
    // Middle C ledger line (position 0 for treble clef)
    if (clef === 'treble' && pos <= 0 && pos % 2 === 0) {
      if (!ledgers.includes(pos)) ledgers.push(pos);
    }
    if (clef === 'bass' && pos >= -2 && pos % 2 === 0) {
      if (!ledgers.includes(pos)) ledgers.push(pos);
    }

    return ledgers;
  };

  const noteColor = (highlight?: string) => {
    switch (highlight) {
      case 'correct': return 'hsl(var(--chart-2))';
      case 'wrong': return 'hsl(var(--destructive))';
      default: return 'hsl(var(--foreground))';
    }
  };

  // Treble clef SVG path (simplified)
  const trebleClefPath = (
    <g transform={`translate(28, ${staffTop - 12}) scale(0.38)`}>
      <text 
        fontSize="120" 
        fontFamily="serif" 
        fill="hsl(var(--foreground))"
        y="115"
        x="-5"
      >
        𝄞
      </text>
    </g>
  );

  // Bass clef SVG
  const bassClefPath = (
    <g transform={`translate(28, ${staffTop - 4}) scale(0.38)`}>
      <text 
        fontSize="100" 
        fontFamily="serif" 
        fill="hsl(var(--foreground))"
        y="100"
        x="-5"
      >
        𝄢
      </text>
    </g>
  );

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      className="w-full max-w-[280px] mx-auto select-none"
      role="img"
      aria-label="Portée musicale"
    >
      {/* Staff lines */}
      {linePositions.map((pos, i) => (
        <line
          key={`line-${i}`}
          x1={20}
          y1={positionToY(pos)}
          x2={width - 20}
          y2={positionToY(pos)}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
          opacity={0.5}
        />
      ))}

      {/* Clef */}
      {clef === 'treble' ? trebleClefPath : bassClefPath}

      {/* Notes */}
      {notes.map((noteData, idx) => {
        const pos = noteToStaffPosition(noteData.note, noteData.octave);
        const y = positionToY(pos);
        const ledgerLines = getLedgerLines(pos);
        const color = noteColor(noteData.highlight);
        
        // Offset notes that are adjacent (1 step apart) to avoid overlap
        const xOffset = notes.length > 1 && idx > 0 ? 
          (Math.abs(noteToStaffPosition(notes[idx].note, notes[idx].octave) - 
            noteToStaffPosition(notes[idx-1].note, notes[idx-1].octave)) <= 1 ? 22 : 0) : 0;

        return (
          <g key={`note-${idx}`}>
            {/* Ledger lines */}
            {ledgerLines.map(lp => (
              <line
                key={`ledger-${lp}`}
                x1={noteX + xOffset - 16}
                y1={positionToY(lp)}
                x2={noteX + xOffset + 16}
                y2={positionToY(lp)}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1}
                opacity={0.5}
              />
            ))}

            {/* Note head (whole note style) */}
            <ellipse
              cx={noteX + xOffset}
              cy={y}
              rx={8}
              ry={6}
              fill={color}
              transform={`rotate(-10, ${noteX + xOffset}, ${y})`}
              className={animate ? 'animate-in fade-in zoom-in-75 duration-300' : ''}
            />

            {/* Accidental */}
            {noteData.accidental && (
              <text
                x={noteX + xOffset - 18}
                y={y + 5}
                fontSize="16"
                fill={color}
                fontFamily="serif"
              >
                {noteData.accidental === '#' ? '♯' : '♭'}
              </text>
            )}

            {/* Label (solfège name) */}
            {showLabels && (
              <text
                x={noteX + xOffset}
                y={y > staffTop + staffHeight / 2 ? y - 16 : y + 22}
                fontSize="12"
                fill="hsl(var(--primary))"
                textAnchor="middle"
                fontWeight="600"
                fontFamily="var(--font-sans)"
                className={animate ? 'animate-in fade-in duration-500 delay-300' : ''}
              >
                {toSolfege(noteData.note, noteData.accidental)}
                {noteData.octave}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
