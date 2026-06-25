"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { APP_SECTIONS } from "@/config/navigation";

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

const navLinkClassName =
  "rounded-full px-3 py-1.5 text-xs font-medium text-forest-700 transition hover:bg-forest-100 hover:text-forest-900";
const mobileNavLinkClassName =
  "shrink-0 rounded-full border border-forest-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-forest-700 transition hover:bg-forest-100 hover:text-forest-900";

export function TopNav() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthNavUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
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
      setIsLoadingSession(false);
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
