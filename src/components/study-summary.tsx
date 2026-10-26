import { Link } from '@tanstack/react-router';
import { useStudies } from './study-provider';
import { buildSummary, MIN_SAMPLE } from '@/lib/summary';
import { hours } from '@/lib/study';
import { activityLabels } from '@/lib/schedule';

const pct = (n: number | null) => (n === null ? '—' : `${n.toFixed(0)}%`);
const bar = (v: number, g: number) => (g > 0 ? Math.min(100, (v / g) * 100) : 0);

export function StudySummary({ contestId }: { contestId: string }) {
  const { data } = useStudies();
  const s = buildSummary(data.items, data.sessions, contestId);
  const trendText = s.trend === 'up' ? 'Acertos em alta nas últimas 2 semanas' : s.trend === 'down' ? 'Acertos em queda nas últimas 2 semanas' : s.trend === 'stable' ? 'Desempenho estável nas últimas 2 semanas' : 'Ainda sem amostra para tendência';

  return (
    <section className="summary-grid" aria-label="Resumo">
      <article className="summary-card">
        <span className="summary-q">Quanto estudei?</span>
        <strong>{hours(s.todaySeconds)} <small>hoje</small></strong>
        <div className="progress-track"><span style={{ width: `${bar(s.todaySeconds / 3600, s.dailyGoal)}%` }} /></div>
        <small>{hours(s.weekSeconds)} nos últimos 7 dias{s.weeklyGoal ? ` · meta ${s.weeklyGoal} h` : ' · sem meta definida'}</small>
      </article>
      <article className="summary-card">
        <span className="summary-q">Como estou indo?</span>
        <strong>{pct(s.stats.rate)} <small>de acerto</small></strong>
        <small>{s.stats.total} questões · {s.stats.correct} certas · {s.stats.wrong} erradas · {s.stats.blank} em branco</small>
        <small className={`trend trend-${s.trend ?? 'none'}`}>{trendText}</small>
      </article>
      <article className="summary-card">
        <span className="summary-q">Maiores dificuldades</span>
        {s.weakest.length ? (
          <ul className="summary-list">{s.weakest.map((w) => <li key={w.id}><span>{w.name}</span><b>{pct(w.rate)}</b></li>)}</ul>
        ) : (
          <small>Registre ao menos {MIN_SAMPLE} questões por disciplina para comparar.</small>
        )}
      </article>
      <article className="summary-card">
        <span className="summary-q">O que estudar em seguida?</span>
        {s.next ? (
          <strong className="summary-next">{s.next.subject} <small>{activityLabels[s.next.activity]} · {s.next.minutes} min · {new Date(`${s.next.date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</small></strong>
        ) : s.nextTopic ? (
          <strong className="summary-next">{s.nextTopic} <small>Próximo tópico pendente do edital</small></strong>
        ) : (
          <small>Monte um <Link to="/cronograma">cronograma</Link> para ver a próxima atividade.</small>
        )}
        <small>Edital: {s.topics.completed}/{s.topics.total} tópicos concluídos · Revisões: {s.reviews.overdue} atrasadas, {s.reviews.upcoming} próximas</small>
      </article>
    </section>
  );
}
