import { useRef, useCallback } from 'react';

// Simple Web Audio synth for playing notes without Tone.js dependency issues
export function useSynth() {
  const ctxRef = useRef<AudioContext | null>(null);
  const activeOscillators = useRef<Map<number, { osc: OscillatorNode; gain: GainNode }>>(new Map());

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const midiToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

  const playNote = useCallback((midi: number, duration: number = 0.5) => {
    const ctx = getCtx();
    const freq = midiToFreq(midi);
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    
    activeOscillators.current.set(midi, { osc, gain });
    
    setTimeout(() => {
      activeOscillators.current.delete(midi);
    }, duration * 1000);
  }, [getCtx]);

  const playChord = useCallback((midis: number[], duration: number = 0.8) => {
    midis.forEach(midi => playNote(midi, duration));
  }, [playNote]);

  return { playNote, playChord };
}
