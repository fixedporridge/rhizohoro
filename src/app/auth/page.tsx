"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type AuthMode = "login" | "register";

type AuthResultUser = {
  id: string;
  email: string;
  displayName: string;
  role: "LEARNER" | "ADMIN";
};

type AuthResponseBody = {
  ok?: boolean;
  error?: string;
  data?: {
    user?: AuthResultUser;
  };
};

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthResultUser | null>(null);

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password.trim()) {
      return false;
    }

    if (mode === "register") {
      return displayName.trim().length >= 2;
    }

    return true;
  }, [displayName, email, mode, password]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? {
              email: email.trim(),
              password,
            }
          : {
              displayName: displayName.trim(),
              email: email.trim(),
              password,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const body = (await response
        .json()
        .catch(() => null)) as AuthResponseBody | null;

      if (!response.ok || !body?.ok || !body.data?.user) {
        throw new Error(body?.error || "Authentication failed.");
      }

      setAuthUser(body.data.user);
      router.prefetch("/");
    } catch (authError) {
      setAuthUser(null);
      setError(
        authError instanceof Error ? authError.message : "Unexpected auth error.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-10">
      <section className="w-full rounded-3xl border border-forest-200 bg-white/90 p-7 shadow-[0_22px_60px_-36px_rgba(27,69,38,0.55)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-forest-700/80">
          Rhizohoro Beta Access
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-forest-900">
          {mode === "login" ? "Welcome back" : "Create your learner account"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-forest-700/90">
          Sign in to continue your ecosystem progression, or create a new account
          to start your first biome.
        </p>

        <div className="mt-5 inline-flex rounded-full border border-forest-200 bg-forest-50 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              mode === "login"
                ? "bg-forest-700 text-white"
                : "text-forest-700 hover:bg-forest-100"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              mode === "register"
                ? "bg-forest-700 text-white"
                : "text-forest-700 hover:bg-forest-100"
            }`}
          >
            Register
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-forest-700/80">
                Display name
              </span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="mt-1 w-full rounded-xl border border-forest-200 bg-white px-3 py-2 text-sm text-forest-900 outline-none transition focus:border-forest-300 focus:ring-2 focus:ring-forest-200/60"
                required={mode === "register"}
                minLength={2}
              />
            </label>
          ) : null}

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-forest-700/80">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-forest-200 bg-white px-3 py-2 text-sm text-forest-900 outline-none transition focus:border-forest-300 focus:ring-2 focus:ring-forest-200/60"
              required
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-forest-700/80">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="mt-1 w-full rounded-xl border border-forest-200 bg-white px-3 py-2 text-sm text-forest-900 outline-none transition focus:border-forest-300 focus:ring-2 focus:ring-forest-200/60"
              required
              minLength={8}
            />
          </label>

          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="inline-flex items-center rounded-full bg-forest-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-forest-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Authenticating..."
              : mode === "login"
                ? "Login"
                : "Create account"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-xl border border-ember-400/35 bg-ember-400/10 px-3 py-2 text-sm text-forest-900">
            {error}
          </p>
        ) : null}

        {authUser ? (
          <div className="mt-4 rounded-xl border border-moss-500/40 bg-moss-500/12 px-3 py-3 text-sm text-forest-900">
            <p className="font-medium">Signed in as {authUser.displayName}.</p>
            <p className="mt-1 text-xs text-forest-700/85">{authUser.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-full bg-forest-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-forest-900"
              >
                Continue to app
              </button>
              <Link
                href="/"
                className="rounded-full border border-forest-300 px-4 py-1.5 text-xs font-medium text-forest-700 transition hover:bg-forest-100"
              >
                Back to home
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
