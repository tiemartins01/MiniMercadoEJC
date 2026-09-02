"use client";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "./AppShell";
import type { Role } from "@/lib/types";
export default function Guard({children,adminOnly=false}:{children:React.ReactNode;adminOnly?:boolean}){
 const [role,setRole]=useState<Role|null>(null),[ready,setReady]=useState(false); const router=useRouter();
 useEffect(()=>{fetch('/api/auth/me').then(async r=>({ok:r.ok,data:await r.json()})).then(({ok,data})=>{if(!ok){router.replace('/login');return}if(adminOnly&&data.role!=='ADMIN'){router.replace('/painel');return}setRole(data.role);setReady(true)}).catch(()=>router.replace('/login'))},[adminOnly,router]);
 if(!ready||!role)return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',color:'#76685f'}}>Carregando...</div>;
 return <AppShell admin={role==='ADMIN'}>{children}</AppShell>
}
