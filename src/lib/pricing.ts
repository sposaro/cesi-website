import { getCourse, isBookable } from '../data/courses';
import { booking, diveSites } from '../config/site';

export interface OrderInput {
  courseSlug: string;
  diveSiteId: string;
  students: number;
  addOns?: string[];
}

export interface LineItem {
  name: string;
  description: string;
  unitAmount: number; // cents
  quantity: number;
}

/** Server-side price calculation. Never trust prices sent from the browser. */
export function priceOrder(input: OrderInput): { lineItems: LineItem[]; total: number } {
  const course = getCourse(input.courseSlug);
  if (!course || !isBookable(course)) throw new OrderError('That course is not available for online booking.');
  const site = diveSites.find((s) => s.id === input.diveSiteId);
  if (!site) throw new OrderError('Unknown dive site.');
  if (site.surchargePerStudent === null) throw new OrderError(`Contact us to book ${site.name}.`);
  const students = Math.trunc(input.students);
  if (!(students >= 1 && students <= booking.maxGroupSize)) {
    throw new OrderError(`Choose between 1 and ${booking.maxGroupSize} students.`);
  }

  const isPrivate = students === 1;
  const lineItems: LineItem[] = [
    {
      name: `${course.name} (${isPrivate ? 'private' : `group of ${students}`})`,
      description: isPrivate ? 'One-on-one instruction' : 'Price per student',
      unitAmount: isPrivate ? course.pricing.privatePrice : course.pricing.groupPricePerStudent,
      quantity: students,
    },
  ];
  if (site.surchargePerStudent > 0) {
    lineItems.push({
      name: `Open water dives at ${site.name}`,
      description: 'Travel surcharge, per student',
      unitAmount: site.surchargePerStudent,
      quantity: students,
    });
  }
  for (const id of new Set(input.addOns ?? [])) {
    const addOn = course.addOns?.find((a) => a.id === id);
    if (!addOn) throw new OrderError('Unknown add-on.');
    if (addOn.pricePerStudent === null) throw new OrderError(`Ask your instructor to add ${addOn.name}.`);
    lineItems.push({ name: addOn.name, description: 'Add-on, per student', unitAmount: addOn.pricePerStudent, quantity: students });
  }
  const total = lineItems.reduce((sum, li) => sum + li.unitAmount * li.quantity, 0);
  return { lineItems, total };
}

export class OrderError extends Error {}

export const formatUsd = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
