import { describe, it, expect } from 'vitest';
import { parseEdital, splitTopics, dedupeSubjects } from '@/lib/edital-parser';
import { buildSummary } from '@/lib/summary';

const sample = `EDITAL Nº 1 – POLÍCIA FEDERAL, DE 2025
Cebraspe
CONHECIMENTOS BÁSICOS
LÍNGUA PORTUGUESA: 1 Compreensão de textos. 2 Ortografia oficial. 2.1 Acentuação gráfica. 3 Pontuação.
DIREITO CONSTITUCIONAL: 1 Constituição de 1988. 2 Direitos e garantias fundamentais.`;

describe('importação de edital', () => {
  it('extrai disciplinas, tópicos e subtópicos com hierarquia', () => {
    const d = parseEdital(sample);
    expect(d.agency).toBe('Polícia Federal');
    expect(d.board).toBe('Cebraspe');
    expect(d.subjects.map(s => s.name)).toEqual(['Língua Portuguesa', 'Direito Constitucional']);
    const lp = d.subjects[0].topics;
    expect(lp).toHaveLength(3);
    expect(lp[1].children[0].name).toBe('2.1 Acentuação gráfica');
  });
  it('não quebra números que não seguem a sequência', () => {
    expect(splitTopics('1 Lei 8 112 de 1990. 2 Ética.').map(t => t.name)).toEqual(['1 Lei 8 112 de 1990', '2 Ética']);
  });
  it('remove disciplinas e tópicos duplicados', () => {
    const r = dedupeSubjects([{ name: 'Ética', topics: [{ name: '1 A', children: [] }] }, { name: 'ÉTICA', topics: [{ name: '1 a', children: [] }, { name: '2 B', children: [] }] }]);
    expect(r).toHaveLength(1);
    expect(r[0].topics.map(t => t.name)).toEqual(['1 A', '2 B']);
  });
  it('PDF sem conteúdo programático não gera disciplinas', () => {
    expect(parseEdital('texto qualquer sem estrutura').subjects).toEqual([]);
  });
});

describe('resumo de desempenho', () => {
  const item = (id: string, kind: any, payload: any) => ({ id, kind, payload, created_at: '2026-01-01T00:00:00Z' }) as any;
  it('não ranqueia disciplina com menos de 20 respondidas e separa brancos', () => {
    const items = [item('s1', 'subject', { name: 'A', contest_id: 'c' }), item('q1', 'questions', { contest_id: 'c', subject_id: 's1', date: '2026-10-20', total: 12, correct: 5, wrong: 5, blank: 2 })];
    const s = buildSummary(items, [], 'c', '2026-10-26');
    expect(s.weakest).toEqual([]);
    expect(s.stats.blank).toBe(2);
    expect(s.stats.rate).toBe(50);
    expect(s.trend).toBeNull();
  });
  it('filtra por concurso sem misturar dados', () => {
    const items = [item('q1', 'questions', { contest_id: 'x', subject_id: 's', date: '2026-10-20', total: 10, correct: 10, wrong: 0, blank: 0 })];
    expect(buildSummary(items, [], 'c', '2026-10-26').stats.total).toBe(0);
    expect(buildSummary(items, [], '', '2026-10-26').stats.total).toBe(10);
  });
});
