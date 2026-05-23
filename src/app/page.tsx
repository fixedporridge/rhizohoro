import { MaterialUploadQuizWorkbench } from "@/components/material-upload-quiz-workbench";
import { SectionPanel } from "@/components/section-panel";
import { TopNav } from "@/components/top-nav";
import { APP_SECTIONS, PRODUCT_PILLARS } from "@/config/navigation";
import { forestThemeTokens } from "@/lib/design/tokens";
import { selectMotivationMessage } from "@/lib/messaging/motivation";

export default function Home() {
  const successMessage = selectMotivationMessage("success", 0);
  const recoveryMessage = selectMotivationMessage("recovery", 0);
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 pb-16 pt-8 md:px-10">
        <section
          id="forest-home"
          className="scroll-mt-24 overflow-hidden rounded-3xl border border-forest-200/80 bg-white/80 p-8 shadow-[0_20px_60px_-36px_rgba(27,69,38,0.6)] backdrop-blur"
          style={{ backgroundImage: forestThemeTokens.gradients.hero }}
        >
          <p className="inline-flex rounded-full border border-forest-300 bg-forest-50 px-3 py-1 text-xs font-semibold tracking-wide text-forest-700">
            RHIZOHORO PHASE 1
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-forest-900 sm:text-5xl">
            Study that grows with you.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-forest-700/90 sm:text-lg">
            Rhizohoro unifies studying, motivation, progression, organization,
            personalization, and emotional engagement into one ecosystem-driven
            learning platform.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-forest-700 px-4 py-2 text-sm font-semibold text-white">
              {successMessage}
            </span>
            <span className="rounded-full border border-forest-300 bg-white/85 px-4 py-2 text-sm font-medium text-forest-700">
              {recoveryMessage}
            </span>
          </div>
        </section>
        <section
          id="study-vault"
          className="scroll-mt-24 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {APP_SECTIONS.map((section) => (
            <SectionPanel
              key={section.key}
              title={section.label}
              description={section.description}
              href={section.href}
              competitive={section.competitive}
            />
          ))}
        </section>
        <section id="study-studio" className="scroll-mt-24 grid gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-forest-200 bg-white/85 p-6 shadow-[0_18px_50px_-34px_rgba(27,69,38,0.55)]">
            <h2 className="text-xl font-semibold text-forest-900">
              Product pillars now encoded in scaffold
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-forest-700/90">
              {PRODUCT_PILLARS.map((pillar) => (
                <li key={pillar} className="flex items-start gap-2">
                  <span className="mt-2 h-2 w-2 rounded-full bg-moss-500" />
                  <span>{pillar}</span>
                </li>
              ))}
            </ul>
          </article>
          <article
            id="progress-map"
            className="scroll-mt-24 rounded-3xl border border-forest-200 bg-white/85 p-6 shadow-[0_18px_50px_-34px_rgba(27,69,38,0.55)]"
            style={{ backgroundImage: forestThemeTokens.gradients.panel }}
          >
            <h2 className="text-xl font-semibold text-forest-900">
              Biome progression baseline
            </h2>
            <p className="mt-3 text-sm leading-6 text-forest-700/90">
              Consistency drives the core progression path, while mastery boosts
              unlock speed and controlled RNG introduces playful reward moments.
            </p>
            <ol className="mt-4 space-y-2 text-sm text-forest-700">
              {forestThemeTokens.biomeLadder.map((biome) => (
                <li
                  key={biome.key}
                  className="flex items-center justify-between rounded-xl border border-forest-100 bg-white/80 px-3 py-2"
                >
                  <span className="font-medium">{biome.name}</span>
                  <span className="text-xs uppercase tracking-wide text-forest-700/80">
                    {biome.expThreshold} EXP
                  </span>
                </li>
              ))}
            </ol>
          </article>
        </section>
        <section
          id="social-grove"
          className="scroll-mt-24 rounded-3xl border border-forest-200 bg-white/85 p-6 shadow-[0_18px_50px_-34px_rgba(27,69,38,0.55)]"
        >
          <h2 className="text-xl font-semibold text-forest-900">
            Social Grove MVP direction
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-forest-700/90">
            Async challenge rooms, consistency-weighted biome leaderboards, and
            opt-in competition create pressure in the game layer while keeping
            the study layer calm and low-friction.
          </p>
        </section>
        <section id="quiz-preview">
          <MaterialUploadQuizWorkbench />
        </section>
        <section
          id="profile"
          className="scroll-mt-24 rounded-3xl border border-forest-200 bg-white/85 p-6 shadow-[0_18px_50px_-34px_rgba(27,69,38,0.55)]"
        >
          <h2 className="text-xl font-semibold text-forest-900">
            Profile and personalization
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-forest-700/90">
            Beta profile controls now center on account basics, study goal tuning,
            and motivational style preferences before the full settings suite ships.
          </p>
        </section>
      </main>
    </div>
  );
}
