'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddressSelector } from '@/components/address-selector';
import { api, DeliveryAddress, Recipient, toRecipientAddressInput } from '@/lib/api';

type ProfileForm = { displayName: string; phone: string; relationship: string; birthday: string; interests: string[]; dislikes: string[]; notes: string };
const formatBirthday = (birthday: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${birthday}T00:00:00.000Z`));

function TagInput({ label, tags, onChange }: { label: string; tags: string[]; onChange: (tags: string[]) => void }) {
  const [value, setValue] = useState('');
  function add() {
    const clean = value.trim();
    if (clean && !tags.includes(clean)) onChange([...tags, clean]);
    setValue('');
  }
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); add(); }
    if (event.key === 'Backspace' && !value && tags.length) onChange(tags.slice(0, -1));
  }
  return <div><label className="text-sm font-bold">{label}</label><div className="mt-2 flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-[#dfe5d9] bg-white px-3 py-2 focus-within:border-[#193f32]">{tags.map(tag=><button key={tag} type="button" onClick={()=>onChange(tags.filter(item=>item!==tag))} className="pill gap-2">{tag}<span aria-hidden="true">×</span></button>)}<input value={value} onChange={event=>setValue(event.target.value)} onKeyDown={handleKeyDown} onBlur={add} placeholder="Thêm sở thích" className="min-w-32 flex-1 border-0 bg-transparent py-1 outline-none" /></div></div>;
}

export default function RecipientDetail({ id }: { id: string }) {
  const router = useRouter();
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [address, setAddress] = useState<DeliveryAddress | null>(null);
  const [showAddress, setShowAddress] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    api<Recipient>(`/recipients/${encodeURIComponent(id)}`)
      .then(value => { if (active) { setRecipient(value); setAddress(value.address); setForm({ displayName: value.displayName, phone: value.phone ?? '', relationship: value.relationship ?? '', birthday: value.birthday ?? '', interests: value.interests, dislikes: value.dislikes, notes: value.notes ?? '' }); } })
      .catch(reason => {
        if (!active) return;
        if ((reason as { status?: number }).status === 401) router.replace('/login');
        else setError((reason as Error).message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, router]);

  async function uploadAvatar(file?: File) {
    if (!file || !recipient || avatarUploading) return;
    setAvatarUploading(true);
    setAvatarError('');
    const body = new FormData();
    body.append('file', file);
    try {
      const result = await api<{ url: string }>(`/media/recipients/${encodeURIComponent(recipient.id)}/avatar`, { method: 'POST', body });
      setRecipient({ ...recipient, avatarUrl: result.url });
    } catch (reason) {
      setAvatarError((reason as Error).message);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      const updated = await api<Recipient>(`/recipients/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...form, phone: form.phone.trim() || null, relationship: form.relationship || null, birthday: form.birthday || null, notes: form.notes || null, address: toRecipientAddressInput(address) }),
      });
      setRecipient(updated);
      setAddress(updated.address);
      setShowAddress(false);
      setForm({ displayName: updated.displayName, phone: updated.phone ?? '', relationship: updated.relationship ?? '', birthday: updated.birthday ?? '', interests: updated.interests, dislikes: updated.dislikes, notes: updated.notes ?? '' });
      setEditing(false);
      setSaved(true);
    } catch (reason) { setError((reason as Error).message); }
    finally { setSaving(false); }
  }

  function cancelEdit() {
    if (!recipient) return;
    setForm({ displayName: recipient.displayName, phone: recipient.phone ?? '', relationship: recipient.relationship ?? '', birthday: recipient.birthday ?? '', interests: recipient.interests, dislikes: recipient.dislikes, notes: recipient.notes ?? '' });
    setAddress(recipient.address);
    setShowAddress(false);
    setEditing(false);
    setError('');
    setSaved(false);
  }

  if (loading) return <main className="page-container min-h-[50vh] flex-1 py-16" role="status">Đang tải hồ sơ...</main>;
  if (!recipient || !form) return <main className="page-container min-h-[50vh] flex-1 py-12"><p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error || 'Không tìm thấy hồ sơ người nhận.'}</p><Link href="/recipients" className="mt-5 inline-block underline">Quay lại hồ sơ người nhận</Link></main>;

  return <main className="page-container flex-1 py-8 sm:py-10">
    <p className="mb-6 text-xs text-[#64756b]"><Link href="/recipients" className="hover:underline">Hồ sơ người nhận</Link><span className="mx-2">/</span>{recipient.displayName}</p>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(250px,.7fr)]">
      <div>
        <section className="surface flex flex-wrap items-center gap-4 p-5 sm:p-6">
          <span className={`relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-[#edf1e8] text-xl font-extrabold ${editing?'cursor-pointer':''}`} title={editing?'Đổi ảnh đại diện':undefined}>
            {recipient.avatarUrl?<Image src={recipient.avatarUrl} alt={`Ảnh đại diện ${recipient.displayName}`} width={64} height={64} unoptimized className="h-full w-full object-cover" />:recipient.displayName.slice(0, 2).toUpperCase()}
            {editing&&<><span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/50 text-[10px] text-white">{avatarUploading?'Đang tải':'Đổi ảnh'}</span><input aria-label="Đổi ảnh đại diện" type="file" accept="image/jpeg,image/png,image/webp" className="absolute inset-0 cursor-pointer opacity-0" disabled={avatarUploading} onChange={event=>{void uploadAvatar(event.target.files?.[0]);event.target.value='';}} /></>}
          </span>
          <div className="min-w-0 flex-1"><h1 className="text-2xl font-extrabold sm:text-3xl">{recipient.displayName}</h1><p className="mt-1 text-sm text-[#64756b]">{recipient.relationship || 'Người bạn quan tâm'}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            {editing?<><button type="button" onClick={cancelEdit} disabled={saving} className="btn-outline disabled:opacity-50">Hủy</button><button type="submit" form="recipient-profile-form" disabled={saving} className="btn-primary disabled:opacity-50">{saving?'Đang lưu...':'Lưu thay đổi'}</button></>:<><button type="button" onClick={()=>{setEditing(true);setSaved(false);}} className="btn-outline">Sửa</button><Link href="/catalog" className="btn-accent">Tìm quà cho {recipient.displayName}</Link></>}
          </div>
        </section>
        {editing&&<p className="mt-2 text-xs text-[#64756b]">Ảnh JPG, PNG hoặc WebP, tối đa 5 MB.</p>}
        {avatarError&&<p role="alert" className="mt-2 text-sm text-red-700">{avatarError}</p>}
        <form id="recipient-profile-form" onSubmit={save} className="mt-5 space-y-4">
          <section className="surface p-5 sm:p-6"><h2 className="text-lg font-extrabold">Thông tin cơ bản</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{editing?<><label className="text-sm font-bold">Tên người nhận<input required maxLength={100} value={form.displayName} onChange={event=>setForm({...form,displayName:event.target.value})} className="form-control mt-2" /></label><label className="text-sm font-bold">Số điện thoại (không bắt buộc)<input inputMode="tel" maxLength={13} value={form.phone} onChange={event=>setForm({...form,phone:event.target.value})} placeholder="0912345678" className="form-control mt-2" /></label><label className="text-sm font-bold">Mối quan hệ<input maxLength={100} value={form.relationship} onChange={event=>setForm({...form,relationship:event.target.value})} className="form-control mt-2" /></label><label className="text-sm font-bold">Ngày sinh (không bắt buộc)<input type="date" value={form.birthday} onChange={event=>setForm({...form,birthday:event.target.value})} className="form-control mt-2" /></label></>:<><div><p className="text-xs font-semibold text-[#64756b]">Tên người nhận</p><p className="mt-1 font-semibold">{recipient.displayName}</p></div><div><p className="text-xs font-semibold text-[#64756b]">Số điện thoại</p><p className="mt-1 font-semibold">{recipient.phone||'Chưa cập nhật'}</p></div><div><p className="text-xs font-semibold text-[#64756b]">Mối quan hệ</p><p className="mt-1 font-semibold">{recipient.relationship||'Người bạn quan tâm'}</p></div><div><p className="text-xs font-semibold text-[#64756b]">Ngày sinh</p><p className="mt-1 font-semibold">{recipient.birthday?formatBirthday(recipient.birthday):'Chưa cập nhật'}</p></div></>}</div></section>
          <section className="surface p-5 sm:p-6"><h2 className="text-lg font-extrabold">Sở thích</h2><p className="mt-1 text-xs text-[#64756b]">AI ưu tiên những món quà có các sở thích này.</p><div className="mt-4">{editing?<TagInput label="Thêm sở thích" tags={form.interests} onChange={interests=>setForm({...form,interests})} />:recipient.interests.length?<div className="flex flex-wrap gap-2">{recipient.interests.map(item=><span key={item} className="pill">{item}</span>)}</div>:<p className="text-sm text-[#64756b]">Chưa thêm sở thích.</p>}</div></section>
          <section className="surface p-5 sm:p-6"><h2 className="text-lg font-extrabold">Không thích</h2><p className="mt-1 text-xs text-[#64756b]">Điều cần tránh khi chọn quà.</p><div className="mt-4">{editing?<TagInput label="Thêm điều không thích" tags={form.dislikes} onChange={dislikes=>setForm({...form,dislikes})} />:recipient.dislikes.length?<div className="flex flex-wrap gap-2">{recipient.dislikes.map(item=><span key={item} className="pill">{item}</span>)}</div>:<p className="text-sm text-[#64756b]">Chưa thêm điều cần tránh.</p>}</div></section>
          <section className="surface p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-extrabold">Địa chỉ người nhận</h2>{editing&&showAddress&&address&&<button type="button" onClick={()=>setAddress(null)} className="shrink-0 text-sm underline">Xóa địa chỉ</button>}</div>{editing&&showAddress?<div className="mt-4"><AddressSelector key={`${id}-${recipient.address?.version ?? 'new'}`} onChange={setAddress} initialAddress={recipient.address} /></div>:address?<div className="mt-3 flex min-w-0 items-center gap-3"><p className="min-w-0 flex-1 truncate text-sm text-[#64756b]" title={`${address.addressLine}, ${address.ward.name}${address.district?`, ${address.district.name}`:''}, ${address.province.name}`}>{address.addressLine}, {address.ward.name}{address.district?`, ${address.district.name}`:''}, {address.province.name}</p>{editing&&<button type="button" onClick={()=>setShowAddress(true)} className="shrink-0 text-sm font-semibold text-green-900 underline">Sửa</button>}</div>:editing?<button type="button" onClick={()=>setShowAddress(true)} className="mt-3 text-sm font-semibold text-green-900 underline">＋ Thêm địa chỉ</button>:<p className="mt-3 text-sm text-[#64756b]">Chưa cập nhật địa chỉ.</p>}</section>
          <section className="surface p-5 sm:p-6"><label htmlFor="recipient-notes" className="text-lg font-extrabold">Ghi chú</label>{editing?<textarea id="recipient-notes" maxLength={1000} value={form.notes} onChange={event=>setForm({...form,notes:event.target.value})} className="form-control mt-4 min-h-28 resize-y" placeholder="Ghi lại những điều bạn muốn nhớ..." />:<p className="mt-4 whitespace-pre-wrap text-sm text-[#64756b]">{recipient.notes||'Chưa có ghi chú.'}</p>}</section>
          <section className="surface p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold">Quà đã tặng</h2><p className="mt-1 text-xs text-[#64756b]">Theo dõi quà đã trao để tránh tặng trùng.</p></div><span className="text-xs text-[#64756b]">Lịch sử sẽ được bổ sung sau</span></div><div className="mt-4 rounded-xl bg-[#f4f6f1] p-4 text-sm text-[#64756b]">Chưa có món quà nào được ghi nhận.</div></section>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
          {saved && <p role="status" className="rounded-xl bg-[#edf1e8] p-4 text-sm text-[#327450]">Đã lưu thay đổi hồ sơ.</p>}
        </form>
      </div>
      <aside className="space-y-4">
        <section className="surface p-5"><p className="text-xs font-semibold text-[#64756b]">Tìm quà cho</p><h2 className="mt-1 text-lg font-extrabold">{recipient.displayName}</h2><p className="mt-1 text-sm text-[#64756b]">{recipient.relationship || 'Người bạn quan tâm'}</p><div className="mt-4 border-t border-[#edf1e8] pt-4"><p className="text-xs font-semibold text-[#64756b]">Sở thích đang lưu</p><p className="mt-2 font-bold">{recipient.interests.length}</p><p className="mt-3 text-xs font-semibold text-[#64756b]">Điều cần tránh</p><p className="mt-2 font-bold">{recipient.dislikes.length}</p></div><Link href={`/recommendations?recipient=${encodeURIComponent(recipient.id)}`} className="btn-accent mt-5 w-full">✧ Nhờ AI gợi ý</Link></section>
        <section className="rounded-2xl border border-[#dfe5d9] bg-[#edf1e8] p-5"><h2 className="font-extrabold">Mẹo nhỏ</h2><p className="mt-2 text-sm leading-6 text-[#64756b]">Thêm sở thích, điều không thích và ghi chú để việc chọn quà trở nên cá nhân hơn.</p></section>
      </aside>
    </div>
  </main>;
}
