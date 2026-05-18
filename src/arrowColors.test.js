import { describe, expect, it } from 'vitest';
import { ARROW_COLORS, advanceArrowColorQueue, createArrowColorQueue, pickArrowColor } from './arrowColors.js';

describe('arrow color queue', () => {
  it('picks only supported arrow colors', () => {
    expect(ARROW_COLORS).toEqual(['green', 'yellow', 'blue']);
    expect(ARROW_COLORS).toContain(pickArrowColor(() => 0));
    expect(ARROW_COLORS).toContain(pickArrowColor(() => 0.99));
  });

  it('stores current and next colors', () => {
    const queue = createArrowColorQueue({ random: () => 0 });
    expect(queue.current).toBe('green');
    expect(queue.next).toBe('green');
  });

  it('advances next into current and rolls a new next color', () => {
    const values = [0.1, 0.8, 0.4];
    const random = () => values.shift();
    const queue = createArrowColorQueue({ random });
    const advanced = advanceArrowColorQueue(queue, random);

    expect(queue).toEqual({ current: 'green', next: 'blue' });
    expect(advanced).toEqual({ current: 'blue', next: 'yellow' });
  });
});
