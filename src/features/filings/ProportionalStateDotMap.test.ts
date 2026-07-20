import { describe, expect, it } from 'vitest';
import { scaledStateDotRadius } from './ProportionalStateDotMap';

describe('proportional state dot sizing', () => {
  it('uses a strictly increasing square-root radius for positive filing counts', () => {
    const small = scaledStateDotRadius(1, 100);
    const medium = scaledStateDotRadius(25, 100);
    const large = scaledStateDotRadius(100, 100);

    expect(scaledStateDotRadius(0, 100)).toBe(0);
    expect(small).toBeLessThan(medium);
    expect(medium).toBeLessThan(large);
    expect(large).toBe(22);
  });
});
