import { day, secondsOnDay, questionStats, type Item, type Session } from './study';
import type { Block } from './schedule';

export const MIN_SAMPLE = 20; // answered questions needed before ranking a subject
export const MIN_TREND = 30; // answered questions per window before reporting a trend

const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() + n);
  return day(x);
};

/** Derives every indicator from existing records; nothing is stored. */
export function buildSummary(items: Item[], sessions: Session[], contestId = '', today = day()) {
  const subjects = items.filter((i) => i.kind === 'subject' && (!contestId || i.payload.contest_id === contestId));
  const subjectIds = new Set(subjects.map((s) => s.id));
  const own = (s: Session) => !contestId || s.contest_ids.includes(contestId);
  const ses = sessions.filter(own);
  const secs = (dates: string[]) => ses.reduce((t, s) => t + dates.reduce((n, d) => n + secondsOnDay(s, d), 0), 0);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(today, -i));

  const goal = items
    .filter((i) => i.kind === 'goal' && (i.payload.contest_id || '') === contestId && i.payload.date && i.payload.date <= today)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  const qs = items.filter((i) => (i.kind === 'questions' || i.kind === 'mock') && (!contestId || i.payload.contest_id === contestId));
  const stats = questionStats(qs);

  const window = (from: string, to: string) => questionStats(qs.filter((q) => q.payload.date >= from && q.payload.date <= to));
  const recent = window(addDays(today, -13), today);
  const prior = window(addDays(today, -27), addDays(today, -14));
  let trend: 'up' | 'down' | 'stable' | null = null;
  if (recent.answered >= MIN_TREND && prior.answered >= MIN_TREND && recent.rate !== null && prior.rate !== null) {
    const diff = recent.rate - prior.rate;
    trend = diff >= 5 ? 'up' : diff <= -5 ? 'down' : 'stable';
  }

  const bySubject = subjects
    .map((s) => ({ id: s.id, name: String(s.payload.name), ...questionStats(qs.filter((q) => q.payload.subject_id === s.id)) }))
    .filter((s) => s.answered >= MIN_SAMPLE && s.rate !== null)
    .sort((a, b) => a.rate! - b.rate!);

  const topics = items.filter((i) => i.kind === 'topic' && subjectIds.has(i.payload.subject_id));
  const completed = topics.filter((t) => t.payload.status === 'completed').length;

  const topicIds = new Set(topics.map((t) => t.id));
  const reviews = items.filter((i) => i.kind === 'review' && !i.payload.done && topicIds.has(i.payload.topic_id));
  const overdue = reviews.filter((r) => r.payload.date < today).length;

  const schedule = items.find((i) => i.kind === 'schedule' && (!contestId || i.payload.contest_id === contestId));
  const next = ((schedule?.payload.blocks || []) as Block[])
    .filter((b) => !b.done && b.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const nextSubject = next ? subjects.find((s) => s.id === next.subject_id)?.payload.name : undefined;
  const nextTopic = !next ? topics.find((t) => t.payload.status !== 'completed') : undefined;

  return {
    todaySeconds: secs([today]),
    weekSeconds: secs(weekDates),
    dailyGoal: Number(goal?.payload.daily_hours || 0),
    weeklyGoal: Number(goal?.payload.weekly_hours || 0),
    stats,
    trend,
    weakest: bySubject.slice(0, 3),
    topics: { total: topics.length, completed, pending: topics.length - completed },
    reviews: { overdue, upcoming: reviews.length - overdue },
    next: next ? { date: next.date, activity: next.activity, minutes: next.minutes, subject: nextSubject || 'Disciplina' } : null,
    nextTopic: nextTopic ? String(nextTopic.payload.name) : null,
  };
}
