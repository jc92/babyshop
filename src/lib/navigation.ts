export type SectionId = "overview" | "how-it-works" | "curated" | "profile";

export type SectionNavItem = {
  id: SectionId;
  label: string;
  href: string;
};

export const sectionNavItems: SectionNavItem[] = [
  { id: "overview", label: "Overview", href: "/overview" },
  { id: "how-it-works", label: "How it works", href: "/how-it-works" },
  { id: "curated", label: "Curated picks", href: "/curated" },
  { id: "profile", label: "Family profile", href: "/profile" },
];
