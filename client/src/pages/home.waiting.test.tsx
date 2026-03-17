import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Home from "./home";

vi.mock("@/hooks/use-synth", () => ({
  useSynth: () => ({ playNote: vi.fn(), playChord: vi.fn() }),
}));

vi.mock("@/hooks/use-midi", () => ({
  useMidi: () => ({
    isSupported: true,
    isConnected: false,
    deviceName: null,
    activeNotes: new Set<number>(),
    lastNoteOn: null,
    error: null,
  }),
}));

vi.mock("@/lib/music", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/music")>();
  return {
    ...mod,
    randomNote: vi.fn(),
    randomChord: vi.fn(),
    checkAnswer: vi.fn(),
  };
});

function clickKey(midi: number) {
  const g = screen.getByTestId(`key-${midi}`);
  const rect = g.querySelector("rect");
  expect(rect).toBeTruthy();
  fireEvent.click(rect as SVGRectElement);
}

describe("Home (module attente / timers)", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    // Ensure game always has a valid question by default
    // (Home calls randomNote/randomChord during startGame/advanceToNext).
    const music = await import("@/lib/music");
    vi.mocked(music.randomNote).mockReturnValue({
      note: "C",
      octave: 4,
      accidental: "",
      midi: 60,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("updates the elapsed timer while playing", async () => {
    render(<Home />);
    fireEvent.click(screen.getByTestId("start-button"));

    // Let the interval tick
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId("stat-timer")).toHaveTextContent("0.5s");
  });

  it("auto-advances after correct answer (800ms)", async () => {
    const music = await import("@/lib/music");
    const randomNote = vi.mocked(music.randomNote);
    const checkAnswer = vi.mocked(music.checkAnswer);

    randomNote.mockReset();
    randomNote
      .mockReturnValueOnce({ note: "C", octave: 4, accidental: "", midi: 60 })
      .mockReturnValueOnce({ note: "D", octave: 4, accidental: "", midi: 62 });

    checkAnswer.mockImplementation((expected, played) => {
      const expectedMidis = expected.map((n) => n.midi);
      return expectedMidis.every((m) => played.includes(m));
    });

    render(<Home />);
    fireEvent.click(screen.getByTestId("start-button"));

    // Correct input
    clickKey(60);
    act(() => {
      vi.advanceTimersByTime(40); // 30ms debounce + a bit
    });

    expect(screen.getByTestId("feedback-message")).toHaveTextContent("Correct");
    expect(screen.getByTestId("stat-correct")).toHaveTextContent("1");

    // Wait for auto-advance
    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(screen.queryByTestId("feedback-message")).not.toBeInTheDocument();
    // Next round should be generated
    expect(randomNote).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("progress-bar")).toBeInTheDocument();
    expect(screen.getByTestId("stat-correct")).toHaveTextContent("1");
  });

  it("auto-advances after wrong answer (2000ms) and shows expected answer", async () => {
    const music = await import("@/lib/music");
    const randomNote = vi.mocked(music.randomNote);
    const checkAnswer = vi.mocked(music.checkAnswer);

    randomNote.mockReset();
    randomNote
      .mockReturnValueOnce({ note: "C", octave: 4, accidental: "", midi: 60 })
      .mockReturnValueOnce({ note: "E", octave: 4, accidental: "", midi: 64 });

    checkAnswer.mockImplementation(() => false);

    render(<Home />);
    fireEvent.click(screen.getByTestId("start-button"));

    // Wrong input
    clickKey(61);
    act(() => {
      vi.advanceTimersByTime(40);
    });

    // Expected solfège answer appears in feedback
    expect(screen.getByTestId("feedback-message")).toHaveTextContent(/Do4/i);
    expect(screen.getByTestId("stat-wrong")).toHaveTextContent("1");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByTestId("feedback-message")).not.toBeInTheDocument();
    expect(randomNote).toHaveBeenCalledTimes(2);
  });
});

