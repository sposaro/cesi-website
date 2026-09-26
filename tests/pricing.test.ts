import { describe, expect, it } from 'vitest';
import { getCourse } from '../src/data/courses';
import { OrderError, priceOrder } from '../src/lib/pricing';

describe('priceOrder', () => {
  it('charges the private rate for one student', () => {
    expect(priceOrder({ courseSlug: 'open-water', diveSiteId: 'lake-denton', students: 1 }).total).toBe(70000);
  });

  it('charges the group rate per student for 2 to 4', () => {
    expect(priceOrder({ courseSlug: 'open-water', diveSiteId: 'lake-denton', students: 3 }).total).toBe(3 * 62500);
  });

  it('rejects bad input', () => {
    expect(() => priceOrder({ courseSlug: 'open-water', diveSiteId: 'lake-denton', students: 5 })).toThrow(OrderError);
    expect(() => priceOrder({ courseSlug: 'open-water', diveSiteId: 'lake-denton', students: 0 })).toThrow(OrderError);
    expect(() => priceOrder({ courseSlug: 'deep', diveSiteId: 'lake-denton', students: 1 })).toThrow(OrderError);
    expect(() => priceOrder({ courseSlug: 'open-water', diveSiteId: 'nowhere', students: 1 })).toThrow(OrderError);
  });

  it('adds a priced add-on per student', () => {
    const addOn = getCourse('open-water')!.addOns!.find((a) => a.id === 'aware-specialist')!;
    const original = addOn.pricePerStudent;
    addOn.pricePerStudent = 5000;
    try {
      expect(priceOrder({ courseSlug: 'open-water', diveSiteId: 'lake-denton', students: 2, addOns: ['aware-specialist'] }).total).toBe(2 * 62500 + 2 * 5000);
    } finally {
      addOn.pricePerStudent = original;
    }
  });

  it('does not sell add-ons without a price yet', () => {
    expect(() => priceOrder({ courseSlug: 'open-water', diveSiteId: 'lake-denton', students: 1, addOns: ['aware-specialist'] })).toThrow(/Ask your instructor/);
    expect(() => priceOrder({ courseSlug: 'open-water', diveSiteId: 'lake-denton', students: 1, addOns: ['nope'] })).toThrow(OrderError);
  });

  it('does not sell sites without a price yet', () => {
    expect(() => priceOrder({ courseSlug: 'open-water', diveSiteId: 'florida-springs', students: 1 })).toThrow(/Contact us/);
  });
});
