import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { StudyView } from '@/components/study-views';
export const Route=createFileRoute('/estudar')({
 validateSearch:z.object({cid:z.string().optional(),sid:z.string().optional()}),
 head:()=>({meta:[{title:'Estudar | Central de Estudos'},{name:'description',content:'Cronômetro persistente e registros de questões e simulados.'},{property:'og:title',content:'Estudar | Central de Estudos'},{property:'og:description',content:'Cronômetro persistente e registros de questões e simulados.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:StudyView,
});
