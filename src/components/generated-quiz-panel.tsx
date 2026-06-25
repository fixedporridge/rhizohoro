"use client";
import { useMemo, useState } from "react";
export type GeneratedQuizQuestion = {
  prompt: string;
  options: string[];
  answer: string;
  explanation: string | null;
  difficulty: number;
};
export type GeneratedQuizData = {
  title: string;
  questionCount: number;
  questions: GeneratedQuizQuestion[];
  provider: string;
  generatedAt: string;
  usedFallback: boolean;
};

type GeneratedQuizPanelProps = {
  materialTitle: string;
  quiz: GeneratedQuizData | null;
};

type QuizAttemptState = {
  quizKey: string;
  selectedOptions: number[];
  hasCheckedAnswers: boolean;
};

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function GeneratedQuizPanel({
  materialTitle,
  quiz,
}: GeneratedQuizPanelProps) {
  const totalQuestions = quiz?.questions.length ?? 0;
  const activeQuizKey = quiz
    ? `${quiz.generatedAt}:${quiz.title}:${quiz.questionCount}`
    : "";
  const [attemptState, setAttemptState] = useState<QuizAttemptState>({
    quizKey: "",
    selectedOptions: [],
    hasCheckedAnswers: false,
  });

  const defaultSelectedOptions = useMemo(
    () => Array.from({ length: totalQuestions }, () => -1),
    [totalQuestions],
  );
  const hasActiveAttempt = attemptState.quizKey === activeQuizKey;
  const selectedOptions = hasActiveAttempt
    ? attemptState.selectedOptions
    : defaultSelectedOptions;
  const hasCheckedAnswers = hasActiveAttempt
    ? attemptState.hasCheckedAnswers
    : false;

  const answeredCount = useMemo(
    () => selectedOptions.filter((optionIndex) => optionIndex >= 0).length,
    [selectedOptions],
  );

  const score = useMemo(() => {
    if (!quiz || !hasCheckedAnswers) {
      return 0;
    }

    return quiz.questions.reduce((currentScore, question, questionIndex) => {
      const selectedOptionIndex = selectedOptions[questionIndex];
      if (selectedOptionIndex < 0) {
        return currentScore;
      }

      return question.options[selectedOptionIndex] === question.answer
        ? currentScore + 1
        : currentScore;
    }, 0);
  }, [hasCheckedAnswers, quiz, selectedOptions]);

  function handleOptionSelect(questionIndex: number, optionIndex: number) {
    setAttemptState((current) => {
      const next =
        current.quizKey === activeQuizKey &&
        current.selectedOptions.length === totalQuestions
          ? [...current.selectedOptions]
          : Array.from({ length: totalQuestions }, () => -1);
      next[questionIndex] = optionIndex;
      return {
        quizKey: activeQuizKey,
        selectedOptions: next,
        hasCheckedAnswers: false,
      };
    });
  }

  function checkAnswers() {
    setAttemptState((current) => {
      const currentSelectedOptions =
        current.quizKey === activeQuizKey &&
        current.selectedOptions.length === totalQuestions
          ? [...current.selectedOptions]
          : [...defaultSelectedOptions];
      return {
        quizKey: activeQuizKey,
        selectedOptions: currentSelectedOptions,
        hasCheckedAnswers: true,
      };
    });
  }

  function resetAttempt() {
    setAttemptState({
      quizKey: activeQuizKey,
      selectedOptions: [...defaultSelectedOptions],
      hasCheckedAnswers: false,
    });
  }
  return (
    <article className="rounded-3xl border border-forest-200 bg-white/85 p-6 shadow-[0_18px_50px_-34px_rgba(27,69,38,0.55)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-forest-700/80">
            Uploaded material
          </p>
          <h2 className="mt-1 text-xl font-semibold text-forest-900">
            {materialTitle}
          </h2>
        </div>
        <span className="rounded-full border border-forest-300 bg-forest-50 px-3 py-1 text-xs font-semibold text-forest-700">
          Initial Quiz
        </span>
      </div>
      {!quiz ? (
        <p className="mt-4 rounded-2xl border border-forest-100 bg-forest-50/60 px-4 py-3 text-sm text-forest-700">
          No quiz has been generated yet for this material.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          <header className="rounded-2xl border border-forest-100 bg-white/90 p-4">
            <h3 className="text-base font-semibold text-forest-900">
              {quiz.title}
            </h3>
            <p className="mt-2 text-xs text-forest-700/80">
              {quiz.questionCount} questions • Provider: {quiz.provider} •
              Generated {formatGeneratedAt(quiz.generatedAt)}
            </p>
            {quiz.usedFallback ? (
              <p className="mt-2 text-xs text-forest-700/75">
                Showing fallback question generation output.
              </p>
            ) : null}
          </header>
          <ol className="space-y-3">
            {quiz.questions.map((question, questionIndex) => (
              <li
                key={`${question.prompt}-${questionIndex}`}
                className="rounded-2xl border border-forest-100 bg-white/90 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-forest-900">
                    Q{questionIndex + 1}. {question.prompt}
                  </h4>
                  <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest-700">
                    Difficulty {question.difficulty.toFixed(1)}
                  </span>
                </div>

                <ul className="mt-3 space-y-2">
                  {question.options.map((option, optionIndex) => {
                    const selectedOptionIndex = selectedOptions[questionIndex] ?? -1;
                    const isSelectedOption = selectedOptionIndex === optionIndex;
                    const isCorrectOption = option === question.answer;

                    const optionClassName = hasCheckedAnswers
                      ? isCorrectOption
                        ? "border-moss-500/50 bg-moss-500/10 text-forest-900"
                        : isSelectedOption
                          ? "border-ember-400/50 bg-ember-400/10 text-forest-900"
                          : "border-forest-100 bg-forest-50/40 text-forest-700/90"
                      : isSelectedOption
                        ? "border-forest-400/60 bg-forest-100/70 text-forest-900"
                        : "border-forest-100 bg-forest-50/40 text-forest-700/90";

                    return (
                      <li key={`${option}-${optionIndex}`}>
                        <button
                          type="button"
                          onClick={() => handleOptionSelect(questionIndex, optionIndex)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${optionClassName}`}
                        >
                          <span className="font-medium">
                            {String.fromCharCode(65 + optionIndex)}.
                          </span>{" "}
                          {option}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {hasCheckedAnswers ? (
                  <p
                    className={`mt-3 rounded-lg border px-3 py-2 text-xs font-medium ${
                      selectedOptions[questionIndex] >= 0 &&
                      question.options[selectedOptions[questionIndex]] === question.answer
                        ? "border-moss-500/40 bg-moss-500/10 text-forest-900"
                        : "border-ember-400/45 bg-ember-400/10 text-forest-900"
                    }`}
                  >
                    {selectedOptions[questionIndex] >= 0 &&
                    question.options[selectedOptions[questionIndex]] === question.answer
                      ? "Correct."
                      : `Not quite. Correct answer: ${question.answer}`}
                  </p>
                ) : null}

                {hasCheckedAnswers && question.explanation ? (
                  <p className="mt-3 rounded-lg border border-water-300/40 bg-water-300/10 px-3 py-2 text-xs leading-5 text-forest-800">
                    {question.explanation}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>

          <footer className="rounded-2xl border border-forest-100 bg-white/90 p-4">
            <p className="text-xs text-forest-700/85">
              {answeredCount}/{quiz.questions.length} questions answered.
            </p>
            {hasCheckedAnswers ? (
              <p className="mt-1 text-sm font-semibold text-forest-900">
                Score: {score}/{quiz.questions.length}
              </p>
            ) : (
              <p className="mt-1 text-xs text-forest-700/80">
                Select one option for each question, then check your answers.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={checkAnswers}
                disabled={answeredCount !== quiz.questions.length}
                className="inline-flex items-center rounded-full bg-forest-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-forest-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {hasCheckedAnswers ? "Re-check answers" : "Check answers"}
              </button>
              {hasCheckedAnswers ? (
                <button
                  type="button"
                  onClick={resetAttempt}
                  className="inline-flex items-center rounded-full border border-forest-300 px-4 py-1.5 text-xs font-medium text-forest-700 transition hover:bg-forest-100"
                >
                  Reset attempt
                </button>
              ) : null}
            </div>
          </footer>
        </div>
      )}
    </article>
  );
}
