import { createFileRoute } from '@tanstack/react-router';
import { ScheduleView } from '@/components/schedule-view';
export const Route = createFileRoute('/cronograma')({
  head: () => ({ meta: [
    { title: 'Cronograma | Central de Estudos' },
    { name: 'description', content: 'Planejamento semanal de estudos por matéria, prioridade e horas disponíveis.' },
    { property: 'og:title', content: 'Cronograma | Central de Estudos' },
    { property: 'og:description', content: 'Planejamento semanal de estudos por matéria, prioridade e horas disponíveis.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: ScheduleView,
});
