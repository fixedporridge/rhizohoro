import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TopNav } from "@/components/top-nav";

const routerRefreshMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefreshMock,
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("TopNav progression chips", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    routerRefreshMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders EXP, Trees, Biome, and Forest chips for authenticated users", async () => {
    fetchMock.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url === "/api/auth/me" && method === "GET") {
          return jsonResponse({
            ok: true,
            data: {
              user: {
                id: "user-1",
                email: "user@example.com",
                displayName: "Forest Learner",
                role: "LEARNER",
              },
            },
          });
        }

        if (url === "/api/progress" && method === "GET") {
          return jsonResponse({
            ok: true,
            data: {
              user: {
                totalExp: 180,
                level: 1,
                streakCount: 1,
              },
              forestProgress: {
                currentBiome: "seedling_meadow",
                growthStage: 2,
                healthScore: 88,
                unlockedBiomes: ["seedling_meadow"],
              },
            },
          });
        }

        throw new Error(`Unexpected fetch call: ${method} ${url}`);
      },
    );

    render(<TopNav />);

    expect(await screen.findByText("EXP 180")).toBeInTheDocument();
    expect(screen.getByText("Trees 2")).toBeInTheDocument();
    expect(screen.getByText("Biome Seedling Meadow")).toBeInTheDocument();
    expect(screen.getByText("Forest 88%")).toBeInTheDocument();
  });

  it("lets the user earn progression from UI and updates visible chips", async () => {
    fetchMock.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url === "/api/auth/me" && method === "GET") {
          return jsonResponse({
            ok: true,
            data: {
              user: {
                id: "user-1",
                email: "user@example.com",
                displayName: "Forest Learner",
                role: "LEARNER",
              },
            },
          });
        }

        if (url === "/api/progress" && method === "GET") {
          return jsonResponse({
            ok: true,
            data: {
              user: {
                totalExp: 0,
                level: 1,
                streakCount: 0,
              },
              forestProgress: {
                currentBiome: "seedling_meadow",
                growthStage: 1,
                healthScore: 100,
                unlockedBiomes: ["seedling_meadow"],
              },
            },
          });
        }

        if (url === "/api/progress" && method === "POST") {
          return jsonResponse({
            ok: true,
            data: {
              user: {
                totalExp: 180,
                level: 1,
                streakCount: 1,
              },
              forestProgress: {
                currentBiome: "seedling_meadow",
                growthStage: 1,
                healthScore: 100,
                unlockedBiomes: ["seedling_meadow"],
              },
            },
          });
        }

        throw new Error(`Unexpected fetch call: ${method} ${url}`);
      },
    );

    render(<TopNav />);
    const user = userEvent.setup();

    expect(await screen.findByText("EXP 0")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Log session +180 EXP" }));

    await waitFor(() => expect(screen.getByText("EXP 180")).toBeInTheDocument());
    expect(screen.getByText("Forest 100%")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/progress",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
