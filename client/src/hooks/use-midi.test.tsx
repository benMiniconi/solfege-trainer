import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useMidi } from "./use-midi";

type MidiMessageHandler = ((event: MIDIMessageEvent) => void) | null;

class FakeMIDIInput {
  name: string;
  onmidimessage: MidiMessageHandler = null;

  constructor(name: string) {
    this.name = name;
  }

  emit(data: number[]) {
    const event = { data: new Uint8Array(data) } as unknown as MIDIMessageEvent;
    this.onmidimessage?.(event);
  }
}

class FakeMIDIAccess {
  inputs: Map<string, FakeMIDIInput>;
  onstatechange: ((e: MIDIConnectionEvent) => void) | null = null;

  constructor(inputs: FakeMIDIInput[]) {
    this.inputs = new Map(inputs.map((i, idx) => [String(idx), i]));
  }
}

function stubMidiAccess(access: FakeMIDIAccess) {
  const requestMIDIAccess = vi.fn(async () => access as unknown as MIDIAccess);
  Object.defineProperty(globalThis.navigator, "requestMIDIAccess", {
    configurable: true,
    value: requestMIDIAccess,
  });
  return requestMIDIAccess;
}

function deleteMidiAccessStub() {
  delete (globalThis.navigator as any).requestMIDIAccess;
}

describe("useMidi", () => {
  beforeEach(() => {
    deleteMidiAccessStub();
  });

  afterEach(() => {
    deleteMidiAccessStub();
    vi.restoreAllMocks();
  });

  it("exposes unsupported state when WebMIDI is missing", () => {
    const { result } = renderHook(() => useMidi());
    expect(result.current.isSupported).toBe(false);
    expect(result.current.isConnected).toBe(false);
  });

  it("connects to the first MIDI input and sets device name", async () => {
    const input = new FakeMIDIInput("My Keyboard");
    const access = new FakeMIDIAccess([input]);
    const requestMIDIAccess = stubMidiAccess(access);

    const { result } = renderHook(() => useMidi());

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(result.current.deviceName).toBe("My Keyboard");
    expect(requestMIDIAccess).toHaveBeenCalledWith({ sysex: false });
  });

  it("tracks active notes and calls callbacks on note on/off", async () => {
    const input = new FakeMIDIInput("Keyboard");
    const access = new FakeMIDIAccess([input]);
    stubMidiAccess(access);

    const onNoteOn = vi.fn();
    const onNoteOff = vi.fn();

    const { result } = renderHook(() => useMidi(onNoteOn, onNoteOff));
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    act(() => input.emit([0x90, 60, 100])); // Note On C4
    expect(onNoteOn).toHaveBeenCalledWith(60, 100);
    expect(result.current.lastNoteOn).toBe(60);
    expect(Array.from(result.current.activeNotes)).toEqual([60]);

    act(() => input.emit([0x80, 60, 0])); // Note Off C4
    expect(onNoteOff).toHaveBeenCalledWith(60);
    expect(Array.from(result.current.activeNotes)).toEqual([]);
  });

  it("treats NoteOn velocity 0 as NoteOff", async () => {
    const input = new FakeMIDIInput("Keyboard");
    const access = new FakeMIDIAccess([input]);
    stubMidiAccess(access);

    const { result } = renderHook(() => useMidi());
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    act(() => input.emit([0x90, 61, 100])); // Note On
    expect(Array.from(result.current.activeNotes)).toEqual([61]);

    act(() => input.emit([0x90, 61, 0])); // Note Off via velocity 0
    expect(Array.from(result.current.activeNotes)).toEqual([]);
  });

  it("sets a user-friendly error when requestMIDIAccess rejects", async () => {
    const requestMIDIAccess = vi.fn(async () => {
      throw new Error("nope");
    });
    Object.defineProperty(globalThis.navigator, "requestMIDIAccess", {
      configurable: true,
      value: requestMIDIAccess,
    });

    const { result } = renderHook(() => useMidi());
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.isConnected).toBe(false);
  });
});

