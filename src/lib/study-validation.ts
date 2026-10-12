import { z } from 'zod';

const uuid = z.string().uuid('Selecione um registro válido.');
export const timerInputSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start'), contest_ids: z.array(uuid).min(1, 'Selecione um concurso.'), subject_id: uuid, topic_id: uuid.nullable().optional() }),
  ...(['pause', 'resume', 'finish'] as const).map((action) => z.object({ action: z.literal(action), id: uuid, notes: z.string().optional() })),
]);

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields: Record<string, string> = { contest_id: 'Concurso', contest_ids: 'Concurso', subject_id: 'Disciplina', topic_id: 'Tópico', parent_id: 'Tópico pai', id: 'Registro', total: 'Total', date: 'Data', minutes_per_day: 'Horas por dia' };
  throw new Error([...new Set(result.error.issues.map((issue) => {
    const field = fields[String(issue.path[0])];
    const message = issue.message === 'Required' ? 'Preencha este campo.' : issue.message;
    return field ? `${field}: ${message}` : message;
  }))].join(' '));
}