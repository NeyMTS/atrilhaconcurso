import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Play, RefreshCw, Settings2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useStudies } from './study-provider';
import { saveItem } from '@/lib/study.functions';
import { day, hours } from '@/lib/study';
import {
  activityLabels, blockTimes, generate, matchSession, rebalance, studiedSeconds,
  weekDates, weekStart, weekdayLabels, type Activity, type Block, type Schedule, type ScheduleConfig,
} from '@/lib/schedule';

const priorityLabels = ['', 'Baixa', 'Média', 'Alta'];

export function ScheduleView() {
  const { data, user, login, refresh } = useStudies();
  const save = useServerFn(saveItem);
  const item = data.items.find((i) => i.kind === 'schedule');
  const schedule = item?.payload as Schedule | undefined;
  const [editing, setEditing] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const today = day(now);
  const [selected, setSelected] = useState(today);
  const [busy, setBusy] = useState(false);
  const attempted = useRef('');
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const subjectName = (id: string) => data.items.find((i) => i.id === id)?.payload.name ?? 'Matéria removida';

  const persist = async (payload: Schedule, message = 'Cronograma salvo'): Promise<boolean> => {
    if (!user) { void login(); return false; }
    setBusy(true);
    try {
      await save({ data: { id: item?.id, kind: 'schedule', payload } });
      await refresh();
      if (message) toast.success(message);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const updateBlocks = (blocks: Block[], message = '') => schedule && persist({ ...schedule, blocks }, message);

  void attempted;

  const header = (
    <div className="page-heading">
      <div>
        <div className="eyebrow">PLANEJAMENTO SEMANAL</div>
        <h1>Cronograma</h1>
        <p>Seus blocos de estudo distribuídos pelo tempo que você tem.</p>
      </div>
      {schedule && !editing && (
        <Button variant="outline" onClick={() => setEditing(true)}><Settings2 size={16} /> Ajustar plano</Button>
      )}
    </div>
  );

  if (!user) return <>{header}<div className="empty-state"><span className="empty-icon"><CalendarDays size={23} /></span><h3>Entre para montar seu cronograma</h3><p>O plano fica salvo na sua conta.</p><Button onClick={() => void login()}>Entrar com Google</Button></div></>;

  if (!schedule || editing)
    return <>{header}<ScheduleSetup initial={schedule} busy={busy} onCancel={schedule ? () => setEditing(false) : undefined}
      onSave={async (config, regenerate) => {
        const start = weekStart();
        const base: Schedule = schedule ? { ...schedule, ...config } : { ...config, week_start: start, blocks: generate(config, start) };
        const result = !schedule || regenerate ? rebalance(base, new Date()) : null;
        const ok = await persist(result ? { ...base, blocks: result.blocks, start_minutes: result.start_minutes } : base);
        if (ok) setEditing(false);
      }} /></>;

  const dates = weekDates(weekStart(new Date(`${selected}T00:00:00`)));
  const weeklyBlocks = schedule.blocks.filter((b) => dates.includes(b.date));
  const total = weeklyBlocks.length;
  const done = weeklyBlocks.filter((b) => b.done).length;
  const reorganized = rebalance(schedule, now);
  const overdue = reorganized.pending;
  const reorganize = (mode: 'move' | 'extra') => {
    const r = rebalance(schedule, new Date(), mode);
    if (!r.moved) { toast.info('Não há espaço disponível para encaixar os blocos. Ajuste o plano.'); return; }
    const label = mode === 'extra' ? 'adicionado(s) como horas extras' : 'realocado(s) em novas datas';
    void persist({ ...schedule, blocks: r.blocks, start_minutes: r.start_minutes }, `${r.moved} bloco(s) ${label}${r.left ? `; ${r.left} não couberam` : ''}`);
  };
  const outdated = schedule.week_start < weekStart();
  const dayBlocks = blockTimes(schedule, selected);
  const planned = dayBlocks.reduce((t, x) => t + x.block.minutes, 0);
  const studied = studiedSeconds(data.sessions, selected);

  const toggle = (b: Block) => {
    const session = !b.done ? matchSession(data.sessions, schedule.blocks, b) : null;
    void updateBlocks(schedule.blocks.map((x) => x.id === b.id ? { ...x, done: !b.done, session_id: session?.id ?? null } : x),
      !b.done ? (session ? 'Concluído e vinculado à sessão do cronômetro' : 'Bloco concluído') : '');
  };
  const patch = (b: Block, change: Partial<Block>) => void updateBlocks(schedule.blocks.map((x) => x.id === b.id ? { ...x, ...change } : x));

  return <>
    {header}
    <section className="metrics-grid schedule-metrics">
      <div className="metric-card"><span className="metric-label">Progresso da semana</span><strong>{total ? Math.round(done / total * 100) : 0}%</strong><small>{done} de {total} blocos</small></div>
      <div className="metric-card"><span className="metric-label">Pendentes atrasados</span><strong>{overdue}</strong><small>de dias anteriores</small></div>
      <div className="metric-card"><span className="metric-label">Estudado no dia</span><strong>{hours(studied)}</strong><small>planejado {hours(planned * 60)}</small></div>
    </section>

    {(overdue > 0 || outdated) && <div className="schedule-alert">
      <span>{outdated ? 'Este plano é de uma semana anterior.' : `Você tem ${overdue} bloco(s) atrasado(s).`}</span>
      <div className="card-actions">
        {overdue > 0 && <>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => reorganize('extra')}><RefreshCw size={15} /> Somar como hora extra</Button>
          <Button size="sm" disabled={busy} onClick={() => reorganize('move')}><RefreshCw size={15} /> Realocar em novas datas</Button>
        </>}
        {outdated && <Button size="sm" disabled={busy} onClick={() => setSelected(today)}><CalendarDays size={15} /> Ver semana atual</Button>}
      </div>
    </div>}

    <div className="card-actions">
      <Button variant="ghost" size="icon" aria-label="Semana anterior" onClick={() => { const d = new Date(`${selected}T00:00:00`); d.setDate(d.getDate() - 7); setSelected(day(d)); }}><ChevronLeft size={16} /></Button>
      <span>{dates[0]?.split('-').reverse().join('/')} – {dates[6]?.split('-').reverse().join('/')}</span>
      <Button variant="ghost" size="icon" aria-label="Próxima semana" onClick={() => { const d = new Date(`${selected}T00:00:00`); d.setDate(d.getDate() + 7); setSelected(day(d)); }}><ChevronRight size={16} /></Button>
    </div>
    <nav className="schedule-days" aria-label="Dias da semana">
      {dates.map((d) => {
        const list = schedule.blocks.filter((b) => b.date === d);
        const off = !schedule.days.includes(new Date(`${d}T00:00:00`).getDay());
        return <button key={d} type="button" className={`schedule-day${d === selected ? ' active' : ''}${off ? ' off' : ''}${d === today ? ' today' : ''}`} onClick={() => setSelected(d)} aria-pressed={d === selected}>
          <span>{weekdayLabels[new Date(`${d}T00:00:00`).getDay()]}</span>
          <strong>{d.slice(8)}</strong>
          <small>{list.length ? `${list.filter((b) => b.done).length}/${list.length}` : '—'}</small>
        </button>;
      })}
    </nav>

    <section className="schedule-list">
      {dayBlocks.length === 0 ? <div className="empty-state"><h3>Sem blocos neste dia</h3><p>Dia livre no seu plano.</p></div> :
        dayBlocks.map(({ block: b, time }) => <article key={b.id} className={`schedule-block${b.done ? ' done' : ''}`}>
          <button type="button" className="schedule-check" onClick={() => toggle(b)} disabled={busy} aria-label={b.done ? 'Marcar como pendente' : 'Marcar como concluído'}>{b.done && <Check size={16} />}</button>
          <div className="schedule-main">
            <strong>{subjectName(b.subject_id)}</strong>
            <span>{time && `${time} · `}{b.minutes} min · <span className={`activity-tag ${b.activity}`}>{activityLabels[b.activity]}</span>{b.session_id && ' · via cronômetro'}</span>
            {!b.done && <div className="schedule-edit">
              <select aria-label="Atividade" value={b.activity} onChange={(e) => patch(b, { activity: e.target.value as Activity })}>{(Object.keys(activityLabels) as Activity[]).map((a) => <option key={a} value={a}>{activityLabels[a]}</option>)}</select>
              <select aria-label="Mover para" value={b.date} onChange={(e) => patch(b, { date: e.target.value })}>{dates.map((d) => <option key={d} value={d}>{weekdayLabels[new Date(`${d}T00:00:00`).getDay()]} {d.slice(8)}</option>)}</select>
              <button type="button" className="outline-icon" aria-label="Remover bloco" onClick={() => void updateBlocks(schedule.blocks.filter((x) => x.id !== b.id), 'Bloco removido')}><Trash2 size={15} /></button>
            </div>}
          </div>
          {!b.done && <Button asChild size="sm" variant="outline"><Link to="/estudar" search={{ cid: schedule.contest_id, sid: b.subject_id }}><Play size={14} /> Estudar</Link></Button>}
        </article>)}
    </section>
    <p className="form-note">Concluir um bloco vincula a sessão do cronômetro daquele dia e matéria, sem criar novo registro de horas.</p>
  </>;
}

function ScheduleSetup({ initial, busy, onSave, onCancel }: {
  initial?: Schedule | undefined; busy: boolean; onCancel?: (() => void) | undefined; onSave: (c: ScheduleConfig, regenerate: boolean) => void;
}) {
  const { data } = useStudies();
  const contests = data.items.filter((i) => i.kind === 'contest' && !i.payload.archived);
  const [cid, setCid] = useState(initial?.contest_id ?? '');
  const [days, setDays] = useState<number[]>(initial?.days ?? []);
  const [hoursPerDay, setHoursPerDay] = useState(initial ? String(initial.minutes_per_day / 60) : '');
  const [block, setBlock] = useState(String(initial?.block_minutes ?? 50));
  const [startTime, setStartTime] = useState(initial?.start_time ?? '');
  const [review, setReview] = useState(initial?.review ?? true);
  const [questions, setQuestions] = useState(initial?.questions ?? true);
  const [prio, setPrio] = useState<Record<string, number>>(() => Object.fromEntries((initial?.subjects ?? []).map((s) => [s.subject_id, s.priority])));
  const [regenerate, setRegenerate] = useState(true);
  const subjects = useMemo(() => data.items.filter((i) => i.kind === 'subject' && i.payload.contest_id === cid).sort((a, b) => (a.payload.order ?? 0) - (b.payload.order ?? 0)), [data.items, cid]);

  const minutes = Math.round(Number(hoursPerDay.replace(',', '.')) * 60);
  const chosen = Object.entries(prio).filter(([id, p]) => p > 0 && subjects.some((s) => s.id === id)).map(([subject_id, priority]) => ({ subject_id, priority }));
  const missing = [!cid && 'concurso', !days.length && 'dias', !(minutes >= 15) && 'horas por dia', !chosen.length && 'matérias'].filter(Boolean);

  if (!contests.length) return <div className="empty-state"><h3>Adicione um concurso primeiro</h3><p>O cronograma usa as matérias do seu edital.</p><Button asChild><Link to="/edital">Ir para o Edital</Link></Button></div>;

  return <section className="schedule-setup">
    <label className="field"><span>Concurso prioritário</span>
      <select value={cid} onChange={(e) => { setCid(e.target.value); setPrio({}); }}><option value="">Selecione</option>{contests.map((c) => <option key={c.id} value={c.id}>{c.payload.name}</option>)}</select></label>

    <div className="field"><span>Dias disponíveis</span>
      <div className="schedule-weekdays">{[1, 2, 3, 4, 5, 6, 0].map((d) => <button key={d} type="button" aria-pressed={days.includes(d)} className={days.includes(d) ? 'active' : ''} onClick={() => setDays((x) => x.includes(d) ? x.filter((y) => y !== d) : [...x, d])}>{weekdayLabels[d]}</button>)}</div></div>

    <div className="form-grid three">
      <label className="field"><span>Horas por dia</span><input inputMode="decimal" placeholder="ex.: 2,5" value={hoursPerDay} onChange={(e) => setHoursPerDay(e.target.value)} /></label>
      <label className="field"><span>Duração do bloco</span><select value={block} onChange={(e) => setBlock(e.target.value)}>{[25, 30, 45, 50, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}</select></label>
      <label className="field"><span>Início (opcional)</span><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></label>
    </div>

    <div className="check-row"><label><input type="checkbox" checked={questions} onChange={(e) => setQuestions(e.target.checked)} /> Incluir blocos de questões</label></div>
    <div className="check-row"><label><input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} /> Encerrar o dia com revisão</label></div>

    {cid && <div className="field"><span>Matérias e prioridade</span>
      {subjects.length === 0 ? <p className="form-note">Este concurso ainda não tem matérias cadastradas.</p> :
        <div className="schedule-subjects">{subjects.map((s) => <div key={s.id} className="schedule-subject">
          <span>{s.payload.name}</span>
          <select aria-label={`Prioridade de ${s.payload.name}`} value={prio[s.id] ?? 0} onChange={(e) => setPrio((p) => ({ ...p, [s.id]: Number(e.target.value) }))}>
            <option value={0}>Não estudar</option>{[3, 2, 1].map((p) => <option key={p} value={p}>{priorityLabels[p]}</option>)}
          </select></div>)}</div>}
    </div>}

    {initial && <div className="check-row"><label><input type="checkbox" checked={regenerate} onChange={(e) => setRegenerate(e.target.checked)} /> Redistribuir os blocos desta semana com as novas regras</label></div>}
    {missing.length > 0 && <p className="form-note">Falta informar: {missing.join(', ')}.</p>}
    <div className="card-actions">
      {onCancel && <Button variant="ghost" onClick={onCancel}>Cancelar</Button>}
      <Button disabled={busy || missing.length > 0} onClick={() => onSave({ contest_id: cid, days, minutes_per_day: minutes, block_minutes: Number(block), start_time: startTime, review, questions, subjects: chosen }, !initial || regenerate)}>
        {initial ? 'Salvar ajustes' : 'Gerar cronograma'}
      </Button>
    </div>
  </section>;
}
