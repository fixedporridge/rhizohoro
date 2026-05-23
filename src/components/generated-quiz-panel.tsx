"use client";
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
                <ul className="mt-3 space-y-2 text-sm text-forest-700/90">
                  {question.options.map((option, optionIndex) => {
                    const isAnswer = option === question.answer;
                    return (
                      <li
                        key={`${option}-${optionIndex}`}
                        className={`rounded-lg border px-3 py-2 ${
                          isAnswer
                            ? "border-moss-500/50 bg-moss-500/10 text-forest-900"
                            : "border-forest-100 bg-forest-50/40"
                        }`}
                      >
                        <span className="font-medium">
                          {String.fromCharCode(65 + optionIndex)}.
                        </span>{" "}
                        {option}
                      </li>
                    );
                  })}
                </ul>
                {question.explanation ? (
                  <p className="mt-3 rounded-lg border border-water-300/40 bg-water-300/10 px-3 py-2 text-xs leading-5 text-forest-800">
                    {question.explanation}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}
