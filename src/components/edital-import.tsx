import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { FileUp, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Modal, Field } from './study-forms';
import { useStudies } from './study-provider';
import { importEdital } from '@/lib/study.functions';
import { parseEdital, countTopics, dedupeSubjects, type DraftEdital, type DraftTopic } from '@/lib/edital-parser';

async function readPdf(file: File) {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', buf.slice(0));
  const hash = [...new Uint8Array(hashBuf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  let text = '';
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    for (const it of content.items as any[]) text += (it.str ?? '') + (it.hasEOL ? '\n' : '');
    text += '\n';
  }
  return { text, hash, pages: doc.numPages };
}

function TopicEditor({ list, onChange, depth = 0 }: { list: DraftTopic[]; onChange: (l: DraftTopic[]) => void; depth?: number }) {
  return (
    <ul className="import-topics" style={{ paddingLeft: depth ? 14 : 0 }}>
      {list.map((t, i) => (
        <li key={i}>
          <div className="import-row">
            <input aria-label="Nome do tópico" value={t.name} onChange={(e) => onChange(list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <button type="button" aria-label="Adicionar subtópico" onClick={() => onChange(list.map((x, j) => (j === i ? { ...x, children: [...x.children, { name: 'Novo subtópico', children: [] }] } : x)))}><Plus size={14} /></button>
            <button type="button" aria-label="Excluir tópico" onClick={() => onChange(list.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
          </div>
          {t.children.length > 0 && <TopicEditor list={t.children} depth={depth + 1} onChange={(c) => onChange(list.map((x, j) => (j === i ? { ...x, children: c } : x)))} />}
        </li>
      ))}
    </ul>
  );
}

export function EditalImport() {
  const { user, login, refresh } = useStudies();
  const save = useServerFn(importEdital);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<DraftEdital | null>(null);
  const [file, setFile] = useState<{ name: string; hash: string } | null>(null);
  const [expanded, setExpanded] = useState<number | null>(0);

  const pick = async (f?: File) => {
    if (!f) return;
    setError(''); setDraft(null); setBusy(true);
    try {
      if (f.type && f.type !== 'application/pdf') throw new Error('Selecione um arquivo PDF.');
      const { text, hash } = await readPdf(f);
      if (text.replace(/\s/g, '').length < 200) throw new Error('Este PDF não tem texto selecionável (provavelmente é digitalizado). Nenhum conteúdo foi inventado: cadastre as disciplinas manualmente ou use um PDF com texto.');
      const parsed = parseEdital(text);
      if (!parsed.subjects.length) throw new Error('Não encontramos o conteúdo programático no formato "DISCIPLINA: 1 Tópico. 2 Tópico". Você pode cadastrar manualmente.');
      setFile({ name: f.name, hash }); setDraft(parsed); setExpanded(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível ler o PDF.');
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    if (!draft || !file) return;
    const subjects = dedupeSubjects(draft.subjects.map((s) => ({ ...s, name: s.name.trim() })).filter((s) => s.name));
    if (!subjects.length) return setError('Mantenha ao menos uma disciplina com tópicos.');
    setBusy(true);
    try {
      await save({ data: { ...draft, subjects, hash: file.hash, filename: file.name.slice(0, 200) } });
      await refresh();
      toast.success('Edital importado. Agora monte seu cronograma.');
      setOpen(false); setDraft(null);
      void navigate({ to: '/cronograma' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao importar.');
    } finally { setBusy(false); }
  };

  const setSubject = (i: number, patch: Partial<DraftEdital['subjects'][number]>) =>
    draft && setDraft({ ...draft, subjects: draft.subjects.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  return (
    <>
      <Button variant="outline" onClick={() => (user ? setOpen(true) : void login())}><FileUp /> Importar edital</Button>
      {open && (
        <Modal title="Importar edital (PDF)" close={() => !busy && setOpen(false)}>
          {!draft && (
            <div className="import-pick">
              <p className="form-note">O PDF é lido no seu aparelho. Você revisa tudo antes de salvar.</p>
              <label className="import-drop">
                <FileUp size={22} />
                <span>{busy ? 'Lendo o PDF…' : 'Escolher arquivo PDF'}</span>
                <input type="file" accept="application/pdf,.pdf" hidden disabled={busy} onChange={(e) => void pick(e.target.files?.[0])} />
              </label>
            </div>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          {draft && (
            <div className="import-review">
              <div className="form-grid">
                <Field label="Concurso"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
                <Field label="Cargo"><input value={draft.role} placeholder="Não identificado" onChange={(e) => setDraft({ ...draft, role: e.target.value })} /></Field>
                <Field label="Órgão"><input value={draft.agency} placeholder="Não identificado" onChange={(e) => setDraft({ ...draft, agency: e.target.value })} /></Field>
                <Field label="Banca"><input value={draft.board} placeholder="Não identificada" onChange={(e) => setDraft({ ...draft, board: e.target.value })} /></Field>
              </div>
              <p className="form-note">{draft.subjects.length} disciplinas · {draft.subjects.reduce((n, s) => n + countTopics(s.topics), 0)} tópicos identificados. Corrija o que estiver errado.</p>
              {draft.subjects.map((s, i) => (
                <section className="import-subject" key={i}>
                  <div className="import-row">
                    <button type="button" aria-label="Expandir" onClick={() => setExpanded(expanded === i ? null : i)}>{expanded === i ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
                    <input aria-label="Disciplina" value={s.name} onChange={(e) => setSubject(i, { name: e.target.value })} />
                    <small>{countTopics(s.topics)}</small>
                    <button type="button" aria-label="Excluir disciplina" onClick={() => setDraft({ ...draft, subjects: draft.subjects.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
                  </div>
                  {expanded === i && (
                    <>
                      <TopicEditor list={s.topics} onChange={(topics) => setSubject(i, { topics })} />
                      <Button size="sm" variant="ghost" onClick={() => setSubject(i, { topics: [...s.topics, { name: 'Novo tópico', children: [] }] })}><Plus /> Tópico</Button>
                    </>
                  )}
                </section>
              ))}
              <Button size="sm" variant="ghost" onClick={() => { setDraft({ ...draft, subjects: [...draft.subjects, { name: 'Nova disciplina', topics: [{ name: 'Novo tópico', children: [] }] }] }); setExpanded(draft.subjects.length); }}><Plus /> Disciplina</Button>
              <div className="card-actions">
                <Button variant="outline" disabled={busy} onClick={() => { setDraft(null); setError(''); }}>Outro arquivo</Button>
                <Button disabled={busy} onClick={() => void confirm()}>{busy ? 'Salvando…' : 'Confirmar importação'}</Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
