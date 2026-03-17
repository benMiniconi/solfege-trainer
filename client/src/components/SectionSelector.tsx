import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Repeat, X } from 'lucide-react';

interface SectionSelectorProps {
  measureCount: number;
  currentMeasure: number;
  loopStart: number | null;
  loopEnd: number | null;
  loopEnabled: boolean;
  onSetStart: (measure: number | null) => void;
  onSetEnd: (measure: number | null) => void;
  onToggleLoop: () => void;
  onClear: () => void;
}

export function SectionSelector({
  measureCount,
  currentMeasure,
  loopStart,
  loopEnd,
  loopEnabled,
  onSetStart,
  onSetEnd,
  onToggleLoop,
  onClear,
}: SectionSelectorProps) {
  const hasLoop = loopStart !== null || loopEnd !== null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant={loopStart !== null ? 'default' : 'outline'}
        size="sm"
        className="text-xs h-7 px-2.5 gap-1"
        onClick={() => onSetStart(currentMeasure)}
      >
        A {loopStart !== null && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{loopStart}</Badge>}
      </Button>

      <Button
        variant={loopEnd !== null ? 'default' : 'outline'}
        size="sm"
        className="text-xs h-7 px-2.5 gap-1"
        onClick={() => onSetEnd(currentMeasure)}
      >
        B {loopEnd !== null && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{loopEnd}</Badge>}
      </Button>

      {hasLoop && (
        <>
          <Button
            variant={loopEnabled ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-7 px-2.5"
            onClick={onToggleLoop}
          >
            <Repeat className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-2.5"
            onClick={onClear}
          >
            <X className="w-3 h-3" />
          </Button>
        </>
      )}

      <span className="text-xs text-muted-foreground ml-1">
        Mesure {currentMeasure}/{measureCount}
      </span>
    </div>
  );
}
