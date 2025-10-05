import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/Navigation", () => ({
  Navigation: () => <nav aria-label="Primary" data-testid="navigation" />,
}));

const heroCopyMock = {
  overline: "Plan with less mental load",
  title: "Know what to buy next, without the scramble",
  subtitle:
    "Nestlings surfaces the next must-do, curates gear that fits your budget, and keeps every milestone on track in minutes.",
  primaryCta: { label: "Start onboarding", href: "/onboarding" },
  secondaryCta: { label: "See how it works", href: "/how-it-works" },
  proofPoints: [
    {
      title: "Timeline adjusts with your due date",
      description: "Stay ahead with auto-shifting reminders for every milestone.",
    },
  ],
};

vi.mock("@/lib/copy/hero", () => ({
  heroCopy: heroCopyMock,
}));

vi.mock("@/data/catalog", () => ({
  products: [
    {
      id: "p1",
      name: "Bassinet",
      rating: 4.9,
      milestoneIds: ["prenatal"],
      brand: "DreamBaby",
      price: 199,
    },
    {
      id: "p2",
      name: "Carrier",
      rating: 4.8,
      milestoneIds: ["newborn"],
      brand: "CarryCo",
      price: 159,
    },
  ],
}));

vi.mock("@/data/defaultMilestones", () => ({
  defaultMilestones: [
    { id: "prenatal", label: "Prenatal", monthRange: [0, 1], focus: [] },
    { id: "newborn", label: "Newborn", monthRange: [1, 3], focus: [] },
  ],
}));

vi.mock("@/lib/navigation", () => ({
  sectionNavItems: [
    { id: "overview", label: "Overview", href: "/overview" },
    { id: "curated", label: "Curated picks", href: "/curated" },
    { id: "profile", label: "Family profile", href: "/profile" },
  ],
}));

const { default: Home } = await import("@/app/page");

describe("Home (marketing page)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the navigation and hero copy", () => {
    render(<Home />);

    expect(screen.getByTestId("navigation")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Know what to buy next, without the scramble/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /Start onboarding/i })).toHaveAttribute("href", "/onboarding");
    expect(screen.getByRole("link", { name: /See how it works/i })).toHaveAttribute("href", "/how-it-works");
  });

  it("keeps the hero focused on guidance without navigation cards", () => {
    render(<Home />);

    expect(screen.queryByRole("link", { name: /Explore overview/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Explore curated picks/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Explore family profile/i })).toBeNull();
  });
});
