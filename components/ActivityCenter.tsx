import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { InboxNotification } from '../types';
interface HistoryRequest { id:string;userName:string;date:string;type:string;status:string;notes?:string;adminResponse?:string; }
interface HistoryEvent { id:string;requestId:string;actorName:string;action:string;newStatus?:string;createdAt:string; }
export function ActivityCenter({orgId,timezone,onUnreadChange}:{orgId:string;timezone:string;onUnreadChange:(count:number)=>void}) {
  const [tab,setTab]=useState<'INBOX'|'HISTORY'>('INBOX');
  const [notifications,setNotifications]=useState<InboxNotification[]>([]);
  const [requests,setRequests]=useState<HistoryRequest[]>([]);
  const [events,setEvents]=useState<HistoryEvent[]>([]);
  const [filter,setFilter]=useState('ALL');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const inFlight=useRef(false);
  const unreadCallback=useRef(onUnreadChange);unreadCallback.current=onUnreadChange;
  const format=(time:string)=>new Date(time).toLocaleString(undefined,{timeZone:timezone});
  const load=async()=>{
    const [inbox,history]=await Promise.all([api.get(`/orgs/${orgId}/notifications`),api.get(`/orgs/${orgId}/request-history`)]);
    if(!mounted.current)return;
    setNotifications(inbox.notifications);unreadCallback.current(inbox.unread);setRequests(history.requests);setEvents(history.events);
  };
  useEffect(()=>{
    let active=true;
    const refresh=async()=>{
      try {
        const [inbox,history]=await Promise.all([api.get(`/orgs/${orgId}/notifications`),api.get(`/orgs/${orgId}/request-history`)]);
        if(!active)return;
        setNotifications(inbox.notifications);unreadCallback.current(inbox.unread);setRequests(history.requests);setEvents(history.events);setError('');
      } catch(e) {if(active)setError(e instanceof Error?e.message:'Unable to load activity');}
      finally {if(active)setLoading(false);}
    };
    void refresh();const timer=window.setInterval(()=>void refresh(),30000);
    return()=>{active=false;window.clearInterval(timer);};
  },[orgId]);
  const markRead=async(id?:string)=>{
    if(inFlight.current)return;
    inFlight.current=true;setBusy(true);setError('');
    try{await api.put(`/orgs/${orgId}/notifications/read`,id?{id}:{});await load();}
    catch(e){setError(e instanceof Error?e.message:'Unable to mark read');}
    finally{inFlight.current=false;setBusy(false);}
  };
  return <section className="space-y-5 p-5 md:p-8">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-sky-700">Stay up to date</p><h1 className="mt-1 text-2xl font-bold">Inbox & request history</h1><p className="mt-2 text-sm text-slate-600">In-app updates refresh every 30 seconds while open. Reminders appear here within 24 hours of a shift. Times use {timezone}.</p></div>
      <button className="rounded-xl border px-4 py-2 text-sm font-semibold" disabled={loading||busy} onClick={()=>{setLoading(true);void load().catch(e=>setError(e.message)).finally(()=>setLoading(false));}}>Refresh activity</button></div>
    <div className="flex gap-2">{(['INBOX','HISTORY'] as const).map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)} className={`rounded-xl border px-4 py-3 text-sm font-semibold ${tab===t?'bg-slate-950 text-white':'bg-white text-slate-700'}`}>{t==='INBOX'?'Notifications':'Request history'}</button>)}</div>
    {error&&<p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
    {loading&&<p role="status">Loading activity…</p>}
    {tab==='INBOX'?<>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">Latest 100 updates. Reading an update does not acknowledge an assignment.</p><button className="rounded-xl border px-4 py-2 text-sm" disabled={busy||!notifications.some(n=>!n.readAt)} onClick={()=>void markRead()}>Mark all as read</button></div>
      {!loading&&!notifications.length&&<p className="rounded-xl border border-dashed p-8 text-center text-slate-600">You’re all caught up. New assignment and request updates will appear here.</p>}
      <div className="space-y-3">{notifications.map(n=><article key={n.id} className={`rounded-2xl border p-4 ${n.readAt?'border-slate-200 bg-white':'border-sky-200 bg-sky-50'}`}><div className="flex flex-wrap justify-between gap-3"><span className="text-xs font-bold uppercase text-sky-800">{n.kind}{!n.readAt?' · Unread':''}</span><time dateTime={n.createdAt} className="text-xs text-slate-500">{format(n.createdAt)}</time></div><p className="mt-3 text-sm text-slate-900">{n.message}</p>{!n.readAt&&<button className="mt-3 rounded-lg border bg-white px-3 py-2 text-xs font-semibold" disabled={busy} onClick={()=>void markRead(n.id)}>Mark as read</button>}</article>)}</div>
    </>:<>
      <label className="block text-sm font-semibold">Filter requests<select className="ml-3 rounded-xl border px-3 py-2" value={filter} onChange={e=>setFilter(e.target.value)}>{['ALL','PENDING','APPROVED','REJECTED','CANCELLED'].map(s=><option key={s}>{s}</option>)}</select></label>
      <p className="text-xs text-slate-500">Latest 200 requests, including cancellations. Staff see their own history; administrators see their team’s history.</p>
      <div className="space-y-3">{requests.filter(r=>filter==='ALL'||r.status===filter).map(r=><details key={r.id} className="rounded-2xl border bg-white p-4"><summary className="cursor-pointer text-sm"><span className="font-bold">{r.userName}</span> · {r.date} · {r.type==='WORK'?'Availability':r.type} <span className="ml-2 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold">{r.status}</span></summary>
        {r.notes&&<p className="mt-3 text-sm text-slate-600">Private note: {r.notes}</p>}{r.adminResponse&&<p className="mt-2 text-sm text-slate-600">Manager reply: {r.adminResponse}</p>}
        <ol className="mt-4 space-y-3 border-l border-sky-200 pl-4">{events.filter(e=>e.requestId===r.id).map(e=><li key={e.id} className="text-sm"><p><strong>{e.actorName}</strong> · {e.action.toLowerCase()}{e.newStatus?` → ${e.newStatus.toLowerCase()}`:''}</p><time dateTime={e.createdAt} className="text-xs text-slate-500">{format(e.createdAt)}</time></li>)}</ol>
      </details>)}</div>
      {!loading&&!requests.filter(r=>filter==='ALL'||r.status===filter).length&&<p className="py-8 text-sm text-slate-600">No requests match this filter.</p>}
    </>}
  </section>;
}
