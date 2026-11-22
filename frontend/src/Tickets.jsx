import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'

const statuses = ['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED']
const statusName = value => value.toLowerCase().replaceAll('_', ' ').replace(/^./, c => c.toUpperCase())
const date = value => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const message = error => error.response?.data?.message || error.response?.data?.detail || error.message
const number = id => 'SD-' + String(id).padStart(4, '0')
function Status({value}) {
  return <span className={'badge ' + value}>{statusName(value)}</span>
}
function Choices({items}) {
  return items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)
}
function Empty({children}) {
  return <p className="muted p-5">{children}</p>
}

export function TicketList({api,user,tickets=[],catalog,refresh,notify}) {
  const [filters,setFilters] = useState({q:'',status:'',priority:'',category:''})
  const [page,setPage] = useState(1)
  const [creating,setCreating] = useState(false)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const navigate = useNavigate()
  const categories = catalog?.categories || []
  const priorities = catalog?.priorities || []
  const visible = tickets.filter(t =>
    (!filters.status || t.status === filters.status) &&
    (!filters.priority || String(t.priority.id) === filters.priority) &&
    (!filters.category || String(t.category.id) === filters.category) &&
    [t.title,number(t.id),t.owner?.name,t.engineer?.name,t.description].some(v => v?.toLowerCase().includes(filters.q.trim().toLowerCase())))
  const pages = Math.max(1, Math.ceil(visible.length / 10))
  const current = Math.min(page,pages)
  function filter(key,value) { setFilters({...filters,[key]:value}); setPage(1) }
  async function create(e) {
    e.preventDefault()
    const body = Object.fromEntries(new FormData(e.currentTarget))
    setBusy(true); setError('')
    try {
      const {data} = await api.post('/tickets',{...body,categoryId:Number(body.categoryId),priorityId:Number(body.priorityId)})
      setCreating(false); notify('Ticket created'); navigate('/tickets/'+data.id); await refresh()
    } catch (err) { setError(message(err)) } finally { setBusy(false) }
  }
  return <div className="stack">
    <header className="page-head"><div><h1>{user.role === 'ENGINEER' ? 'Assigned tickets' : user.role === 'EMPLOYEE' ? 'My tickets' : 'All tickets'}</h1><p className="muted">{tickets.length} {tickets.length===1?'ticket':'tickets'} in your workspace</p></div>
      {user.role === 'EMPLOYEE' && !creating && <button className="btn primary" onClick={()=>{setError('');setCreating(true)}}><Plus size={17}/> New ticket</button>}</header>
    {creating && <form onSubmit={create} className="panel stack"><h2>Create a ticket</h2>
      <label className="field">Subject<input autoFocus name="title" required maxLength="160" /></label>
      <label className="field">Description<textarea name="description" required maxLength="4000" rows="4" /></label>
      <div className="toolbar"><label className="field">Category<select name="categoryId" required defaultValue=""><option value="" disabled>Select category</option><Choices items={categories}/></select></label>
      <label className="field">Priority<select name="priorityId" required defaultValue=""><option value="" disabled>Select priority</option><Choices items={priorities}/></select></label></div>
      {error && <p role="alert">{error}</p>}<div className="toolbar"><button className="btn primary" disabled={busy}>{busy?'Creating…':'Create ticket'}</button><button className="btn" type="button" onClick={()=>setCreating(false)} disabled={busy}>Cancel</button></div></form>}
    <section className="panel stack">
      <div className="toolbar"><label className="relative"><span className="sr-only">Search tickets</span><input type="search" placeholder="Search tickets…" value={filters.q} onChange={e=>filter('q',e.target.value)}/></label>
        <select aria-label="Filter by status" value={filters.status} onChange={e=>filter('status',e.target.value)}><option value="">All statuses</option>{statuses.map(s=><option key={s} value={s}>{statusName(s)}</option>)}</select>
        <select aria-label="Filter by category" value={filters.category} onChange={e=>filter('category',e.target.value)}><option value="">All categories</option><Choices items={categories}/></select>
        <select aria-label="Filter by priority" value={filters.priority} onChange={e=>filter('priority',e.target.value)}><option value="">All priorities</option><Choices items={priorities}/></select></div>
      <div className="table-wrap"><table><thead><tr>{['Ticket','Priority','Status','Engineer','Opened'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>
        {visible.slice((current-1)*10,current*10).map(t=><tr key={t.id}><td><Link to={'/tickets/'+t.id}><small className="muted block">{number(t.id)} · {t.category.name}</small><strong>{t.title}</strong></Link></td><td><span className={'badge '+t.priority.name.toLowerCase()}>{t.priority.name}</span></td><td><Status value={t.status}/></td><td>{t.engineer?.name||'Unassigned'}</td><td>{date(t.createdAt)}</td></tr>)}
      </tbody></table></div>{!visible.length && <Empty>{tickets.length?'No tickets match these filters.':'Your ticket queue is empty.'}</Empty>}
      <div className="toolbar"><span className="muted">Page {current} of {pages} · {visible.length} results</span><button className="btn" aria-label="Previous page" disabled={current===1} onClick={()=>setPage(current-1)}><ChevronLeft size={16}/></button><button className="btn" aria-label="Next page" disabled={current===pages} onClick={()=>setPage(current+1)}><ChevronRight size={16}/></button></div>
    </section></div>
}

function Timeline({items,empty}) {
  if (!items.length) return <Empty>{empty}</Empty>
  return <ol className="stack">{items.map(entry=><li key={entry.id}><strong>{entry.actor.name}</strong> <small className="muted">{date(entry.createdAt)}</small><p className="whitespace-pre-wrap break-words">{entry.text}</p></li>)}</ol>
}

export function TicketDetail({api,user,users=[],refresh,notify}) {
  const {id} = useParams()
  const [detail,setDetail] = useState(null)
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
  const [next,setNext] = useState('')
  const [retry,setRetry] = useState(0)
  const activeId = useRef(id)
  activeId.current = id
  useEffect(()=>{
    let live=true
    setDetail(null); setError(''); setNext('')
    api.get('/tickets/'+id).then(({data})=>{if(live)setDetail(data)}).catch(err=>{if(live)setError(message(err))})
    return ()=>{live=false}
  },[api,id,retry])
  async function change(e,action,success) {
    e.preventDefault()
    const form=e.currentTarget
    const body=Object.fromEntries(new FormData(form))
    if (action==='assign') body.engineerId=Number(body.engineerId)
    if ((action==='assign'||body.status==='CLOSED') && !window.confirm(action==='assign'?'Save this engineer assignment?':'Confirm that this issue is resolved and close the ticket?')) return
    setBusy(true);setError('')
    try {
      await api.post('/tickets/'+id+'/'+action,body)
      notify(success);form.reset();setNext('')
      const {data}=await api.get('/tickets/'+id)
      if(activeId.current===id)setDetail(data)
      await refresh()
    } catch(err) {setError(message(err))} finally {setBusy(false)}
  }
  if(!detail) return <div className="panel">{error?<><p role="alert">{error}</p><button className="btn" onClick={()=>setRetry(retry+1)}>Try again</button></>:<p role="status">Loading ticket…</p>}</div>
  const t=detail.ticket
  const transitions=({OPEN:['IN_PROGRESS'],PENDING:['IN_PROGRESS'],IN_PROGRESS:['PENDING','RESOLVED']})[t.status]||[]
  return <article className="stack"><Link to="/tickets" className="muted">‹ Tickets</Link>
    <header className="page-head"><div><p className="muted">{number(t.id)} · {t.category.name}</p><h1>{t.title}</h1></div><Status value={t.status}/></header>
    <section className="panel stack"><div className="toolbar"><span className="badge">{t.priority.name} priority</span><span className="muted">Opened {date(t.createdAt)} by {t.owner.name}</span></div><p className="whitespace-pre-wrap break-words">{t.description}</p><p>Assigned to <strong>{t.engineer?.name||'Unassigned'}</strong></p></section>
    {error&&<p role="alert" className="panel">{error}</p>}
    {user.role==='ADMIN' && t.status!=='CLOSED' && <form className="panel toolbar" onSubmit={e=>change(e,'assign','Assignment saved')}><label className="field">Support engineer<select key={t.engineer?.id} name="engineerId" required defaultValue={t.engineer?.id||''}><option value="" disabled>Select engineer</option><Choices items={users.filter(u=>u.active&&u.role==='ENGINEER')}/></select></label><button className="btn primary" disabled={busy}>Save assignment</button></form>}
    {user.role==='ENGINEER' && transitions.length>0 && <form className="panel stack" onSubmit={e=>change(e,'status','Status updated')}><h2>Update status</h2><label className="field">New status<select required name="status" value={next} onChange={e=>setNext(e.target.value)}><option value="" disabled>Select status</option>{transitions.map(s=><option key={s} value={s}>{statusName(s)}</option>)}</select></label><label className="field">{next==='RESOLVED'?'Resolution note':'Work note (optional)'}<textarea name="note" rows="3" maxLength="3500" required={next==='RESOLVED'}/></label><button className="btn primary" disabled={busy}>Update status</button></form>}
    {user.role==='EMPLOYEE' && t.status==='RESOLVED' && <form className="panel toolbar" onSubmit={e=>change(e,'status','Resolution confirmed')}><input type="hidden" name="status" value="CLOSED"/><button className="btn primary" disabled={busy}>Confirm resolution</button></form>}
    <section className="panel stack"><h2>Conversation</h2><Timeline items={detail.comments} empty="No comments yet."/><form className="stack" onSubmit={e=>change(e,'comments','Comment added')}><label className="field">Add a comment<textarea rows="3" name="text" required maxLength="4000"/></label><button className="btn primary" disabled={busy}>Post comment</button></form></section>
    <section className="panel stack"><h2>Ticket history</h2><Timeline items={detail.history} empty="No activity recorded."/></section></article>
}
