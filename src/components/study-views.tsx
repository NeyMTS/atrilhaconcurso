import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import {
  ArrowRight,
  ArrowUpRight,
  Play,
  Pause,
  Square,
  Plus,
  Clock3,
  Target,
  CheckCheck,
  Percent,
  BookOpen,
  ShieldCheck,
  ChevronRight,
  CalendarDays,
  Pencil,
  Trash2,
  Copy,
  Archive,
  Link2,
  RotateCcw,
  Download,
  Upload,
  Check,
  TrendingUp,
  LogOut,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStudies } from './study-provider';
import { Field, ItemForm, Modal } from './study-forms';
import { catalog } from '@/lib/catalog';
import {
  day,
  elapsed,
  clock,
  hours,
  questionStats,
  score,
  secondsOnDay,
  type Item,
  type Session,
} from '@/lib/study';
import {
  saveItem,
  deleteRecord,
  timerAction,
  editSession,
  importCatalog,
  duplicateContest,
  restoreBackup,
  saveProfile,
} from '@/lib/study.functions';
import { toast } from 'sonner';
import { InstitutionMark } from './institution-mark';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

export const statusLabels: Record<string, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  review: 'Revisar',
};

function pct(n: number | null | undefined) {
  return n == null || !Number.isFinite(n) ? '—' : `${Math.round(n)}%`;
}

function useActions() {
  const { user, login, refresh } = useStudies();
  const remove = useServerFn(deleteRecord);

  return {
    run: async (
      fn: () => Promise<unknown>,
      message = 'Salvo com sucesso',
    ) => {
      if (!user) {
        void login();
        return;
      }

      try {
        await fn();
        await refresh();

        if (message) {
          toast.success(message);
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar',
        );
      }
    },

    remove: async (id: string, session = false) => {
      if (
        !window.confirm(
          'Excluir este registro? Os indicadores serão recalculados.',
        )
      ) {
        return;
      }

      try {
        await remove({ data: { id, session } });
        await refresh();
        toast.success('Registro excluído');
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Falha ao excluir',
        );
      }
    },
  };
}

function Empty({
  icon: Icon = BookOpen,
  title,
  text,
  children,
}: {
  icon?: typeof BookOpen;
  title: string;
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={23} />
      </span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

function Title({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function GoalBar({
  value,
  goal,
}: {
  value: number;
  goal: number;
}) {
  const progress =
    goal > 0 && Number.isFinite(value)
      ? Math.min(100, Math.max(0, (value / goal) * 100))
      : 0;

  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
    >
      <span style={{ width: `${progress}%` }} />
    </div>
  );
}

function getDisplayName(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function HomeView() {
  const { data, user, login, loading } = useStudies();
  const [goalForm, setGoalForm] = useState(false);

  const today = day();
  const now = new Date();
  const start = new Date(now);

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  const week = day(start);
  const sessions = data.sessions;

  const daily = sessions.reduce(
    (total, session) =>
      total + secondsOnDay(session, today),
    0,
  );

  const weekly = sessions.reduce((total, session) => {
    let seconds = 0;

    for (let index = 0; index < 7; index++) {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      seconds += secondsOnDay(session, day(date));
    }

    return total + seconds;
  }, 0);

  const questions = data.items.filter(
    (item) =>
      ['questions', 'mock'].includes(item.kind) &&
      Boolean(item.payload.date) &&
      item.payload.date! >= week &&
      item.payload.date! <= today,
  );

  const stats = questionStats(questions);

  const goals = data.items
    .filter(
      (item) =>
        item.kind === 'goal' &&
        !item.payload.contest_id &&
        Boolean(item.payload.date) &&
        item.payload.date! <= today,
    )
    .sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );

  const goal = goals[0]?.payload;

  const contests = data.items.filter(
    (item) =>
      item.kind === 'contest' &&
      !item.payload.archived,
  );

  const reviews = data.items
    .filter(
      (item) =>
        item.kind === 'review' &&
        !item.payload.done,
    )
    .sort((a, b) =>
      String(a.payload.date || '').localeCompare(
        String(b.payload.date || ''),
      ),
    );

  const active = sessions.find(
    (session) => session.state !== 'finished',
  );

  const metadataName = getDisplayName(
    user?.user_metadata?.['full_name'],
  );

  const name =
    getDisplayName(data.profile?.display_name) ||
    metadataName;

  const weekDays = Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index);

      const key = day(date);

      const seconds = sessions.reduce(
        (total, session) =>
          total + secondsOnDay(session, key),
        0,
      );

      return {
        key,
        label: date
          .toLocaleDateString('pt-BR', {
            weekday: 'short',
          })
          .replace('.', ''),
        hours: Math.round(seconds / 360) / 10,
        isToday: key === today,
      };
    },
  );

  const maxHours = Math.max(
    2,
    ...weekDays.map((item) => item.hours),
  );

  const metrics = [
    {
      icon: Clock3,
      label: 'Horas líquidas hoje',
      value: hours(daily),
      detail: goal
        ? `Meta diária: ${goal.daily_hours}h`
        : 'Meta diária não definida',
      amount: daily / 3600,
      target: Number(goal?.daily_hours || 0),
      accent: 'blue',
    },
    {
      icon: CalendarDays,
      label: 'Horas nesta semana',
      value: hours(weekly),
      detail: goal
        ? `Meta semanal: ${goal.weekly_hours}h`
        : 'Meta semanal não definida',
      amount: weekly / 3600,
      target: Number(goal?.weekly_hours || 0),
      accent: 'violet',
    },
    {
      icon: CheckCheck,
      label: 'Questões resolvidas',
      value: String(stats.total),
      detail: `${stats.correct} acertos · ${stats.wrong} erros`,
      amount: stats.total,
      target: Number(goal?.questions || 0),
      accent: 'cyan',
    },
    {
      icon: Percent,
      label: 'Taxa de acerto',
      value: pct(stats.rate),
      detail: stats.total
        ? `${stats.answered} respondidas · ${stats.blank} em branco`
        : 'Registre questões para acompanhar',
      amount: stats.rate || 0,
      target: 100,
      accent: 'amber',
    },
  ];

  const nextReview = reviews[0];

  const nextReviewTopic = nextReview
    ? data.items.find(
        (item) =>
          item.id === nextReview.payload.topic_id,
      )
    : undefined;

  return (
    <>
      <Title
        eyebrow="SEU PLANEJAMENTO, MAIS CLARO"
        title={
          name
            ? `Olá, ${name.split(/\s+/)[0]}.`
            : 'Seu próximo passo começa aqui.'
        }
        subtitle="Organize seus estudos. Acompanhe o que realmente importa."
      >
        <div className="date-label">
          <CalendarDays size={16} />
          {now.toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'long',
          })}
        </div>
      </Title>

      <section className="welcome-band">
        <div>
          <span className="mini-label">
            <span className="live-dot" />
            FOCO NO QUE ESTÁ AO SEU ALCANCE
          </span>

          <h2>
            {active
              ? 'Seu estudo está em andamento.'
              : 'Um pouco hoje. Mais perto amanhã.'}
          </h2>

          <p>
            {active
              ? 'Retome sua sessão e mantenha seu progresso registrado.'
              : 'Cada sessão conta. Escolha um conteúdo e dê o próximo passo.'}
          </p>

          <Button asChild className="start-button">
            <Link to="/estudar">
              <Play size={16} fill="currentColor" />
              {active ? 'Retomar estudo' : 'Iniciar estudo'}
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>

      </section>

      <div className="section-heading">
        <h2>Seu estudo em números</h2>
        <span>Resumo da semana</span>
      </div>

      <section className="metrics-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article
              className={`metric-card metric-${metric.accent}`}
              key={metric.label}
            >
              <div className="metric-label">
                <span>{metric.label}</span>
                <Icon size={19} />
              </div>

              <strong>{metric.value}</strong>

              <GoalBar
                value={metric.amount}
                goal={metric.target}
              />

              <small>{metric.detail}</small>
            </article>
          );
        })}
      </section>

      <section className="weekly-panel">
        <div className="section-heading">
          <div>
            <h2>Ritmo de estudos</h2>
            <p className="muted-copy">
              Tempo registrado em cada dia desta semana
            </p>
          </div>

          <Link to="/estudar" className="text-link">
            Ver estudos <ArrowRight size={14} />
          </Link>
        </div>

        <div
          className="weekly-chart"
          role="img"
          aria-label="Gráfico de horas estudadas por dia"
        >
          {weekDays.map((item) => (
            <div className="weekly-day" key={item.key}>
              <div className="weekly-bar-area">
                <span className="weekly-value">
                  {item.hours
                    ? `${item.hours}h`
                    : '—'}
                </span>

                <div
                  className={`weekly-bar ${
                    item.isToday ? 'is-today' : ''
                  }`}
                  style={{
                    height: `${Math.max(
                      5,
                      (item.hours / maxHours) * 100,
                    )}%`,
                  }}
                />
              </div>

              <span
                className={`weekly-day-label ${
                  item.isToday ? 'is-today' : ''
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className="weekly-footer">
          <span>
            <span className="legend-dot" />
            Horas registradas
          </span>

          <strong>
            {hours(weekly)} <small>na semana</small>
          </strong>
        </div>
      </section>

      <div className="dashboard-grid">
        <section>
          <div className="section-heading">
            <h2>
              Meus concursos{' '}
              <span className="count-badge">
                {contests.length}
              </span>
            </h2>

            <Button variant="link" asChild>
              <Link to="/edital">
                Ver editais <ArrowUpRight size={14} />
              </Link>
            </Button>
          </div>

          <div className="contest-list">
            {contests.length ? (
              contests.slice(0, 4).map(
                (contest, index) => {
                  const details = contest.payload;

                  const subjects = data.items.filter(
                    (item) =>
                      item.kind === 'subject' &&
                      item.payload.contest_id ===
                        contest.id,
                  );

                  const topics = data.items.filter(
                    (item) =>
                      item.kind === 'topic' &&
                      !item.payload.parent_id &&
                      subjects.some(
                        (subject) =>
                          subject.id ===
                          item.payload.subject_id,
                      ),
                  );

                  const completed = topics.filter(
                    (item) =>
                      item.payload.status ===
                      'completed',
                  ).length;

                  return (
                    <article
                      className="contest-card"
                      key={contest.id}
                    >
                      <InstitutionMark agency={details.agency || details.name || ""} />

                      <div className="contest-content">
                        <div className="contest-title">
                          <h3>{details.name}</h3>
                          <span className="subtle-tag">
                            {details.year || 'Sem ano'}
                          </span>
                        </div>

                        <p>
                          {details.agency ||
                            details.role ||
                            'Concurso cadastrado'}
                        </p>

                        <div className="contest-progress">
                          <GoalBar
                            value={completed}
                            goal={topics.length}
                          />

                          <small>
                            {topics.length
                              ? `${completed} / ${topics.length} tópicos`
                              : 'Adicione tópicos ao edital'}
                          </small>
                        </div>

                        <small>
                          Progresso por tópicos concluídos
                        </small>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        aria-label={`Abrir ${details.name}`}
                      >
                        <Link to="/edital">
                          <ChevronRight />
                        </Link>
                      </Button>
                    </article>
                  );
                },
              )
            ) : (
              <>
                {catalog.slice(0, 2).map(
                  (contest, index) => (
                    <article
                      className="contest-card"
                      key={contest.id}
                    >
                      <InstitutionMark agency={contest.id} />

                      <div className="contest-content">
                        <div className="contest-title">
                          <h3>{contest.label}</h3>
                          <span className="subtle-tag">
                            {contest.year}
                          </span>
                        </div>

                        <p>
                          Referência histórica · Vigência atual não confirmada
                        </p>

                        <small>
                          {contest.content.length} disciplinas disponíveis
                        </small>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        aria-label={`Consultar ${contest.label}`}
                      >
                        <Link to="/edital">
                          <ChevronRight />
                        </Link>
                      </Button>
                    </article>
                  ),
                )}

                <p className="form-note">
                  Adicione um edital para acompanhar o progresso dos seus estudos.
                </p>
              </>
            )}
          </div>

          <div className="next-step">
            <span className="outline-icon">
              <Target size={19} />
            </span>

            <div>
              <h3>Próxima ação</h3>
              <p>
                {reviews.length
                  ? `Revisar ${
                      nextReviewTopic?.payload.name ||
                      'tópico agendado'
                    }`
                  : contests.length
                    ? 'Escolha uma disciplina e registre sua próxima sessão.'
                    : 'Adicione um edital para organizar seus conteúdos.'}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              asChild
              aria-label="Próxima ação"
            >
              <Link
                to={
                  reviews.length
                    ? '/estudar'
                    : '/edital'
                }
              >
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>

        <section>
          <div className="section-heading">
            <h2>Revisões prioritárias</h2>
            <RotateCcw size={16} />
          </div>

          <div className="review-panel">
            {reviews.length ? (
              reviews.slice(0, 3).map((review) => {
                const topic = data.items.find(
                  (item) =>
                    item.id ===
                    review.payload.topic_id,
                );

                return (
                  <div
                    className="review-row"
                    key={review.id}
                  >
                    <span className="outline-icon">
                      <RotateCcw size={18} />
                    </span>

                    <div>
                      <h3>
                        {topic?.payload.name ||
                          'Tópico para revisar'}
                      </h3>
                      <p>
                        {review.payload.date <= today
                          ? 'Revisão pendente'
                          : 'Agendada'}{' '}
                        ·{' '}
                        {new Date(
                          `${review.payload.date}T12:00:00`,
                        ).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <Empty
                icon={RotateCcw}
                title="Tudo em dia por aqui"
                text="Marque tópicos para revisão no seu edital."
              >
                <Button variant="link" asChild>
                  <Link to="/edital">
                    Organizar revisões{' '}
                    <ArrowRight size={14} />
                  </Link>
                </Button>
              </Empty>
            )}
          </div>

          <div className="goal-callout">
            <span className="outline-icon">
              <Target size={20} />
            </span>

            <h3>
              {goal
                ? 'Suas metas, seu ritmo'
                : 'Qual é o seu ritmo?'}
            </h3>

            <p>
              {goal
                ? 'Suas metas acompanham sua rotina. Ajuste quando precisar.'
                : 'Defina metas que façam sentido para a sua rotina.'}
            </p>

            <Button
              variant="outline"
              onClick={() =>
                user
                  ? setGoalForm(true)
                  : void login()
              }
            >
              {goal
                ? 'Ajustar metas'
                : 'Definir minhas metas'}
              <ArrowRight size={14} />
            </Button>
          </div>
        </section>
      </div>

      {!user && (
        <div className="signin-strip">
          <ShieldCheck size={19} />

          <div>
            <strong>
              Seu progresso acompanha você.
            </strong>
            <p>
              Entre com Google para salvar seus estudos e acessar em qualquer dispositivo.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => void login()}
          >
            Entrar com Google{' '}
            <ArrowUpRight size={15} />
          </Button>
        </div>
      )}

      {loading && (
        <p className="form-note">
          Carregando seus registros…
        </p>
      )}

      {goalForm && (
        <ItemForm
          kind="goal"
          close={() => setGoalForm(false)}
        />
      )}
    </>
  );
}

export function StudyView() {
  const { data, user, login } = useStudies();
  const { run, remove } = useActions();

  const timer = useServerFn(timerAction);
  const edit = useServerFn(editSession);

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(
      () => setNow(Date.now()),
      1000,
    );

    return () => window.clearInterval(interval);
  }, []);

  const [cid, setCid] = useState('');
  const [sid, setSid] = useState('');
  const [tid, setTid] = useState('');
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);

  const [
    form,
    setForm,
  ] = useState<{
    kind: Item['kind'];
    item?: Item;
    defaults?: any;
  } | null>(null);

  const [finishing, setFinishing] = useState(false);
  const [notes, setNotes] = useState('');
  const [editing, setEditing] =
    useState<Session | null>(null);
  const [minutes, setMinutes] = useState('');
  const [tab, setTab] = useState('sessions');

  const contests = data.items.filter(
    (item) =>
      item.kind === 'contest' &&
      !item.payload.archived,
  );

  const subjects = data.items.filter(
    (item) =>
      item.kind === 'subject' &&
      item.payload.contest_id === cid,
  );

  const topics = data.items.filter(
    (item) =>
      item.kind === 'topic' &&
      item.payload.subject_id === sid,
  );

  const active = data.sessions.find(
    (session) => session.state !== 'finished',
  );

  const linked = data.items.filter(
    (item) =>
      item.kind === 'link' &&
      Array.isArray(item.payload.topic_ids) &&
      item.payload.topic_ids.includes(tid),
  );

  const sharedIds = Array.from(
    new Set([
      cid,
      ...linked
        .flatMap((link) =>
          link.payload.topic_ids.map(
            (id: string) => {
              const topic = data.items.find(
                (item) => item.id === id,
              );

              const subject = data.items.find(
                (item) =>
                  item.id ===
                  topic?.payload.subject_id,
              );

              return subject?.payload.contest_id;
            },
          ),
        )
        .filter(Boolean),
    ]),
  );

  const act = async (
    action: 'start' | 'pause' | 'resume' | 'finish',
  ) => {
    if (busy) return;

    setBusy(true);

    try {
      await run(async () => {
        await timer({
          data: {
            action,
            id: active?.id,
            contest_ids: shared
              ? sharedIds
              : [cid],
            subject_id: sid,
            topic_id: tid || null,
            notes,
          },
        });

        if (action === 'finish') {
          setFinishing(false);

          setForm({
            kind: 'questions',
            defaults: {
              contest_id: active?.contest_ids[0],
              subject_id: active?.subject_id,
              topic_id: active?.topic_id,
              date: day(),
              session_id: active?.id,
            },
          });
        }
      }, action === 'finish'
        ? 'Sessão salva. Questões são opcionais.'
        : '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Title
        eyebrow="TEMPO BEM INVESTIDO"
        title="Hora de estudar."
        subtitle="Um conteúdo, uma sessão. Seu foco fica no estudo."
      />

      <section className="timer-section">
        <div className="section-heading">
          <h2>
            <TimerIcon /> Sessão de estudo
          </h2>

          <span className="subtle-tag">
            {active
              ? active.state === 'paused'
                ? 'Pausada'
                : 'Em andamento'
              : 'Pronto para começar'}
          </span>
        </div>

        {!active ? (
          <div className="form-grid three">
            <Field label="Concurso">
              <select
                value={cid}
                onChange={(event) => {
                  setCid(event.target.value);
                  setSid('');
                  setTid('');
                  setShared(false);
                }}
              >
                <option value="">
                  Selecione o concurso
                </option>

                {contests.map((contest) => (
                  <option
                    key={contest.id}
                    value={contest.id}
                  >
                    {contest.payload.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Disciplina">
              <select
                value={sid}
                onChange={(event) => {
                  setSid(event.target.value);
                  setTid('');
                }}
              >
                <option value="">
                  Selecione a disciplina
                </option>

                {subjects.map((subject) => (
                  <option
                    key={subject.id}
                    value={subject.id}
                  >
                    {subject.payload.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tópico (opcional)">
              <select
                value={tid}
                onChange={(event) =>
                  setTid(event.target.value)
                }
              >
                <option value="">
                  Toda a disciplina
                </option>

                {topics.map((topic) => (
                  <option
                    key={topic.id}
                    value={topic.id}
                  >
                    {topic.payload.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : (
          <p className="active-content">
            {
              data.items.find(
                (item) =>
                  item.id === active.subject_id,
              )?.payload.name
            }

            <span>
              {
                data.items.find(
                  (item) =>
                    item.id === active.topic_id,
                )?.payload.name ||
                  'Toda a disciplina'
              }
            </span>
          </p>
        )}

        <div className="timer-display">
          <span>TEMPO LÍQUIDO</span>

          <strong>
            {clock(
              active
                ? elapsed(active, now)
                : 0,
            )}
          </strong>

          <div className="timer-buttons">
            {active ? (
              <>
                <Button
                  disabled={busy}
                  onClick={() =>
                    void act(
                      active.state === 'paused'
                        ? 'resume'
                        : 'pause',
                    )
                  }
                >
                  {active.state === 'paused' ? (
                    <Play />
                  ) : (
                    <Pause />
                  )}

                  {active.state === 'paused'
                    ? 'Retomar'
                    : 'Pausar'}
                </Button>

                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => {
                    setNotes('');
                    setFinishing(true);
                  }}
                >
                  <Square />
                  Finalizar
                </Button>
              </>
            ) : (
              <Button
                disabled={busy || (!!user && !sid)}
                className="start-button"
                onClick={() =>
                  user
                    ? void act('start')
                    : void login()
                }
              >
                <Play fill="currentColor" />
                Iniciar estudo
              </Button>
            )}
          </div>

          {!active &&
            tid &&
            sharedIds.length > 1 && (
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={shared}
                  onChange={(event) =>
                    setShared(event.target.checked)
                  }
                />
                Conteúdo compartilhado entre{' '}
                {sharedIds.length} concursos — tempo
                contado uma vez
              </label>
            )}
        </div>

        {!contests.length && (
          <p className="form-note centered">
            Adicione um concurso em{' '}
            <Link to="/edital">Edital</Link> para
            começar.
          </p>
        )}
      </section>

      <div className="section-heading spaced">
        <div className="segmented">
          {([
            ['sessions', 'Sessões'],
            ['questions', 'Questões'],
            ['mock', 'Simulados'],
          ] as const).map(([value, label]) => (
            <Button
              key={value}
              variant="ghost"
              className={
                tab === value ? 'selected' : ''
              }
              onClick={() => setTab(value)}
            >
              {label}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={() =>
            user
              ? setForm({
                  kind:
                    tab === 'mock'
                      ? 'mock'
                      : 'questions',
                  defaults: {},
                })
              : void login()
          }
        >
          <Plus />
          Registrar{' '}
          {tab === 'mock'
            ? 'simulado'
            : 'questões'}
        </Button>
      </div>

      <section className="record-list">
        {tab === 'sessions' ? (
          data.sessions.filter(
            (session) =>
              session.state === 'finished',
          ).length ? (
            data.sessions
              .filter(
                (session) =>
                  session.state === 'finished',
              )
              .map((session) => (
                <article
                  className="record-row"
                  key={session.id}
                >
                  <span className="outline-icon">
                    <Clock3 size={20} />
                  </span>

                  <div>
                    <h3>
                      {
                        data.items.find(
                          (item) =>
                            item.id ===
                            session.subject_id,
                        )?.payload.name ||
                          'Disciplina'
                      }
                    </h3>

                    <p>
                      {new Date(
                        session.started_at,
                      ).toLocaleDateString('pt-BR')}
                      {' · '}
                      {session.contest_ids.length > 1
                        ? 'Conteúdo compartilhado'
                        : data.items.find(
                            (item) =>
                              item.id ===
                              session.contest_ids[0],
                          )?.payload.name}
                    </p>

                    {session.notes && (
                      <small>{session.notes}</small>
                    )}
                  </div>

                  <strong>
                    {hours(
                      Number(session.elapsed_seconds),
                    )}
                  </strong>

                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Editar sessão"
                    onClick={() => {
                      setEditing(session);
                      setMinutes(
                        String(
                          Number(
                            session.elapsed_seconds,
                          ) / 60,
                        ),
                      );
                      setNotes(session.notes);
                    }}
                  >
                    <Pencil />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Excluir sessão"
                    onClick={() =>
                      void remove(session.id, true)
                    }
                  >
                    <Trash2 />
                  </Button>
                </article>
              ))
          ) : (
            <Empty
              icon={Clock3}
              title="Seu histórico começa com a primeira sessão"
              text="O tempo líquido será registrado aqui ao finalizar seu estudo."
            />
          )
        ) : data.items.filter(
            (item) => item.kind === tab,
          ).length ? (
          data.items
            .filter((item) => item.kind === tab)
            .slice()
            .reverse()
            .map((record) => {
              const payload = record.payload;
              const statistics = questionStats([
                record,
              ]);

              return (
                <article
                  className="record-row"
                  key={record.id}
                >
                  <span className="outline-icon">
                    <CheckCheck size={20} />
                  </span>

                  <div>
                    <h3>
                      {payload.name ||
                        data.items.find(
                          (item) =>
                            item.id ===
                            payload.subject_id,
                        )?.payload.name}
                    </h3>

                    <p>
                      {payload.date} · {payload.total}{' '}
                      itens · {payload.correct} acertos
                      {' · '}
                      {payload.wrong} erros ·{' '}
                      {payload.blank} brancos
                    </p>

                    <small>
                      {pct(statistics.rate)} entre
                      respondidas ·{' '}
                      {pct(statistics.percentage)} sobre
                      o total
                      {record.kind === 'mock'
                        ? ` · ${score(payload)} pontos líquidos`
                        : ''}
                    </small>

                    {payload.elimination && (
                      <small>
                        Critérios: {payload.elimination}
                      </small>
                    )}
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Editar registro"
                    onClick={() =>
                      setForm({
                        kind: record.kind,
                        item: record,
                      })
                    }
                  >
                    <Pencil />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Excluir registro"
                    onClick={() =>
                      void remove(record.id)
                    }
                  >
                    <Trash2 />
                  </Button>
                </article>
              );
            })
        ) : (
          <Empty
            icon={CheckCheck}
            title={
              tab === 'mock'
                ? 'Nenhum simulado registrado'
                : 'Nenhum bloco de questões registrado'
            }
            text="Registre total, acertos, erros e brancos para acompanhar seu desempenho."
          />
        )}
      </section>

      {form && (
        <ItemForm
          {...form}
          close={() => setForm(null)}
        />
      )}

      {finishing && (
        <Modal
          title="Finalizar sessão"
          close={() => setFinishing(false)}
        >
          <div className="form-body">
            <Field label="Observações (opcional)">
              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
              />
            </Field>

            <p className="form-note">
              Depois de salvar, você pode registrar
              questões ou fechar a janela.
            </p>

            <Button
              disabled={busy}
              onClick={() => void act('finish')}
            >
              Salvar sessão ·{' '}
              {clock(
                active ? elapsed(active) : 0,
              )}
            </Button>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal
          title="Corrigir sessão"
          close={() => setEditing(null)}
        >
          <form
            className="form-body"
            onSubmit={(event) => {
              event.preventDefault();

              const seconds =
                Number(minutes) * 60;

              if (
                !Number.isFinite(seconds) ||
                seconds < 0
              ) {
                toast.error(
                  'Informe um tempo válido.',
                );
                return;
              }

              void run(async () => {
                await edit({
                  data: {
                    id: editing.id,
                    seconds,
                    notes,
                  },
                });

                setEditing(null);
              });
            }}
          >
            <Field label="Tempo líquido em minutos">
              <input
                type="number"
                min="0"
                step="any"
                required
                value={minutes}
                onChange={(event) =>
                  setMinutes(event.target.value)
                }
              />
            </Field>

            <Field label="Observações">
              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
              />
            </Field>

            <Button>Salvar correção</Button>
          </form>
        </Modal>
      )}
    </>
  );
}

function TimerIcon() {
  return <Clock3 size={18} />;
}

export function EditalView() {
  const { data, user, login } = useStudies();
  const { run, remove } = useActions();

  const seed = useServerFn(importCatalog);
  const duplicate = useServerFn(duplicateContest);
  const save = useServerFn(saveItem);

  const [selected, setSelected] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [archived, setArchived] = useState(false);

  const [
    form,
    setForm,
  ] = useState<{
    kind: Item['kind'];
    item?: Item;
    defaults?: any;
  } | null>(null);

  const [search, setSearch] = useState('');

  const contests = data.items.filter(
    (item) =>
      item.kind === 'contest' &&
      (archived || !item.payload.archived),
  );

  const contest =
    contests.find(
      (item) => item.id === selected,
    ) || contests[0];

  const subjects = data.items
    .filter(
      (item) =>
        item.kind === 'subject' &&
        item.payload.contest_id === contest?.id,
    )
    .sort(
      (a, b) =>
        Number(a.payload.order || 0) -
        Number(b.payload.order || 0),
    );

  const topicStats = (topic: Item) => {
    const ids = new Set([
      topic.id,
      ...data.items
        .filter(
          (item) =>
            item.kind === 'link' &&
            item.payload.topic_ids?.includes(
              topic.id,
            ),
        )
        .flatMap(
          (item) => item.payload.topic_ids || [],
        ),
    ]);

    const sessions = data.sessions.filter(
      (session) =>
        session.topic_id &&
        (session.topic_id === topic.id ||
          (ids.has(session.topic_id) &&
            session.contest_ids.includes(
              contest?.id || '',
            ))),
    );

    const questions = data.items.filter(
      (item) =>
        ['questions', 'mock'].includes(item.kind) &&
        ids.has(item.payload.topic_id || ''),
    );

    return {
      seconds: sessions.reduce(
        (total, session) =>
          total + elapsed(session),
        0,
      ),
      questions: questionStats(questions),
      last: sessions[0]?.started_at,
    };
  };

  return (
    <>
      <Title
        eyebrow="DO EDITAL AO PLANEJAMENTO"
        title="Seu caminho, tópico a tópico."
        subtitle="Organize os conteúdos e acompanhe o que já foi concluído."
      >
        <Button
          onClick={() =>
            user
              ? setForm({ kind: 'contest' })
              : void login()
          }
        >
          <Plus />
          Novo concurso
        </Button>
      </Title>

      {!contests.length && (
        <>
          <div className="section-heading">
            <h2>Comece por uma referência oficial</h2>
            <span>
              Conteúdo conferido no documento
            </span>
          </div>

          <div className="catalog-grid">
            {catalog.map((item) => (
              <article
                className="catalog-card"
                key={item.id}
              >
                <InstitutionMark agency={item.id} />

                <h2>{item.label}</h2>

                <span className="subtle-tag">
                  Referência histórica · {item.year}
                </span>

                <p>
                  {item.content.length} disciplinas ·
                  Conteúdo programático oficial
                </p>

                <p className="form-note">
                  Vigência atual não confirmada. Nenhuma
                  regra ou peso é presumido.
                </p>

                <div className="card-actions">
                  <Button
                    onClick={() =>
                      void run(
                        () =>
                          seed({
                            data: { key: item.id },
                          }),
                        'Edital adicionado',
                      )
                    }
                  >
                    <Plus />
                    Adicionar edital
                  </Button>

                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Fonte oficial
                    <ArrowUpRight size={14} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {contests.length > 0 && (
        <>
          <div className="edital-toolbar">
            <Field label="Concurso">
              <select
                value={contest?.id || ''}
                onChange={(event) =>
                  setSelected(event.target.value)
                }
              >
                {contests.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.payload.name}
                    {item.payload.archived
                      ? ' (arquivado)'
                      : ''}
                  </option>
                ))}
              </select>
            </Field>

            <input
              className="search-input"
              placeholder="Buscar conteúdo…"
              aria-label="Buscar conteúdo"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            <Button
              variant="outline"
              onClick={() =>
                setForm({
                  kind: 'link',
                  defaults: {
                    topic_ids: [],
                    confirmed: false,
                  },
                })
              }
            >
              <Link2 />
              Vincular conteúdos
            </Button>
          </div>

          <section className="edital-info">
            <div>
              <InstitutionMark agency={contest?.payload.agency || contest?.payload.name || ''} />
              <h2>{contest?.payload.name}</h2>

              <p>
                {contest?.payload.agency} ·{' '}
                {contest?.payload.role} ·{' '}
                {contest?.payload.board} ·{' '}
                {contest?.payload.year ||
                  'Ano não definido'}
              </p>

              <span className="subtle-tag">
                {contest?.payload.status}
              </span>

              <p className="form-note">
                {contest?.payload.verification}
              </p>

              {contest?.payload.source && (
                <a
                  href={contest.payload.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  Consultar documento oficial
                  <ArrowUpRight size={13} />
                </a>
              )}
            </div>

            <div className="card-actions">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Editar concurso"
                onClick={() => {
                  if (contest) {
                    setForm({
                      kind: 'contest',
                      item: contest,
                    });
                  }
                }}
              >
                <Pencil />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                aria-label="Duplicar edital"
                onClick={() => {
                  if (contest) {
                    void run(
                      () =>
                        duplicate({
                          data: { id: contest.id },
                        }),
                      'Estrutura duplicada sem histórico',
                    );
                  }
                }}
              >
                <Copy />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                aria-label="Arquivar ou reativar concurso"
                onClick={() => {
                  if (
                    contest &&
                    window.confirm(
                      'Alterar arquivamento? O histórico será mantido.',
                    )
                  ) {
                    void run(() =>
                      save({
                        data: {
                          id: contest.id,
                          kind: 'contest',
                          payload: {
                            ...contest.payload,
                            archived:
                              !contest.payload.archived,
                          },
                        },
                      }),
                    );
                  }
                }}
              >
                <Archive />
              </Button>
            </div>
          </section>

          <div className="section-heading">
            <h2>
              Disciplinas{' '}
              <span className="count-badge">
                {subjects.length}
              </span>
            </h2>

            <Button
              variant="outline"
              onClick={() =>
                setForm({
                  kind: 'subject',
                  defaults: {
                    contest_id: contest?.id,
                    order: subjects.length,
                  },
                })
              }
            >
              <Plus />
              Adicionar disciplina
            </Button>
          </div>

          <div className="subject-list">
            {subjects.map((subject) => {
              const topics = data.items
                .filter(
                  (item) =>
                    item.kind === 'topic' &&
                    item.payload.subject_id ===
                      subject.id,
                )
                .sort(
                  (a, b) =>
                    Number(a.payload.order || 0) -
                    Number(b.payload.order || 0),
                );

              const visible = topics.filter(
                (topic) =>
                  !search ||
                  String(topic.payload.name || '')
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              );

              const open =
                expanded.includes(subject.id) ||
                Boolean(search);

              if (search && !visible.length) {
                return null;
              }

              return (
                <section
                  className="subject-section"
                  key={subject.id}
                >
                  <div className="subject-header">
                    <Button
                      variant="ghost"
                      className="subject-toggle"
                      onClick={() =>
                        setExpanded((current) =>
                          current.includes(subject.id)
                            ? current.filter(
                                (id) =>
                                  id !== subject.id,
                              )
                            : [...current, subject.id],
                        )
                      }
                    >
                      <ChevronRight
                        className={
                          open ? 'rotated' : ''
                        }
                      />
                      <BookOpen size={18} />
                      <strong>
                        {subject.payload.name}
                      </strong>
                      <span className="subtle-tag">
                        {
                          topics.filter(
                            (topic) =>
                              topic.payload.status ===
                              'completed',
                          ).length
                        }
                        /{topics.length}
                      </span>
                    </Button>

                    <div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar disciplina"
                        onClick={() =>
                          setForm({
                            kind: 'subject',
                            item: subject,
                          })
                        }
                      >
                        <Pencil />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Novo tópico"
                        onClick={() =>
                          setForm({
                            kind: 'topic',
                            defaults: {
                              subject_id: subject.id,
                              order: topics.length,
                            },
                          })
                        }
                      >
                        <Plus />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir disciplina"
                        onClick={() =>
                          void remove(subject.id)
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  {open && (
                    <div>
                      {visible.map((topic) => {
                        const statistics =
                          topicStats(topic);

                        return (
                          <article
                            className={`topic-row ${
                              topic.payload.parent_id
                                ? 'subtopic'
                                : ''
                            }`}
                            key={topic.id}
                          >
                            <div className="topic-main">
                              <h3>
                                {topic.payload.name}
                              </h3>

                              <small>
                                Estimativa:{' '}
                                {topic.payload.estimated_hours ||
                                  0}
                                h · Investido:{' '}
                                {hours(
                                  statistics.seconds,
                                )}{' '}
                                ·{' '}
                                {statistics.questions.total}{' '}
                                questões · Acerto:{' '}
                                {pct(
                                  statistics.questions.rate,
                                )}
                                {statistics.last
                                  ? ` · Última sessão: ${new Date(
                                      statistics.last,
                                    ).toLocaleDateString(
                                      'pt-BR',
                                    )}`
                                  : ''}
                              </small>
                            </div>

                            <select
                              className="status-select"
                              aria-label={`Status de ${topic.payload.name}`}
                              value={
                                topic.payload.status ||
                                'not_started'
                              }
                              onChange={(event) =>
                                void run(
                                  () =>
                                    save({
                                      data: {
                                        id: topic.id,
                                        kind: 'topic',
                                        payload: {
                                          ...topic.payload,
                                          status:
                                            event.target
                                              .value,
                                        },
                                      },
                                    }),
                                  'Status atualizado',
                                )
                              }
                            >
                              {Object.entries(
                                statusLabels,
                              ).map(([value, label]) => (
                                <option
                                  key={value}
                                  value={value}
                                >
                                  {label}
                                </option>
                              ))}
                            </select>

                            <div className="topic-actions">
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label="Agendar revisão"
                                onClick={() =>
                                  setForm({
                                    kind: 'review',
                                    defaults: {
                                      topic_id: topic.id,
                                    },
                                  })
                                }
                              >
                                <RotateCcw />
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label="Adicionar subtópico"
                                onClick={() =>
                                  setForm({
                                    kind: 'topic',
                                    defaults: {
                                      subject_id:
                                        subject.id,
                                      parent_id: topic.id,
                                      order:
                                        Number(
                                          topic.payload
                                            .order || 0,
                                        ) + 1,
                                    },
                                  })
                                }
                              >
                                <Plus />
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label="Editar tópico"
                                onClick={() =>
                                  setForm({
                                    kind: 'topic',
                                    item: topic,
                                  })
                                }
                              >
                                <Pencil />
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label="Excluir tópico"
                                onClick={() =>
                                  void remove(topic.id)
                                }
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </article>
                        );
                      })}

                      {!topics.length && (
                        <Empty title="Adicione o primeiro tópico" />
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      <div className="section-heading spaced">
        <label className="check-row">
          <input
            type="checkbox"
            checked={archived}
            onChange={(event) =>
              setArchived(event.target.checked)
            }
          />
          Mostrar concursos arquivados
        </label>

        {contests.length > 0 && (
          <div className="card-actions">
            {catalog.map((item) => (
              <Button
                key={item.id}
                variant="link"
                onClick={() =>
                  void run(
                    () =>
                      seed({
                        data: { key: item.id },
                      }),
                    'Edital adicionado',
                  )
                }
              >
                Adicionar {item.id.toUpperCase()}{' '}
                {item.year}
              </Button>
            ))}
          </div>
        )}
      </div>

      {data.items.some(
        (item) => item.kind === 'link',
      ) && (
        <section>
          <h2 className="section-title">
            Conteúdos compartilhados
          </h2>

          {data.items
            .filter((item) => item.kind === 'link')
            .map((link) => (
              <div
                className="record-row"
                key={link.id}
              >
                <Link2 size={18} />

                <div>
                  {(link.payload.topic_ids || [])
                    .map(
                      (id: string) =>
                        data.items.find(
                          (item) => item.id === id,
                        )?.payload.name,
                    )
                    .filter(Boolean)
                    .join(' ↔ ')}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover equivalência"
                  onClick={() =>
                    void remove(link.id)
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
        </section>
      )}

      {form && (
        <ItemForm
          {...form}
          close={() => setForm(null)}
        />
      )}
    </>
  );
}

export function EvolutionView() {
  const { data } = useStudies();

  const [cid, setCid] = useState('');
  const [sid, setSid] = useState('');
  const [period, setPeriod] = useState('7');

  const today = day();
  const start = new Date();

  start.setHours(0, 0, 0, 0);
  start.setDate(
    start.getDate() - Number(period) + 1,
  );

  const from = day(start);

  const contests = data.items.filter(
    (item) => item.kind === 'contest',
  );

  const subjects = data.items.filter(
    (item) =>
      item.kind === 'subject' &&
      (!cid || item.payload.contest_id === cid),
  );

  const linkedIds = (id: string) =>
    data.items
      .filter(
        (item) =>
          item.kind === 'link' &&
          item.payload.topic_ids?.includes(id),
      )
      .flatMap(
        (item) => item.payload.topic_ids || [],
      );

  const matchSession = (session: Session) => {
    if (
      cid &&
      !session.contest_ids.includes(cid)
    ) {
      return false;
    }

    if (!sid || session.subject_id === sid) {
      return true;
    }

    return (
      !!session.topic_id &&
      linkedIds(session.topic_id).some(
        (id: string) =>
          data.items.find(
            (item) => item.id === id,
          )?.payload.subject_id === sid,
      )
    );
  };

  const sessions =
    data.sessions.filter(matchSession);

  const questions = data.items.filter(
    (item) =>
      ['questions', 'mock'].includes(item.kind) &&
      (!cid || item.payload.contest_id === cid) &&
      (!sid || item.payload.subject_id === sid) &&
      Boolean(item.payload.date) &&
      item.payload.date! >= from &&
      item.payload.date! <= today,
  );

  const stats = questionStats(questions);

  const days = Array.from(
    { length: Number(period) },
    (_, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index);

      const key = day(date);

      const goal = data.items
        .filter(
          (item) =>
            item.kind === 'goal' &&
            (item.payload.contest_id || '') === cid &&
            Boolean(item.payload.date) &&
            item.payload.date! <= key,
        )
        .sort((a, b) =>
          b.created_at.localeCompare(a.created_at),
        )[0];

      return {
        name: date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
        date: key,
        Horas: Number(
          (
            sessions.reduce(
              (total, session) =>
                total + secondsOnDay(session, key),
              0,
            ) / 3600
          ).toFixed(2),
        ),
        Meta: Number(
          goal?.payload.daily_hours || 0,
        ),
        Questões: questions
          .filter(
            (question) =>
              question.payload.date === key,
          )
          .reduce(
            (total, question) =>
              total +
              Number(question.payload.total || 0),
            0,
          ),
      };
    },
  );

  const perSubject = subjects
    .filter(
      (subject) => !sid || subject.id === sid,
    )
    .map((subject) => ({
      name: subject.payload.name || 'Disciplina',
      Acerto: questionStats(
        questions.filter(
          (question) =>
            question.payload.subject_id ===
            subject.id,
        ),
      ).rate,
    }))
    .filter(
      (item) => item.Acerto !== null,
    );

  const mocks = questions
    .filter((item) => item.kind === 'mock')
    .map((item) => ({
      name: item.payload.name || 'Simulado',
      Pontuação: score(item.payload),
      date: item.payload.date,
    }));

  const estimated = subjects
    .filter(
      (subject) => !sid || subject.id === sid,
    )
    .map((subject) => ({
      name: subject.payload.name || 'Disciplina',
      Estimada: data.items
        .filter(
          (item) =>
            item.kind === 'topic' &&
            item.payload.subject_id === subject.id,
        )
        .reduce(
          (total, item) =>
            total +
            Number(item.payload.estimated_hours || 0),
          0,
        ),
      Investida: Number(
        (
          sessions
            .filter(
              (session) =>
                session.subject_id === subject.id ||
                (!!session.topic_id &&
                  linkedIds(session.topic_id).some(
                    (id: string) =>
                      data.items.find(
                        (item) => item.id === id,
                      )?.payload.subject_id ===
                      subject.id,
                  )),
            )
            .reduce(
              (total, session) =>
                total + elapsed(session),
              0,
            ) / 3600
        ).toFixed(2),
      ),
    }));

  const reviews = data.items
    .filter(
      (item) =>
        item.kind === 'review' &&
        !item.payload.done &&
        Boolean(item.payload.date) &&
        item.payload.date! <= today,
    )
    .filter((review) => {
      const topic = data.items.find(
        (item) =>
          item.id === review.payload.topic_id,
      );

      return (
        subjects.some(
          (subject) =>
            subject.id === topic?.payload.subject_id,
        ) &&
        (!sid ||
          topic?.payload.subject_id === sid)
      );
    });

  const save = useServerFn(saveItem);
  const { run } = useActions();

  const totalHours = days.reduce(
    (total, item) => total + item.Horas,
    0,
  );

  const planned = days.reduce(
    (total, item) => total + item.Meta,
    0,
  );

  return (
    <>
      <Title
        eyebrow="UM OLHAR SOBRE SUA JORNADA"
        title="Evolução com dados reais."
        subtitle="Tempo, questões e desempenho. Cada indicador no seu lugar."
      />

      <div className="filters">
        <Field label="Concurso">
          <select
            value={cid}
            onChange={(event) => {
              setCid(event.target.value);
              setSid('');
            }}
          >
            <option value="">
              Todos os concursos
            </option>

            {contests.map((contest) => (
              <option
                key={contest.id}
                value={contest.id}
              >
                {contest.payload.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Disciplina">
          <select
            value={sid}
            onChange={(event) =>
              setSid(event.target.value)
            }
          >
            <option value="">
              Todas as disciplinas
            </option>

            {subjects.map((subject) => (
              <option
                key={subject.id}
                value={subject.id}
              >
                {subject.payload.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Período">
          <select
            value={period}
            onChange={(event) =>
              setPeriod(event.target.value)
            }
          >
            <option value="7">
              Últimos 7 dias
            </option>
            <option value="30">
              Últimos 30 dias
            </option>
            <option value="90">
              Últimos 90 dias
            </option>
          </select>
        </Field>
      </div>

      <div className="metrics-grid">
        {[
          ['Tempo líquido', hours(totalHours * 3600)],
          ['Questões resolvidas', stats.total],
          ['Taxa entre respondidas', pct(stats.rate)],
          ['Acertos sobre o total', pct(stats.percentage)],
        ].map(([label, value]) => (
          <article
            className="metric-card"
            key={String(label)}
          >
            <div className="metric-label">
              {label}
            </div>

            <strong>{value}</strong>

            <small>
              {label === 'Questões resolvidas'
                ? `${stats.correct} acertos · ${stats.wrong} erros · ${stats.blank} brancos`
                : 'No período selecionado'}
            </small>
          </article>
        ))}
      </div>

      <div className="charts-grid">
        <ChartPanel
          title="Horas líquidas × metas"
          empty={!sessions.length}
        >
          <ResponsiveContainer
            width="100%"
            height={240}
          >
            <BarChart data={days}>
              <CartesianGrid
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar
                dataKey="Meta"
                fill="var(--chart-2)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="Horas"
                fill="var(--primary)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Questões por dia"
          empty={!questions.length}
        >
          <ResponsiveContainer
            width="100%"
            height={240}
          >
            <BarChart data={days}>
              <CartesianGrid
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
              />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="Questões"
                fill="var(--chart-3)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Taxa de acerto por disciplina"
          empty={!perSubject.length}
        >
          <ResponsiveContainer
            width="100%"
            height={Math.max(
              240,
              perSubject.length * 40,
            )}
          >
            <BarChart
              data={perSubject}
              layout="vertical"
              margin={{ left: 20 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar
                dataKey="Acerto"
                fill="var(--primary)"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Pontuação líquida em simulados"
          empty={!mocks.length}
        >
          <ResponsiveContainer
            width="100%"
            height={240}
          >
            <LineChart data={mocks}>
              <CartesianGrid stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
              />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="Pontuação"
                stroke="var(--chart-3)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>

          <p className="form-note">
            Cada registro utiliza sua regra de pontuação.
            Escalas diferentes não são equivalentes.
          </p>
        </ChartPanel>

        <ChartPanel
          title="Carga estimada × tempo investido"
          empty={!sessions.length}
        >
          <ResponsiveContainer
            width="100%"
            height={260}
          >
            <BarChart data={estimated}>
              <XAxis
                dataKey="name"
                tick={false}
              />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="Estimada"
                fill="var(--chart-2)"
              />
              <Bar
                dataKey="Investida"
                fill="var(--primary)"
              />
            </BarChart>
          </ResponsiveContainer>

          <p className="form-note">
            Tempo investido não representa domínio.
            Cargas compartilhadas podem aparecer em mais
            de uma disciplina.
          </p>
        </ChartPanel>

        <section className="weekly-summary">
          <div className="section-heading">
            <h2>
              Resumo{' '}
              {period === '7'
                ? 'semanal'
                : 'do período'}
            </h2>
            <CalendarDays size={18} />
          </div>

          <div className="summary-line">
            <span>Planejado</span>
            <strong>
              {planned
                ? `${planned.toFixed(1)}h`
                : 'Meta não definida'}
            </strong>
          </div>

          <div className="summary-line">
            <span>Realizado</span>
            <strong>
              {totalHours.toFixed(1)}h
            </strong>
          </div>

          <div className="summary-line">
            <span>Questões respondidas</span>
            <strong>{stats.answered}</strong>
          </div>

          <div className="summary-line">
            <span>Revisões pendentes</span>
            <strong>{reviews.length}</strong>
          </div>

          <h3>Prioridade sugerida</h3>

          <p>
            {reviews.length
              ? `Comece pelas revisões vencidas: existem ${reviews.length} pendências agendadas.`
              : perSubject.length
                ? `Revise ${
                    [...perSubject].sort(
                      (a, b) =>
                        Number(a.Acerto) -
                        Number(b.Acerto),
                    )[0]?.name
                  }, com a menor taxa de acerto registrada no período.`
                : 'Registre uma sessão e um bloco de questões para identificar suas prioridades.'}
          </p>

          {reviews.map((review) => (
            <div
              className="review-row"
              key={review.id}
            >
              <div>
                <h3>
                  {
                    data.items.find(
                      (item) =>
                        item.id ===
                        review.payload.topic_id,
                    )?.payload.name
                  }
                </h3>

                <small>
                  {review.payload.date}
                </small>
              </div>

              <Button
                size="icon"
                variant="outline"
                aria-label="Concluir revisão"
                onClick={() =>
                  void run(
                    () =>
                      save({
                        data: {
                          id: review.id,
                          kind: 'review',
                          payload: {
                            ...review.payload,
                            done: true,
                          },
                        },
                      }),
                    'Revisão concluída',
                  )
                }
              >
                <Check />
              </Button>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

function ChartPanel({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="chart-panel">
      <h2>{title}</h2>

      {empty ? (
        <Empty
          icon={TrendingUp}
          title="Ainda sem registros"
          text="Seus dados aparecerão aqui após os primeiros estudos."
        />
      ) : (
        children
      )}
    </section>
  );
}

export function AccountDialog({
  mode,
  close,
}: {
  mode: string;
  close: () => void;
}) {
  const { user, data, login, logout } = useStudies();
  const { run } = useActions();

  const restore = useServerFn(restoreBackup);
  const profileSave = useServerFn(saveProfile);

  const [form, setForm] = useState(false);
  const [name, setName] = useState(
    data.profile?.display_name ||
      getDisplayName(
        user?.user_metadata?.['full_name'],
      ),
  );
  const [avatar, setAvatar] = useState(
    data.profile?.avatar_url || '',
  );
  const [timezone, setTimezone] = useState(
    data.profile?.preferences?.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [backup, setBackup] = useState<any>(null);

  const download = (
    text: string,
    filename: string,
    type: string,
  ) => {
    const url = URL.createObjectURL(
      new Blob([text], { type }),
    );

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(
      () => URL.revokeObjectURL(url),
      1000,
    );
  };

  if (form) {
    return (
      <ItemForm
        kind="goal"
        close={() => setForm(false)}
      />
    );
  }

  return (
    <Modal
      title={
        mode === 'backup'
          ? 'Backup e exportação'
          : mode === 'settings'
            ? 'Configurações'
            : 'Minha conta'
      }
      close={close}
    >
      <div className="form-body">
        {!user ? (
          <>
            <Empty
              icon={UserRound}
              title="Seu espaço, em qualquer dispositivo"
              text="Entre com Google para guardar estudos, perfil e preferências."
            />

            <Button onClick={() => void login()}>
              Entrar com Google
            </Button>
          </>
        ) : mode === 'account' ? (
          <form
            className="form-body"
            onSubmit={(event) => {
              event.preventDefault();

              void run(() =>
                profileSave({
                  data: {
                    display_name: name,
                    avatar_url: avatar || null,
                    timezone,
                  },
                }),
              );
            }}
          >
            <Field label="Nome">
              <input
                required
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
              />
            </Field>

            <Field label="Foto (URL, opcional)">
              <input
                type="url"
                value={avatar}
                onChange={(event) =>
                  setAvatar(event.target.value)
                }
              />
            </Field>

            <Field label="Fuso horário (preferência)">
              <input
                required
                value={timezone}
                onChange={(event) =>
                  setTimezone(event.target.value)
                }
              />
            </Field>

            <p className="form-note">
              Datas dos relatórios acompanham o fuso
              horário do dispositivo.
            </p>

            <Button>Salvar perfil</Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                close();
                void logout();
              }}
            >
              <LogOut />
              Sair da conta
            </Button>
          </form>
        ) : mode === 'settings' ? (
          <>
            <div className="setting-row">
              <div>
                <h3>Metas de estudo</h3>
                <p>
                  Horas diárias, semanais e questões.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => setForm(true)}
              >
                <Target />
                Configurar
              </Button>
            </div>

            <div className="setting-row">
              <div>
                <h3>Histórico de metas</h3>
                <p>
                  Alterações preservam os valores anteriores.
                </p>
              </div>
            </div>

            {data.items
              .filter((item) => item.kind === 'goal')
              .slice()
              .reverse()
              .map((item) => (
                <div
                  className="summary-line"
                  key={item.id}
                >
                  <span>
                    {item.payload.date}
                    {item.payload.contest_id
                      ? ` · ${
                          data.items.find(
                            (contest) =>
                              contest.id ===
                              item.payload.contest_id,
                          )?.payload.name || ''
                        }`
                      : ''}
                  </span>

                  <strong>
                    {item.payload.daily_hours}h/dia ·{' '}
                    {item.payload.weekly_hours}h/semana
                  </strong>
                </div>
              ))}
          </>
        ) : (
          <>
            <p className="form-note">
              Exportações incluem seu histórico finalizado.
              Sessões ativas continuam salvas na conta,
              mas não são restauradas.
            </p>

            <Button
              variant="outline"
              onClick={() =>
                download(
                  JSON.stringify(
                    {
                      version: 1,
                      items: data.items,
                      sessions: data.sessions.filter(
                        (session) =>
                          session.state === 'finished',
                      ),
                    },
                    null,
                    2,
                  ),
                  `central-estudos-${day()}.json`,
                  'application/json',
                )
              }
            >
              <Download />
              Exportar JSON completo
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                const rows = [
                  [
                    'tipo',
                    'id',
                    'data',
                    'concurso',
                    'disciplina',
                    'tempo_segundos',
                    'total',
                    'acertos',
                    'erros',
                    'brancos',
                    'pontuacao',
                    'dados',
                  ],

                  ...data.items.map((item) => [
                    item.kind,
                    item.id,
                    item.payload.date ||
                      item.created_at,
                    item.payload.contest_id || '',
                    item.payload.subject_id || '',
                    '',
                    item.payload.total ?? '',
                    item.payload.correct ?? '',
                    item.payload.wrong ?? '',
                    item.payload.blank ?? '',
                    item.kind === 'mock'
                      ? score(item.payload)
                      : '',
                    JSON.stringify(item.payload),
                  ]),

                  ...data.sessions
                    .filter(
                      (session) =>
                        session.state === 'finished',
                    )
                    .map((session) => [
                      'session',
                      session.id,
                      session.started_at,
                      session.contest_ids.join(';'),
                      session.subject_id,
                      session.elapsed_seconds,
                      '',
                      '',
                      '',
                      '',
                      '',
                      JSON.stringify(session),
                    ]),
                ];

                const csv = rows
                  .map((row) =>
                    row
                      .map(
                        (value) =>
                          `"${String(value).replaceAll(
                            '"',
                            '""',
                          )}"`,
                      )
                      .join(','),
                  )
                  .join('\r\n');

                download(
                  `\ufeff${csv}`,
                  `central-estudos-${day()}.csv`,
                  'text/csv;charset=utf-8',
                );
              }}
            >
              <Download />
              Exportar CSV
            </Button>

            <Field label="Restaurar JSON">
              <input
                type="file"
                accept="application/json,.json"
                onChange={async (event) => {
                  const file =
                    event.target.files?.[0];

                  if (!file) return;

                  try {
                    if (
                      file.size >
                      10 * 1024 * 1024
                    ) {
                      throw new Error(
                        'Arquivo maior que 10 MB',
                      );
                    }

                    const parsed = JSON.parse(
                      await file.text(),
                    );

                    if (
                      parsed.version !== 1 ||
                      !Array.isArray(parsed.items) ||
                      !Array.isArray(parsed.sessions)
                    ) {
                      throw new Error(
                        'Formato de backup inválido',
                      );
                    }

                    setBackup(parsed);
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : 'Arquivo inválido',
                    );
                  }
                }}
              />
            </Field>

            {backup && (
              <div className="backup-confirm">
                <h3>Confirmar restauração</h3>

                <p>
                  {backup.items.length} registros e{' '}
                  {backup.sessions.length} sessões.
                  Registros existentes serão preservados;
                  IDs repetidos serão ignorados.
                </p>

                <Button
                  onClick={() => {
                    if (
                      window.confirm(
                        'Restaurar este backup sem substituir ou apagar os registros existentes?',
                      )
                    ) {
                      void run(async () => {
                        const count = await restore({
                          data: backup,
                        });

                        setBackup(null);

                        toast.success(
                          `${count} registros novos restaurados`,
                        );
                      }, '');
                    }
                  }}
                >
                  <Upload />
                  Confirmar restauração
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
