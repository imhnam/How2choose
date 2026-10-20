'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, User } from '@/lib/api';
export default function RegisterPage() {
  const router=useRouter();
  const [displayName,setDisplayName]=useState('');
  const [identifier,setIdentifier]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent) {
    event.preventDefault();setError('');setBusy(true);
    try { await api<{user:User}>('/auth/register',{method:'POST',body:JSON.stringify({displayName,identifier,password})});router.push('/recipients'); }
    catch(e) {setError((e as Error).message);setBusy(false);}
  }
  return <main className="page-container flex flex-1 items-center justify-center py-12">
    <section className="surface grid w-full max-w-4xl overflow-hidden md:grid-cols-2">
      <div className="p-6 sm:p-10">
    <p className="eyebrow">Bắt đầu hành trình</p><h1 className="mt-4 text-3xl font-extrabold">Tạo tài khoản</h1>
    <p className="mt-3 text-sm leading-6 text-[#64756b]">Đăng ký để lưu hồ sơ và những món quà bạn đã tặng.</p>
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-sm font-semibold">Tên hiển thị
        <input className="form-control mt-2" value={displayName} onChange={e=>setDisplayName(e.target.value)} autoComplete="name" minLength={2} maxLength={80} required />
      </label>
      <label className="block text-sm font-semibold">Email hoặc số điện thoại
        <input className="form-control mt-2" value={identifier} onChange={e=>setIdentifier(e.target.value)} autoComplete="username" required />
      </label>
      <label className="block text-sm font-semibold">Mật khẩu (ít nhất 8 ký tự)
        <input className="form-control mt-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="btn-accent w-full disabled:opacity-50">{busy?'Đang tạo...':'Tạo tài khoản'}</button>
    </form>
    <p className="mt-6 text-sm text-[#64756b]">Đã có tài khoản? <Link className="font-bold text-[#193f32] underline" href="/login">Đăng nhập</Link></p>
      </div>
      <div className="hidden flex-col justify-between bg-[#edf1e8] p-10 md:flex"><div><span className="text-4xl text-[#ff4d00]">♡</span><h2 className="mt-5 text-3xl font-extrabold leading-tight">Ghi nhớ điều<br />họ yêu thích.</h2><p className="mt-4 max-w-xs leading-6 text-[#64756b]">Mỗi hồ sơ là một cách nhỏ để bạn hiểu và quan tâm đến họ hơn.</p></div><p className="text-sm font-bold">How<span className="text-[#ff4d00]">2</span>choose</p></div>
    </section>
  </main>;
}
