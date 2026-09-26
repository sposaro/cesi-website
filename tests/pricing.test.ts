import { describe, expect, it } from 'vitest';
import { getCourse } from '../src/data/courses';
import { diveSites } from '../src/config/site';
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

  it('adds the AWARE add-on per student', () => {
    expect(priceOrder({ courseSlug: 'open-water', diveSiteId: 'lake-denton', students: 2, addOns: ['aware-specialist'] }).total).toBe(2 * 62500 + 2 * 5000);
    // Duplicates are only charged once
    expect(priceOrder({ courseSlug: 'open-water', diveSiteId: 'lake-denton', students: 1, addOns: ['aware-specialist', 'aware-specialist'] }).total).toBe(70000 + 5000);
  });

  it('does not sell add-ons without a price yet', () => {
    const addOn = getCourse('open-water')!.addOns!.find((a) => a.id === 'aware-specialist')!;
    const original = addOn.pricePerStudent;
    addOn.pricePerStudent = null;
    try {
      expect(() => priceOrder({ courseSlug: 'open-water', diveSiteId: 'lake-denton', students: 1, addOns: ['aware-specialist'] })).toThrow(/Ask your instructor/);
    } finally {
      addOn.pricePerStudent = original;
    }
    expect(() => priceOrder({ courseSlug: 'open-water', diveSiteId: 'lake-denton', students: 1, addOns: ['nope'] })).toThrow(OrderError);
  });

  it('does not sell sites without a price yet', () => {
    diveSites.push({ ...diveSites[0], id: 'unpriced-site', name: 'Unpriced site', surchargePerStudent: null });
    try {
      expect(() => priceOrder({ courseSlug: 'open-water', diveSiteId: 'unpriced-site', students: 1 })).toThrow(/Contact us/);
    } finally {
      diveSites.pop();
    }
  });
});
