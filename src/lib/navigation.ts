export type SectionId = "overview" | "curated" | "profile" | "how-it-works";

export type SectionNavItem = {
  id: SectionId;
  label: string;
  href: string;
};

export const sectionNavItems: SectionNavItem[] = [
  { id: "overview", label: "Overview", href: "/overview" },
  { id: "curated", label: "Curated picks", href: "/curated" },
  { id: "profile", label: "Family profile", href: "/profile" },
  { id: "how-it-works", label: "How it works", href: "/how-it-works" },
];
