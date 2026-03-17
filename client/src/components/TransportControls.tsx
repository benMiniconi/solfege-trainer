import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SpeedMode } from '@/hooks/use-practice-engine';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';

interface TransportControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  speedMode: SpeedMode;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onRestart: () => void;
  onSpeedChange: (mode: SpeedMode) => void;
}

export function TransportControls({
  isPlaying,
  isPaused,
  speedMode,
  onPlay,
  onPause,
  onStop,
  onRestart,
  onSpeedChange,
}: TransportControlsProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Play/Pause/Stop */}
      <div className="flex items-center gap-1.5">
        {isPlaying ? (
          <Button variant="outline" size="sm" onClick={onPause} className="gap-1.5">
            <Pause className="w-3.5 h-3.5" />
            Pause
          </Button>
        ) : (
          <Button size="sm" onClick={onPlay} className="gap-1.5">
            <Play className="w-3.5 h-3.5" />
            {isPaused ? 'Reprendre' : 'Jouer'}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onStop}>
          <Square className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onRestart}>
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Speed selector */}
      <Tabs value={speedMode} onValueChange={(v) => onSpeedChange(v as SpeedMode)}>
        <TabsList className="h-8">
          <TabsTrigger value="wait" className="text-xs px-2.5 h-6">
            Attente
          </TabsTrigger>
          <TabsTrigger value="slow" className="text-xs px-2.5 h-6">
            50%
          </TabsTrigger>
          <TabsTrigger value="normal" className="text-xs px-2.5 h-6">
            100%
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
