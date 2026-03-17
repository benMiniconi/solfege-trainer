import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MidiStatus } from "./MidiStatus";
import type { MidiState } from "@/hooks/use-midi";

function midi(overrides: Partial<MidiState>): MidiState {
  return {
    isSupported: true,
    isConnected: false,
    deviceName: null,
    activeNotes: new Set(),
    lastNoteOn: null,
    error: null,
    ...overrides,
  };
}

describe("MidiStatus", () => {
  it("renders unsupported state", () => {
    render(<MidiStatus midi={midi({ isSupported: false })} />);
    expect(screen.getByTestId("midi-status")).toHaveTextContent("MIDI non supporté");
  });

  it("renders connected state with device name", () => {
    render(<MidiStatus midi={midi({ isConnected: true, deviceName: "Akai MPK" })} />);
    expect(screen.getByTestId("midi-status")).toHaveTextContent("Akai MPK");
  });

  it("renders disconnected prompt", () => {
    render(<MidiStatus midi={midi({ isConnected: false })} />);
    expect(screen.getByTestId("midi-status")).toHaveTextContent("Connectez un clavier MIDI");
  });
});

