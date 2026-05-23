"use client";

import { FormEvent, useMemo, useState } from "react";

import {
  GeneratedQuizPanel,
  type GeneratedQuizData,
} from "@/components/generated-quiz-panel";

type UploadFormState = {
  workspaceId: string;
  title: string;
  rawText: string;
  sourceType: "text" | "note" | "pdf" | "docx" | "slides" | "link";
};

type MaterialCreateResponseBody = {
  ok?: boolean;
  error?: string;
  data?: {
    material?: {
      title?: string;
    };
    initialQuiz?: GeneratedQuizData | null;
  };
};

type UploadResultState = {
  materialTitle: string;
  quiz: GeneratedQuizData | null;
};

const INITIAL_FORM_STATE: UploadFormState = {
  workspaceId: "",
  title: "",
  rawText: "",
  sourceType: "text",
};

export function MaterialUploadQuizWorkbench() {
  const [form, setForm] = useState<UploadFormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResultState | null>(null);

  const canSubmit = useMemo(
    () =>
      Boolean(
        form.workspaceId.trim() &&
          form.title.trim() &&
          form.rawText.trim().length >= 20,
      ),
    [form.rawText, form.title, form.workspaceId],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/materials", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          workspaceId: form.workspaceId.trim(),
          title: form.title.trim(),
          sourceType: form.sourceType,
          rawText: form.rawText.trim(),
        }),
      });

      const body = (await response
        .json()
        .catch(() => null)) as MaterialCreateResponseBody | null;
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error || `Upload failed with status ${response.status}.`);
      }

      const materialTitle = body.data?.material?.title || form.title.trim();
      const quiz = body.data?.initialQuiz ?? null;
      setResult({ materialTitle, quiz });

      if (!quiz) {
        setError("Material uploaded, but no initial quiz was returned.");
      }
    } catch (submissionError) {
      setResult(null);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unexpected upload error.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
      <article className="rounded-3xl border border-forest-200 bg-white/85 p-6 shadow-[0_18px_50px_-34px_rgba(27,69,38,0.55)]">
        <h2 className="text-xl font-semibold text-forest-900">
          Upload material and generate an initial quiz
        </h2>
        <p className="mt-2 text-sm leading-6 text-forest-700/90">
          Paste uploaded material text, submit it, and preview the generated
          quiz questions immediately.
        </p>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-forest-700/80">
              Workspace ID
            </span>
            <input
              value={form.workspaceId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  workspaceId: event.target.value,
                }))
              }
              placeholder="cuid workspace id"
              className="mt-1 w-full rounded-xl border border-forest-200 bg-white px-3 py-2 text-sm text-forest-900 outline-none transition focus:border-forest-300 focus:ring-2 focus:ring-forest-200/60"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-forest-700/80">
              Material title
            </span>
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Cell respiration notes"
              className="mt-1 w-full rounded-xl border border-forest-200 bg-white px-3 py-2 text-sm text-forest-900 outline-none transition focus:border-forest-300 focus:ring-2 focus:ring-forest-200/60"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-forest-700/80">
              Source type
            </span>
            <select
              value={form.sourceType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  sourceType: event.target.value as UploadFormState["sourceType"],
                }))
              }
              className="mt-1 w-full rounded-xl border border-forest-200 bg-white px-3 py-2 text-sm text-forest-900 outline-none transition focus:border-forest-300 focus:ring-2 focus:ring-forest-200/60"
            >
              <option value="text">Text</option>
              <option value="note">Note</option>
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
              <option value="slides">Slides</option>
              <option value="link">Link</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-forest-700/80">
              Uploaded material text
            </span>
            <textarea
              value={form.rawText}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  rawText: event.target.value,
                }))
              }
              placeholder="Paste extracted or uploaded material text here..."
              className="mt-1 min-h-36 w-full rounded-xl border border-forest-200 bg-white px-3 py-2 text-sm text-forest-900 outline-none transition focus:border-forest-300 focus:ring-2 focus:ring-forest-200/60"
              required
              minLength={20}
            />
          </label>
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="inline-flex items-center rounded-full bg-forest-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-forest-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Generating quiz..." : "Generate initial quiz"}
          </button>
        </form>
        {error ? (
          <p className="mt-4 rounded-xl border border-ember-400/40 bg-ember-400/10 px-3 py-2 text-sm text-forest-900">
            {error}
          </p>
        ) : null}
      </article>
      <GeneratedQuizPanel
        materialTitle={result?.materialTitle ?? "No uploaded material yet"}
        quiz={result?.quiz ?? null}
      />
    </section>
  );
}
