import { describe, expect, it } from 'vitest';
import { timerInputSchema, parseInput } from '@/lib/study-validation';
import { validatePayload } from '@/lib/study';
const id = '00000000-0000-4000-8000-000000000001';
describe('saving regressions', () => {
  for (const action of ['pause', 'resume', 'finish']) {
    it(`${action} works after reload with empty selectors`, () => {
      expect(parseInput(timerInputSchema, { action, id, contest_ids: [''], subject_id: '', notes: '' })).toEqual({ action, id, notes: '' });
    });
  }
  it('start still requires valid content', () => {
    expect(() => parseInput(timerInputSchema, { action: 'start', contest_ids: [''], subject_id: '' })).toThrow('Concurso');
    expect(() => parseInput(timerInputSchema, { action: 'finish' })).toThrow('Registro');
  });
  it('optional empty links can be saved', () => {
    expect(validatePayload('goal', { date: '2026-10-12', daily_hours: 1, weekly_hours: 5, contest_id: '' })).toMatchObject({ contest_id: null });
    expect(validatePayload('questions', { contest_id: id, subject_id: id, topic_id: '', date: '2026-10-12', total: 1, correct: 1, wrong: 0, blank: 0 })).toMatchObject({ topic_id: null });
  });
  it('shows readable validation messages rather than raw errors', () => {
    expect(() => validatePayload('questions', { contest_id: '', subject_id: '' })).toThrow('Concurso: Selecione um registro válido.');
  });
});