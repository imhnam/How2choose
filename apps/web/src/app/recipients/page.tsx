'use client';
import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AddressSelector } from '@/components/address-selector';
import { api, DeliveryAddress, Recipient, toRecipientAddressInput } from '@/lib/api';
type Form = {displayName:string;relationship:string;birthday:string;interests:string;dislikes:string;notes:string};
const empty:Form={displayName:'',relationship:'',birthday:'',interests:'',dislikes:'',notes:''};
function toList(value:string) { return value.split(',').map(x=>x.trim()).filter(Boolean); }
export default function RecipientsPage() {
  const router=useRouter();
  const [items,setItems]=useState<Recipient[]>([]);
  const [form,setForm]=useState<Form>(empty);
  const [editing,setEditing]=useState<string|null>(null);
  const [showForm,setShowForm]=useState(false);
  const [address,setAddress]=useState<DeliveryAddress|null>(null);
  const [showAddress,setShowAddress]=useState(false);
  const [avatarFile,setAvatarFile]=useState<File|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [formError,setFormError]=useState('');
  useEffect(()=>{
    api<Recipient[]>('/recipients').then(recipients=>{setItems(recipients);}).catch(e=>{
      if((e as {status?:number}).status===401) { router.replace('/login'); return; }
      setError((e as Error).message);
    }).finally(()=>setLoading(false));
  },[router]);
  async function save(event:FormEvent) {
    event.preventDefault();setBusy(true);setFormError('');
    const body=JSON.stringify({displayName:form.displayName,relationship:form.relationship,birthday:form.birthday||null,interests:toList(form.interests),dislikes:toList(form.dislikes),notes:form.notes,address:toRecipientAddressInput(address)});
    try {
      const saved=await api<Recipient>(editing?'/recipients/'+editing:'/recipients',{method:editing?'PATCH':'POST',body});
      if(avatarFile) {
        const upload=new FormData();
        upload.append('file',avatarFile);
        try {
          await api<{url:string}>(`/media/recipients/${encodeURIComponent(saved.id)}/avatar`,{method:'POST',body:upload});
        } catch(uploadError) {
          setEditing(saved.id);
          setFormError(`Đã lưu hồ sơ nhưng chưa tải được ảnh đại diện: ${(uploadError as Error).message}`);
          setItems(await api<Recipient[]>('/recipients'));
          return;
        }
      }
      setForm(empty);setEditing(null);setShowForm(false);setAddress(null);setShowAddress(false);setAvatarFile(null);setItems(await api<Recipient[]>('/recipients'));
    } catch(e) {setFormError((e as Error).message);} finally {setBusy(false);}
  }
  return <main className="page-container flex-1 py-8 sm:py-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Hồ sơ người nhận</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight">Những người bạn quan tâm</h1><p className="mt-3 max-w-2xl leading-6 text-[#64756b]">Mỗi hồ sơ lưu sở thích, điều họ không thích và những món bạn đã tặng. Chỉ cần mở hồ sơ là có thể nhờ AI gợi ý quà.</p></div><button type="button" onClick={()=>{setEditing(null);setForm(empty);setAddress(null);setShowAddress(false);setAvatarFile(null);setFormError('');setError('');setShowForm(true);}} className="btn-accent">＋ Tạo hồ sơ người nhận</button></div>
    {loading ? <p className="mt-8" role="status">Đang tải hồ sơ người nhận...</p> : error ? <div role="alert" className="mt-8 rounded-xl bg-red-50 p-5 text-red-700"><p>{error}</p><button onClick={()=>window.location.reload()} className="mt-3 underline">Thử lại</button></div> : <>
      {showForm && <form onSubmit={save} className="surface mt-7 grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2"><h2 className="text-xl font-bold">{editing?'Chỉnh sửa hồ sơ':'Tạo hồ sơ người nhận'}</h2><p className="mt-1 text-sm text-[#64756b]">Thông tin này giúp cá nhân hóa những gợi ý quà sau này.</p></div>
        <label className="text-sm font-semibold sm:col-span-2">Ảnh đại diện<input type="file" accept="image/jpeg,image/png,image/webp" className="form-control mt-2" onChange={event=>{setAvatarFile(event.target.files?.[0]??null);event.target.value='';}} /><span className="mt-1 block text-xs font-normal text-[#64756b]">{avatarFile?`Ảnh đã chọn: ${avatarFile.name}`:editing?'Chọn ảnh để thay avatar hiện tại. JPG, PNG hoặc WebP, tối đa 5 MB.':'Có thể tải ảnh sau khi tạo hồ sơ. JPG, PNG hoặc WebP, tối đa 5 MB.'}</span></label>
        <label className="text-sm font-semibold">Tên người nhận *<input className="form-control mt-2" value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} maxLength={100} required /></label>
        <label className="text-sm font-semibold">Mối quan hệ<input className="form-control mt-2" value={form.relationship} onChange={e=>setForm({...form,relationship:e.target.value})} maxLength={100} placeholder="Ví dụ: Bạn thân" /></label>
        <label className="text-sm font-semibold">Ngày sinh (không bắt buộc)<input type="date" className="form-control mt-2" value={form.birthday} onChange={e=>setForm({...form,birthday:e.target.value})} /></label>
        <label className="text-sm font-semibold">Sở thích<input className="form-control mt-2" value={form.interests} onChange={e=>setForm({...form,interests:e.target.value})} placeholder="Ngăn cách bằng dấu phẩy" /></label>
        <label className="text-sm font-semibold">Điều không thích<input className="form-control mt-2" value={form.dislikes} onChange={e=>setForm({...form,dislikes:e.target.value})} placeholder="Ngăn cách bằng dấu phẩy" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Ghi chú<textarea className="form-control mt-2 min-h-24" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} maxLength={1000} /></label>
        <section className="sm:col-span-2"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Địa chỉ người nhận</h3>{showAddress&&<button type="button" onClick={()=>{setShowAddress(false);setAddress(null);}} className="text-sm underline">Xóa địa chỉ</button>}</div>{showAddress?<AddressSelector key={editing??'new-recipient'} onChange={setAddress} initialAddress={address} />:<button type="button" onClick={()=>setShowAddress(true)} className="text-sm font-semibold text-green-900 underline">＋ Thêm địa chỉ</button>}</section>
        {formError && <p role="alert" className="sm:col-span-2 text-red-700">{formError}</p>}
        <div className="flex gap-3 sm:col-span-2"><button disabled={busy} className="btn-primary disabled:opacity-50">{busy?'Đang lưu...':editing?'Lưu thay đổi':'Tạo hồ sơ'}</button><button type="button" onClick={()=>{setEditing(null);setForm(empty);setAddress(null);setShowAddress(false);setAvatarFile(null);setFormError('');setShowForm(false);}} className="btn-outline">Hủy</button></div>
      </form>}
      <section className="mt-8 pb-12"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold">Danh sách hồ sơ người nhận <span className="text-sm font-normal text-[#64756b]">({items.length})</span></h2></div>
        {items.length===0?<div className="surface p-8 text-center"><p className="font-bold">Chưa có hồ sơ người nhận</p><p className="mt-2 text-sm text-[#64756b]">Tạo hồ sơ đầu tiên để lưu sở thích và dịp quan trọng.</p><button type="button" onClick={()=>{setEditing(null);setForm(empty);setAddress(null);setShowAddress(false);setAvatarFile(null);setFormError('');setShowForm(true);}} className="btn-accent mt-4">＋ Tạo hồ sơ</button></div>:<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item,index)=><article key={item.id} className="surface p-5">
          <div className="flex items-center gap-3"><span className={`grid h-11 w-11 place-items-center overflow-hidden rounded-full font-bold ${['bg-[#fff0e8] text-[#c83c00]','bg-[#e8eddf]','bg-[#f0ebdc]'][index%3]}`}>{item.avatarUrl?<Image src={item.avatarUrl} alt={`Ảnh đại diện ${item.displayName}`} width={44} height={44} unoptimized className="h-full w-full object-cover" />:item.displayName.slice(0,2).toUpperCase()}</span><div className="min-w-0"><h3 className="font-extrabold">{item.relationship||item.displayName}</h3><p className="truncate text-xs text-[#64756b]">{item.displayName}</p></div></div>
          {item.address&&<p className="mt-3 line-clamp-2 text-xs text-[#64756b]">{item.address.addressLine}, {item.address.ward.name}{item.address.district?`, ${item.address.district.name}`:''}, {item.address.province.name}</p>}
          <p className="mt-4 text-xs font-semibold text-[#64756b]">Sở thích</p><div className="mt-2 flex min-h-7 flex-wrap gap-1.5">{item.interests.length?item.interests.slice(0,3).map(value=><span key={value} className="pill px-2.5 py-1">{value}</span>):<span className="text-xs text-[#64756b]">Chưa thêm sở thích</span>}</div>
          {item.dislikes.length>0&&<p className="mt-3 line-clamp-1 text-xs text-[#64756b]">Không thích: {item.dislikes.join(', ')}</p>}
          <div className="mt-5 flex gap-2"><Link href={`/recipients/${encodeURIComponent(item.id)}`} className="btn-outline min-h-9 flex-1 px-3 text-xs">Xem hồ sơ</Link><Link href={`/recommendations?recipient=${encodeURIComponent(item.id)}`} className="btn-primary min-h-9 flex-1 px-3 text-xs">Tìm quà</Link></div>
        </article>)}</div>}
      </section>
    </>}
  </main>;
}
