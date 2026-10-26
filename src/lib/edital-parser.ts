// Heuristic, deterministic parser for "conteúdo programático" sections of Brazilian contest notices.
// It never invents content: every name comes from the extracted text.

export type DraftTopic = { name: string; children: DraftTopic[] };
export type DraftSubject = { name: string; topics: DraftTopic[] };
export type DraftEdital = { name: string; agency: string; role: string; board: string; year: number | null; subjects: DraftSubject[] };

const clean = (s: string) => s.replace(/\s+/g, ' ').replace(/^[\s.;:,–-]+|[\s;,–-]+$/g, '').trim();

const SUBJECT_RE = /^([A-ZÁÉÍÓÚÂÊÔÃÕÇÀÜ][A-ZÁÉÍÓÚÂÊÔÃÕÇÀÜ0-9 ,.\-–()/ºª]{3,120}):\s*(.*)$/;
const NUMBERED_RE = /(?:^|\s)(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç])/g;

/** Splits "1 Tema A. 2 Tema B. 2.1 Sub" into numbered items preserving hierarchy. */
export function splitTopics(text: string): DraftTopic[] {
  const marks: { num: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  NUMBERED_RE.lastIndex = 0;
  let expectedTop = 1;
  while ((m = NUMBERED_RE.exec(text))) {
    const num = m[1];
    const top = Number(num.split('.')[0]);
    // accept only plausible sequence numbers to avoid splitting on "Lei 8 112" etc.
    if (!num.includes('.') && top !== expectedTop && top !== expectedTop - 1 + 1) {
      if (top !== expectedTop) continue;
    }
    if (!num.includes('.')) expectedTop = top + 1;
    marks.push({ num, start: m.index + m[0].length, end: m.index + (m[0].startsWith(' ') ? 1 : 0) });
  }
  if (!marks.length) {
    return text.split(/;\s+|\.\s+(?=[A-ZÁÉÍÓÚ])/).map(clean).filter((s) => s.length > 2).map((name) => ({ name, children: [] }));
  }
  const roots: DraftTopic[] = [];
  const byNum = new Map<string, DraftTopic>();
  marks.forEach((mk, i) => {
    const body = clean(text.slice(mk.start, i + 1 < marks.length ? marks[i + 1].end : undefined));
    if (!body) return;
    const node: DraftTopic = { name: `${mk.num} ${body}`, children: [] };
    byNum.set(mk.num, node);
    const parent = mk.num.includes('.') ? byNum.get(mk.num.split('.').slice(0, -1).join('.')) : undefined;
    (parent ? parent.children : roots).push(node);
  });
  return roots;
}

export function detectMeta(text: string) {
  const head = text.slice(0, 6000);
  const agencies = ['Polícia Federal', 'Polícia Rodoviária Federal', 'Polícia Civil', 'Polícia Militar', 'Polícia Penal', 'Corpo de Bombeiros', 'Guarda Municipal', 'Polícia Legislativa'];
  const boards = ['Cebraspe', 'CESPE', 'FGV', 'Vunesp', 'FCC', 'Cesgranrio', 'IBFC', 'Idecan', 'Instituto AOCP', 'Quadrix', 'Consulplan', 'Fundatec'];
  const low = head.toLowerCase();
  const agency = agencies.find((a) => low.includes(a.toLowerCase())) || '';
  const board = boards.find((b) => low.includes(b.toLowerCase())) || '';
  const role = (/cargo\s*(?:\d+\s*)?[:–-]\s*([^\n.;]{3,80})/i.exec(head)?.[1] || '').trim();
  const yearMatch = /edital[^\n]{0,60}?\b(20\d{2})\b/i.exec(head) || /\b(20\d{2})\b/.exec(head);
  const year = yearMatch ? Number(yearMatch[1]) : null;
  return { agency, board, role: clean(role), year };
}

/** Finds the "conteúdo programático" block and extracts "DISCIPLINA: tópicos" groups. */
export function parseEdital(raw: string): DraftEdital {
  const text = raw.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  const meta = detectMeta(text);
  const idx = text.search(/conhecimentos\s+(b[aá]sicos|gerais|espec[ií]ficos)|conte[uú]dos?\s+program[aá]tic/i);
  const body = idx >= 0 ? text.slice(idx) : text;
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
  const subjects: DraftSubject[] = [];
  let current: { name: string; buf: string[] } | null = null;
  const flush = () => {
    if (current) {
      const topics = splitTopics(current.buf.join(' '));
      if (topics.length) subjects.push({ name: current.name, topics });
    }
  };
  for (const line of lines) {
    const sm = SUBJECT_RE.exec(line);
    if (sm && !/^\d/.test(line) && sm[1].replace(/[^A-ZÁÉÍÓÚÂÊÔÃÕÇ]/g, '').length >= 4) {
      flush();
      current = { name: titleCase(clean(sm[1])), buf: [sm[2]] };
    } else if (current) current.buf.push(line);
  }
  flush();
  const name = [meta.agency, meta.role].filter(Boolean).join(' — ') || 'Edital importado';
  return { name, ...meta, subjects: dedupeSubjects(subjects) };
}

function titleCase(s: string) {
  const small = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'para']);
  return s.toLowerCase().split(' ').map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}

export const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function dedupeTopics(list: DraftTopic[]): DraftTopic[] {
  const seen = new Set<string>();
  return list.filter((t) => {
    const k = norm(t.name);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    t.children = dedupeTopics(t.children);
    return true;
  });
}

export function dedupeSubjects(list: DraftSubject[]): DraftSubject[] {
  const map = new Map<string, DraftSubject>();
  for (const s of list) {
    const k = norm(s.name);
    if (!k) continue;
    const prev = map.get(k);
    if (prev) prev.topics = dedupeTopics([...prev.topics, ...s.topics]);
    else map.set(k, { name: s.name, topics: dedupeTopics(s.topics) });
  }
  return [...map.values()].filter((s) => s.topics.length);
}

export const countTopics = (t: DraftTopic[]): number => t.reduce((n, x) => n + 1 + countTopics(x.children), 0);
