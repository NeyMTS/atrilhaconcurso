import { createFileRoute } from '@tanstack/react-router';
import { StudyView } from '@/components/study-views';
export const Route=createFileRoute('/estudar')({
 head:()=>({meta:[{title:'Estudar | Central de Estudos'},{name:'description',content:'Cronômetro persistente e registros de questões e simulados.'},{property:'og:title',content:'Estudar | Central de Estudos'},{property:'og:description',content:'Cronômetro persistente e registros de questões e simulados.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:StudyView,
});
