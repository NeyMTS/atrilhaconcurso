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
export type Schedule = ScheduleConfig & { week_start: string; blocks: Block[] };

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
      let subject = weighted[cursor % weighted.length]!;
      if (config.review && isLast && studiedThisWeek.length) {
        activity = 'review';
        subject = studiedThisWeek[blocks.length % studiedThisWeek.length]!;
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

/** Moves pending blocks from past days to remaining study days that still have room. */
export function rebalance(schedule: Schedule, today = day()) {
  const future = weekDates(schedule.week_start).filter(
    (d) => d >= today && schedule.days.includes(parse(d).getDay()),
  );
  const load = (d: string, blocks: Block[]) =>
    blocks.filter((b) => b.date === d && !b.done).reduce((t, b) => t + b.minutes, 0);
  const blocks = schedule.blocks.map((b) => ({ ...b }));
  let moved = 0;
  let left = 0;
  for (const b of blocks) {
    if (b.done || b.date >= today) continue;
    const target = future.find((d) => load(d, blocks) + b.minutes <= schedule.minutes_per_day);
    if (target) {
      b.date = target;
      moved++;
    } else left++;
  }
  return { blocks, moved, left };
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
  const list = schedule.blocks.filter((b) => b.date === date);
  if (!schedule.start_time) return list.map((b) => ({ block: b, time: '' }));
  const [h = 0, m = 0] = schedule.start_time.split(':').map(Number);
  let t = h * 60 + m;
  return list.map((b) => {
    const time = `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    t += b.minutes;
    return { block: b, time };
  });
}
