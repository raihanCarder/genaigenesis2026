import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { RoadmapIntake } from "@/features/roadmap/components/roadmap-intake";

function parseNeedsInput(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function RoadmapIntakeHarness() {
  const [needsInput, setNeedsInput] = useState("");
  const needs = parseNeedsInput(needsInput);

  return (
    <RoadmapIntake
      needs={needs}
      needsInput={needsInput}
      loading={false}
      onNeedsInputChange={setNeedsInput}
      onAddNeed={(need) =>
        setNeedsInput((current) => (current.trimEnd() ? `${current.trimEnd()}\n${need}` : need))
      }
      onGenerate={() => undefined}
    />
  );
}

describe("RoadmapIntake", () => {
  it("preserves spaces and blank lines while typing", () => {
    render(<RoadmapIntakeHarness />);

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, {
      target: {
        value: "Find housing support \n\nNeed help replacing ID"
      }
    });

    expect(textarea).toHaveValue("Find housing support \n\nNeed help replacing ID");
  });
});
