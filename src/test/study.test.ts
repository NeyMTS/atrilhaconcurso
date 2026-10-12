import { describe,it,expect } from 'vitest';
import { questionStats,validatePayload,score,elapsed,secondsOnDay,type Item,type Session } from '@/lib/study';
import { catalog } from '@/lib/catalog';
const id='00000000-0000-4000-8000-000000000001';
const row=(p:Record<string,any>)=>({id,kind:'questions',payload:p,created_at:''} as Item);
describe('study integrity',()=>{
 it('distinguishes accuracy and percentage',()=>{const s=questionStats([row({total:100,correct:60,wrong:20,blank:20})]);expect(s.answered).toBe(80);expect(s.rate).toBe(75);expect(s.percentage).toBe(60)});
 it('has no zero division',()=>{expect(questionStats([]).rate).toBeNull();expect(questionStats([row({total:5,correct:0,wrong:0,blank:5})]).rate).toBeNull()});
 it('validates question sums and nonnegative integers',()=>{expect(()=>validatePayload('questions',{contest_id:id,subject_id:id,date:'2026-10-12',total:10,correct:6,wrong:2,blank:1})).toThrow();expect(()=>validatePayload('questions',{contest_id:id,subject_id:id,date:'2026-10-12',total:10,correct:6,wrong:2,blank:2})).not.toThrow()});
 it('scores configurable rules',()=>{expect(score({correct:60,wrong:20,blank:20,correct_value:1,wrong_value:-1,blank_value:0})).toBe(40);expect(score({correct:60,wrong:20,blank:20,correct_value:2,wrong_value:0,blank_value:0})).toBe(120)});
 it('paused clocks never advance',()=>{const s={elapsed_seconds:50,state:'paused',running_since:null} as Session;expect(elapsed(s,10000)).toBe(50);expect(elapsed(s,20000)).toBe(50)});
 it('allocates study across days excluding pauses, counts one shared session',()=>{const s={started_at:'2026-10-12T10:00:00',finished_at:'2026-10-12T11:00:00',state:'finished',elapsed_seconds:2700,running_since:null,pauses:[{start:'2026-10-12T10:15:00',end:'2026-10-12T10:30:00'}],contest_ids:[id,id]} as Session;expect(secondsOnDay(s,'2026-10-12')).toBe(2700);expect(secondsOnDay(s,'2026-10-11')).toBe(0)});
 it('requires explicit confirmation for shared topics',()=>{expect(()=>validatePayload('link',{topic_ids:[id,id],confirmed:false})).toThrow()});
 it('rejects impossible calendar dates',()=>{expect(()=>validatePayload('goal',{date:'2026-02-30',daily_hours:2,weekly_hours:10})).toThrow()});
 it('does not infer a contest scoring rule',()=>{const c=validatePayload('contest',{name:'Concurso'}) as any;expect(c.correct_value).toBeNull();expect(c.wrong_value).toBeNull()});
 it('rejects duplicate equivalence selections',()=>{expect(()=>validatePayload('link',{topic_ids:[id,id],confirmed:true})).toThrow()});
 it('preserves unique official numbering per subject',()=>{for(const c of catalog)for(const s of c.content)expect(new Set(s.topics.map(t=>t.number)).size,s.name).toBe(s.topics.length)});
 it('allocates a midnight crossing without counting the pause',()=>{const s={started_at:'2026-10-12T23:00:00',finished_at:'2026-10-13T02:00:00',state:'finished',elapsed_seconds:7200,running_since:null,pauses:[{start:'2026-10-12T23:30:00',end:'2026-10-13T00:30:00'}]} as Session;expect(secondsOnDay(s,'2026-10-12')).toBe(1800);expect(secondsOnDay(s,'2026-10-13')).toBe(5400)});
});
