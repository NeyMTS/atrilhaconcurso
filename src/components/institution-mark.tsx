import { ShieldCheck } from 'lucide-react';
import pfAsset from '@/assets/pf-official.png.asset.json';

// Source: https://www.gov.br/pf/pt-br/principios-fundamentais/simbolos-da-policia-federal-2/emblema.png/image_view_fullscreen
export function InstitutionMark({ agency }: { agency: string }) {
  const normalized = agency.trim().toLowerCase();
  const isPF = normalized === 'pf' || /^pf\b/.test(normalized) || /pol[ií]cia federal/.test(normalized);
  return <span className={`contest-emblem${isPF ? ' official' : ''}`}>
    {isPF ? <img className="institution-logo" src={pfAsset.url} alt="Emblema oficial da Polícia Federal" /> : <ShieldCheck size={25} aria-label="Instituição" />}
  </span>;
}
