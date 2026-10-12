import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { getStudies } from '@/lib/study.functions';
import { empty,type Snapshot } from '@/lib/study';
import { toast } from 'sonner';
type Context={user:User|null;ready:boolean;loading:boolean;data:Snapshot;refresh:()=>Promise<void>;login:()=>Promise<void>;logout:()=>Promise<void>};
const StudyContext=createContext<Context|null>(null);
export function StudyProvider({children}:{children:ReactNode}){const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false);const queryClient=useQueryClient(),router=useRouter(),fetchStudies=useServerFn(getStudies);
 useEffect(()=>{let mounted=true;const check=()=>{void supabase.auth.getUser().then(({data})=>{if(mounted){setUser(data.user);setReady(true)}})};const {data:listener}=supabase.auth.onAuthStateChange(event=>{if(!['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event))return;check();void router.invalidate();if(event!=='SIGNED_OUT')void queryClient.invalidateQueries({queryKey:['studies']})});check();return()=>{mounted=false;listener.subscription.unsubscribe()}},[queryClient,router]);
 const query=useQuery({queryKey:['studies',user?.id],queryFn:()=>fetchStudies(),enabled:!!user,refetchInterval:15000});
 useEffect(()=>{if(query.error)toast.error('Não foi possível carregar seus estudos: '+query.error.message)},[query.error]);
 const refresh=async()=>{await queryClient.invalidateQueries({queryKey:['studies']})};const login=async()=>{const result=await lovable.auth.signInWithOAuth('google',{redirect_uri:window.location.origin});if(result.error)toast.error(result.error.message)};const logout=async()=>{await queryClient.cancelQueries();queryClient.clear();await supabase.auth.signOut();setUser(null);await router.navigate({to:'/',replace:true})};
 return <StudyContext.Provider value={{user,ready,loading:query.isLoading,data:user?query.data||empty:empty,refresh,login,logout}}>{children}</StudyContext.Provider>}
export function useStudies(){const c=useContext(StudyContext);if(!c)throw new Error('StudyProvider ausente');return c}
