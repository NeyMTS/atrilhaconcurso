import { describe, expect, it } from 'vitest';
import { blockTimes, generate, rebalance, weekDates } from '@/lib/schedule';
import { validatePayload } from '@/lib/study';

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
  it('mantém blocos de hoje visíveis e avança atrasados para o próximo dia livre', () => {
    const s = { ...plan, blocks: [block('late', '2026-10-12', false, b), block('w1', '2026-10-14'), block('w2', '2026-10-14')] };
    const r = rebalance(s, new Date('2026-10-14T09:00:00'));
    expect(r.blocks.find((x) => x.id === 'w1')?.date).toBe('2026-10-14');
    expect(r.blocks.find((x) => x.id === 'w2')?.date).toBe('2026-10-14');
    expect(r.blocks.find((x) => x.id === 'late')!.date > '2026-10-14').toBe(true);
    expect(r.blocks.filter((x) => x.id === 'w1')).toHaveLength(1);
  });
  it('modo hora extra soma o atrasado a um dia que já tem cronograma', () => {
    const s = { ...plan, blocks: [block('late', '2026-10-12', false, b), block('w1', '2026-10-14'), block('w2', '2026-10-14')] };
    const r = rebalance(s, new Date('2026-10-14T09:00:00'), 'extra');
    expect(r.blocks.find((x) => x.id === 'late')?.date).toBe('2026-10-14');
    expect(r.blocks).toHaveLength(3);
    const again = rebalance({ ...s, blocks: r.blocks, start_minutes: r.start_minutes }, new Date('2026-10-14T09:00:00'), 'extra');
    expect(again.moved).toBe(0);
  });
  it('prioriza matéria mais importante na vaga mais próxima', () => {
    const s = { ...plan, blocks: [block('low', '2026-10-12', false, b), block('high', '2026-10-12', false, a), block('busy', '2026-10-14')] };
    const r = rebalance(s, new Date('2026-10-13T12:00:00'));
    expect(r.blocks.find((x) => x.id === 'high')?.date).toBe('2026-10-14');
    expect(r.blocks.find((x) => x.id === 'low')?.date).toBe('2026-10-19');
  });
  it('usa apenas a parte restante de hoje, sem deslocar compromissos válidos', () => {
    const s = { ...plan, minutes_per_day: 180, blocks: [block('late', '2026-10-12'), block('future', '2026-10-14')], start_minutes: { future: 600 } };
    const now = new Date('2026-10-14T09:05:01');
    const r = rebalance(s, now);
    expect(r.start_minutes?.['late']).toBe(546);
    expect(r.start_minutes?.['future']).toBe(600);
    expect(blockTimes({ ...s, ...r }, '2026-10-14').map((x) => x.time)).toEqual(['09:06', '10:00']);
    expect(rebalance({ ...s, ...r }, now).moved).toBe(0);
  });
  it('sem horário inicial não inventa disponibilidade hoje; bloco impossível permanece intacto', () => {
    const s = { ...plan, start_time: '', blocks: [block('late', '2026-10-12'), { ...block('large', '2026-10-12'), minutes: 150 }] };
    const r = rebalance(s, new Date('2026-10-14T08:00:00'));
    expect(r.blocks[0]?.date).toBe('2026-10-19');
    expect(r.blocks[1]).toEqual(s.blocks[1]);
    expect(r.left).toBe(1);
  });
  it('semana cheia reserva também concluídos e mantém dados e horários após salvar/restaurar', () => {
    const s = { ...plan, blocks: [block('late', '2026-10-12'), block('complete', '2026-10-14', true), block('future', '2026-10-14'), block('next1', '2026-10-19'), block('next2', '2026-10-19')] };
    const before = structuredClone(s);
    const r = rebalance(s, new Date('2026-10-13T12:00:00'));
    expect(r.blocks[0]?.date).toBe('2026-10-21');
    expect(r.blocks.slice(1)).toEqual(s.blocks.slice(1));
    expect(s).toEqual(before);
    const restored = validatePayload('schedule', JSON.parse(JSON.stringify({ ...s, ...r }))) as typeof s & { start_minutes?: Record<string, number> };
    expect(restored.blocks).toEqual(r.blocks);
    expect(restored.start_minutes).toEqual(r.start_minutes);
    expect(rebalance(restored, new Date('2026-10-13T12:00:00')).moved).toBe(0);
  });
});
