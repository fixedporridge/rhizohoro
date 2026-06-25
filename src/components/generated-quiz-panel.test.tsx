import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  GeneratedQuizPanel,
  type GeneratedQuizData,
} from "@/components/generated-quiz-panel";

const quizFixture: GeneratedQuizData = {
  title: "Cell respiration notes - Initial Quiz",
  questionCount: 2,
  provider: "mock",
  generatedAt: "2026-05-23T10:00:00.000Z",
  usedFallback: false,
  questions: [
    {
      prompt: "Where does glycolysis begin?",
      options: [
        "In the nucleus",
        "In the cytoplasm",
        "In chloroplasts",
        "In ribosomes",
      ],
      answer: "In the cytoplasm",
      explanation: "The source text states glycolysis starts in the cytoplasm.",
      difficulty: 1.1,
    },
    {
      prompt: "What role does oxygen play in aerobic respiration?",
      options: [
        "Final electron acceptor",
        "Primary ATP store",
        "Amino acid carrier",
        "CO2 reducer",
      ],
      answer: "Final electron acceptor",
      explanation: null,
      difficulty: 1.5,
    },
  ],
};

describe("GeneratedQuizPanel", () => {
  it("shows empty-state message when no quiz exists", () => {
    render(<GeneratedQuizPanel materialTitle="No material" quiz={null} />);

    expect(screen.getByText("No material")).toBeInTheDocument();
    expect(
      screen.getByText("No quiz has been generated yet for this material."),
    ).toBeInTheDocument();
  });

  it("keeps answers hidden until check and supports interactive attempts", async () => {
    render(
      <GeneratedQuizPanel materialTitle="Cell respiration notes" quiz={quizFixture} />,
    );
    const user = userEvent.setup();

    expect(
      screen.getByRole("heading", { name: "Cell respiration notes - Initial Quiz" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/2 questions • Provider: mock •/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Provider: mock/i)).toBeInTheDocument();
    expect(screen.getByText("Q1. Where does glycolysis begin?")).toBeInTheDocument();
    expect(
      screen.queryByText("The source text states glycolysis starts in the cytoplasm."),
    ).not.toBeInTheDocument();

    const checkAnswersButton = screen.getByRole("button", {
      name: "Check answers",
    });
    expect(checkAnswersButton).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: /A\.\s*In the nucleus/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /A\.\s*Final electron acceptor/i }),
    );
    expect(checkAnswersButton).toBeEnabled();

    await user.click(checkAnswersButton);

    expect(
      screen.getByText("The source text states glycolysis starts in the cytoplasm."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Not quite. Correct answer: In the cytoplasm"),
    ).toBeInTheDocument();
    expect(screen.getByText("Score: 1/2")).toBeInTheDocument();
  });
});
