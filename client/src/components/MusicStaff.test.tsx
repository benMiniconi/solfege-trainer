import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MusicStaff } from "./MusicStaff";

describe("MusicStaff (partition)", () => {
  it("renders an accessible staff SVG", () => {
    render(
      <MusicStaff
        clef="treble"
        notes={[{ note: "C", octave: 4, accidental: "", midi: 60 }]}
      />
    );

    expect(screen.getByRole("img", { name: "Portée musicale" })).toBeInTheDocument();
  });

  it("renders 5 staff lines for treble clef", () => {
    const { container } = render(
      <MusicStaff
        clef="treble"
        notes={[{ note: "C", octave: 4, accidental: "", midi: 60 }]}
      />
    );

    const svg = container.querySelector('svg[aria-label="Portée musicale"]');
    expect(svg).toBeTruthy();

    const staffLines = Array.from(svg!.querySelectorAll("line")).filter(
      (l) => l.getAttribute("x1") === "20" && l.getAttribute("x2") === "260"
    );
    expect(staffLines).toHaveLength(5);
  });

  it("shows labels and accidentals when requested", () => {
    const { container } = render(
      <MusicStaff
        clef="treble"
        showLabels
        notes={[{ note: "C", octave: 4, accidental: "#", midi: 61 }]}
        animate={false}
      />
    );

    // Accidental symbol
    expect(container.textContent).toContain("♯");
    // Solfège label + octave (e.g. Do4)
    expect(container.textContent).toMatch(/DO.*4/);
  });
});

