"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { APP_SECTIONS } from "@/config/navigation";
import { forestThemeTokens } from "@/lib/design/tokens";

type AuthNavUser = {
  id: string;
  email: string;
  displayName: string;
  role: "LEARNER" | "ADMIN";
};

type MeResponseBody = {
  ok?: boolean;
  data?: {
    user?: AuthNavUser;
  };
};

type ProgressSnapshot = {
  user: {
    totalExp: number;
    level: number;
    streakCount: number;
  };
  forestProgress: {
    currentBiome: string;
    growthStage: number;
    healthScore: number;
    unlockedBiomes: string[];
  };
};

type ProgressResponseBody = {
  ok?: boolean;
  data?: ProgressSnapshot;
};
type ProgressUpdateResponseBody = {
  ok?: boolean;
  data?: {
    user?: ProgressSnapshot["user"];
    forestProgress?: ProgressSnapshot["forestProgress"];
  };
};

const biomeNameByKey = new Map<string, string>(
  forestThemeTokens.biomeLadder.map((biome) => [biome.key, biome.name]),
);

function formatBiomeLabel(biomeKey: string): string {
  return (
    biomeNameByKey.get(biomeKey) ??
    biomeKey
      .split("_")
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(" ")
  );
}

const navLinkClassName =
  "rounded-full px-3 py-1.5 text-xs font-medium text-forest-700 transition hover:bg-forest-100 hover:text-forest-900";
const mobileNavLinkClassName =
  "shrink-0 rounded-full border border-forest-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-forest-700 transition hover:bg-forest-100 hover:text-forest-900";

export function TopNav() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthNavUser | null>(null);
  const [progressSnapshot, setProgressSnapshot] = useState<ProgressSnapshot | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isApplyingProgress, setIsApplyingProgress] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthUser() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) {
            setAuthUser(null);
            setProgressSnapshot(null);
          }
          return;
        }

        const body = (await response
          .json()
          .catch(() => null)) as MeResponseBody | null;
        if (!cancelled) {
          setAuthUser(body?.ok && body.data?.user ? body.data.user : null);
        }
      } catch {
        if (!cancelled) {
          setAuthUser(null);
          setProgressSnapshot(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSession(false);
        }
      }
    }

    void loadAuthUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchProgressSnapshot = useCallback(async (): Promise<ProgressSnapshot | null> => {
    if (!authUser) {
      return null;
    }

    try {
      const response = await fetch("/api/progress", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const body = (await response
        .json()
        .catch(() => null)) as ProgressResponseBody | null;
      return body?.ok && body.data ? body.data : null;
    } catch {
      return null;
    }
  }, [authUser]);

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      const snapshot = await fetchProgressSnapshot();
      if (!cancelled) {
        setProgressSnapshot(snapshot);
      }
    }

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, [fetchProgressSnapshot]);

  const handleCompleteSession = useCallback(async () => {
    if (!authUser || isApplyingProgress) {
      return;
    }

    setIsApplyingProgress(true);
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reason: "SESSION_COMPLETE",
          expDelta: 180,
          consistencyDelta: 2,
          masteryDelta: 0.1,
          streakDelta: 1,
          sessionsCompletedDelta: 1,
          minutesStudiedDelta: 15,
        }),
      });

      if (response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as ProgressUpdateResponseBody | null;
        if (body?.ok && body.data?.user && body.data.forestProgress) {
          setProgressSnapshot({
            user: body.data.user,
            forestProgress: body.data.forestProgress,
          });
          return;
        }
      }

      setProgressSnapshot(await fetchProgressSnapshot());
    } catch {
      setProgressSnapshot(await fetchProgressSnapshot());
    } finally {
      setIsApplyingProgress(false);
    }
  }, [authUser, fetchProgressSnapshot, isApplyingProgress]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setAuthUser(null);
      setProgressSnapshot(null);
      setIsLoadingSession(false);
      setIsApplyingProgress(false);
      setIsLoggingOut(false);
      router.refresh();
    }
  }, [isLoggingOut, router]);

  return (
    <header className="sticky top-0 z-30 border-b border-forest-100/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-700 text-sm font-bold text-white">
            R
          </div>
          <div>
            <p className="text-sm font-semibold text-forest-900">Rhizohoro</p>
            <p className="text-xs text-forest-700/75">
              Ecosystem-driven learning platform
            </p>
          </div>
        </div>

        <nav className="hidden items-center gap-2 lg:flex">
          {APP_SECTIONS.map((item) =>
            item.href.startsWith("#") ? (
              <a key={item.key} href={item.href} className={navLinkClassName}>
                {item.label}
              </a>
            ) : (
              <Link key={item.key} href={item.href} className={navLinkClassName}>
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          {isLoadingSession ? (
            <span className="rounded-full border border-forest-200 px-3 py-1.5 text-xs font-medium text-forest-700/80">
              Checking session...
            </span>
          ) : authUser ? (
            <>
              <span className="rounded-full border border-forest-300 bg-forest-50 px-3 py-1.5 text-xs font-medium text-forest-700">
                {authUser.displayName}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="rounded-full border border-forest-300 px-3 py-1.5 text-xs font-medium text-forest-700 transition hover:bg-forest-100 hover:text-forest-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth"
                className="rounded-full border border-forest-300 px-3 py-1.5 text-xs font-medium text-forest-700 transition hover:bg-forest-100 hover:text-forest-900"
              >
                Login
              </Link>
              <Link
                href="/auth?mode=register"
                className="rounded-full bg-forest-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-forest-900"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
      {authUser && progressSnapshot ? (
        <div className="mx-auto w-full max-w-6xl px-6 pb-3 md:px-10">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={handleCompleteSession}
              disabled={isApplyingProgress}
              className="shrink-0 rounded-full border border-forest-300 bg-white px-3 py-1.5 text-xs font-semibold text-forest-800 transition hover:bg-forest-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isApplyingProgress ? "Growing..." : "Log session +180 EXP"}
            </button>
            <span className="shrink-0 rounded-full border border-forest-300 bg-forest-50 px-3 py-1.5 text-xs font-semibold text-forest-800">
              EXP {progressSnapshot.user.totalExp}
            </span>
            <span className="shrink-0 rounded-full border border-forest-300 bg-forest-50 px-3 py-1.5 text-xs font-semibold text-forest-800">
              Trees {progressSnapshot.forestProgress.growthStage}
            </span>
            <span className="shrink-0 rounded-full border border-forest-300 bg-forest-50 px-3 py-1.5 text-xs font-semibold text-forest-800">
              Biome {formatBiomeLabel(progressSnapshot.forestProgress.currentBiome)}
            </span>
            <span className="shrink-0 rounded-full border border-forest-300 bg-forest-50 px-3 py-1.5 text-xs font-semibold text-forest-800">
              Forest {Math.round(progressSnapshot.forestProgress.healthScore)}%
            </span>
          </div>
        </div>
      ) : null}

      <nav className="mx-auto w-full max-w-6xl px-6 pb-3 md:px-10 lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {APP_SECTIONS.map((item) =>
            item.href.startsWith("#") ? (
              <a key={item.key} href={item.href} className={mobileNavLinkClassName}>
                {item.label}
              </a>
            ) : (
              <Link
                key={item.key}
                href={item.href}
                className={mobileNavLinkClassName}
              >
                {item.label}
              </Link>
            ),
          )}
        </div>
      </nav>
    </header>
  );
}
