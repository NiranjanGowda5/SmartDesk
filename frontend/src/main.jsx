import React, {useCallback, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate} from 'react-router-dom';
import axios from 'axios';
import {Activity, ArrowUpRight, CheckCheck, CircleDot, Clock3, Headphones, Inbox, LayoutDashboard, LogOut, Menu, Moon, Plus, Settings2, Sun, Ticket, X} from 'lucide-react';
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {TicketList, TicketDetail} from './Tickets';
import {Admin} from './Admin';
import './style.css';

const api=axios.create({baseURL:'/api',timeout:15000});
api.interceptors.request.use(config=>{
  const token=sessionStorage.getItem('smartdesk-token');
  if(token) config.headers.Authorization='Bearer '+token;
  return config;
});
api.interceptors.response.use(r=>r,error=>{
  if(error.response?.status===401 && !error.config?.url?.startsWith('/auth/')) window.dispatchEvent(new Event('session-expired'));
  return Promise.reject(error);
});
const roles={ADMIN:'Administrator',EMPLOYEE:'Employee',ENGINEER:'Support engineer'};
const statuses={OPEN:'Open',IN_PROGRESS:'In progress',PENDING:'Pending',RESOLVED:'Resolved',CLOSED:'Closed'};
function Brand(){return <div className="brand"><span className="brand-mark"><Headphones size={24}/></span>SmartDesk</div>}
function Auth({register,onSession}){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const navigate=useNavigate();
  async function submit(event){
    event.preventDefault();setBusy(true);setError('');
    try{
      const data=Object.fromEntries(new FormData(event.currentTarget));
      const {data:session}=await api.post('/auth/'+(register?'register':'login'),data);
      onSession(session);navigate('/');
    }catch(e){setError(e.response?.data?.message || (register?'Check the account details and try again.':'Check your email and password and try again.'))}
    finally{setBusy(false)}
  }
  return <main className="auth"><section className="auth-cover"><Brand/><div><div className="orbit"><Headphones size={62}/><span/><i/></div><h2>IT service desk</h2><p>Track requests, coordinate support and confirm resolutions in one workspace.</p></div><small>SmartDesk · Service operations</small></section>
    <section className="auth-form"><form onSubmit={submit} className="stack"><span className="mobile-brand"><Brand/></span><h1>{register?'Create an account':'Welcome back'}</h1><p className="muted">{register?'Register to submit and track your IT requests.':'Sign in to your service workspace.'}</p>
    {register&&<label>Full name<input name="name" maxLength="80" required autoComplete="name"/></label>}
    <label>Email address<input type="email" name="email" autoComplete="username" required placeholder="you@company.com"/></label>
    <label>Password<input type="password" name="password" autoComplete={register?'new-password':'current-password'} minLength={register?12:1} required/></label>
    {register&&<small>Use at least 12 characters.</small>}{error&&<p role="alert" className="error">{error}</p>}
    <button type="submit" className="primary" disabled={busy}>{busy?'Please wait…':register?'Create account':'Sign in'}</button>
    <p>{register?'Already registered?':'New to SmartDesk?'} <Link to={register?'/login':'/register'}>{register?'Sign in':'Create an account'}</Link></p></form></section></main>
}
function Overview({tickets,user}){
  const navigate=useNavigate();
  const counts=Object.keys(statuses).map(key=>({status:statuses[key],value:tickets.filter(t=>t.status===key).length}));
  const cards=[['Total tickets',tickets.length,Inbox],['In progress',counts[1].value,Activity],['Pending',counts[2].value,Clock3],['Resolved & closed',counts[3].value+counts[4].value,CheckCheck]];
  const categories=Object.entries(tickets.reduce((acc,t)=>({...acc,[t.category.name]:(acc[t.category.name]||0)+1}),{})).sort((a,b)=>b[1]-a[1]);
  return <><header className="page-head"><div><h1>Workspace overview</h1><p className="muted">{user.role==='ADMIN'?'An overview of your service desk.':user.role==='ENGINEER'?'A snapshot of your assigned workload.':'A snapshot of your support requests.'}</p></div><Link className="btn primary" to="/tickets">{user.role==='EMPLOYEE'?<Plus size={17}/>:<Ticket size={17}/>} {user.role==='EMPLOYEE'?'Manage requests':'View tickets'}</Link></header>
    <div className="metrics">{cards.map(([label,value,Icon],index)=><article className={'metric tone'+index} key={label}><span className="metric-icon"><Icon size={20}/></span><div className="metric-number">{value}</div><span>{label}</span></article>)}</div>
    <div className="charts"><section className="panel"><h2>Ticket status</h2><div className="plot"><ResponsiveContainer width="100%" height="100%"><BarChart data={counts} margin={{left:-24,right:4,top:6,bottom:3}}><CartesianGrid vertical={false} strokeDasharray="3 4" stroke="#aab6b866"/><XAxis dataKey="status" tick={{fontSize:12,fill:'var(--muted)'}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fontSize:12,fill:'var(--muted)'}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'var(--panel)',borderColor:'var(--line)',borderRadius:8}} cursor={{fill:'#829e941a'}}/><Bar name="Tickets" dataKey="value" fill="#347c66" radius={[5,5,0,0]} maxBarSize={48}/></BarChart></ResponsiveContainer></div></section>
    <section className="panel"><h2>Requests by category</h2><div className="category-list">{categories.length?categories.map(([name,count])=><div key={name}><div className="between"><span>{name}</span><strong>{count}</strong></div><div className="track"><i style={{width:count/categories[0][1]*100+'%'}}/></div></div>):<p className="muted">New requests will appear here.</p>}</div></section></div>
    <section className="panel"><div className="between"><h2>Recent tickets</h2><Link to="/tickets">View all</Link></div><div className="table-wrap"><table><thead><tr><th>Ticket</th><th>Subject</th><th>Priority</th><th>Status</th></tr></thead><tbody>{tickets.slice(0,5).map(t=><tr key={t.id} onClick={()=>navigate('/tickets/'+t.id)}><td>#{t.id}</td><td><Link to={'/tickets/'+t.id}>{t.title}</Link></td><td>{t.priority.name}</td><td><span className={'badge '+t.status}>{statuses[t.status]}</span></td></tr>)}</tbody></table></div>{!tickets.length&&<p className="muted">Your queue is empty.</p>}</section></>
}
function App(){
 const [user,setUser]=useState(null),[tickets,setTickets]=useState([]),[catalog,setCatalog]=useState({categories:[],priorities:[]}),[users,setUsers]=useState([]);
 const [busy,setBusy]=useState(true),[error,setError]=useState(''),[message,notify]=useState(''),[menu,setMenu]=useState(false);
 const [dark,setDark]=useState(localStorage.getItem('smartdesk-theme')==='dark');
 const location=useLocation();
 useEffect(()=>{setMenu(false)},[location.pathname]);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem('smartdesk-theme',dark?'dark':'light')},[dark]);
 useEffect(()=>{if(message){const timer=setTimeout(()=>notify(''),4200);return()=>clearTimeout(timer)}},[message]);
 function logout(){sessionStorage.removeItem('smartdesk-token');setUser(null);setTickets([]);setUsers([]);setError('');setBusy(false)}
 const refresh=useCallback(async()=>{
   const {data:me}=await api.get('/me');
   const [queue,options,directory]=await Promise.all([api.get('/tickets'),api.get('/catalog'),me.role==='ADMIN'?api.get('/users'):Promise.resolve({data:[]})]);
   setUser(me);setTickets(queue.data);setCatalog(options.data);setUsers(directory.data);setError('');
 },[]);
 async function load(){setBusy(true);try{await refresh()}catch(e){if(e.response?.status!==401)setError('Could not load your workspace. Check the server connection and retry.')}finally{setBusy(false)}}
 useEffect(()=>{window.addEventListener('session-expired',logout);if(sessionStorage.getItem('smartdesk-token'))load();else setBusy(false);return()=>window.removeEventListener('session-expired',logout)},[]);
 const props={api,user,tickets,catalog,users,refresh,notify};
 const session=s=>{sessionStorage.setItem('smartdesk-token',s.token);setUser(s.user);load()};
 if(busy)return <main className="center" role="status">Loading workspace…</main>;
 if(error)return <main className="center stack" role="alert">{error}<button className="btn" onClick={load}>Retry</button></main>;
 if(!user)return <Routes><Route path="/register" element={<Auth key="register" register onSession={session}/>}/><Route path="/login" element={<Auth key="login" onSession={session}/>}/><Route path="*" element={<Navigate replace to="/login"/>}/></Routes>;
 return <div className="shell">{menu&&<button className="scrim" aria-label="Close navigation" onClick={()=>setMenu(false)}/>}<aside className={menu?'open':''}><Brand/><div className="nav-caption">WORKSPACE</div><nav><NavLink end to="/"><LayoutDashboard/>Overview</NavLink><NavLink to="/tickets"><Inbox/>Ticket queue</NavLink>{user.role==='ADMIN'&&<NavLink to="/admin"><Settings2/>Administration</NavLink>}</nav><div className="side-bottom"><div className="profile"><span className="avatar">{user.name.split(/\s+/).map(n=>n[0]).slice(0,2).join('')}</span><div><b>{user.name}</b><small>{roles[user.role]}</small></div></div><button onClick={logout}><LogOut size={16}/>Sign out</button></div></aside>
 <div className="workspace"><header className="topbar"><button className="menu icon" aria-label="Open navigation" onClick={()=>setMenu(true)}><Menu/></button><span>Workspace <span className="slash">/</span> <strong>{location.pathname.startsWith('/admin')?'Administration':location.pathname.startsWith('/tickets')?'Tickets':'Overview'}</strong></span><button className="icon theme" aria-label={dark?'Switch to light mode':'Switch to dark mode'} onClick={()=>setDark(!dark)}>{dark?<Sun/>:<Moon/>}</button></header>
 <main className="content"><Routes><Route path="/" element={<Overview {...props}/>}/><Route path="/tickets" element={<TicketList {...props}/>}/><Route path="/tickets/:id" element={<TicketDetail {...props}/>}/>{user.role==='ADMIN'&&<Route path="/admin/*" element={<Admin {...props}/>}/>}<Route path="*" element={<Navigate replace to="/"/>}/></Routes></main></div>
 {message&&<div className="toast" role="status">{message}<button aria-label="Dismiss notification" onClick={()=>notify('')}><X size={16}/></button></div>}</div>;
}
createRoot(document.getElementById('root')).render(<BrowserRouter><App/></BrowserRouter>);
