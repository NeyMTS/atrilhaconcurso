import { createFileRoute } from '@tanstack/react-router';
import { EvolutionView } from '@/components/study-views';
export const Route=createFileRoute('/evolucao')({
 head:()=>({meta:[{title:'Evolução | Central de Estudos'},{name:'description',content:'Estatísticas reais de tempo, questões e desempenho.'},{property:'og:title',content:'Evolução | Central de Estudos'},{property:'og:description',content:'Estatísticas reais de tempo, questões e desempenho.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:EvolutionView,
});
