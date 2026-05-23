import Link from "next/link";

import { APP_SECTIONS } from "@/config/navigation";

export function TopNav() {
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
          {APP_SECTIONS.map((item) => (
            item.href.startsWith("#") ? (
              <a
                key={item.key}
                href={item.href}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-forest-700 transition hover:bg-forest-100 hover:text-forest-900"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.key}
                href={item.href}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-forest-700 transition hover:bg-forest-100 hover:text-forest-900"
              >
                {item.label}
              </Link>
            )
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/auth"
            className="rounded-full border border-forest-300 px-3 py-1.5 text-xs font-medium text-forest-700 transition hover:bg-forest-100 hover:text-forest-900"
          >
            Login
          </Link>
          <Link
            href="/auth"
            className="rounded-full bg-forest-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-forest-900"
          >
            Register
          </Link>
        </div>
      </div>
    </header>
  );
}
