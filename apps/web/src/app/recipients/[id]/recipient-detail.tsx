'use client';

import Link from 'next/link';
import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, Recipient } from '@/lib/api';

type ProfileForm = { displayName: string; relationship: string; interests: string[]; dislikes: string[]; notes: string };

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    api<Recipient>(`/recipients/${encodeURIComponent(id)}`)
      .then(value => { if (active) { setRecipient(value); setForm({ displayName: value.displayName, relationship: value.relationship ?? '', interests: value.interests, dislikes: value.dislikes, notes: value.notes ?? '' }); } })
      .catch(reason => {
        if (!active) return;
        if ((reason as { status?: number }).status === 401) router.replace('/login');
        else setError((reason as Error).message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, router]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      const updated = await api<Recipient>(`/recipients/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...form, relationship: form.relationship || null, notes: form.notes || null }),
      });
      setRecipient(updated);
      setForm({ displayName: updated.displayName, relationship: updated.relationship ?? '', interests: updated.interests, dislikes: updated.dislikes, notes: updated.notes ?? '' });
      setSaved(true);
    } catch (reason) { setError((reason as Error).message); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="page-container min-h-[50vh] flex-1 py-16" role="status">Đang tải hồ sơ...</main>;
  if (!recipient || !form) return <main className="page-container min-h-[50vh] flex-1 py-12"><p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error || 'Không tìm thấy hồ sơ người nhận.'}</p><Link href="/recipients" className="mt-5 inline-block underline">Quay lại hồ sơ người nhận</Link></main>;

  return <main className="page-container flex-1 py-8 sm:py-10">
    <p className="mb-6 text-xs text-[#64756b]"><Link href="/recipients" className="hover:underline">Hồ sơ người nhận</Link><span className="mx-2">/</span>{recipient.displayName}</p>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(250px,.7fr)]">
      <div>
        <section className="surface flex flex-wrap items-center gap-4 p-5 sm:p-6">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[#edf1e8] text-xl font-extrabold">{recipient.displayName.slice(0, 2).toUpperCase()}</span>
          <div className="min-w-0 flex-1"><h1 className="text-2xl font-extrabold sm:text-3xl">{recipient.displayName}</h1><p className="mt-1 text-sm text-[#64756b]">{recipient.relationship || 'Người bạn quan tâm'}</p></div>
          <Link href={`/recommendations?recipient=${encodeURIComponent(recipient.id)}`} className="btn-accent">✧ Tìm quà cho {recipient.displayName}</Link>
        </section>
        <form onSubmit={save} className="mt-5 space-y-4">
          <section className="surface p-5 sm:p-6"><h2 className="text-lg font-extrabold">Thông tin cơ bản</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Tên người nhận<input required maxLength={100} value={form.displayName} onChange={event=>setForm({...form,displayName:event.target.value})} className="form-control mt-2" /></label><label className="text-sm font-bold">Mối quan hệ<input maxLength={100} value={form.relationship} onChange={event=>setForm({...form,relationship:event.target.value})} className="form-control mt-2" /></label></div></section>
          <section className="surface p-5 sm:p-6"><h2 className="text-lg font-extrabold">Sở thích</h2><p className="mt-1 text-xs text-[#64756b]">AI ưu tiên những món quà có các sở thích này.</p><div className="mt-4"><TagInput label="Thêm sở thích" tags={form.interests} onChange={interests=>setForm({...form,interests})} /></div></section>
          <section className="surface p-5 sm:p-6"><h2 className="text-lg font-extrabold">Không thích</h2><p className="mt-1 text-xs text-[#64756b]">Điều cần tránh khi chọn quà.</p><div className="mt-4"><TagInput label="Thêm điều không thích" tags={form.dislikes} onChange={dislikes=>setForm({...form,dislikes})} /></div></section>
          <section className="surface p-5 sm:p-6"><label htmlFor="recipient-notes" className="text-lg font-extrabold">Ghi chú</label><textarea id="recipient-notes" maxLength={1000} value={form.notes} onChange={event=>setForm({...form,notes:event.target.value})} className="form-control mt-4 min-h-28 resize-y" placeholder="Ghi lại những điều bạn muốn nhớ..." /></section>
          <section className="surface p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold">Quà đã tặng</h2><p className="mt-1 text-xs text-[#64756b]">Theo dõi quà đã trao để tránh tặng trùng.</p></div><span className="text-xs text-[#64756b]">Lịch sử sẽ được bổ sung sau</span></div><div className="mt-4 rounded-xl bg-[#f4f6f1] p-4 text-sm text-[#64756b]">Chưa có món quà nào được ghi nhận.</div></section>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
          {saved && <p role="status" className="rounded-xl bg-[#edf1e8] p-4 text-sm text-[#327450]">Đã lưu thay đổi hồ sơ.</p>}
          <div className="flex justify-end gap-3 pb-8"><Link href="/recipients" className="btn-outline">Hủy thay đổi</Link><button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving?'Đang lưu...':'Lưu thay đổi'}</button></div>
        </form>
      </div>
      <aside className="space-y-4">
        <section className="surface p-5"><p className="text-xs font-semibold text-[#64756b]">Tìm quà cho</p><h2 className="mt-1 text-lg font-extrabold">{recipient.displayName}</h2><p className="mt-1 text-sm text-[#64756b]">{recipient.relationship || 'Người bạn quan tâm'}</p><div className="mt-4 border-t border-[#edf1e8] pt-4"><p className="text-xs font-semibold text-[#64756b]">Sở thích đang lưu</p><p className="mt-2 font-bold">{recipient.interests.length}</p><p className="mt-3 text-xs font-semibold text-[#64756b]">Điều cần tránh</p><p className="mt-2 font-bold">{recipient.dislikes.length}</p></div><Link href={`/recommendations?recipient=${encodeURIComponent(recipient.id)}`} className="btn-accent mt-5 w-full">✧ Nhờ AI gợi ý</Link></section>
        <section className="rounded-2xl border border-[#dfe5d9] bg-[#edf1e8] p-5"><h2 className="font-extrabold">Mẹo nhỏ</h2><p className="mt-2 text-sm leading-6 text-[#64756b]">Thêm sở thích, điều không thích và ghi chú để việc chọn quà trở nên cá nhân hơn.</p></section>
      </aside>
    </div>
  </main>;
}
