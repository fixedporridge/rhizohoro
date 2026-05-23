import Link from "next/link";

type SectionPanelProps = {
  title: string;
  description: string;
  href: string;
  competitive?: boolean;
};

export function SectionPanel({
  title,
  description,
  href,
  competitive,
}: SectionPanelProps) {
  const isHashHref = href.startsWith("#");
  return (
    <article className="group rounded-2xl border border-forest-200 bg-white/85 p-5 shadow-[0_12px_40px_-30px_rgba(27,69,38,0.5)] transition hover:-translate-y-0.5 hover:border-forest-300">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-forest-900">
          {isHashHref ? (
            <a
              href={href}
              className="rounded-sm transition hover:text-forest-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-200"
            >
              {title}
            </a>
          ) : (
            <Link
              href={href}
              className="rounded-sm transition hover:text-forest-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-200"
            >
              {title}
            </Link>
          )}
        </h3>
        {competitive ? (
          <span className="rounded-full bg-ember-400/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-forest-900">
            Competitive
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-forest-700/90">{description}</p>
      {isHashHref ? (
        <a
          href={href}
          className="mt-4 inline-flex items-center text-sm font-medium text-forest-700 transition group-hover:text-forest-900"
        >
          Explore section
        </a>
      ) : (
        <Link
          href={href}
          className="mt-4 inline-flex items-center text-sm font-medium text-forest-700 transition group-hover:text-forest-900"
        >
          Explore section
        </Link>
      )}
    </article>
  );
}
