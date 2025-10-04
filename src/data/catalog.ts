export type MilestoneId =
  | "prenatal"
  | "newborn"
  | "month3"
  | "month6"
  | "month9"
  | "year1"
  | "year2"
  | "year3";

export type CategoryId =
  | "nursing"
  | "bathing"
  | "feeding"
  | "sleeping"
  | "travel"
  | "play"
  | "safety";

export interface Milestone {
  id: MilestoneId;
  label: string;
  description: string;
  monthRange: [number, number];
  summary?: string;
  babyFocus?: string[];
  caregiverFocus?: string[];
  environmentFocus?: string[];
  healthChecklist?: string[];
  planningTips?: string[];
}

export interface ProductSummary {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: CategoryId;
  milestoneIds: MilestoneId[];
  affiliateUrl: string;
  imageUrl?: string;
  colors: string[];
  materials: string[];
  isEcoFriendly: boolean;
  rating: number;
  reviewSummary: string;
  checklistNotes: string;
  aiCategories?: string[];
  periodStartMonth?: number | null;
  periodEndMonth?: number | null;
  safetyNotes?: string | null;
  reviewSources?: { source: string; url?: string }[];
  externalReviewUrls?: { source: string; url?: string }[];
  reviews?: ProductReview[];
}

export interface ProductReview {
  id: string;
  source: string;
  url?: string | null;
  headline?: string | null;
  summary?: string | null;
  rating?: number | null;
  author?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
}

export const products: ProductSummary[] = [
  {
    id: "nursing-station",
    name: "ErgoNest Nursing Station",
    brand: "SoftRoot",
    price: 189,
    category: "nursing",
    milestoneIds: ["prenatal", "newborn"],
    affiliateUrl: "https://amazon.com/dp/example-nursing",
    colors: ["neutral", "warm"],
    materials: ["organic-cotton", "bamboo"],
    isEcoFriendly: true,
    rating: 4.7,
    reviewSummary:
      "Parents praise the breathable organic cover and the firm lumbar support that stays comfortable through long cluster feeds.",
    checklistNotes: "Pairs well with washable nursing pads and a dedicated nightlight.",
  },
  {
    id: "hospital-bag",
    name: "Ready-Set Hospital Kit",
    brand: "Arrival Collective",
    price: 129,
    category: "travel",
    milestoneIds: ["prenatal"],
    affiliateUrl: "https://amazon.com/dp/example-hospital",
    colors: ["neutral", "cool"],
    materials: ["canvas", "recycled-poly"],
    isEcoFriendly: true,
    rating: 4.5,
    reviewSummary:
      "Reviewers love that the kit includes TSA-friendly toiletries, swaddles, and room for partner essentials.",
    checklistNotes: "Add personal documents and insurance cards before 36 weeks.",
  },
  {
    id: "bassinet",
    name: "CloudFloat Bedside Bassinet",
    brand: "NightBloom",
    price: 249,
    category: "sleeping",
    milestoneIds: ["prenatal", "newborn"],
    affiliateUrl: "https://amazon.com/dp/example-bassinet",
    colors: ["neutral", "warm"],
    materials: ["birch", "organic-cotton"],
    isEcoFriendly: false,
    rating: 4.8,
    reviewSummary:
      "Consistently rated for silent glide wheels and easy height adjustments that align with most beds.",
    checklistNotes: "Confirm mattress height once the crib arrives; add two fitted sheets.",
  },
  {
    id: "infant-tub",
    name: "Cascade Support Infant Tub",
    brand: "AquaNest",
    price: 65,
    category: "bathing",
    milestoneIds: ["newborn", "month3"],
    affiliateUrl: "https://amazon.com/dp/example-tub",
    colors: ["cool", "bold"],
    materials: ["foam", "plastic"],
    isEcoFriendly: false,
    rating: 4.6,
    reviewSummary:
      "Parents highlight the temperature strip and non-slip newborn insert that lasts through early sit-up stages.",
    checklistNotes: "Add hooded towels and fragrance-free wash to bathing kit.",
  },
  {
    id: "baby-wrap",
    name: "FeatherFlex Baby Wrap",
    brand: "CarryKind",
    price: 89,
    category: "travel",
    milestoneIds: ["newborn", "month3", "month6"],
    affiliateUrl: "https://amazon.com/dp/example-wrap",
    colors: ["neutral", "pastel"],
    materials: ["modal"],
    isEcoFriendly: true,
    rating: 4.9,
    reviewSummary:
      "Lightweight yet supportive wrap that distributes weight evenly; a favorite among petite and taller caregivers alike.",
    checklistNotes: "Practice tying before baby arrives; store near entryway hooks for quick access.",
  },
  {
    id: "bottle-starter",
    name: "GentleFlow Bottle Starter Set",
    brand: "PureSip",
    price: 72,
    category: "feeding",
    milestoneIds: ["newborn", "month3"],
    affiliateUrl: "https://amazon.com/dp/example-bottle",
    colors: ["neutral"],
    materials: ["silicone", "glass"],
    isEcoFriendly: true,
    rating: 4.4,
    reviewSummary:
      "Reviewers appreciate the anti-colic valve and the ability to switch between slow and medium-flow nipples without leaks.",
    checklistNotes: "Sterilize before first use; consider drying rack add-on if counter space allows.",
  },
  {
    id: "play-gym",
    name: "WonderArc Play Gym",
    brand: "BrightMoss",
    price: 159,
    category: "play",
    milestoneIds: ["month3", "month6"],
    affiliateUrl: "https://amazon.com/dp/example-playgym",
    colors: ["pastel", "bold"],
    materials: ["organic-cotton", "wood"],
    isEcoFriendly: true,
    rating: 4.7,
    reviewSummary:
      "Praised for modular toys that convert into tummy-time mirrors and teether swaps as baby grows.",
    checklistNotes: "Rotate toys weekly to keep stimulation engaging.",
  },
  {
    id: "high-chair",
    name: "GrowAlong High Chair",
    brand: "MealMates",
    price: 249,
    category: "feeding",
    milestoneIds: ["month6", "month9", "year1"],
    affiliateUrl: "https://amazon.com/dp/example-highchair",
    colors: ["neutral", "bold"],
    materials: ["beech", "plastic"],
    isEcoFriendly: false,
    rating: 4.6,
    reviewSummary:
      "Reviewers love the removable tray insert and adjustable footrest that keeps posture aligned during BLW.",
    checklistNotes: "Add silicone suction bowls and bibs once solids begin.",
  },
  {
    id: "safety-gate",
    name: "FlexiGuard Safety Gate",
    brand: "HomeHalo",
    price: 119,
    category: "safety",
    milestoneIds: ["month6", "month9", "year1"],
    affiliateUrl: "https://amazon.com/dp/example-gate",
    colors: ["neutral", "cool"],
    materials: ["steel"],
    isEcoFriendly: false,
    rating: 4.5,
    reviewSummary:
      "Parents note the quiet auto-close hinge and expandable width for open-concept spaces.",
    checklistNotes: "Measure stair openings before ordering; add corner guards to match.",
  },
  {
    id: "convertible-car-seat",
    name: "SafeNest Convertible Car Seat",
    brand: "RoadBud",
    price: 329,
    category: "travel",
    milestoneIds: ["month9", "year1", "year2", "year3"],
    affiliateUrl: "https://amazon.com/dp/example-carseat",
    colors: ["neutral", "bold"],
    materials: ["recycled-poly"],
    isEcoFriendly: true,
    rating: 4.8,
    reviewSummary:
      "Stands out for extended rear-facing limits and machine-washable padding with no rethread harness.",
    checklistNotes: "Schedule a CPST appointment to confirm installation before first trip.",
  },
  {
    id: "toddler-bed",
    name: "NestStep Toddler Bed",
    brand: "DreamLoom",
    price: 299,
    category: "sleeping",
    milestoneIds: ["year2", "year3"],
    affiliateUrl: "https://amazon.com/dp/example-toddlerbed",
    colors: ["warm", "bold"],
    materials: ["pine", "organic-cotton"],
    isEcoFriendly: true,
    rating: 4.6,
    reviewSummary:
      "Families love the low-rise design with built-in guard rails and storage drawer for bedtime books.",
    checklistNotes: "Plan mattress transition alongside potty-training readiness cues.",
  },
  {
    id: "art-easel",
    name: "SparkJoy Art Easel",
    brand: "MiniMuse",
    price: 149,
    category: "play",
    milestoneIds: ["year2", "year3"],
    affiliateUrl: "https://amazon.com/dp/example-art",
    colors: ["bold", "pastel"],
    materials: ["wood", "felt"],
    isEcoFriendly: false,
    rating: 4.3,
    reviewSummary:
      "Teachers highlight the dual-sided chalk and paper rolls plus easy-clean trays for toddler creativity.",
    checklistNotes: "Stock washable paints and smocks; place on a wipeable mat.",
  },
];

export const categories: { id: CategoryId; label: string }[] = [
  { id: "nursing", label: "Nursing & Feeding Support" },
  { id: "bathing", label: "Bath Time" },
  { id: "feeding", label: "Feeding Gear" },
  { id: "sleeping", label: "Sleep & Nursery" },
  { id: "travel", label: "Travel & On-the-Go" },
  { id: "play", label: "Play & Development" },
  { id: "safety", label: "Home Safety" },
];
