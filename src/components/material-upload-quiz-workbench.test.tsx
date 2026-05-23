import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MaterialUploadQuizWorkbench } from "@/components/material-upload-quiz-workbench";

describe("MaterialUploadQuizWorkbench", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits material text and renders returned generated quiz questions", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            material: {
              title: "Cell respiration notes",
            },
            initialQuiz: {
              title: "Cell respiration notes - Initial Quiz",
              questionCount: 1,
              provider: "mock",
              generatedAt: "2026-05-23T10:00:00.000Z",
              usedFallback: false,
              questions: [
                {
                  prompt: "Where does glycolysis occur?",
                  options: [
                    "In the nucleus",
                    "In the cytoplasm",
                    "In chloroplasts",
                    "In lysosomes",
                  ],
                  answer: "In the cytoplasm",
                  explanation: "Glycolysis begins in the cytoplasm.",
                  difficulty: 1.2,
                },
              ],
            },
          },
        }),
        {
          status: 201,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    render(<MaterialUploadQuizWorkbench />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Workspace ID"), "workspace-123");
    await user.type(screen.getByLabelText("Material title"), "Cell respiration notes");
    await user.type(
      screen.getByLabelText("Uploaded material text"),
      "Cellular respiration produces ATP from glucose and glycolysis starts in the cytoplasm.",
    );
    await user.click(
      screen.getByRole("button", { name: "Generate initial quiz" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    expect(requestUrl).toBe("/api/materials");
    expect(requestInit?.method).toBe("POST");
    expect(requestInit?.credentials).toBe("include");
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      workspaceId: "workspace-123",
      title: "Cell respiration notes",
      sourceType: "text",
    });

    expect(
      await screen.findByRole("heading", {
        name: "Cell respiration notes - Initial Quiz",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Q1. Where does glycolysis occur?")).toBeInTheDocument();
    expect(screen.getByText("In the cytoplasm")).toBeInTheDocument();
  });

  it("surfaces a warning when upload succeeds without an initial quiz", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            material: {
              title: "No quiz material",
            },
            initialQuiz: null,
          },
        }),
        {
          status: 201,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    render(<MaterialUploadQuizWorkbench />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Workspace ID"), "workspace-999");
    await user.type(screen.getByLabelText("Material title"), "No quiz material");
    await user.type(
      screen.getByLabelText("Uploaded material text"),
      "This is enough material text content to satisfy the minimum length requirement.",
    );
    await user.click(
      screen.getByRole("button", { name: "Generate initial quiz" }),
    );

    expect(
      await screen.findByText("Material uploaded, but no initial quiz was returned."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No quiz has been generated yet for this material."),
    ).toBeInTheDocument();
  });
});
