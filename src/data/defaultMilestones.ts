import type { Milestone } from "@/data/catalog";

export const defaultMilestones: Milestone[] = [
  {
    id: "prenatal",
    label: "Prenatal Prep",
    description: "Finish core nursery setup and hospital essentials before baby arrives.",
    monthRange: [-3, 0],
    summary: "Lock in hospital prep, confirm support systems, and stage recovery zones before labor begins.",
    babyFocus: [
      "Encourage bonding with daily voice and touch routines to familiarize baby with caregivers.",
      "Review safe-sleep standards and prep swaddles, onesies, and diaper sizes for the newborn window.",
      "Stage a feeding log template so day-one nurses can help you track volume and cues.",
    ],
    caregiverFocus: [
      "Pack hospital bags with nursing, pumping, and recovery essentials for both birthing parent and partner.",
      "Confirm pediatrician onboarding steps and schedule the first newborn appointment before due date.",
      "Coordinate a postpartum support rotation or meal train so the home stays stocked and tidy.",
    ],
    environmentFocus: [
      "Assemble crib or bassinet and verify ASTM/CPSC compliance before linens are added.",
      "Create a nighttime changing station with dim lighting, burp cloths, and soothed-sound options.",
      "Deep clean high-traffic surfaces and stock pantry/freezer with recovery-friendly meals.",
    ],
    healthChecklist: [
      "Finalize birth plan preferences and arrange backup transportation to the hospital.",
      "Attend final prenatal visit; ensure all paperwork is completed and copies of insurance cards are packed.",
      "Install the infant car seat and schedule a CPST (Child Passenger Safety Technician) check if available.",
    ],
    planningTips: [
      "Schedule newborn photography, announcements, and any cord blood banking logistics.",
      "Draft thank-you list for shower gifts and track registry completion discounts.",
      "Organize healthcare portals, lactation contacts, and emergency numbers in a shared note.",
    ],
  },
  {
    id: "newborn",
    label: "0-3 Months",
    description: "Support feeding, sleep, and diapering for the fourth trimester.",
    monthRange: [0, 3],
    summary: "Stabilize feeding, sleep, and recovery rhythms while everyone adjusts to the fourth trimester.",
    babyFocus: [
      "Track hunger cues and log feeding sessions to share trends with the pediatric care team.",
      "Use supervised tummy-to-chest time daily to build foundational neck and core strength.",
      "Practice safe swaddling, burping, and soothing cycles to support newborn regulation.",
    ],
    caregiverFocus: [
      "Rotate night shifts or protected nap windows with partners or helpers to preserve rest.",
      "Keep lactation and bottle supplies organized near seating to minimize overnight scrambling.",
      "Lean on meal delivery, grocery drop-off, or frozen prep to reduce errand fatigue.",
    ],
    environmentFocus: [
      "Set up dimmable lights, blackout shades, and white noise to reinforce day versus night cues.",
      "Stage diapering carts with rash care, extra sleepers, and muslin cloths on every level of the home.",
      "Create a comfortable feeding chair with lumbar support, water, and snacks within reach.",
    ],
    healthChecklist: [
      "Attend newborn well visits; confirm vitamin D or feeding supplements per pediatric guidance.",
      "Schedule birthing parent postpartum follow-ups (typically 2 and 6 weeks).",
      "Monitor diaper counts and temperature; log notes for nurse call lines when questions arise.",
    ],
    planningTips: [
      "Document baby care instructions for visiting helpers, including bottle prep and safe sleep rules.",
      "Keep a running list of outgrown gear to package for donation or next-size exchange.",
      "Save receipts and warranty info for big-ticket gear in case replacements are needed.",
    ],
  },
  {
    id: "month3",
    label: "3-6 Months",
    description: "Introduce tummy time, early play, and transitional sleep tools.",
    monthRange: [3, 6],
    summary: "Build predictable routines and expand sensory play while preparing for the first major transitions.",
    babyFocus: [
      "Schedule tummy-time bursts across the day, working toward 60 total minutes.",
      "Rotate contrasting toys and mirror play to strengthen visual tracking and curiosity.",
      "Encourage rolling with firm floor time and gentle assisted transitions between positions.",
    ],
    caregiverFocus: [
      "Introduce dream feeds or adjusted schedules to consolidate nighttime sleep.",
      "Review return-to-work plans, childcare coverage, and milk storage logistics if applicable.",
      "Refresh pumping parts or adjust nipple sizes as baby’s flow preferences change.",
    ],
    environmentFocus: [
      "Add supportive playmats and safe floor space for increasing mobility.",
      "Sort and store outgrown newborn gear; stage 3-6 month clothing within easy reach.",
      "Tune stroller and babywearing setups to match current weight and ergonomic needs.",
    ],
    healthChecklist: [
      "Book four- and six-month well visits, clarifying the immunization schedule.",
      "Track developmental milestones and bring questions about head control or rolling to appointments.",
      "Discuss vitamin D, iron, or probiotic needs with pediatric team as feeds evolve.",
    ],
    planningTips: [
      "Research high chairs, suction bowls, and utensils for starting solids around the 6-month mark.",
      "Order the next size of sleepwear or swaddles before the current ones feel snug.",
      "Begin a baby-proofing checklist focusing on outlets, cords, and furniture anchors.",
    ],
  },
  {
    id: "month6",
    label: "6-9 Months",
    description: "Support solids, mobility, and baby-proofing foundations.",
    monthRange: [6, 9],
    summary: "Guide sitting, mobility, and first solids while locking in core safety upgrades around the home.",
    babyFocus: [
      "Introduce iron-rich purees or baby-led feeding with upright seating and supervision.",
      "Practice supported sitting and daily floor sessions to refine balance and trunk strength.",
      "Offer chilled teethers and sensory toys to ease teething discomfort and build grip.",
    ],
    caregiverFocus: [
      "Log new food exposures and monitor reactions; share patterns with pediatrician.",
      "Update pump parts, bottle nipples, or straw cups as flow preferences increase.",
      "Maintain caregiver wellness with scheduled movement, hydration, and short resets.",
    ],
    environmentFocus: [
      "Install gates and secure tipping hazards as scooting and crawling begin.",
      "Lower the crib mattress when baby pushes up on hands or knees.",
      "Designate a feeding zone with wipeable mats, bib storage, and cleaning supplies.",
    ],
    healthChecklist: [
      "Schedule six- and nine-month well visits; ask about fluoride and early oral care routines.",
      "Review seasonal vaccines (flu, RSV) based on local guidance and daycare policies.",
      "Complete developmental screenings (e.g., ASQ) required by pediatric office or childcare.",
    ],
    planningTips: [
      "Research travel-friendly sleep and feeding gear for upcoming trips or holidays.",
      "Start a list of first-birthday gift ideas focusing on gross motor and musical play.",
      "Refresh baby-proofing plan to include drawers, cords, and houseplants.",
    ],
  },
  {
    id: "month9",
    label: "9-12 Months",
    description: "Prepare for cruising, bath upgrades, and first-year celebrations.",
    monthRange: [9, 12],
    summary: "Support crawling, cruising, and emerging language while planning first-year transitions.",
    babyFocus: [
      "Encourage supported standing with sturdy furniture and push toys.",
      "Offer varied textures and soft finger foods to build pincer grasp and self-feeding confidence.",
      "Narrate daily routines and introduce simple sign language for needs like more or all done.",
    ],
    caregiverFocus: [
      "Rotate toy baskets weekly to maintain novelty without clutter.",
      "Adjust nap schedules as daytime sleep consolidates and wake windows lengthen.",
      "Track measurements for pre-walker shoes and flexible sneakers before first steps.",
    ],
    environmentFocus: [
      "Anchor furniture, add cabinet locks, and secure toilets as exploration expands.",
      "Swap infant baths for upright tub seats or slip-proof mats when baby can sit steadily.",
      "Designate a safe water-play zone with quick-dry towels and temperature-safe bins.",
    ],
    healthChecklist: [
      "Book nine- and twelve-month well visits, including potential bloodwork or lead screenings.",
      "Select a pediatric dentist and schedule the first dental visit by first birthday.",
      "Review allergy action plans and update childcare forms as new foods are introduced.",
    ],
    planningTips: [
      "Plan first-birthday celebrations, memory keepsakes, and milestone photos early.",
      "Begin transitioning bottles to straw or open cups in gradual, supervised steps.",
      "Update emergency contacts, sitter notes, and travel documents ahead of holiday season.",
    ],
  },
  {
    id: "year1",
    label: "12-18 Months",
    description: "Transition to toddler feeding, travel seats, and exploratory play.",
    monthRange: [12, 18],
    summary: "Shift into toddler rhythms with larger gear, outdoor play, and budding independence cues.",
    babyFocus: [
      "Support first steps with soft-soled shoes and encourage outdoor exploration on varied terrain.",
      "Offer balanced meals three times daily plus snacks featuring healthy fats and proteins.",
      "Introduce simple cleanup routines like placing blocks in bins to foster responsibility.",
    ],
    caregiverFocus: [
      "Reinstall car seats to match new height/weight stats and consider extended rear-facing guidance.",
      "Adjust nap schedule as little ones move from two naps toward one longer midday rest.",
      "Target daily outdoor time for sensory play and gross motor practice.",
    ],
    environmentFocus: [
      "Convert nursery layout for toddler accessibility (lower hooks, open shelving).",
      "Add cabinet or drawer locks for kitchen, bathroom, and cleaning supplies.",
      "Create an art bin with washable supplies and protective mats for messy play.",
    ],
    healthChecklist: [
      "Book twelve-, fifteen-, and eighteen-month well visits with immunizations scheduled.",
      "Schedule first dental checkup when molars appear or per dentist recommendation.",
      "Monitor growth spurts and size up sleep sacks, clothing, and footwear proactively.",
    ],
    planningTips: [
      "Start a savings line or registry for convertible crib-to-bed upgrades.",
      "Gather potty training resources to review ahead of the eighteen- to twenty-four-month window.",
      "Record new words, gestures, and signs in a milestone journal to share with caregivers.",
    ],
  },
  {
    id: "year2",
    label: "18-24 Months",
    description: "Support language, art, and growth spurts with durable gear.",
    monthRange: [18, 24],
    summary: "Channel surging language and mobility into structured routines and safe independence.",
    babyFocus: [
      "Model two-step directions and present simple choices to practice decision-making.",
      "Encourage climbing, balance play, and dance parties to refine gross motor control.",
      "Introduce pretend play props to expand vocabulary and social-emotional skills.",
    ],
    caregiverFocus: [
      "Watch potty readiness cues and assemble training supplies for gentle introductions.",
      "Reinforce mealtime and bedtime rituals to ease toddler boundary testing.",
      "Set up collaborative chore or sticker charts for small helper jobs.",
    ],
    environmentFocus: [
      "Transition to a toddler or floor bed if climbing creates safety risks.",
      "Refresh toy rotations with STEM, sensory, and fine-motor challenges suited to age two.",
      "Create a calm-down corner stocked with pillows, books, and sensory fidgets.",
    ],
    healthChecklist: [
      "Schedule eighteen- and twenty-four-month well visits including developmental screenings (e.g., M-CHAT).",
      "Discuss iron, vitamin D, and fluoride supplementation as diets expand.",
      "Maintain dental cleanings every six months and support brushing routines twice daily.",
    ],
    planningTips: [
      "Tour preschool, co-op, or parent-and-tot classes and note enrollment deadlines.",
      "Research the next car seat stage or boosters in anticipation of growth spurts.",
      "Outline packing checklists for longer trips and overnights with a toddler.",
    ],
  },
  {
    id: "year3",
    label: "24-36 Months",
    description: "Lean into independence, safety upgrades, and preschool readiness.",
    monthRange: [24, 36],
    summary: "Cultivate preschool readiness, self-advocacy, and community safety habits for an emerging preschooler.",
    babyFocus: [
      "Practice cooperative games, turn-taking, and empathy through guided play.",
      "Use sequencing cards and storytelling to expand vocabulary and memory.",
      "Introduce simple STEM or sensory kits that spark curiosity and experimentation.",
    ],
    caregiverFocus: [
      "Set consistent screen-time boundaries and craft engaging offline alternatives.",
      "Use visual schedules for morning, bedtime, and chore routines to build autonomy.",
      "Role-play safety scripts for crossing streets, body autonomy, and asking for help.",
    ],
    environmentFocus: [
      "Create a preschool launch pad with hooks, labeled bins, and a family calendar.",
      "Upgrade ride-on gear (balance bike, scooter) and ensure helmets fit correctly.",
      "Refresh art and maker zones with child-safe scissors, glue sticks, and storage.",
    ],
    healthChecklist: [
      "Book the three-year well visit plus vision and hearing screenings if available.",
      "Confirm harness height or booster seat readiness per manufacturer limits.",
      "Keep dental visits twice yearly; discuss sealants if recommended.",
    ],
    planningTips: [
      "Reserve swim lessons or water safety classes ahead of warm-weather demand.",
      "Review estate plans, guardianship notes, and emergency kits to ensure they’re current.",
      "Rotate closets seasonally and donate or store outgrown toddler gear.",
    ],
  },
];

export const milestoneSeedData = defaultMilestones.map((milestone, index) => ({
  ...milestone,
  sortOrder: index,
}));

