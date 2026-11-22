import { useState } from 'react'
import { Download } from 'lucide-react'

const roles = {EMPLOYEE:'Employee',ENGINEER:'Support engineer',ADMIN:'Administrator'}
function AccountRow({account,self,busy,save}) {
  const [role,setRole]=useState(account.role)
  const [active,setActive]=useState(account.active)
  const changed=role!==account.role||active!==account.active
  return <tr><td><strong>{account.name}</strong><small className="muted block">{account.email}</small></td>
    <td><select aria-label={'Role for '+account.name} value={role} disabled={self||busy} onChange={e=>setRole(e.target.value)}>{Object.entries(roles).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></td>
    <td><label className="flex items-center gap-2"><input type="checkbox" aria-label={'Active account for '+account.name} checked={active} disabled={self||busy} onChange={e=>setActive(e.target.checked)}/>{active?'Active':'Inactive'}</label></td>
    <td><button className="btn" disabled={!changed||busy||self} onClick={()=>{if(window.confirm('Update access for '+account.name+'?')) save(account.id,{role,active})}}>Save</button></td></tr>
}
function CatalogForm({kind,items,busy,save}) {
  function submit(e) {
    e.preventDefault()
    const form=e.currentTarget
    const values=Object.fromEntries(new FormData(form))
    save(kind,{name:values.name,...(values.id?{id:Number(values.id)}:{})},()=>form.reset())
  }
  return <section className="panel stack"><h2>{kind==='categories'?'Categories':'Priorities'}</h2>
    <div className="toolbar">{items.map(item=><span className="badge" key={item.id}>{item.name}</span>)}</div>
    <form className="stack" onSubmit={submit}><label className="field">Catalog entry<select name="id" defaultValue=""><option value="">Add new entry</option>{items.map(i=><option value={i.id} key={i.id}>Rename {i.name}</option>)}</select></label><label className="field">Name<input name="name" required maxLength="80"/></label><div><button className="btn" disabled={busy}>Save {kind==='categories'?'category':'priority'}</button></div></form></section>
}
export function Admin({api,user,users=[],catalog,refresh,notify}) {
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [filter,setFilter]=useState('')
  if(user.role!=='ADMIN') return <p role="alert">Administrator access is required.</p>
  async function run(action) {
    setBusy(true);setError('')
    try {await action()} catch(err) {setError(err.response?.data?.message||err.response?.data?.detail||err.message)} finally {setBusy(false)}
  }
  function saveUser(id,body) {
    return run(async()=>{await api.patch('/users/'+id,body);notify('Account updated');await refresh()})
  }
  function saveCatalog(kind,body,reset) {
    return run(async()=>{await api.post('/catalog/'+kind,body);reset();notify('Catalog updated');await refresh()})
  }
  function exportReport() {
    return run(async()=>{
      const {data}=await api.get('/reports/tickets.csv',{responseType:'blob'})
      const url=URL.createObjectURL(data)
      const a=document.createElement('a')
      a.href=url;a.download='smartdesk-tickets.csv';document.body.append(a);a.click();a.remove()
      window.setTimeout(()=>URL.revokeObjectURL(url),1000)
      notify('Report downloaded')
    })
  }
  const visible=users.filter(u=>(u.name+' '+u.email+' '+roles[u.role]).toLowerCase().includes(filter.trim().toLowerCase()))
  return <div className="stack"><header className="page-head"><div><h1>Administration</h1><p className="muted">Manage workspace access and ticket settings.</p></div><button className="btn" disabled={busy} onClick={exportReport}><Download size={16}/> Export CSV</button></header>
    {error&&<p role="alert" className="panel">{error}</p>}
    <section className="panel stack"><div className="toolbar"><h2>User directory</h2><input aria-label="Search users" type="search" placeholder="Search users…" value={filter} onChange={e=>setFilter(e.target.value)}/></div>
    <div className="table-wrap"><table><thead><tr><th>Account</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{visible.map(u=><AccountRow key={[u.id,u.role,u.active].join('-')} account={u} self={u.id===user.id} busy={busy} save={saveUser}/>)}</tbody></table></div>{!visible.length&&<p className="muted">No matching accounts.</p>}</section>
    <div className="grid gap-4 md:grid-cols-2">{['categories','priorities'].map(kind=><CatalogForm key={kind} kind={kind} items={catalog?.[kind]||[]} busy={busy} save={saveCatalog}/>)}</div></div>
}
