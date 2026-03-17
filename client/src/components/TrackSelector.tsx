import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { MidiScore } from '@/lib/midi-parser';
import { Music, Piano, Clock } from 'lucide-react';

interface TrackSelectorProps {
  score: MidiScore;
  selectedTrackIndex: number;
  onSelectTrack: (index: number) => void;
  onConfirm: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TrackSelector({ score, selectedTrackIndex, onSelectTrack, onConfirm }: TrackSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold">{score.name}</h2>
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(score.duration)}
          </span>
          <span>{score.bpm} BPM</span>
          <span>{score.timeSignature[0]}/{score.timeSignature[1]}</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
          Sélectionnez une piste
        </label>
        <div className="space-y-1.5">
          {score.tracks.map((track, i) => (
            <Card
              key={i}
              className={`p-3 cursor-pointer transition-all ${
                selectedTrackIndex === i
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/30'
              }`}
              onClick={() => onSelectTrack(i)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selectedTrackIndex === i ? 'bg-primary/20' : 'bg-muted'
                }`}>
                  <Piano className={`w-4 h-4 ${selectedTrackIndex === i ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{track.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {track.instrument} &middot; {track.notes.length} notes
                  </p>
                </div>
                {selectedTrackIndex === i && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Button onClick={onConfirm} className="w-full gap-2">
        <Music className="w-4 h-4" />
        Commencer la pratique
      </Button>
    </div>
  );
}
