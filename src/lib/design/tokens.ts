export const forestThemeTokens = {
  gradients: {
    hero: "linear-gradient(140deg, rgba(58,40,28,0.95) 0%, rgba(42,30,22,0.96) 54%, rgba(33,24,19,0.98) 100%)",
    panel:
      "linear-gradient(165deg, rgba(49,36,27,0.96) 0%, rgba(41,29,22,0.93) 48%, rgba(30,22,17,0.95) 100%)",
  },
  woodPalette: {
    matteWalnut: "#2b2018",
    emberBrown: "#5a3f2c",
    cedarBark: "#7a5941",
    ashTan: "#d4b48a",
  },
  biomeLadder: [
    { key: "seedling_meadow", name: "Seedling Meadow", expThreshold: 0 },
    { key: "canopy_glade", name: "Canopy Glade", expThreshold: 1200 },
    { key: "riverlight_basin", name: "Riverlight Basin", expThreshold: 3000 },
    { key: "astral_grove", name: "Astral Grove", expThreshold: 5400 },
  ],
  rngTreeTypes: [
    { key: "cedar", name: "Cedar", rarity: "common" },
    { key: "oak", name: "Oak", rarity: "common" },
    { key: "pine", name: "Pine", rarity: "uncommon" },
    { key: "sakura", name: "Sakura", rarity: "rare" },
    { key: "maple", name: "Maple", rarity: "uncommon" },
  ],
  biomeTreeDropRates: {
    seedling_meadow: [
      { treeType: "cedar", weight: 50 },
      { treeType: "oak", weight: 37.5 },
      { treeType: "pine", weight: 12.5 },
    ],
    canopy_glade: [
      { treeType: "oak", weight: 40 },
      { treeType: "cedar", weight: 30 },
      { treeType: "pine", weight: 24 },
      { treeType: "sakura", weight: 6 },
    ],
    riverlight_basin: [
      { treeType: "oak", weight: 34 },
      { treeType: "cedar", weight: 24 },
      { treeType: "maple", weight: 24 },
      { treeType: "pine", weight: 14 },
      { treeType: "sakura", weight: 4 },
    ],
    astral_grove: [
      { treeType: "maple", weight: 32 },
      { treeType: "oak", weight: 28 },
      { treeType: "cedar", weight: 20 },
      { treeType: "pine", weight: 12 },
      { treeType: "sakura", weight: 8 },
    ],
  },
  betaShinyBiomeDrop: {
    enabled: true,
    biomeKey: "astral_grove",
    label: "Shiny Astral Grove",
    dropRate: 0.015,
  },
  motivationalPrimitives: {
    successPrefix: "You did it!",
    recoveryPrefix: "That one was tricky.",
    streakPrompt: "A short burst keeps your ecosystem alive.",
  },
} as const;
