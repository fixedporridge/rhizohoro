import { ParseStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
const {
  providerGenerateMock,
  providerResolveMock,
  knowledgeChunkCreateMock,
  quizCreateMock,
  quizQuestionCreateMock,
  quizUpdateMock,
  studyMaterialUpdateMock,
  transactionMock,
} = vi.hoisted(() => ({
  providerGenerateMock: vi.fn(),
  providerResolveMock: vi.fn(),
  knowledgeChunkCreateMock: vi.fn(),
  quizCreateMock: vi.fn(),
  quizQuestionCreateMock: vi.fn(),
  quizUpdateMock: vi.fn(),
  studyMaterialUpdateMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/ai/providers", () => ({
  aiProviderRegistry: {
    resolve: providerResolveMock,
  },
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    $transaction: transactionMock,
  },
}));

import { generateInitialQuizForMaterial } from "@/lib/services/quiz-generation-service";

describe("generateInitialQuizForMaterial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RHIZOHORO_AI_PROVIDER;

    providerResolveMock.mockReturnValue({
      generate: providerGenerateMock,
    });

    knowledgeChunkCreateMock.mockImplementation(async () => ({
      id: `chunk-${knowledgeChunkCreateMock.mock.calls.length}`,
    }));
    quizCreateMock.mockResolvedValue({
      id: "quiz-1",
      title: "Respiration Quick Check",
      createdAt: new Date("2026-05-23T10:00:00.000Z"),
    });
    quizQuestionCreateMock.mockResolvedValue({ id: "question-id" });
    quizUpdateMock.mockResolvedValue({ id: "quiz-1" });
    studyMaterialUpdateMock.mockResolvedValue({ id: "material-1" });

    transactionMock.mockImplementation(async (callback) =>
      callback({
        knowledgeChunk: { create: knowledgeChunkCreateMock },
        quiz: { create: quizCreateMock, update: quizUpdateMock },
        quizQuestion: { create: quizQuestionCreateMock },
        studyMaterial: { update: studyMaterialUpdateMock },
      }),
    );
  });

  it("persists parsed AI quiz output and returns structured question payload", async () => {
    process.env.RHIZOHORO_AI_PROVIDER = "openai";
    providerGenerateMock.mockResolvedValue({
      provider: "openai",
      model: "gpt-test",
      output: JSON.stringify({
        quizTitle: "Respiration Drill",
        questions: [
          {
            prompt: "Where does glycolysis happen?",
            options: [
              "In the nucleus",
              "Inside chloroplasts",
              "In the cytoplasm",
              "In ribosomes",
            ],
            answer: "In the cytoplasm",
            explanation: "Glycolysis begins in the cytoplasm.",
            difficulty: 1.3,
            sourceChunkIndex: 0,
          },
          {
            prompt: "What is oxygen's role in aerobic respiration?",
            options: [
              "Carries ATP",
              "It is the final electron acceptor",
              "Blocks the ETC",
              "Creates glucose",
            ],
            answer: "It is the final electron acceptor",
            explanation: "Oxygen accepts electrons at the end of ETC.",
            difficulty: 1.7,
            sourceChunkIndex: 1,
          },
        ],
      }),
      latencyMs: 38,
    });

    const result = await generateInitialQuizForMaterial({
      ownerId: "user-1",
      materialId: "material-1",
      materialTitle: "Cell respiration notes",
      sourceText:
        "Cellular respiration produces ATP from glucose. Glycolysis occurs in the cytoplasm. The Krebs cycle and ETC occur in the mitochondria. Oxygen is the final electron acceptor.",
      requestedQuestionCount: 2,
    });

    expect(providerResolveMock).toHaveBeenCalledWith("openai");
    expect(result.usedFallback).toBe(false);
    expect(result.title).toBe("Respiration Quick Check");
    expect(result.questionCount).toBe(2);
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]).toMatchObject({
      prompt: "Where does glycolysis happen?",
      answer: "In the cytoplasm",
    });

    expect(quizQuestionCreateMock).toHaveBeenCalledTimes(2);
    expect(quizUpdateMock).toHaveBeenCalledWith({
      where: { id: "quiz-1" },
      data: { questionCount: 2 },
    });
    expect(studyMaterialUpdateMock).toHaveBeenCalledWith({
      where: { id: "material-1" },
      data: {
        parseStatus: ParseStatus.READY,
        parseError: null,
      },
    });
  });

  it("falls back to deterministic questions when AI output is invalid JSON", async () => {
    providerGenerateMock.mockResolvedValue({
      provider: "mock",
      model: "rhizohoro-phase1",
      output: "not-json",
      latencyMs: 0,
    });

    const result = await generateInitialQuizForMaterial({
      ownerId: "user-2",
      materialId: "material-2",
      materialTitle: "Photosynthesis summary",
      sourceText:
        "Photosynthesis converts light energy into chemical energy. Chloroplasts contain chlorophyll. Light-dependent reactions produce ATP and NADPH.",
      requestedQuestionCount: 4,
    });

    expect(providerResolveMock).toHaveBeenCalledWith("mock");
    expect(result.usedFallback).toBe(true);
    expect(result.questionCount).toBeGreaterThan(0);
    expect(result.questions.every((question) => question.options.includes(question.answer))).toBe(true);
    expect(quizQuestionCreateMock).toHaveBeenCalledTimes(result.questionCount);
  });
});
