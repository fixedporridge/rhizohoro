import { ParseStatus } from "@prisma/client";
import { z } from "zod";

import { aiProviderRegistry, type ProviderId } from "@/lib/ai/providers";
import { db } from "@/lib/db/client";

const generatedQuizSchema = z.object({
  quizTitle: z.string().min(3).max(180),
  questions: z
    .array(
      z.object({
        prompt: z.string().min(10).max(320),
        options: z.array(z.string().min(1).max(220)).min(2).max(6),
        answer: z.string().min(1).max(220),
        explanation: z.string().max(500).optional(),
        difficulty: z.number().min(0.5).max(3).optional(),
        sourceChunkIndex: z.number().int().min(0).optional(),
      }),
    )
    .min(1)
    .max(10),
});

type GeneratedQuizPayload = z.infer<typeof generatedQuizSchema>;
type GeneratedQuizQuestion = GeneratedQuizPayload["questions"][number];

interface PreparedChunk {
  topicSlug: string;
  content: string;
  complexity: number;
}

interface PreparedQuestion {
  prompt: string;
  options: string[];
  answer: string;
  explanation: string | null;
  difficulty: number;
  sourceChunkIndex: number;
}

export interface GenerateInitialQuizInput {
  ownerId: string;
  materialId: string;
  materialTitle: string;
  sourceText: string;
  requestedQuestionCount?: number;
}

export interface InitialGeneratedQuiz {
  questions: InitialGeneratedQuizQuestion[];
  id: string;
  title: string;
  questionCount: number;
  provider: ProviderId;
  model: string;
  usedFallback: boolean;
  generatedAt: string;
}

export interface InitialGeneratedQuizQuestion {
  prompt: string;
  options: string[];
  answer: string;
  explanation: string | null;
  difficulty: number;
}

const MIN_CHUNK_LENGTH = 20;
const MAX_CHUNKS = 6;
const DEFAULT_QUESTION_COUNT = 5;

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "study-material";
}

function normalizeText(value: string): string {
  return value.replace(/\r/g, "").replace(/\s+/g, " ").trim();
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function extractMaterialChunks(
  sourceText: string,
  materialTitle: string,
): PreparedChunk[] {
  const normalized = normalizeText(sourceText);
  const pieces = normalized
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((piece) => normalizeText(piece))
    .filter((piece) => piece.length >= MIN_CHUNK_LENGTH);

  const uniquePieces = Array.from(new Set(pieces));
  const selectedPieces =
    uniquePieces.length > 0
      ? uniquePieces.slice(0, MAX_CHUNKS)
      : [normalizeText(sourceText).slice(0, 320) || materialTitle];

  const topicBase = slugify(materialTitle);
  return selectedPieces.map((content, index) => {
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const complexity = wordCount >= 36 ? 3 : wordCount >= 18 ? 2 : 1;
    return {
      topicSlug: `${topicBase}-${index + 1}`,
      content,
      complexity,
    };
  });
}

function buildGenerationPrompt(materialTitle: string, questionCount: number): string {
  return [
    `You are generating an initial multiple-choice quiz for "${materialTitle}".`,
    `Return strict JSON only with this exact shape:`,
    `{"quizTitle":"...","questions":[{"prompt":"...","options":["..."],"answer":"...","explanation":"...","difficulty":1.0,"sourceChunkIndex":0}]}`,
    `Generate ${questionCount} concise questions.`,
    `Each question must have 4 options and the answer must exactly match one option.`,
    `sourceChunkIndex must reference a provided context chunk index.`,
  ].join("\n");
}

function extractJsonObject(rawOutput: string): string | null {
  const withoutFences = rawOutput
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const firstBrace = withoutFences.indexOf("{");
  const lastBrace = withoutFences.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return withoutFences.slice(firstBrace, lastBrace + 1);
}

function parseGeneratedQuiz(rawOutput: string): GeneratedQuizPayload | null {
  const jsonPayload = extractJsonObject(rawOutput);
  if (!jsonPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonPayload);
    const validated = generatedQuizSchema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}

function normalizeQuestionOptions(options: string[], answer: string): string[] {
  const normalizedOptions = Array.from(
    new Set(options.map((option) => normalizeText(option)).filter(Boolean)),
  );
  const normalizedAnswer = normalizeText(answer);

  if (normalizedAnswer && !normalizedOptions.includes(normalizedAnswer)) {
    normalizedOptions.unshift(normalizedAnswer);
  }

  return normalizedOptions.slice(0, 6);
}

function normalizeGeneratedQuestion(
  question: GeneratedQuizQuestion,
  fallbackChunkIndex: number,
): PreparedQuestion | null {
  const prompt = normalizeText(question.prompt);
  const answer = normalizeText(question.answer);
  const options = normalizeQuestionOptions(question.options, answer);

  if (!prompt || !answer || options.length < 2) {
    return null;
  }

  return {
    prompt,
    options,
    answer,
    explanation: question.explanation ? normalizeText(question.explanation) : null,
    difficulty: clamp(question.difficulty ?? 1, 0.5, 3),
    sourceChunkIndex: question.sourceChunkIndex ?? fallbackChunkIndex,
  };
}

function buildFallbackQuestions(
  chunks: PreparedChunk[],
  materialTitle: string,
  questionCount: number,
): PreparedQuestion[] {
  const generated: PreparedQuestion[] = [];
  const safeQuestionCount = clamp(questionCount, 1, Math.max(1, chunks.length));

  for (let index = 0; index < safeQuestionCount; index += 1) {
    const chunk = chunks[index % chunks.length];
    const answer = chunk.content;
    const rawOptions = [
      answer,
      `It says ${materialTitle} is unrelated to this topic.`,
      `It argues the exact opposite is always true.`,
      `It only discusses this concept in financial terms.`,
    ];
    const rotation = index % rawOptions.length;
    const rotatedOptions = rawOptions
      .slice(rotation)
      .concat(rawOptions.slice(0, rotation));

    generated.push({
      prompt: `Which statement is best supported by the study material about "${materialTitle}"?`,
      options: normalizeQuestionOptions(rotatedOptions, answer),
      answer,
      explanation: `The source states: "${answer.slice(0, 180)}".`,
      difficulty: clamp(1 + index * 0.15, 0.5, 3),
      sourceChunkIndex: index % chunks.length,
    });
  }

  return generated;
}

function resolveProviderId(): ProviderId {
  const configured = process.env.RHIZOHORO_AI_PROVIDER;
  if (
    configured === "openai" ||
    configured === "anthropic" ||
    configured === "azure-openai" ||
    configured === "mock"
  ) {
    return configured;
  }

  return "mock";
}

export async function generateInitialQuizForMaterial(
  input: GenerateInitialQuizInput,
): Promise<InitialGeneratedQuiz> {
  const chunks = extractMaterialChunks(input.sourceText, input.materialTitle);
  const questionTarget = clamp(
    input.requestedQuestionCount ?? DEFAULT_QUESTION_COUNT,
    1,
    8,
  );

  const providerId = resolveProviderId();
  const provider = aiProviderRegistry.resolve(providerId);
  const aiResult = await provider.generate({
    task: "quiz",
    prompt: buildGenerationPrompt(input.materialTitle, questionTarget),
    contextChunks: chunks.map((chunk) => chunk.content),
  });

  const parsed = parseGeneratedQuiz(aiResult.output);
  const aiQuestions =
    parsed?.questions
      .map((question, index) => normalizeGeneratedQuestion(question, index))
      .filter((question): question is PreparedQuestion => Boolean(question))
      .slice(0, questionTarget) ?? [];

  const selectedQuestions =
    aiQuestions.length > 0
      ? aiQuestions
      : buildFallbackQuestions(chunks, input.materialTitle, questionTarget);
  const quizTitle = parsed?.quizTitle?.trim() || `${input.materialTitle} - Initial Quiz`;

  const created = await db.$transaction(async (tx) => {
    const createdChunks = await Promise.all(
      chunks.map((chunk) =>
        tx.knowledgeChunk.create({
          data: {
            sourceMaterialId: input.materialId,
            topicSlug: chunk.topicSlug,
            content: chunk.content,
            complexity: chunk.complexity,
          },
          select: { id: true },
        }),
      ),
    );

    const quiz = await tx.quiz.create({
      data: {
        creatorId: input.ownerId,
        title: quizTitle,
        isAdaptive: true,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    for (let index = 0; index < selectedQuestions.length; index += 1) {
      const question = selectedQuestions[index];
      const sourceChunkId =
        createdChunks[question.sourceChunkIndex]?.id ??
        createdChunks[index % createdChunks.length]?.id;

      await tx.quizQuestion.create({
        data: {
          quizId: quiz.id,
          sourceChunkId: sourceChunkId ?? null,
          prompt: question.prompt,
          options: question.options,
          answer: question.answer,
          explanation: question.explanation,
          difficulty: question.difficulty,
        },
      });
    }

    await tx.quiz.update({
      where: { id: quiz.id },
      data: { questionCount: selectedQuestions.length },
    });

    await tx.studyMaterial.update({
      where: { id: input.materialId },
      data: {
        parseStatus: ParseStatus.READY,
        parseError: null,
      },
    });

    return quiz;
  });

  return {
    id: created.id,
    title: created.title,
    questionCount: selectedQuestions.length,
    questions: selectedQuestions.map((question) => ({
      prompt: question.prompt,
      options: question.options,
      answer: question.answer,
      explanation: question.explanation,
      difficulty: question.difficulty,
    })),
    provider: aiResult.provider,
    model: aiResult.model,
    usedFallback: aiQuestions.length === 0,
    generatedAt: created.createdAt.toISOString(),
  };
}
