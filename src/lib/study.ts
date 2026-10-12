
import { z } from 'zod';

export const kinds = [
  'contest',
  'subject',
  'topic',
  'questions',
  'mock',
  'goal',
  'review',
  'link',
  'schedule',
] as const;

const uuid = z.string().uuid();

const count = z.coerce.number().int().nonnegative();

const optionalNumber = z.preprocess(
  (value) => {
    if (
      value === '' ||
      value === undefined ||
      value === null
    ) {
      return null;
    }

    return value;
  },
  z.coerce.number().finite().nullable(),
);

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) => {
      const parsed = new Date(`${value}T00:00:00Z`);

      return (
        Number.isFinite(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
      );
    },
    'Data inválida',
  );

const schemas = {
  contest: z.object({
    name: z.string().trim().min(1, 'Informe o nome do concurso'),
    agency: z.string().default(''),
    role: z.string().default(''),
    board: z.string().default(''),
    year: z.preprocess(
      (value) =>
        value === '' || value === undefined || value === null
          ? null
          : value,
      z.coerce.number().int().nullable(),
    ).default(null),
    status: z.string().default('Pendente de verificação'),
    source: z.string().default(''),
    verification: z.string().default('Pendente de verificação'),
    archived: z.boolean().default(false),
    correct_value: optionalNumber.default(null),
    wrong_value: optionalNumber.default(null),
    blank_value: optionalNumber.default(null),
    elimination: z.string().default(''),
  }),

  subject: z.object({
    name: z.string().trim().min(1, 'Informe o nome da matéria'),
    contest_id: uuid,
    order: count.default(0),
  }),

  topic: z.object({
    name: z.string().trim().min(1, 'Informe o nome do tópico'),
    subject_id: uuid,
    parent_id: uuid.nullable().default(null),
    order: count.default(0),
    status: z
      .enum(['not_started', 'in_progress', 'completed', 'review'])
      .default('not_started'),
    estimated_hours: z.coerce.number().finite().nonnegative().default(0),
  }),

  questions: z
    .object({
      contest_id: uuid,
      subject_id: uuid,
      topic_id: uuid.nullable().default(null),
      date,
      total: count.positive(),
      correct: count,
      wrong: count,
      blank: count,
      notes: z.string().default(''),
      session_id: uuid.nullable().default(null),
    })
    .refine(
      (payload) =>
        payload.correct + payload.wrong + payload.blank === payload.total,
      'Acertos + erros + brancos devem ser iguais ao total',
    ),

  mock: z
    .object({
      contest_id: uuid,
      subject_id: uuid.nullable().default(null),
      topic_id: uuid.nullable().default(null),
      date,
      name: z.string().trim().min(1, 'Informe o nome do simulado'),
      rule: z.enum(['custom', 'contest', 'cebraspe']).default('custom'),
      total: count.positive(),
      correct: count,
      wrong: count,
      blank: count,
      correct_value: z.coerce.number().finite(),
      wrong_value: z.coerce.number().finite(),
      blank_value: z.coerce.number().finite(),
      elimination: z.string().default(''),
      notes: z.string().default(''),
    })
    .refine(
      (payload) =>
        payload.correct + payload.wrong + payload.blank === payload.total,
      'Acertos + erros + brancos devem ser iguais ao total',
    ),

  goal: z.object({
    date,
    daily_hours: z.coerce.number().finite().nonnegative(),
    weekly_hours: z.coerce.number().finite().nonnegative(),
    questions: count.default(0),
    contest_id: uuid.nullable().default(null),
  }),

  review: z.object({
    topic_id: uuid,
    date,
    done: z.boolean().default(false),
  }),

  link: z.object({
    topic_ids: z
      .array(uuid)
      .min(2)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        'Selecione tópicos diferentes',
      ),
    confirmed: z.literal(true),
  }),

  schedule: z.object({
    contest_id: uuid,
    days: z.array(z.number().int().min(0).max(6)).min(1, 'Escolha ao menos um dia'),
    minutes_per_day: z.coerce.number().int().min(15).max(960),
    block_minutes: z.coerce.number().int().min(15).max(240),
    start_time: z.string().regex(/^(\d{2}:\d{2})?$/).default(''),
    review: z.boolean().default(true),
    questions: z.boolean().default(true),
    subjects: z
      .array(z.object({ subject_id: uuid, priority: z.number().int().min(1).max(3) }))
      .min(1, 'Escolha ao menos uma matéria'),
    week_start: date,
    blocks: z
      .array(
        z.object({
          id: z.string().min(1),
          date,
          subject_id: uuid,
          activity: z.enum(['theory', 'questions', 'review']),
          minutes: z.coerce.number().int().positive(),
          done: z.boolean().default(false),
          session_id: uuid.nullable().default(null),
        }),
      )
      .max(500),
  }),
};

export function validatePayload(
  kind: (typeof kinds)[number],
  payload: unknown,
) {
  return schemas[kind].parse(payload);
}

export type Payload = {
  name?: any;
  agency?: any;
  role?: any;
  board?: any;
  year?: any;
  status?: any;
  source?: any;
  verification?: any;
  archived?: any;
  correct_value?: any;
  wrong_value?: any;
  blank_value?: any;
  elimination?: any;
  contest_id?: any;
  subject_id?: any;
  topic_id?: any;
  parent_id?: any;
  order?: any;
  estimated_hours?: any;
  date?: any;
  total?: any;
  correct?: any;
  wrong?: any;
  blank?: any;
  notes?: any;
  session_id?: any;
  daily_hours?: any;
  weekly_hours?: any;
  questions?: any;
  done?: any;
  topic_ids?: any;
  confirmed?: any;
  rule?: any;
  [key: string]: any;
};

export type Item = {
  id: string;
  kind: (typeof kinds)[number];
  payload: Payload;
  created_at: string;
};

export type Session = {
  id: string;
  contest_ids: string[];
  subject_id: string;
  topic_id: string | null;
  state: string;
  started_at: string;
  running_since: string | null;
  elapsed_seconds: number;
  finished_at: string | null;
  pauses: any;
  notes: string;
};

export type Snapshot = {
  items: Item[];
  sessions: Session[];
  profile: {
    display_name: string;
    avatar_url: string | null;
    preferences: any;
  } | null;
};

export const empty: Snapshot = {
  items: [],
  sessions: [],
  profile: null,
};

export function questionStats(rows: Item[]) {
  const sum = (key: string) =>
    rows.reduce((total, row) => {
      const value = Number(row.payload[key] ?? 0);
      return total + (Number.isFinite(value) ? value : 0);
    }, 0);

  const total = sum('total');
  const correct = sum('correct');
  const wrong = sum('wrong');
  const blank = sum('blank');
  const answered = correct + wrong;

  return {
    total,
    correct,
    wrong,
    blank,
    answered,
    rate: answered > 0 ? (correct / answered) * 100 : null,
    percentage: total > 0 ? (correct / total) * 100 : null,
  };
}

export const score = (payload: Payload) => {
  const correct = Number(payload.correct ?? 0);
  const wrong = Number(payload.wrong ?? 0);
  const blank = Number(payload.blank ?? 0);

  const correctValue = Number(payload.correct_value ?? 0);
  const wrongValue = Number(payload.wrong_value ?? 0);
  const blankValue = Number(payload.blank_value ?? 0);

  return (
    correct * correctValue +
    wrong * wrongValue +
    blank * blankValue
  );
};

export function elapsed(session: Session, now = Date.now()) {
  const accumulated = Number(session.elapsed_seconds) || 0;

  if (
    session.state !== 'running' ||
    !session.running_since
  ) {
    return Math.max(0, accumulated);
  }

  const started = Date.parse(session.running_since);

  if (!Number.isFinite(started)) {
    return Math.max(0, accumulated);
  }

  return Math.max(
    0,
    accumulated + Math.max(0, now - started) / 1000,
  );
}

export function clock(seconds: number) {
  const safeSeconds = Number.isFinite(seconds)
    ? Math.max(0, Math.floor(seconds))
    : 0;

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

export function hours(seconds: number) {
  const safeSeconds = Number.isFinite(seconds)
    ? Math.max(0, Math.floor(seconds))
    : 0;

  const totalMinutes = Math.floor(safeSeconds / 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return `${wholeHours}h ${String(remainingMinutes).padStart(2, '0')}min`;
}

export function day(d = new Date()) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

export function secondsOnDay(session: Session, date: string) {
  const start = Date.parse(session.started_at);

  if (!Number.isFinite(start)) {
    return 0;
  }

  const end = session.finished_at
    ? Date.parse(session.finished_at)
    : Date.now();

  if (!Number.isFinite(end) || end <= start) {
    return 0;
  }

  const dayStart = new Date(`${date}T00:00:00`).getTime();

  if (!Number.isFinite(dayStart)) {
    return 0;
  }

  const nextDay = new Date(`${date}T00:00:00`);
  nextDay.setDate(nextDay.getDate() + 1);
  const dayEnd = nextDay.getTime();

  if (!Number.isFinite(dayEnd) || dayEnd <= dayStart) {
    return 0;
  }

  const pauses = Array.isArray(session.pauses)
    ? session.pauses
    : [];

  const intervals: Array<[number, number]> = [];
  let cursor = start;

  for (const pause of pauses) {
    const pauseStart = Date.parse(pause?.start ?? '');
    const pauseEnd = pause?.end
      ? Date.parse(pause.end)
      : end;

    if (
      !Number.isFinite(pauseStart) ||
      pauseStart < cursor ||
      pauseStart > end
    ) {
      continue;
    }

    const validPauseEnd = Number.isFinite(pauseEnd)
      ? Math.min(Math.max(pauseEnd, pauseStart), end)
      : end;

    if (pauseStart > cursor) {
      intervals.push([cursor, pauseStart]);
    }

    cursor = Math.max(cursor, validPauseEnd);

    if (cursor >= end) {
      break;
    }
  }

  if (cursor < end) {
    intervals.push([cursor, end]);
  }

  const overlapMilliseconds = intervals.reduce(
    (total, [intervalStart, intervalEnd]) => {
      const overlapStart = Math.max(intervalStart, dayStart);
      const overlapEnd = Math.min(intervalEnd, dayEnd);

      return total + Math.max(0, overlapEnd - overlapStart);
    },
    0,
  );

  const actualMilliseconds = intervals.reduce(
    (total, [intervalStart, intervalEnd]) =>
      total + Math.max(0, intervalEnd - intervalStart),
    0,
  );

  if (actualMilliseconds <= 0) {
    return 0;
  }

  const recordedSeconds = elapsed(session);

  if (!Number.isFinite(recordedSeconds) || recordedSeconds <= 0) {
    return 0;
  }

  return (
    (overlapMilliseconds / actualMilliseconds) *
    recordedSeconds
  );
}
