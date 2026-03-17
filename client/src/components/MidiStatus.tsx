import { Music, Usb, WifiOff } from 'lucide-react';
import type { MidiState } from '@/hooks/use-midi';

interface MidiStatusProps {
  midi: MidiState;
}

export function MidiStatus({ midi }: MidiStatusProps) {
  if (!midi.isSupported) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="midi-status">
        <WifiOff className="w-3.5 h-3.5" />
        <span>MIDI non supporté</span>
      </div>
    );
  }

  if (midi.isConnected) {
    return (
      <div className="flex items-center gap-2 text-xs" data-testid="midi-status">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <Music className="w-3.5 h-3.5 text-primary" />
        <span className="text-primary font-medium">{midi.deviceName}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="midi-status">
      <Usb className="w-3.5 h-3.5" />
      <span>Connectez un clavier MIDI</span>
    </div>
  );
}
