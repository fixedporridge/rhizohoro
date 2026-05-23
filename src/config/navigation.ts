export type AppSection = {
  key: string;
  label: string;
  description: string;
  href: string;
  competitive?: boolean;
};

export const APP_SECTIONS: AppSection[] = [
  {
    key: "forest-home",
    label: "Forest Home",
    description: "Daily momentum, streak health, and next recommended learning burst.",
    href: "#forest-home",
  },
  {
    key: "study-vault",
    label: "Study Vault",
    description: "Notion-style workspace for notes, uploads, and generated study sets.",
    href: "#study-vault",
  },
  {
    key: "study-studio",
    label: "Study Studio",
    description: "AI-generated flashcards, quizzes, and active-recall session building.",
    href: "#study-studio",
  },
  {
    key: "progress-map",
    label: "Progress Map",
    description: "Consistency-first EXP growth with mastery accelerators and biome unlocks.",
    href: "#progress-map",
  },
  {
    key: "social-grove",
    label: "Social Grove",
    description: "Challenge rooms and forest leaderboard progression for competitive energy.",
    href: "#social-grove",
    competitive: true,
  },
  {
    key: "profile",
    label: "Profile",
    description: "Personalized learning preferences, accessibility options, and motivation style.",
    href: "#profile",
  },
];

export const PRODUCT_PILLARS: string[] = [
  "Consistency-first momentum to reduce procrastination.",
  "Short-burst active recall designed for pre-exam revision.",
  "Structured learning workspace that keeps materials and practice together.",
  "Competitive biome progression with controlled RNG rewards.",
  "Supportive motivational voice with visible progress and recovery nudges.",
];
