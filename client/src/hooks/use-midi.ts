import { useState, useEffect, useCallback, useRef } from 'react';

export interface MidiState {
  isSupported: boolean;
  isConnected: boolean;
  deviceName: string | null;
  activeNotes: Set<number>;
  lastNoteOn: number | null;
  error: string | null;
}

export function useMidi(onNoteOn?: (note: number, velocity: number) => void, onNoteOff?: (note: number) => void) {
  const [state, setState] = useState<MidiState>({
    isSupported: typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator,
    isConnected: false,
    deviceName: null,
    activeNotes: new Set(),
    lastNoteOn: null,
    error: null,
  });

  const onNoteOnRef = useRef(onNoteOn);
  const onNoteOffRef = useRef(onNoteOff);
  onNoteOnRef.current = onNoteOn;
  onNoteOffRef.current = onNoteOff;

  const activeNotesRef = useRef(new Set<number>());

  const handleMidiMessage = useCallback((event: WebMidi.MIDIMessageEvent) => {
    const [status, note, velocity] = event.data as unknown as number[];
    const command = status & 0xf0;

    if (command === 0x90 && velocity > 0) {
      // Note On
      activeNotesRef.current.add(note);
      setState(prev => ({
        ...prev,
        activeNotes: new Set(activeNotesRef.current),
        lastNoteOn: note,
      }));
      onNoteOnRef.current?.(note, velocity);
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      // Note Off
      activeNotesRef.current.delete(note);
      setState(prev => ({
        ...prev,
        activeNotes: new Set(activeNotesRef.current),
      }));
      onNoteOffRef.current?.(note);
    }
  }, []);

  useEffect(() => {
    if (!state.isSupported) return;

    let midiAccess: WebMidi.MIDIAccess | null = null;

    const setupMidi = async () => {
      try {
        midiAccess = await navigator.requestMIDIAccess({ sysex: false });
        
        const connectInputs = () => {
          const inputs = Array.from(midiAccess!.inputs.values());
          
          if (inputs.length > 0) {
            const input = inputs[0];
            input.onmidimessage = handleMidiMessage;
            setState(prev => ({
              ...prev,
              isConnected: true,
              deviceName: input.name || 'Clavier MIDI',
              error: null,
            }));
          } else {
            setState(prev => ({
              ...prev,
              isConnected: false,
              deviceName: null,
            }));
          }
        };

        connectInputs();

        midiAccess.onstatechange = () => {
          connectInputs();
        };
      } catch (err) {
        setState(prev => ({
          ...prev,
          error: 'Impossible d\'accéder au MIDI. Vérifiez les permissions du navigateur.',
          isConnected: false,
        }));
      }
    };

    setupMidi();

    return () => {
      if (midiAccess) {
        for (const input of midiAccess.inputs.values()) {
          input.onmidimessage = null;
        }
      }
    };
  }, [state.isSupported, handleMidiMessage]);

  return state;
}
