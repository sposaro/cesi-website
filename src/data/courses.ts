// Swan City Scuba course catalog. Every course here is one Dr. Frank Sposaro is rated to teach
// (from his PADI eCards). A course becomes bookable online once it has `pricing` and `sessions`.

export type SessionKind = 'pool' | 'open-water' | 'classroom';

export interface SessionTemplate {
  key: string;
  title: string;
  kind: SessionKind;
  description: string;
  /** Hours blocked on the calendar. Open-water sessions use the dive site's length instead. */
  durationHours?: number;
  /** Local start times offered. Open-water sessions use the dive site's start times instead. */
  startTimes?: string[];
}

export interface Pricing {
  /** One student, one instructor. Cents. */
  privatePrice: number;
  /** Per student when 2+ students book together. Cents. */
  groupPricePerStudent: number;
}

export interface AddOn {
  id: string;
  name: string;
  description: string;
  /** Per student, in cents. null = recommended but not sold online yet ("ask to add it"). */
  pricePerStudent: number | null;
}

export type Category = 'core' | 'specialty' | 'conservation' | 'first-aid' | 'kids';

export interface Course {
  slug: string;
  name: string;
  category: Category;
  summary: string;
  minAge?: number;
  prerequisites?: string;
  pricing?: Pricing;
  sessions?: SessionTemplate[];
  /** Extra sessions included but scheduled directly with the instructor. */
  makeupSessions?: number;
  addOns?: AddOn[];
  includes?: string[];
  notIncluded?: string[];
}

const poolDay = (n: number, description: string): SessionTemplate => ({
  key: `pool-${n}`,
  title: `Pool day ${n}`,
  kind: 'pool',
  description,
  durationHours: 6,
  startTimes: ['08:00', '09:00', '10:00', '12:00'],
});

const openWaterDay = (n: number, description: string): SessionTemplate => ({
  key: `open-water-${n}`,
  title: `Open water day ${n}`,
  kind: 'open-water',
  description,
});

export const courses: Course[] = [
  {
    slug: 'open-water',
    name: 'PADI Open Water Diver',
    category: 'core',
    summary:
      'Your first scuba certification, taught as a real course: study the PADI manual, work through it in the classroom with your instructor, build your skills in the pool, then make four open-water dives. You’ll be certified to dive to 18 m (60 ft) anywhere in the world.',
    minAge: 10,
    prerequisites: 'Comfortable in the water and medically fit to dive.',
    pricing: { privatePrice: 70000, groupPricePerStudent: 62500 },
    sessions: [
      poolDay(1, 'Classroom review, watermanship assessment (200 m swim and 10-minute float), then your first confined water dives.'),
      poolDay(2, 'Classroom review and the rest of your confined water dives.'),
      openWaterDay(1, 'Open water dives 1 and 2.'),
      openWaterDay(2, 'Open water dives 3 and 4. You’re a diver.'),
    ],
    makeupSessions: 1,
    addOns: [
      {
        id: 'aware-specialist',
        name: 'PADI AWARE Specialist',
        description:
          'Our recommended add-on. Learn what threatens the underwater places you’re about to explore, and what divers can do about it. Offered at cost: the fee covers only the PADI certification card, and the instruction is free.',
        pricePerStudent: 5000, // at cost: PADI certification (PIC) fee
      },
    ],
    includes: [
      'PADI Open Water Diver manual (physical book, yours to keep)',
      'Classroom sessions with your instructor',
      '5 confined water dives in the pool at Scuba Etc',
      '4 open water dives',
      'All scuba gear rental and tanks',
      'One makeup session if you need it',
      'PADI certification',
    ],
    notIncluded: [
      'Mask, fins and snorkel (your own, fitted to you)',
      'Lake Denton entry fee ($20 per day, paid at the lake)',
    ],
  },

  // Core courses (Open Water Scuba Instructor rating). Pricing to come.
  { slug: 'discover-scuba', name: 'PADI Discover Scuba Diving', category: 'core', minAge: 10,
    summary: 'Try scuba in the pool with an instructor, no certification required.' },
  { slug: 'scuba-diver', name: 'PADI Scuba Diver', category: 'core', minAge: 10,
    summary: 'A shorter first step: certified to dive to 12 m (40 ft) with a PADI professional.' },
  { slug: 'advanced-open-water', name: 'PADI Advanced Open Water Diver', category: 'core', minAge: 12,
    prerequisites: 'PADI Open Water Diver or equivalent.',
    summary: 'Five adventure dives, including deep and navigation. Certified to 30 m (100 ft).' },
  { slug: 'rescue', name: 'PADI Rescue Diver', category: 'core', minAge: 12,
    prerequisites: 'Advanced Open Water and EFR (or equivalent) within the last 24 months.',
    summary: 'Learn to prevent and manage problems in the water. The course divers call the most rewarding.' },
  { slug: 'divemaster', name: 'PADI Divemaster', category: 'core', minAge: 18,
    prerequisites: 'Rescue Diver, EFR within 24 months, 40 logged dives to start, 60 to certify.',
    summary: 'Your first professional rating: lead certified divers and assist with training.' },
  { slug: 'reactivate', name: 'PADI ReActivate', category: 'core',
    prerequisites: 'Certified diver.',
    summary: 'Refresh your skills and knowledge after time away from diving.' },

  // Kids
  { slug: 'bubblemaker', name: 'PADI Bubblemaker', category: 'kids', minAge: 8,
    summary: 'Kids breathe underwater for the first time in the pool, in no more than 2 m (6 ft) of water.' },

  // Specialties (Frank holds a Specialty Instructor rating for each)
  { slug: 'enriched-air', name: 'Enriched Air (Nitrox) Diver', category: 'specialty', summary: 'Dive with nitrox for longer no-stop times.' },
  { slug: 'deep', name: 'Deep Diver', category: 'specialty', summary: 'Plan and make dives to 40 m (130 ft).' },
  { slug: 'peak-performance-buoyancy', name: 'Peak Performance Buoyancy', category: 'specialty', summary: 'Fine-tune weighting, trim and buoyancy control.' },
  { slug: 'underwater-navigator', name: 'Underwater Navigator', category: 'specialty', summary: 'Compass and natural navigation that gets you back to the exit.' },
  { slug: 'dsmb', name: 'Delayed Surface Marker Buoy', category: 'specialty', summary: 'Deploy a surface marker buoy from depth.' },
  { slug: 'drift', name: 'Drift Diver', category: 'specialty', summary: 'Ride the current safely, including Florida’s famous drift dives.' },
  { slug: 'boat', name: 'Boat Diver', category: 'specialty', summary: 'Boat diving procedures, etiquette and entries.' },
  { slug: 'search-and-recovery', name: 'Search & Recovery Diver', category: 'specialty', summary: 'Search patterns and lifting objects with a lift bag.' },
  { slug: 'equipment-specialist', name: 'Equipment Specialist', category: 'specialty', summary: 'Care for, adjust and troubleshoot your own gear.' },
  { slug: 'underwater-naturalist', name: 'Underwater Naturalist', category: 'specialty', summary: 'Understand the aquatic life and ecosystems you dive in.' },
  { slug: 'emergency-oxygen', name: 'Emergency Oxygen Provider', category: 'first-aid', summary: 'Recognize dive injuries and give emergency oxygen. Open to non-divers.' },

  // Conservation (ties in with cleanup efforts)
  { slug: 'dive-against-debris', name: 'PADI AWARE Dive Against Debris', category: 'conservation', summary: 'Remove and survey marine debris, and report it to the global database.' },
  { slug: 'aware-coral-reef', name: 'PADI AWARE Coral Reef Conservation', category: 'conservation', summary: 'How coral reefs work, the threats they face and how divers can help. No diving required.' },
  { slug: 'padi-aware', name: 'PADI AWARE Specialist', category: 'conservation', summary: 'Ocean conservation for divers who want to do something about it.' },

  // Emergency First Response (EFR Instructor)
  { slug: 'efr', name: 'Emergency First Response (Primary & Secondary Care)', category: 'first-aid', summary: 'CPR, AED and first aid. Required for Rescue Diver and open to non-divers.' },
  { slug: 'care-for-children', name: 'EFR Care for Children with AED', category: 'first-aid', summary: 'CPR and first aid for infants and children.' },
];

export const categoryLabels: Record<Category, string> = {
  core: 'Certification path',
  kids: 'Kids',
  specialty: 'Specialty courses',
  conservation: 'Conservation',
  'first-aid': 'First aid & safety',
};

export const isBookable = (c: Course): c is Course & Required<Pick<Course, 'pricing' | 'sessions'>> =>
  Boolean(c.pricing && c.sessions?.length);

export const getCourse = (slug: string) => courses.find((c) => c.slug === slug);
