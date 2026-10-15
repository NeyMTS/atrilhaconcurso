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
  const block = (id: string, date: string, done = false, subject_id = a) => ({ id, date, subject_id, activity: 'theory' as const, minutes: 50, done, session_id: null });
  const plan = { ...config, start_time: '08:00', minutes_per_day: 100, week_start: '2026-10-12' };
  it('move atrasados sem duplicar, preserva concluídos e é estável na repetição', () => {
    const s = { ...plan, blocks: [block('done', '2026-10-12', true), block('late', '2026-10-12'), block('valid', '2026-10-14')] };
    const r = rebalance(s, new Date('2026-10-13T12:00:00'));
    expect(r.blocks.map((x) => x.id)).toEqual(['done', 'late', 'valid']);
    expect(r.blocks[0]).toEqual(s.blocks[0]);
    expect(r.blocks.find((x) => x.id === 'late')?.date).toBe('2026-10-14');
    expect(r.blocks.find((x) => x.id === 'valid')?.date).toBe('2026-10-14');
    const again = rebalance({ ...s, blocks: r.blocks, start_minutes: r.start_minutes }, new Date('2026-10-13T12:00:00'));
    expect(again.moved).toBe(0);
    expect(weekDates('2026-10-12')).toHaveLength(7);
  });
  it('não usa horário já passado e avança para a semana seguinte quando lotada', () => {
    const s = { ...plan, blocks: [block('late', '2026-10-12', false, b), block('w1', '2026-10-14'), block('w2', '2026-10-14')] };
    const r = rebalance(s, new Date('2026-10-14T09:00:00'));
    expect(r.blocks.find((x) => x.id === 'late')?.date).toBe('2026-10-19');
    expect(r.blocks.every((x) => x.date >= '2026-10-14')).toBe(true);
    expect(r.blocks.filter((x) => x.id === 'w1')).toHaveLength(1);
  });
  it('prioriza matéria mais importante na vaga mais próxima', () => {
    const s = { ...plan, blocks: [block('low', '2026-10-12', false, b), block('high', '2026-10-12', false, a), block('busy', '2026-10-14')] };
    const r = rebalance(s, new Date('2026-10-13T12:00:00'));
    expect(r.blocks.find((x) => x.id === 'high')?.date).toBe('2026-10-14');
    expect(r.blocks.find((x) => x.id === 'low')?.date).toBe('2026-10-19');
  });
});
