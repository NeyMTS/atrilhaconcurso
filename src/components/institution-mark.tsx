import { ShieldCheck } from 'lucide-react';
import pfAsset from '@/assets/pf-official.png.asset.json';
import prfAsset from '@/assets/prf-official.png.asset.json';

// PF source: https://www.gov.br/pf/pt-br/principios-fundamentais/simbolos-da-policia-federal-2/emblema.png/image_view_fullscreen
// PRF source: official PRF badge supplied by the user
export function InstitutionMark({ agency }: { agency: string }) {
  const n = agency.trim().toLowerCase();
  const isPRF = n === 'prf' || /^prf\b/.test(n) || /rodovi[aá]ria federal/.test(n);
  const isPF = !isPRF && (n === 'pf' || /^pf\b/.test(n) || /pol[ií]cia federal/.test(n));
  const logo = isPRF
    ? { src: prfAsset.url, alt: 'Brasão oficial da Polícia Rodoviária Federal' }
    : isPF ? { src: pfAsset.url, alt: 'Emblema oficial da Polícia Federal' } : null;
  return <span className={`contest-emblem${logo ? ' official' : ''}`}>
    {logo ? <img className="institution-logo" src={logo.src} alt={logo.alt} loading="lazy" /> : <ShieldCheck size={25} aria-label="Instituição" />}
  </span>;
}
