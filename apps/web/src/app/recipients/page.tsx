'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Recipient, User } from '@/lib/api';
type Form = {displayName:string;relationship:string;interests:string;dislikes:string;notes:string};
const empty:Form={displayName:'',relationship:'',interests:'',dislikes:'',notes:''};
function toList(value:string) { return value.split(',').map(x=>x.trim()).filter(Boolean); }
export default function RecipientsPage() {
  const router=useRouter();
  const [user,setUser]=useState<User|null>(null);
  const [items,setItems]=useState<Recipient[]>([]);
  const [form,setForm]=useState<Form>(empty);
  const [editing,setEditing]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [logoutBusy,setLogoutBusy]=useState(false);
  const [error,setError]=useState('');
  const [logoutError,setLogoutError]=useState('');
  useEffect(()=>{
    api<{user:User}>('/auth/me').then(me=>{
      setUser(me.user);
      return api<Recipient[]>('/recipients');
    }).then(setItems).catch(e=>{
      if((e as {status?:number}).status===401) { router.replace('/login'); return; }
      setError((e as Error).message);
    }).finally(()=>setLoading(false));
  },[router]);
  function edit(item:Recipient) {
    setEditing(item.id);
    setForm({displayName:item.displayName,relationship:item.relationship??'',interests:item.interests.join(', '),dislikes:item.dislikes.join(', '),notes:item.notes??''});
    window.scrollTo({top:0,behavior:'smooth'});
  }
  async function save(event:FormEvent) {
    event.preventDefault();setBusy(true);setError('');
    const body=JSON.stringify({displayName:form.displayName,relationship:form.relationship,interests:toList(form.interests),dislikes:toList(form.dislikes),notes:form.notes});
    try {
      await api<Recipient>(editing?'/recipients/'+editing:'/recipients',{method:editing?'PATCH':'POST',body});
      setForm(empty);setEditing(null);setItems(await api<Recipient[]>('/recipients'));
    } catch(e) {setError((e as Error).message);} finally {setBusy(false);}
  }
  async function logout() {
    setLogoutBusy(true);setLogoutError('');
    try { await api<{ok:boolean}>('/auth/logout',{method:'POST'});router.replace('/login'); }
    catch(e) { setLogoutError((e as Error).message);setLogoutBusy(false); }
  }
  return <main className="mx-auto max-w-5xl px-6 py-8">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-green-900/15 pb-6">
      <Link href="/" className="text-xl font-bold">howtochoose.</Link>
      <div className="flex items-center gap-4 text-sm"><span>{user?.email??user?.phone}</span><button onClick={logout} disabled={logoutBusy} className="underline disabled:opacity-50">{logoutBusy?'Đang đăng xuất...':'Đăng xuất'}</button></div>
    </header>
    {logoutError && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{logoutError}</p>}
    <h1 className="mt-12 text-3xl font-semibold">Người nhận quà</h1>
    <p className="mt-2 text-stone-600">Lưu những điều họ thích để lần sau chọn quà dễ hơn.</p>
    {loading ? <p className="mt-8" role="status">Đang tải...</p> : !user ? <div role="alert" className="mt-8 rounded-xl bg-red-50 p-5 text-red-700"><p>{error || 'Không tải được tài khoản.'}</p><button onClick={()=>window.location.reload()} className="mt-3 underline">Thử lại</button></div> : <>
      <form onSubmit={save} className="mt-10 grid gap-4 rounded-2xl bg-white p-6 shadow-sm sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-xl font-semibold">{editing?'Sửa hồ sơ':'Thêm người nhận'}</h2>
        <label className="text-sm">Tên người nhận *<input className="mt-2 w-full rounded-lg border p-3" value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} maxLength={100} required /></label>
        <label className="text-sm">Mối quan hệ<input className="mt-2 w-full rounded-lg border p-3" value={form.relationship} onChange={e=>setForm({...form,relationship:e.target.value})} maxLength={100} /></label>
        <label className="text-sm">Sở thích (ngăn cách bằng dấu phẩy)<input className="mt-2 w-full rounded-lg border p-3" value={form.interests} onChange={e=>setForm({...form,interests:e.target.value})} /></label>
        <label className="text-sm">Điều không thích (ngăn cách bằng dấu phẩy)<input className="mt-2 w-full rounded-lg border p-3" value={form.dislikes} onChange={e=>setForm({...form,dislikes:e.target.value})} /></label>
        <label className="text-sm sm:col-span-2">Ghi chú<textarea className="mt-2 w-full rounded-lg border p-3" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} maxLength={1000} /></label>
        {error && <p role="alert" className="sm:col-span-2 text-red-700">{error}</p>}
        <div className="flex gap-3 sm:col-span-2"><button disabled={busy} className="rounded-xl bg-green-900 px-6 py-3 font-semibold text-white disabled:opacity-50">{busy?'Đang lưu...':editing?'Lưu thay đổi':'Thêm người nhận'}</button>{editing && <button type="button" onClick={()=>{setEditing(null);setForm(empty);}} className="rounded-xl border px-5">Hủy</button>}</div>
      </form>
      <section className="mt-12 pb-16"><h2 className="text-xl font-semibold">Danh sách ({items.length})</h2>
        {items.length===0?<p className="mt-5 text-stone-600">Chưa có người nhận nào. Hãy tạo hồ sơ đầu tiên.</p>:<div className="mt-5 grid gap-4 sm:grid-cols-2">{items.map(item=><article key={item.id} className="rounded-2xl bg-white p-6 shadow-sm"><div className="flex justify-between gap-4"><h3 className="text-lg font-semibold">{item.displayName}</h3><button onClick={()=>edit(item)} className="text-sm underline">Sửa</button></div><p className="mt-1 text-sm text-stone-600">{item.relationship||'Chưa ghi mối quan hệ'}</p><p className="mt-4 text-sm"><b>Thích:</b> {item.interests.join(', ')||'Chưa có'}</p><p className="mt-2 text-sm"><b>Không thích:</b> {item.dislikes.join(', ')||'Chưa có'}</p>{item.notes&&<p className="mt-3 text-sm text-stone-600">{item.notes}</p>}</article>)}</div>}
      </section>
    </>}
  </main>;
}
