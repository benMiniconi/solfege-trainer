import { useState, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScoreUploader } from '@/components/ScoreUploader';
import { TrackSelector } from '@/components/TrackSelector';
import { ScrollingStaff } from '@/components/ScrollingStaff';
import { TransportControls } from '@/components/TransportControls';
import { SectionSelector } from '@/components/SectionSelector';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { MidiStatus } from '@/components/MidiStatus';
import { useMidi } from '@/hooks/use-midi';
import { useSynth } from '@/hooks/use-synth';
import { useMidiScore } from '@/hooks/use-midi-score';
import { usePracticeEngine } from '@/hooks/use-practice-engine';
import type { ClefType } from '@/lib/music';
import {
  Music,
  ArrowLeft,
  Trophy,
  RotateCcw,
  Target,
  AlertTriangle,
  Zap,
} from 'lucide-react';

type PageState = 'upload' | 'select-track' | 'practice' | 'results';

export default function ScorePractice() {
  const [, setLocation] = useLocation();
  const [pageState, setPageState] = useState<PageState>('upload');

  const {
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
    reset: resetScore,
    recentScores,
  } = useMidiScore();

  const engine = usePracticeEngine(events);

  const { playNote } = useSynth();

  // Determine clef from track range
  const detectedClef: ClefType = useMemo(() => {
    if (!selectedTrack || selectedTrack.notes.length === 0) return 'treble';
    const avgMidi = selectedTrack.notes.reduce((s, n) => s + n.midi, 0) / selectedTrack.notes.length;
    return avgMidi >= 60 ? 'treble' : 'bass';
  }, [selectedTrack]);

  // Piano range based on clef
  const pianoRange = detectedClef === 'treble'
    ? { start: 48, end: 84 }
    : { start: 36, end: 72 };

  // Handle note input (from MIDI or piano click)
  const handleNoteInput = useCallback((midi: number) => {
    playNote(midi, 0.3);
    engine.handleNoteInput(midi);
  }, [playNote, engine]);

  // MIDI integration
  const midi = useMidi(
    (note) => handleNoteInput(note),
    () => {}
  );

  // Piano highlights
  const highlightedNotes = useMemo(() => {
    const map = new Map<number, 'correct' | 'wrong' | 'neutral'>();

    // Show expected notes as neutral/highlighted
    engine.expectedNotes.forEach(n => {
      if (engine.matchedNotes.has(n)) {
        map.set(n, 'correct');
      } else {
        map.set(n, 'neutral');
      }
    });

    // Show wrong notes
    engine.wrongNotes.forEach(n => {
      if (!engine.expectedNotes.includes(n)) {
        map.set(n, 'wrong');
      }
    });

    return map;
  }, [engine.expectedNotes, engine.matchedNotes, engine.wrongNotes]);

  const currentMeasure = engine.currentEvent?.measure || 1;

  // Handle file loaded -> go to track select
  const handleFileLoaded = useCallback((file: File) => {
    loadFile(file).then(() => {
      setPageState('select-track');
    });
  }, [loadFile]);

  const handleRecentLoaded = useCallback((recent: any) => {
    loadFromRecent(recent);
    setPageState('select-track');
  }, [loadFromRecent]);

  // Go to practice mode
  const startPractice = useCallback(() => {
    setPageState('practice');
  }, []);

  // Back to upload
  const backToUpload = useCallback(() => {
    engine.stop();
    resetScore();
    setPageState('upload');
  }, [engine, resetScore]);

  // Show results when complete
  const showResults = engine.isComplete;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/')}
              className="mr-1 -ml-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Music className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">Pratique de partition</h1>
              <p className="text-xs text-muted-foreground">
                {score ? score.name : 'Importez un fichier MIDI'}
              </p>
            </div>
          </div>
          <MidiStatus midi={midi} />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-6 max-w-4xl mx-auto w-full">
        {/* Upload state */}
        {pageState === 'upload' && (
          <div className="max-w-md mx-auto pt-4">
            <ScoreUploader
              onFileSelect={handleFileLoaded}
              onRecentSelect={handleRecentLoaded}
              recentScores={recentScores}
              isLoading={isLoading}
              error={error}
            />
          </div>
        )}

        {/* Track selection */}
        {pageState === 'select-track' && score && (
          <div className="max-w-md mx-auto pt-4">
            <TrackSelector
              score={score}
              selectedTrackIndex={selectedTrackIndex}
              onSelectTrack={selectTrack}
              onConfirm={startPractice}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={backToUpload}
              className="mt-4 w-full text-xs text-muted-foreground"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Choisir un autre fichier
            </Button>
          </div>
        )}

        {/* Practice mode */}
        {pageState === 'practice' && !showResults && (
          <div className="flex flex-col gap-4">
            {/* Score info + controls row */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {score && (
                  <Badge variant="outline" className="text-xs">
                    {score.bpm} BPM
                  </Badge>
                )}
                {selectedTrack && (
                  <Badge variant="outline" className="text-xs">
                    {selectedTrack.name}
                  </Badge>
                )}
              </div>

              <TransportControls
                isPlaying={engine.isPlaying}
                isPaused={engine.isPaused}
                speedMode={engine.speedMode}
                onPlay={engine.start}
                onPause={engine.pause}
                onStop={engine.stop}
                onRestart={engine.restart}
                onSpeedChange={engine.setSpeedMode}
              />
            </div>

            {/* Section selector */}
            <SectionSelector
              measureCount={measureCount}
              currentMeasure={currentMeasure}
              loopStart={engine.loopStart}
              loopEnd={engine.loopEnd}
              loopEnabled={engine.loopEnabled}
              onSetStart={engine.setLoopStart}
              onSetEnd={engine.setLoopEnd}
              onToggleLoop={engine.toggleLoop}
              onClear={engine.clearLoop}
            />

            {/* Stats bar */}
            {engine.isPlaying && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex-1">
                  <Progress
                    value={events.length > 0 ? (engine.currentEventIndex / events.length) * 100 : 0}
                    className="h-1.5"
                  />
                </div>
                <div className="flex items-center gap-3 whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    {engine.stats.correct}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    {engine.stats.wrong}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {engine.accuracy}%
                  </span>
                </div>
              </div>
            )}

            {/* Scrolling staff */}
            <ScrollingStaff
              events={events}
              currentEventIndex={engine.currentEventIndex}
              matchedNotes={engine.matchedNotes}
              wrongNotes={engine.wrongNotes}
              clef={detectedClef}
              showLabels={true}
              loopStart={engine.loopStart}
              loopEnd={engine.loopEnd}
              isPlaying={engine.isPlaying}
            />

            {/* Piano keyboard */}
            <div className="mt-1">
              <PianoKeyboard
                startMidi={pianoRange.start}
                endMidi={pianoRange.end}
                activeNotes={midi.activeNotes}
                highlightedNotes={highlightedNotes}
                onNoteClick={handleNoteInput}
                showLabels={true}
              />
            </div>

            {/* Hint when not playing */}
            {!engine.isPlaying && !engine.isPaused && (
              <p className="text-xs text-muted-foreground text-center">
                Appuyez sur Jouer pour commencer. En mode Attente, jouez chaque note pour avancer.
              </p>
            )}

            {/* Back button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={backToUpload}
              className="text-xs text-muted-foreground self-center mt-2"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Changer de fichier
            </Button>
          </div>
        )}

        {/* Results */}
        {pageState === 'practice' && showResults && (
          <div className="flex flex-col items-center gap-6 pt-6 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-primary" />
            </div>

            <h2 className="text-lg font-semibold">Pratique terminée !</h2>

            <div className="grid grid-cols-2 gap-3 w-full">
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {engine.accuracy}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">Précision</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {engine.stats.correct}/{engine.stats.total}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Notes correctes</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-red-400">
                  {engine.stats.wrong}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Erreurs</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {events.length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Notes totales</div>
              </Card>
            </div>

            {/* Trouble spots */}
            {engine.stats.troubleSpots.length > 0 && (
              <Card className="p-4 w-full">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">Passages difficiles</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {engine.stats.troubleSpots.sort((a, b) => a - b).map(m => (
                    <Badge key={m} variant="outline" className="text-xs">
                      Mesure {m}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Utilisez la boucle A-B pour travailler ces passages.
                </p>
              </Card>
            )}

            <div className="flex gap-3 mt-2">
              <Button onClick={engine.restart} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Recommencer
              </Button>
              <Button variant="outline" onClick={backToUpload}>
                Nouveau fichier
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
