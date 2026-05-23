export const forestThemeTokens = {
  gradients: {
    hero: "linear-gradient(135deg, rgba(227,243,214,0.92) 0%, rgba(245,251,240,0.94) 52%, rgba(218,237,248,0.85) 100%)",
    panel:
      "linear-gradient(160deg, rgba(247,252,243,0.95) 0%, rgba(240,248,236,0.92) 45%, rgba(233,245,252,0.75) 100%)",
  },
  biomeLadder: [
    { key: "seedling_meadow", name: "Seedling Meadow", expThreshold: 0 },
    { key: "canopy_glade", name: "Canopy Glade", expThreshold: 1200 },
    { key: "riverlight_basin", name: "Riverlight Basin", expThreshold: 3000 },
    { key: "astral_grove", name: "Astral Grove", expThreshold: 5400 },
  ],
  motivationalPrimitives: {
    successPrefix: "You did it!",
    recoveryPrefix: "That one was tricky.",
    streakPrompt: "A short burst keeps your ecosystem alive.",
  },
} as const;
