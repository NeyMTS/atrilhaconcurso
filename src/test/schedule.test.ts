import { describe, expect, it } from 'vitest';
import { generate, rebalance, weekDates } from '@/lib/schedule';

const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const config = { contest_id: a, days: [1, 3], minutes_per_day: 150, block_minutes: 50, start_time: '', review: true, questions: true, subjects: [{ subject_id: a, priority: 3 }, { subject_id: b, priority: 1 }] };

describe('cronograma', () => {
  it('distribui blocos só nos dias e horas informados', () => {
    const blocks = generate(config, '2026-10-12');
    expect(blocks).toHaveLength(6);
    expect(new Set(blocks.map((x) => x.date))).toEqual(new Set(['2026-10-12', '2026-10-14']));
    expect(blocks.filter((x) => x.subject_id === a).length).toBeGreaterThan(blocks.filter((x) => x.subject_id === b).length);
    expect(blocks.some((x) => x.activity === 'review')).toBe(true);
  });
  it('move pendentes atrasados para dias futuros com espaço', () => {
    const blocks = generate({ ...config, minutes_per_day: 100 }, '2026-10-12');
    const s = { ...config, minutes_per_day: 200, week_start: '2026-10-12', blocks };
    const r = rebalance(s, '2026-10-13');
    expect(r.moved).toBe(2);
    expect(r.blocks.every((x) => x.date === '2026-10-14')).toBe(true);
    expect(weekDates('2026-10-12')).toHaveLength(7);
  });
});
