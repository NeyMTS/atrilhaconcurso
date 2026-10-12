import { createFileRoute } from '@tanstack/react-router';
import { EditalView } from '@/components/study-views';
export const Route=createFileRoute('/edital')({
 head:()=>({meta:[{title:'Editais | Central de Estudos'},{name:'description',content:'Concursos, disciplinas e tópicos com referências oficiais.'},{property:'og:title',content:'Editais | Central de Estudos'},{property:'og:description',content:'Concursos, disciplinas e tópicos com referências oficiais.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:EditalView,
});
