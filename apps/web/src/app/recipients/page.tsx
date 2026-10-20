'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Recipient } from '@/lib/api';
type Form = {displayName:string;relationship:string;interests:string;dislikes:string;notes:string};
const empty:Form={displayName:'',relationship:'',interests:'',dislikes:'',notes:''};
function toList(value:string) { return value.split(',').map(x=>x.trim()).filter(Boolean); }
export default function RecipientsPage() {
  const router=useRouter();
  const [items,setItems]=useState<Recipient[]>([]);
  const [form,setForm]=useState<Form>(empty);
  const [editing,setEditing]=useState<string|null>(null);
  const [showForm,setShowForm]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    api<Recipient[]>('/recipients').then(recipients=>{setItems(recipients);}).catch(e=>{
      if((e as {status?:number}).status===401) { router.replace('/login'); return; }
      setError((e as Error).message);
    }).finally(()=>setLoading(false));
  },[router]);
  function edit(item:Recipient) {
    setEditing(item.id);
    setShowForm(true);
    setForm({displayName:item.displayName,relationship:item.relationship??'',interests:item.interests.join(', '),dislikes:item.dislikes.join(', '),notes:item.notes??''});
    window.scrollTo({top:0,behavior:'smooth'});
  }
  async function save(event:FormEvent) {
    event.preventDefault();setBusy(true);setError('');
    const body=JSON.stringify({displayName:form.displayName,relationship:form.relationship,interests:toList(form.interests),dislikes:toList(form.dislikes),notes:form.notes});
    try {
      await api<Recipient>(editing?'/recipients/'+editing:'/recipients',{method:editing?'PATCH':'POST',body});
      setForm(empty);setEditing(null);setShowForm(false);setItems(await api<Recipient[]>('/recipients'));
    } catch(e) {setError((e as Error).message);} finally {setBusy(false);}
  }
  return <main className="page-container flex-1 py-8 sm:py-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Hồ sơ người nhận</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight">Những người bạn quan tâm</h1><p className="mt-3 max-w-2xl leading-6 text-[#64756b]">Mỗi hồ sơ lưu sở thích, điều họ không thích và những món bạn đã tặng. Chỉ cần mở hồ sơ là có thể nhờ AI gợi ý quà.</p></div><button type="button" onClick={()=>{setEditing(null);setForm(empty);setError('');setShowForm(true);}} className="btn-accent">＋ Tạo hồ sơ người nhận</button></div>
    {loading ? <p className="mt-8" role="status">Đang tải hồ sơ người nhận...</p> : error ? <div role="alert" className="mt-8 rounded-xl bg-red-50 p-5 text-red-700"><p>{error}</p><button onClick={()=>window.location.reload()} className="mt-3 underline">Thử lại</button></div> : <>
      {showForm && <form onSubmit={save} className="surface mt-7 grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2"><h2 className="text-xl font-bold">{editing?'Chỉnh sửa hồ sơ':'Tạo hồ sơ người nhận'}</h2><p className="mt-1 text-sm text-[#64756b]">Thông tin này giúp cá nhân hóa những gợi ý quà sau này.</p></div>
        <label className="text-sm font-semibold">Tên người nhận *<input className="form-control mt-2" value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} maxLength={100} required /></label>
        <label className="text-sm font-semibold">Mối quan hệ<input className="form-control mt-2" value={form.relationship} onChange={e=>setForm({...form,relationship:e.target.value})} maxLength={100} placeholder="Ví dụ: Bạn thân" /></label>
        <label className="text-sm font-semibold">Sở thích<input className="form-control mt-2" value={form.interests} onChange={e=>setForm({...form,interests:e.target.value})} placeholder="Ngăn cách bằng dấu phẩy" /></label>
        <label className="text-sm font-semibold">Điều không thích<input className="form-control mt-2" value={form.dislikes} onChange={e=>setForm({...form,dislikes:e.target.value})} placeholder="Ngăn cách bằng dấu phẩy" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Ghi chú<textarea className="form-control mt-2 min-h-24" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} maxLength={1000} /></label>
        {error && <p role="alert" className="sm:col-span-2 text-red-700">{error}</p>}
        <div className="flex gap-3 sm:col-span-2"><button disabled={busy} className="btn-primary disabled:opacity-50">{busy?'Đang lưu...':editing?'Lưu thay đổi':'Tạo hồ sơ'}</button><button type="button" onClick={()=>{setEditing(null);setForm(empty);setShowForm(false);}} className="btn-outline">Hủy</button></div>
      </form>}
      <section className="mt-8 pb-12"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold">Danh sách hồ sơ người nhận <span className="text-sm font-normal text-[#64756b]">({items.length})</span></h2></div>
        {items.length===0?<div className="surface p-8 text-center"><p className="font-bold">Chưa có hồ sơ người nhận</p><p className="mt-2 text-sm text-[#64756b]">Tạo hồ sơ đầu tiên để lưu sở thích và dịp quan trọng.</p><button type="button" onClick={()=>setShowForm(true)} className="btn-accent mt-4">＋ Tạo hồ sơ</button></div>:<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item,index)=><article key={item.id} className="surface p-5">
          <div className="flex items-center gap-3"><span className={`grid h-11 w-11 place-items-center rounded-full font-bold ${['bg-[#fff0e8] text-[#c83c00]','bg-[#e8eddf]','bg-[#f0ebdc]'][index%3]}`}>{item.displayName.slice(0,2).toUpperCase()}</span><div className="min-w-0"><h3 className="font-extrabold">{item.relationship||item.displayName}</h3><p className="truncate text-xs text-[#64756b]">{item.displayName}</p></div><button type="button" onClick={()=>edit(item)} className="ml-auto text-sm underline">Sửa</button></div>
          <div className="mt-4 rounded-xl bg-[#fff0e8] px-3 py-2 text-xs"><span className="font-semibold">♡</span><span className="ml-2">{item.relationship||'Người nhận'} · Hồ sơ đang theo dõi</span></div>
          <p className="mt-4 text-xs font-semibold text-[#64756b]">Sở thích</p><div className="mt-2 flex min-h-7 flex-wrap gap-1.5">{item.interests.length?item.interests.slice(0,3).map(value=><span key={value} className="pill px-2.5 py-1">{value}</span>):<span className="text-xs text-[#64756b]">Chưa thêm sở thích</span>}</div>
          {item.dislikes.length>0&&<p className="mt-3 line-clamp-1 text-xs text-[#64756b]">Không thích: {item.dislikes.join(', ')}</p>}
          <div className="mt-5 flex gap-2"><Link href={`/recipients/${encodeURIComponent(item.id)}`} className="btn-outline min-h-9 flex-1 px-3 text-xs">Xem hồ sơ</Link><Link href={`/recommendations?recipient=${encodeURIComponent(item.id)}`} className="btn-primary min-h-9 flex-1 px-3 text-xs">Tìm quà</Link></div>
        </article>)}</div>}
      </section>
    </>}
  </main>;
}
