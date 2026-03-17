import { useCallback } from 'react';
import { midiToNoteName, SOLFEGE_NAMES } from '@/lib/music';

interface PianoKeyboardProps {
  startMidi: number; // e.g., 48 = C3
  endMidi: number;   // e.g., 72 = C5
  activeNotes: Set<number>;
  highlightedNotes?: Map<number, 'correct' | 'wrong' | 'neutral'>;
  onNoteClick?: (midi: number) => void;
  showLabels?: boolean;
}

export function PianoKeyboard({ 
  startMidi, 
  endMidi, 
  activeNotes, 
  highlightedNotes = new Map(),
  onNoteClick,
  showLabels = true 
}: PianoKeyboardProps) {
  const isBlackKey = (midi: number) => {
    const note = midi % 12;
    return [1, 3, 6, 8, 10].includes(note);
  };

  // Collect white and black keys
  const whiteKeys: number[] = [];
  const blackKeys: number[] = [];
  
  for (let m = startMidi; m <= endMidi; m++) {
    if (isBlackKey(m)) {
      blackKeys.push(m);
    } else {
      whiteKeys.push(m);
    }
  }

  const whiteKeyWidth = 36;
  const whiteKeyHeight = 130;
  const blackKeyWidth = 22;
  const blackKeyHeight = 82;
  const totalWidth = whiteKeys.length * whiteKeyWidth;

  // Get X position for a white key
  const whiteKeyX = (midi: number) => {
    const idx = whiteKeys.indexOf(midi);
    return idx * whiteKeyWidth;
  };

  // Get X position for a black key (between the two white keys)
  const blackKeyX = (midi: number) => {
    // Find the white key just before this black key
    const prevWhite = midi - 1;
    const nextWhite = midi + 1;
    
    // If prevWhite is white, position between prev and next
    if (!isBlackKey(prevWhite)) {
      const prevIdx = whiteKeys.indexOf(prevWhite);
      if (prevIdx >= 0) {
        return (prevIdx + 1) * whiteKeyWidth - blackKeyWidth / 2;
      }
    }
    // If prevWhite is also black, find the white key before that
    const prevPrevWhite = midi - 2;
    if (!isBlackKey(prevPrevWhite)) {
      const prevIdx = whiteKeys.indexOf(prevPrevWhite);
      if (prevIdx >= 0) {
        return (prevIdx + 1) * whiteKeyWidth - blackKeyWidth / 2;
      }
    }
    return 0;
  };

  const getKeyColor = (midi: number, isBlack: boolean) => {
    const highlight = highlightedNotes.get(midi);
    const isActive = activeNotes.has(midi);

    if (highlight === 'correct') return isBlack ? '#16a34a' : '#bbf7d0';
    if (highlight === 'wrong') return isBlack ? '#dc2626' : '#fecaca';
    if (isActive) return isBlack ? 'hsl(var(--primary))' : 'hsl(38 85% 85%)';
    return isBlack ? '#1a1a1a' : '#fafafa';
  };

  const handleClick = useCallback((midi: number) => {
    onNoteClick?.(midi);
  }, [onNoteClick]);

  return (
    <div className="overflow-x-auto pb-2" data-testid="piano-keyboard">
      <svg 
        viewBox={`0 0 ${totalWidth} ${whiteKeyHeight + 10}`}
        className="w-full max-w-[700px] mx-auto select-none"
        style={{ minWidth: '400px' }}
      >
        {/* White keys */}
        {whiteKeys.map((midi) => {
          const x = whiteKeyX(midi);
          const { note } = midiToNoteName(midi);
          const isActive = activeNotes.has(midi);
          const fill = getKeyColor(midi, false);

          return (
            <g key={`white-${midi}`} data-testid={`key-${midi}`}>
              <rect
                x={x + 1}
                y={0}
                width={whiteKeyWidth - 2}
                height={whiteKeyHeight}
                rx={4}
                fill={fill}
                stroke="hsl(var(--border))"
                strokeWidth={1}
                className="cursor-pointer transition-colors duration-100"
                onClick={() => handleClick(midi)}
              />
              {showLabels && (
                <text
                  x={x + whiteKeyWidth / 2}
                  y={whiteKeyHeight - 10}
                  fontSize="10"
                  fill={isActive ? 'hsl(var(--primary))' : '#999'}
                  textAnchor="middle"
                  fontFamily="var(--font-sans)"
                  fontWeight="500"
                  className="pointer-events-none"
                >
                  {SOLFEGE_NAMES[note]}
                </text>
              )}
            </g>
          );
        })}

        {/* Black keys (drawn on top) */}
        {blackKeys.map((midi) => {
          const x = blackKeyX(midi);
          const fill = getKeyColor(midi, true);

          return (
            <g key={`black-${midi}`} data-testid={`key-${midi}`}>
              <rect
                x={x}
                y={0}
                width={blackKeyWidth}
                height={blackKeyHeight}
                rx={3}
                fill={fill}
                className="cursor-pointer transition-colors duration-100"
                onClick={() => handleClick(midi)}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
