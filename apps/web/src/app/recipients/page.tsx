'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api, Recipient, User } from '@/lib/api';
import { HeaderUtilityActions } from '@/components/header-utility-actions';
type Form = {displayName:string;relationship:string;interests:string;dislikes:string;notes:string};
const empty:Form={displayName:'',relationship:'',interests:'',dislikes:'',notes:''};
function toList(value:string) { return value.split(',').map(x=>x.trim()).filter(Boolean); }
export default function RecipientsPage() {
  const router=useRouter();
  const [user,setUser]=useState<User|null>(null);
  const [profileName,setProfileName]=useState('');
  const [profileBusy,setProfileBusy]=useState(false);
  const [profileError,setProfileError]=useState('');
  const [profileEditing,setProfileEditing]=useState(false);
  const [items,setItems]=useState<Recipient[]>([]);
  const [form,setForm]=useState<Form>(empty);
  const [editing,setEditing]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [logoutBusy,setLogoutBusy]=useState(false);
  const [avatarUrl,setAvatarUrl]=useState<string|null>(null);
  const [avatarBusy,setAvatarBusy]=useState(false);
  const [avatarError,setAvatarError]=useState('');
  const [error,setError]=useState('');
  const [logoutError,setLogoutError]=useState('');
  useEffect(()=>{
    api<{user:User}>('/auth/me').then(me=>{
      setUser(me.user);
      setProfileName(me.user.displayName??'');
      setProfileEditing(!me.user.displayName?.trim());
      return Promise.all([api<Recipient[]>('/recipients'),api<{url:string|null}>('/media/avatar')]);
    }).then(([recipients,avatar])=>{setItems(recipients);setAvatarUrl(avatar.url);}).catch(e=>{
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
  async function saveProfile() {
    const cleanName=profileName.trim();
    if(profileBusy) return;
    if(cleanName.length<2) {setProfileError('Tên hiển thị phải có ít nhất 2 ký tự.');return;}
    if(cleanName===user?.displayName?.trim()) {setProfileEditing(false);return;}
    setProfileBusy(true);setProfileError('');
    try {
      const result=await api<{user:User}>('/auth/me',{method:'PATCH',body:JSON.stringify({displayName:cleanName})});
      setUser(result.user);setProfileName(result.user.displayName??'');setProfileEditing(false);
    } catch(e) { setProfileError((e as Error).message); }
    finally { setProfileBusy(false); }
  }
  async function uploadAvatar(file?:File) {
    if(!file) return;
    setAvatarBusy(true);setAvatarError('');
    const form=new FormData();form.append('file',file);
    try { const avatar=await api<{url:string}>('/media/avatar',{method:'POST',body:form});setAvatarUrl(avatar.url); }
    catch(e) { setAvatarError((e as Error).message); }
    finally { setAvatarBusy(false); }
  }
  const needsDisplayName=Boolean(user&&!user.displayName?.trim());
  return <main className="mx-auto max-w-5xl px-6 py-8">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-green-900/15 pb-6">
      <Link href="/" className="text-xl font-bold">How2choose</Link>
      <div className="flex items-center gap-3 text-sm"><HeaderUtilityActions /><span className="font-semibold">{user?.displayName||'Chưa có tên hiển thị'}</span><button onClick={logout} disabled={logoutBusy} className="underline disabled:opacity-50">{logoutBusy?'Đang đăng xuất...':'Đăng xuất'}</button></div>
    </header>
    {logoutError && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{logoutError}</p>}
    {user && <section className={`mt-8 rounded-2xl bg-white p-6 shadow-sm ${needsDisplayName?'ring-2 ring-orange-500/50':''}`} aria-label="Thông tin cá nhân">
      <div className="flex items-center gap-5">
        <label className={`group relative shrink-0 overflow-hidden rounded-full focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-green-800 ${avatarBusy?'cursor-wait opacity-60':'cursor-pointer'}`} title="Bấm để đổi avatar">
          {avatarUrl?<Image src={avatarUrl} alt="Ảnh đại diện" width={88} height={88} unoptimized className="h-22 w-22 rounded-full object-cover ring-1 ring-green-900/15" />:<span className="grid h-22 w-22 place-items-center rounded-full bg-green-900 text-2xl font-semibold text-white">{(user.displayName?.trim()||'?').charAt(0).toUpperCase()}</span>}
          <span className="absolute inset-0 grid place-items-center bg-green-950/55 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">{avatarBusy?'Đang tải':'Đổi ảnh'}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={avatarBusy} onChange={event=>{void uploadAvatar(event.target.files?.[0]);event.target.value='';}} />
        </label>
        <div className="min-w-0 flex-1">
          {profileEditing
            ? <input autoFocus className="w-full max-w-md rounded-lg border border-green-800/30 px-3 py-2 text-xl font-semibold outline-none focus:border-green-800" value={profileName} onChange={event=>setProfileName(event.target.value)} onBlur={()=>void saveProfile()} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}}} minLength={2} maxLength={80} aria-label="Tên hiển thị" />
            : <button type="button" onClick={()=>{setProfileName(user.displayName??'');setProfileError('');setProfileEditing(true);}} className="max-w-full truncate text-left text-xl font-semibold underline-offset-4 hover:underline" title="Bấm để đổi tên">{profileBusy?'Đang lưu...':user.displayName||'Thêm tên hiển thị'}</button>}
          {needsDisplayName&&<p className="mt-2 text-sm text-orange-700">Hãy nhập tên hiển thị để tiếp tục sử dụng trang cá nhân.</p>}
          {profileError&&<p role="alert" className="mt-2 text-sm text-red-700">{profileError}</p>}
          {avatarError&&<p role="alert" className="mt-2 text-sm text-red-700">{avatarError}</p>}
        </div>
      </div>
    </section>}
    <h1 className="mt-12 text-3xl font-semibold">Người nhận quà</h1>
    <p className="mt-2 text-stone-600">Lưu những điều họ thích để lần sau chọn quà dễ hơn.</p>
    {loading ? <p className="mt-8" role="status">Đang tải...</p> : !user ? <div role="alert" className="mt-8 rounded-xl bg-red-50 p-5 text-red-700"><p>{error || 'Không tải được tài khoản.'}</p><button onClick={()=>window.location.reload()} className="mt-3 underline">Thử lại</button></div> : needsDisplayName ? <div className="mt-8 rounded-xl bg-orange-50 p-5 text-orange-800">Bạn cần lưu tên hiển thị ở phần thông tin cá nhân phía trên trước khi quản lý người nhận.</div> : <>
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
