"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Boxes, LayoutDashboard, LogOut, PackageOpen, ReceiptText, ShoppingCart, Tags } from "lucide-react";
export default function AppShell({children,admin=false}:{children:React.ReactNode;admin?:boolean}){
 const p=usePathname(),r=useRouter(); const items=[
  ["/painel","Painel",LayoutDashboard],["/vendas","Realizar venda",ShoppingCart],["/finalizar-venda","Encerrar compra",ReceiptText],["/estoque","Estoque",PackageOpen],
  ...(admin?[["/admin","Admin",BarChart3],["/admin/produtos","Produtos",Tags],["/admin/relatorios","Relatórios",Boxes]]:[])
 ] as const;
 async function sair(){await fetch('/api/auth/logout',{method:'POST'});r.push('/login');r.refresh()}
 return <div style={{display:'flex',minHeight:'100vh'}}><aside style={{width:245,background:'#1b1714',color:'white',padding:22,position:'sticky',top:0,height:'100vh'}}>
  <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:28}}><img src="/ejc-logo.png" alt="EJC" style={{width:48,height:48,objectFit:'contain'}}/><div><b style={{fontSize:18}}>EJC</b><div style={{fontSize:12,color:'#d8c8bd'}}>Vendas & Estoque</div></div></div>
  <nav style={{display:'grid',gap:7}}>{items.map(([href,label,Icon])=><Link key={href} href={href} style={{display:'flex',gap:10,alignItems:'center',padding:'11px 12px',borderRadius:11,background:p===href?'#f47a20':'transparent',color:p===href?'white':'#eadfd7'}}><Icon size={18}/>{label}</Link>)}</nav>
  <button onClick={sair} style={{position:'absolute',bottom:22,left:22,right:22,display:'flex',gap:9,alignItems:'center',padding:11,border:0,borderRadius:10,background:'#302721',color:'white',cursor:'pointer'}}><LogOut size={17}/> Sair</button>
 </aside><main style={{flex:1,padding:'34px clamp(20px,4vw,54px)',minWidth:0}}>{children}</main></div>
}
