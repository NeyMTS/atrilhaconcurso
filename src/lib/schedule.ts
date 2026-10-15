import { day, secondsOnDay, type Session } from './study';

export type Activity = 'theory' | 'questions' | 'review';
export type Block = {
  id: string;
  date: string;
  subject_id: string;
  activity: Activity;
  minutes: number;
  done: boolean;
  session_id: string | null;
};
export type ScheduleConfig = {
  contest_id: string;
  days: number[];
  minutes_per_day: number;
  block_minutes: number;
  start_time: string;
  review: boolean;
  questions: boolean;
  subjects: { subject_id: string; priority: number }[];
};
export type Schedule = ScheduleConfig & { week_start: string; blocks: Block[]; start_minutes?: Record<string, number> };

export const activityLabels: Record<Activity, string> = {
  theory: 'Teoria',
  questions: 'Questões',
  review: 'Revisão',
};
export const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const parse = (d: string) => new Date(`${d}T00:00:00`);

export function weekStart(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return day(x);
}

export function weekDates(start: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const x = parse(start);
    x.setDate(x.getDate() + i);
    return day(x);
  });
}

let seq = 0;
const newId = () => `b${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Distributes subjects in blocks across the chosen weekdays, weighted by priority. */
export function generate(config: ScheduleConfig, start: string): Block[] {
  const weighted: string[] = [];
  const max = Math.max(...config.subjects.map((s) => s.priority));
  for (let round = 0; round < max; round++)
    for (const s of [...config.subjects].sort((a, b) => b.priority - a.priority))
      if (s.priority > round) weighted.push(s.subject_id);
  if (!weighted.length) return [];
  const perDay = Math.max(1, Math.floor(config.minutes_per_day / config.block_minutes));
  const blocks: Block[] = [];
  const studiedThisWeek: string[] = [];
  let cursor = 0;
  for (const date of weekDates(start)) {
    if (!config.days.includes(parse(date).getDay())) continue;
    for (let i = 0; i < perDay; i++) {
      const isLast = i === perDay - 1 && perDay > 1;
      let activity: Activity = 'theory';
      let subject = weighted[cursor % weighted.length];
      if (!subject) continue;
      if (config.review && isLast && studiedThisWeek.length) {
        activity = 'review';
        subject = studiedThisWeek[blocks.length % studiedThisWeek.length] ?? subject;
      } else {
        if (config.questions && i % 3 === 2) activity = 'questions';
        cursor++;
        if (!studiedThisWeek.includes(subject)) studiedThisWeek.push(subject);
      }
      blocks.push({ id: newId(), date, subject_id: subject, activity, minutes: config.block_minutes, done: false, session_id: null });
    }
  }
  return blocks;
}

/** Legacy blocks retain their original positions even when earlier tasks move away. */
function positions(schedule: Schedule) {
  const starts = { ...schedule.start_minutes };
  const cursors: Record<string, number> = {};
  const [h = 0, m = 0] = schedule.start_time.split(':').map(Number);
  const beginning = h * 60 + m;
  for (const b of schedule.blocks) {
    const start = starts[b.id] ?? cursors[b.date] ?? beginning;
    starts[b.id] = start;
    cursors[b.date] = Math.max(cursors[b.date] ?? beginning, start + b.minutes);
  }
  return starts;
}

/** Reserve valid appointments first, then place overdue/invalid tasks into real free gaps. */
export function rebalance(schedule: Schedule, reference: Date | string = new Date()) {
  const now = typeof reference === 'string' ? parse(reference) : reference;
  const today = day(now);
  const currentMinute = Math.ceil((now.getTime() - parse(today).getTime()) / 60000);
  const [h = 0, m = 0] = schedule.start_time.split(':').map(Number);
  const beginning = h * 60 + m;
  const end = Math.min(1440, beginning + schedule.minutes_per_day);
  const starts = positions(schedule);
  const occupied = new Map<string, [number, number][]>();
  const reserve = (date: string, start: number, minutes: number) => {
    const intervals = occupied.get(date) ?? [];
    intervals.push([start, start + minutes]);
    intervals.sort((a, b) => a[0] - b[0]);
    occupied.set(date, intervals);
  };
  const overlaps = (date: string, start: number, minutes: number) =>
    (occupied.get(date) ?? []).some(([a, b]) => start < b && start + minutes > a);
  const lowerBound = (date: string) => date === today ? Math.max(beginning, currentMinute) : beginning;
  const availableDay = (date: string) => date >= today && schedule.days.includes(parse(date).getDay()) &&
    (date !== today || Boolean(schedule.start_time));

  // Completed records never change, and still occupy their original slots.
  for (const b of schedule.blocks) if (b.done) reserve(b.date, starts[b.id] ?? beginning, b.minutes);
  const pending: Block[] = [];
  for (const b of schedule.blocks) {
    if (b.done) continue;
    const start = starts[b.id] ?? beginning;
    if (availableDay(b.date) && start >= lowerBound(b.date) && start + b.minutes <= end && !overlaps(b.date, start, b.minutes))
      reserve(b.date, start, b.minutes);
    else pending.push(b);
  }
  const priority = new Map(schedule.subjects.map((s) => [s.subject_id, s.priority]));
  pending.sort((a, b) => (priority.get(b.subject_id) ?? 0) - (priority.get(a.subject_id) ?? 0) || a.date.localeCompare(b.date));
  const changes = new Map<string, Block>();
  let left = 0;
  for (const b of pending) {
    // An indivisible task larger than the entire window cannot fit in any week.
    if (!schedule.days.length || b.minutes > end - beginning || b.minutes <= 0) { left++; continue; }
    const cursor = parse(today);
    for (;;) {
      const date = day(cursor);
      if (availableDay(date)) {
        let start = lowerBound(date);
        for (const [a, z] of occupied.get(date) ?? []) {
          if (z <= start) continue;
          if (start + b.minutes <= a) break;
          start = Math.max(start, z);
        }
        if (start + b.minutes <= end) {
          changes.set(b.id, { ...b, date });
          starts[b.id] = start;
          reserve(date, start, b.minutes);
          break;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return { blocks: schedule.blocks.map((b) => changes.get(b.id) ?? b), start_minutes: changes.size ? starts : schedule.start_minutes, moved: changes.size, left };
}

/** Real studied seconds for a subject on a date, from timer sessions (never duplicated). */
export function studiedSeconds(sessions: Session[], date: string, subjectId?: string) {
  return sessions
    .filter((s) => s.state === 'finished' && (!subjectId || s.subject_id === subjectId))
    .reduce((t, s) => t + secondsOnDay(s, date), 0);
}

/** Finds a finished session that day for the subject which no other block uses yet. */
export function matchSession(sessions: Session[], blocks: Block[], block: Block) {
  const used = new Set(blocks.filter((b) => b.id !== block.id && b.session_id).map((b) => b.session_id));
  return sessions.find(
    (s) => s.state === 'finished' && s.subject_id === block.subject_id && !used.has(s.id) && secondsOnDay(s, block.date) > 0,
  );
}

export function blockTimes(schedule: Schedule, date: string) {
  const starts = positions(schedule);
  const list = schedule.blocks.filter((b) => b.date === date).sort((a, b) => (starts[a.id] ?? 0) - (starts[b.id] ?? 0));
  if (!schedule.start_time) return list.map((b) => ({ block: b, time: '' }));
  return list.map((b) => {
    const t = starts[b.id] ?? 0;
    const time = `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    return { block: b, time };
  });
}
