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
  return <main className="mx-auto max-w-md px-6 py-16">
    <Link href="/" className="font-semibold">How2choose</Link>
    <h1 className="mt-12 text-3xl font-semibold">Đăng nhập</h1>
    <p className="mt-3 text-stone-600">Tiếp tục chọn quà cho những người bạn quan tâm.</p>
    <form onSubmit={submit} className="mt-8 space-y-5">
      <label className="block text-sm font-medium">Email hoặc số điện thoại
        <input className="mt-2 w-full rounded-xl border border-stone-300 bg-white p-3" value={identifier} onChange={e=>setIdentifier(e.target.value)} autoComplete="username" required />
      </label>
      <label className="block text-sm font-medium">Mật khẩu
        <input className="mt-2 w-full rounded-xl border border-stone-300 bg-white p-3" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" minLength={8} required />
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-green-900 p-3 font-semibold text-white disabled:opacity-50">{busy?'Đang đăng nhập...':'Đăng nhập'}</button>
    </form>
    {google && <a href={API_URL+'/api/auth/google/start'} className="mt-4 block rounded-xl border border-stone-300 bg-white p-3 text-center font-semibold">Tiếp tục với Google</a>}
    <p className="mt-6 text-sm">Chưa có tài khoản? <Link className="font-semibold underline" href="/register">Đăng ký</Link></p>
  </main>;
}
