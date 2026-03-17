import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { MusicStaff } from '@/components/MusicStaff';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { MidiStatus } from '@/components/MidiStatus';
import { useMidi } from '@/hooks/use-midi';
import { useSynth } from '@/hooks/use-synth';
import {
  randomNote,
  randomChord,
  checkAnswer,
  toSolfege,
  type ClefType,
} from '@/lib/music';
import {
  Play,
  RotateCcw,
  Timer,
  Trophy,
  Zap,
  Volume2,
  Settings2,
  ChevronDown,
  ChevronUp,
  Music,
  FileMusic,
  BookOpen,
} from 'lucide-react';
import { PerplexityAttribution } from '@/components/PerplexityAttribution';

type GameMode = 'single' | 'chord2' | 'chord3';
type GameState = 'idle' | 'playing' | 'feedback' | 'finished';

interface NoteData {
  note: string;
  octave: number;
  accidental: string;
  midi: number;
  highlight?: 'correct' | 'wrong' | 'neutral';
}

interface SessionStats {
  correct: number;
  wrong: number;
  total: number;
  streak: number;
  bestStreak: number;
  avgTime: number;
  times: number[];
}

const INITIAL_STATS: SessionStats = {
  correct: 0,
  wrong: 0,
  total: 0,
  streak: 0,
  bestStreak: 0,
  avgTime: 0,
  times: [],
};

export default function Home() {
  const [, setLocation] = useLocation();

  // Game settings
  const [mode, setMode] = useState<GameMode>('single');
  const [clef, setClef] = useState<ClefType>('treble');
  const [useAccidentals, setUseAccidentals] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [roundCount, setRoundCount] = useState(20);

  // Game state
  const [gameState, setGameState] = useState<GameState>('idle');
  const [currentNotes, setCurrentNotes] = useState<NoteData[]>([]);
  const [playedNotes, setPlayedNotes] = useState<number[]>([]);
  const [stats, setStats] = useState<SessionStats>(INITIAL_STATS);
  const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  // Timer
  const [roundStartTime, setRoundStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Refs for stable closures
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval>>();
  const currentNotesRef = useRef<NoteData[]>([]);
  const gameStateRef = useRef<GameState>('idle');
  const statsRef = useRef<SessionStats>(INITIAL_STATS);
  const roundStartRef = useRef(0);
  const playedNotesRef = useRef<number[]>([]);

  // Keep refs in sync
  useEffect(() => { currentNotesRef.current = currentNotes; }, [currentNotes]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { playedNotesRef.current = playedNotes; }, [playedNotes]);

  // MIDI range based on clef
  const midiRange = clef === 'treble'
    ? { min: 60, max: 84 }  // C4 to C6
    : { min: 36, max: 60 }; // C2 to C4

  // Piano display range
  const pianoRange = clef === 'treble'
    ? { start: 48, end: 84 }  // C3 to C6
    : { start: 36, end: 67 }; // C2 to G4

  // Synth
  const { playNote, playChord } = useSynth();

  // Generate next question
  const generateQuestion = useCallback((): NoteData[] => {
    if (mode === 'single') {
      return [randomNote(midiRange.min, midiRange.max, useAccidentals)];
    }
    const count = mode === 'chord2' ? 2 : 3;
    return randomChord(count as 2 | 3, midiRange.min, midiRange.max, useAccidentals);
  }, [mode, midiRange.min, midiRange.max, useAccidentals]);

  // Advance to the next round
  const advanceToNext = useCallback(() => {
    const current = statsRef.current;
    if (current.total >= roundCount) {
      setGameState('finished');
      return;
    }
    const notes = generateQuestion();
    setCurrentNotes(notes);
    setPlayedNotes([]);
    setFeedbackType(null);
    setShowAnswer(false);
    const now = Date.now();
    setRoundStartTime(now);
    roundStartRef.current = now;
    setElapsed(0);
    setGameState('playing');
  }, [generateQuestion, roundCount]);

  // Start game
  const startGame = useCallback(() => {
    const initial = { ...INITIAL_STATS, times: [] as number[] };
    setStats(initial);
    statsRef.current = initial;
    const notes = generateQuestion();
    setCurrentNotes(notes);
    setPlayedNotes([]);
    setFeedbackType(null);
    setShowAnswer(false);
    const now = Date.now();
    setRoundStartTime(now);
    roundStartRef.current = now;
    setElapsed(0);
    setGameState('playing');
  }, [generateQuestion]);

  // Process answer
  const processAnswer = useCallback((played: number[]) => {
    if (gameStateRef.current !== 'playing') return;

    const expectedCount = mode === 'single' ? 1 : mode === 'chord2' ? 2 : 3;
    if (played.length < expectedCount) return;

    const timeTaken = (Date.now() - roundStartRef.current) / 1000;
    const notes = currentNotesRef.current;
    const isCorrect = checkAnswer(notes, played);

    setGameState('feedback');

    if (isCorrect) {
      setFeedbackType('correct');
      setCurrentNotes(notes.map(n => ({ ...n, highlight: 'correct' as const })));
      setStats(prev => {
        const newStreak = prev.streak + 1;
        const newTimes = [...prev.times, timeTaken];
        const updated = {
          correct: prev.correct + 1,
          wrong: prev.wrong,
          total: prev.total + 1,
          streak: newStreak,
          bestStreak: Math.max(prev.bestStreak, newStreak),
          avgTime: newTimes.reduce((a, b) => a + b, 0) / newTimes.length,
          times: newTimes,
        };
        statsRef.current = updated;
        return updated;
      });
    } else {
      setFeedbackType('wrong');
      setShowAnswer(true);
      setCurrentNotes(notes.map(n => ({ ...n, highlight: 'wrong' as const })));
      setStats(prev => {
        const updated = {
          ...prev,
          wrong: prev.wrong + 1,
          total: prev.total + 1,
          streak: 0,
        };
        statsRef.current = updated;
        return updated;
      });
    }

    // Auto-advance
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      advanceToNext();
    }, isCorrect ? 800 : 2000);
  }, [mode, advanceToNext]);

  // Handle note input (from MIDI or keyboard click)
  const handleNoteInput = useCallback((midi: number) => {
    if (gameStateRef.current !== 'playing') return;

    if (soundEnabled) {
      playNote(midi, 0.4);
    }

    setPlayedNotes(prev => {
      if (prev.includes(midi)) return prev;
      const newPlayed = [...prev, midi];
      // Process after state update
      setTimeout(() => processAnswer(newPlayed), 30);
      return newPlayed;
    });
  }, [soundEnabled, playNote, processAnswer]);

  // MIDI integration
  const midi = useMidi(
    (note) => handleNoteInput(note),
    () => {}
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current === 'idle' && e.key === 'Enter') {
        startGame();
      }
      if (gameStateRef.current === 'playing' && e.key === ' ') {
        e.preventDefault();
        if (soundEnabled && currentNotesRef.current.length > 0) {
          playChord(currentNotesRef.current.map(n => n.midi), 0.6);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startGame, soundEnabled, playChord]);

  // Elapsed timer
  useEffect(() => {
    if (gameState === 'playing') {
      elapsedTimerRef.current = setInterval(() => {
        setElapsed((Date.now() - roundStartRef.current) / 1000);
      }, 100);
    } else {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    }
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [gameState]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, []);

  // Listen to the current notes
  const hearNotes = () => {
    if (currentNotes.length > 0 && soundEnabled) {
      playChord(currentNotes.map(n => n.midi), 0.6);
    }
  };

  // Highlighted notes on piano
  const highlightedNotes = new Map<number, 'correct' | 'wrong' | 'neutral'>();
  if (gameState === 'feedback') {
    currentNotes.forEach(n => {
      highlightedNotes.set(n.midi, feedbackType === 'correct' ? 'correct' : 'neutral');
    });
    if (feedbackType === 'wrong') {
      playedNotes.forEach(midi => {
        if (!currentNotes.some(n => n.midi === midi)) {
          highlightedNotes.set(midi, 'wrong');
        }
      });
    }
  }

  const accuracyPercent = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Music className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">Solfège Trainer</h1>
              <p className="text-xs text-muted-foreground">Lecture de notes & accords</p>
            </div>
          </div>
          <MidiStatus midi={midi} />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full">
        {/* Idle state */}
        {gameState === 'idle' && (
          <div className="flex flex-col items-center gap-6 pt-4">
            {/* Mode navigation */}
            <div className="w-full grid grid-cols-2 gap-3 mb-2">
              <Card className="p-4 border-primary bg-primary/5">
                <div className="flex items-center gap-2 mb-1.5">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Lecture de notes</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Quiz interactif — notes et accords aléatoires
                </p>
              </Card>
              <Card
                className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setLocation('/practice')}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <FileMusic className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Pratique de partition</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Importez un MIDI et jouez avec le mode attente
                </p>
              </Card>
            </div>

            <div className="w-full space-y-5">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Mode
                </label>
                <Tabs value={mode} onValueChange={(v) => setMode(v as GameMode)}>
                  <TabsList className="w-full" data-testid="mode-selector">
                    <TabsTrigger value="single" className="flex-1" data-testid="mode-single">
                      Note seule
                    </TabsTrigger>
                    <TabsTrigger value="chord2" className="flex-1" data-testid="mode-chord2">
                      Accord 2 notes
                    </TabsTrigger>
                    <TabsTrigger value="chord3" className="flex-1" data-testid="mode-chord3">
                      Accord 3 notes
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Clé
                </label>
                <Tabs value={clef} onValueChange={(v) => setClef(v as ClefType)}>
                  <TabsList className="w-full" data-testid="clef-selector">
                    <TabsTrigger value="treble" className="flex-1" data-testid="clef-treble">
                      🎼 Clé de Sol
                    </TabsTrigger>
                    <TabsTrigger value="bass" className="flex-1" data-testid="clef-bass">
                      🎵 Clé de Fa
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Settings toggle */}
              <button
                onClick={() => setShowSettings(s => !s)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="toggle-settings"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Options
                {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showSettings && (
                <Card className="p-4 space-y-4" data-testid="settings-panel">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="accidentals" className="text-sm">Altérations (♯ ♭)</Label>
                    <Switch
                      id="accidentals"
                      checked={useAccidentals}
                      onCheckedChange={setUseAccidentals}
                      data-testid="toggle-accidentals"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sound" className="text-sm">Son</Label>
                    <Switch
                      id="sound"
                      checked={soundEnabled}
                      onCheckedChange={setSoundEnabled}
                      data-testid="toggle-sound"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Nombre de questions</Label>
                    <div className="flex items-center gap-2">
                      {[10, 20, 50].map(n => (
                        <Button
                          key={n}
                          variant={roundCount === n ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setRoundCount(n)}
                          data-testid={`round-count-${n}`}
                        >
                          {n}
                        </Button>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Start button */}
            <Button
              size="lg"
              onClick={startGame}
              className="w-full max-w-xs gap-2 mt-2"
              data-testid="start-button"
            >
              <Play className="w-4 h-4" />
              Commencer
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              {midi.isConnected
                ? 'Jouez les notes sur votre clavier MIDI ou cliquez sur le piano'
                : 'Cliquez sur les touches du piano ou connectez un clavier MIDI'}
            </p>
          </div>
        )}

        {/* Playing / Feedback state */}
        {(gameState === 'playing' || gameState === 'feedback') && (
          <div className="flex flex-col items-center gap-3">
            {/* Progress bar and stats */}
            <div className="w-full flex items-center gap-3">
              <div className="flex-1">
                <Progress
                  value={(stats.total / roundCount) * 100}
                  className="h-1.5"
                  data-testid="progress-bar"
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                {stats.total}/{roundCount}
              </span>
            </div>

            {/* Quick stats row */}
            <div className="flex items-center gap-5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5" data-testid="stat-correct">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>{stats.correct}</span>
              </div>
              <div className="flex items-center gap-1.5" data-testid="stat-wrong">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>{stats.wrong}</span>
              </div>
              <div className="flex items-center gap-1.5" data-testid="stat-streak">
                <Zap className="w-3 h-3 text-primary" />
                <span>{stats.streak}</span>
              </div>
              <div className="flex items-center gap-1.5" data-testid="stat-timer">
                <Timer className="w-3 h-3" />
                <span className="font-mono">{elapsed.toFixed(1)}s</span>
              </div>
            </div>

            {/* Staff display */}
            <Card className="w-full p-6 flex justify-center" data-testid="staff-display">
              <MusicStaff
                notes={currentNotes}
                clef={clef}
                showLabels={showAnswer}
                animate={true}
              />
            </Card>

            {/* Feedback message */}
            {gameState === 'feedback' && (
              <div
                className={`text-center py-2 px-5 rounded-full text-sm font-medium transition-all ${
                  feedbackType === 'correct'
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-red-500/10 text-red-400'
                }`}
                data-testid="feedback-message"
              >
                {feedbackType === 'correct' ? (
                  'Correct ✓'
                ) : (
                  <span>
                    {currentNotes.map(n => toSolfege(n.note, n.accidental) + n.octave).join(' — ')}
                  </span>
                )}
              </div>
            )}

            {/* Action buttons */}
            {gameState === 'playing' && (
              <div className="flex items-center gap-3">
                {soundEnabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={hearNotes}
                    className="text-xs gap-1.5 text-muted-foreground"
                    data-testid="hear-button"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Écouter
                  </Button>
                )}
              </div>
            )}

            {/* Piano keyboard */}
            <div className="w-full mt-1" data-testid="piano-container">
              <PianoKeyboard
                startMidi={pianoRange.start}
                endMidi={pianoRange.end}
                activeNotes={new Set(playedNotes)}
                highlightedNotes={highlightedNotes}
                onNoteClick={handleNoteInput}
                showLabels={true}
              />
            </div>
          </div>
        )}

        {/* Finished state */}
        {gameState === 'finished' && (
          <div className="flex flex-col items-center gap-6 pt-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-primary" />
            </div>

            <h2 className="text-lg font-semibold">Session terminée</h2>

            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-primary" data-testid="result-score">
                  {accuracyPercent}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">Score</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold" data-testid="result-correct">
                  {stats.correct}/{stats.total}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Bonnes réponses</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-primary" data-testid="result-streak">
                  {stats.bestStreak}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Meilleure série</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold" data-testid="result-avg-time">
                  {stats.avgTime > 0 ? stats.avgTime.toFixed(1) + 's' : '—'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Temps moyen</div>
              </Card>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Badge variant="outline" className="text-xs">
                {mode === 'single' ? 'Notes seules' : mode === 'chord2' ? 'Accords 2 notes' : 'Accords 3 notes'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {clef === 'treble' ? 'Clé de Sol' : 'Clé de Fa'}
              </Badge>
              {useAccidentals && (
                <Badge variant="outline" className="text-xs">Altérations</Badge>
              )}
            </div>

            <div className="flex gap-3 mt-2">
              <Button onClick={startGame} className="gap-2" data-testid="restart-button">
                <RotateCcw className="w-4 h-4" />
                Recommencer
              </Button>
              <Button
                variant="outline"
                onClick={() => setGameState('idle')}
                data-testid="back-to-menu"
              >
                Menu
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-3 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <PerplexityAttribution />
          {(gameState === 'playing' || gameState === 'feedback') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
                setGameState('idle');
              }}
              className="text-xs text-muted-foreground"
              data-testid="quit-button"
            >
              Quitter
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
