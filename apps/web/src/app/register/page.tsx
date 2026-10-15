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
  return <main className="mx-auto max-w-md px-6 py-16">
    <Link href="/" className="font-semibold">How2choose</Link>
    <h1 className="mt-12 text-3xl font-semibold">Tạo tài khoản</h1>
    <p className="mt-3 text-stone-600">Đăng ký bằng email hoặc số điện thoại của bạn.</p>
    <form onSubmit={submit} className="mt-8 space-y-5">
      <label className="block text-sm font-medium">Tên hiển thị
        <input className="mt-2 w-full rounded-xl border border-stone-300 bg-white p-3" value={displayName} onChange={e=>setDisplayName(e.target.value)} autoComplete="name" minLength={2} maxLength={80} required />
      </label>
      <label className="block text-sm font-medium">Email hoặc số điện thoại
        <input className="mt-2 w-full rounded-xl border border-stone-300 bg-white p-3" value={identifier} onChange={e=>setIdentifier(e.target.value)} autoComplete="username" required />
      </label>
      <label className="block text-sm font-medium">Mật khẩu (ít nhất 8 ký tự)
        <input className="mt-2 w-full rounded-xl border border-stone-300 bg-white p-3" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-green-900 p-3 font-semibold text-white disabled:opacity-50">{busy?'Đang tạo...':'Đăng ký'}</button>
    </form>
    <p className="mt-6 text-sm">Đã có tài khoản? <Link className="font-semibold underline" href="/login">Đăng nhập</Link></p>
  </main>;
}
