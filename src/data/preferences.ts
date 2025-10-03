export type BudgetTier = "essentials" | "balanced" | "premium";

export interface PreferenceProfile {
  budget: BudgetTier;
  babyGender: "girl" | "boy" | "surprise";
  dueDate: string;
  colorPalette: "neutral" | "pastel" | "bold" | "warm" | "cool";
  materialFocus: "organic" | "performance" | "recycled" | "classic";
  ecoPriority: boolean;
  location: string;
}

export const defaultProfile: PreferenceProfile = {
  budget: "balanced",
  babyGender: "surprise",
  dueDate: new Date().toISOString().slice(0, 10),
  colorPalette: "neutral",
  materialFocus: "organic",
  ecoPriority: true,
  location: "",
};
