// Business settings. Edit these values; the site and booking APIs both read from here.

export const org = {
  name: 'The CESI Project',
  legalName: 'Sposaro Conservation, Education, Sustainability, Initiative INC',
  ein: '41-2621387',
  taxStatus: '501(c)(3) nonprofit',
  email: 'secretary@cesi.earth',
  donateUrl: 'https://www.zeffy.com/en-US/donation-form/conservation-education-sustainability',
  youtube: 'https://www.youtube.com/@cesiearth',
};

/** Swan City Scuba: an educational program of The CESI Project. */
export const site = {
  name: 'Swan City Scuba',
  tagline: 'Scuba education for conservation, in Lakeland, Florida',
  basePath: '/swancityscuba',
  instructor: {
    name: 'Dr. Frank Sposaro',
    title: 'PADI Open Water Scuba Instructor',
    padiNumber: '578633',
  },
  // Shown on program pages. Leave blank to hide.
  contact: {
    email: '', // e.g. 'dive@cesi.earth' once the mailbox exists
    phone: '',
  },
  timeZone: 'America/New_York',
  shop: {
    name: 'Scuba Etc',
    city: 'Lakeland, FL',
    // Street address for calendar invites.
    address: 'Scuba Etc, 715 Alicia Rd, Lakeland, FL 33801',
  },
  lakeDentonFeePerDay: 20,
};

export interface DiveSite {
  id: string;
  name: string;
  description: string;
  address: string;
  /** Extra charge in cents per student. null = not sold online yet ("contact us"). */
  surchargePerStudent: number | null;
  /** How long an open-water day blocks your calendar, including travel. */
  openWaterDayHours: number;
  /** Local start times offered for open-water days at this site. */
  openWaterStartTimes: string[];
  siteFeeNote?: string;
}

// Open water training sites offered at enrollment. To offer another site (e.g. Florida springs),
// add an entry with its surchargePerStudent; the enrollment form shows a choice once there are two.
export const diveSites: DiveSite[] = [
  {
    id: 'lake-denton',
    name: 'Lake Denton',
    description: 'Clear, calm freshwater training site near Avon Park, about an hour from Lakeland.',
    address: 'Lake Denton, 790 Lake Denton Rd, Avon Park, FL 33825',
    surchargePerStudent: 0,
    openWaterDayHours: 8,
    openWaterStartTimes: ['07:00', '08:00'],
    siteFeeNote: `$${site.lakeDentonFeePerDay} per day entry fee, paid at the lake.`,
  },
];

export const booking = {
  /** Students can't book sooner than this many hours from now. */
  minLeadHours: 48,
  /** How far ahead students can book. */
  maxDaysAhead: 120,
  maxGroupSize: 4,
};

export const policies = {
  // Recommended wording — see docs/swancityscuba-setup.md "Refund policy". Edit freely.
  refund: [
    'Tuition is paid in full up front and is non-refundable. Your course materials are purchased for you as soon as you enroll.',
    'You can reschedule any session at no charge with at least 48 hours’ notice.',
    'If we cancel a session for weather, water conditions or safety, we reschedule it at no charge.',
    'If a physician does not clear you to dive, your tuition is refunded minus the cost of course materials.',
    'Enrollments are valid for 12 months from purchase.',
  ],
  medical:
    'Before any in-water session you must complete the Diver Medical Participant Questionnaire. If you answer “yes” to any question, you need a physician’s signed approval before getting in the water.',
  // Link to the questionnaire PDF, if you want one on the site.
  medicalFormUrl: '',
  tuitionNotDonation:
    'Tuition pays for educational instruction and is not a tax-deductible donation. Separate gifts to The CESI Project are tax-deductible to the extent allowed by law.',
};
