import { useCallback, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Upload, FileMusic, Clock, Info } from 'lucide-react';

interface RecentScore {
  name: string;
  trackCount: number;
  date: string;
  data: string;
}

interface ScoreUploaderProps {
  onFileSelect: (file: File) => void;
  onRecentSelect: (recent: RecentScore) => void;
  recentScores: RecentScore[];
  isLoading: boolean;
  error: string | null;
}

export function ScoreUploader({ onFileSelect, onRecentSelect, recentScores, isLoading, error }: ScoreUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (file.name.match(/\.(mid|midi)$/i)) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <Card
        className={`p-8 border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center gap-3 ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border/50 hover:border-primary/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mid,.midi"
          className="hidden"
          onChange={handleInputChange}
        />
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">
            {isLoading ? 'Chargement...' : 'Glissez un fichier MIDI ici'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ou cliquez pour sélectionner un fichier .mid
          </p>
        </div>
      </Card>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {/* PDF tip */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <p>
          Vous avez une partition PDF ? Utilisez{' '}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="underline decoration-dotted cursor-help">Audiveris</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[200px] text-xs">
                Audiveris est un logiciel gratuit et open-source de reconnaissance optique de partitions (OMR).
                Il convertit vos PDF de partitions en fichiers MIDI.
              </p>
            </TooltipContent>
          </Tooltip>
          {' '}(gratuit, open-source) ou{' '}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="underline decoration-dotted cursor-help">ScoreFlow</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[200px] text-xs">
                ScoreFlow est un outil en ligne pour convertir des partitions PDF en MIDI.
              </p>
            </TooltipContent>
          </Tooltip>
          {' '}pour convertir vos PDF en MIDI.
        </p>
      </div>

      {/* Recent scores */}
      {recentScores.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Fichiers récents
          </h3>
          <div className="space-y-1">
            {recentScores.map((recent, i) => (
              <Button
                key={i}
                variant="ghost"
                className="w-full justify-start gap-2 h-auto py-2 px-3"
                onClick={() => onRecentSelect(recent)}
              >
                <FileMusic className="w-3.5 h-3.5 text-primary shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-sm truncate">{recent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {recent.trackCount} piste{recent.trackCount > 1 ? 's' : ''} &middot;{' '}
                    {new Date(recent.date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
