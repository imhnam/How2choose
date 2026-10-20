'use client';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_URL, api, User } from '@/lib/api';
export default function LoginForm({initialError}:{initialError:string}) {
  const router=useRouter();
  const [identifier,setIdentifier]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState(initialError);
  const [busy,setBusy]=useState(false);
  const [google,setGoogle]=useState(false);
  useEffect(()=>{
    api<{google:boolean}>('/auth/providers').then(x=>setGoogle(x.google)).catch(()=>{});
  },[]);
  async function submit(event:FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try { await api<{user:User}>('/auth/login',{method:'POST',body:JSON.stringify({identifier,password})}); router.push('/recipients'); }
    catch(e) { setError((e as Error).message); setBusy(false); }
  }
  return <main className="page-container flex flex-1 items-center justify-center py-12">
    <section className="surface grid w-full max-w-4xl overflow-hidden md:grid-cols-2">
      <div className="p-6 sm:p-10">
    <p className="eyebrow">Chào mừng trở lại</p><h1 className="mt-4 text-3xl font-extrabold">Đăng nhập</h1>
    <p className="mt-3 text-sm leading-6 text-[#64756b]">Tiếp tục chọn quà cho những người bạn quan tâm.</p>
    <form onSubmit={submit} className="mt-7 space-y-5">
      <label className="block text-sm font-semibold">Email hoặc số điện thoại
        <input className="form-control mt-2" value={identifier} onChange={e=>setIdentifier(e.target.value)} autoComplete="username" required />
      </label>
      <label className="block text-sm font-semibold">Mật khẩu
        <input className="form-control mt-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" minLength={8} required />
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="btn-primary w-full disabled:opacity-50">{busy?'Đang đăng nhập...':'Đăng nhập'}</button>
    </form>
    {google && <a href={API_URL+'/api/auth/google/start'} className="btn-outline mt-4 w-full">Tiếp tục với Google</a>}
    <p className="mt-6 text-sm text-[#64756b]">Chưa có tài khoản? <Link className="font-bold text-[#193f32] underline" href="/register">Đăng ký</Link></p>
      </div>
      <div className="hidden flex-col justify-between bg-[#edf1e8] p-10 md:flex"><div><span className="text-4xl text-[#ff4d00]">✧</span><h2 className="mt-5 text-3xl font-extrabold leading-tight">Món quà nhỏ,<br />tình cảm lớn.</h2><p className="mt-4 max-w-xs leading-6 text-[#64756b]">Lưu lại những điều bạn biết về họ, để mỗi món quà đều thật riêng.</p></div><p className="text-sm font-bold">How<span className="text-[#ff4d00]">2</span>choose</p></div>
    </section>
  </main>;
}
