import { createFileRoute } from '@tanstack/react-router';
import { HomeView } from '@/components/study-views';
export const Route=createFileRoute('/')({
 head:()=>({meta:[{title:'Início | Central de Estudos'},{name:'description',content:'Resumo de horas líquidas, questões, metas e revisões.'},{property:'og:title',content:'Início | Central de Estudos'},{property:'og:description',content:'Resumo de horas líquidas, questões, metas e revisões.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:HomeView,
});
