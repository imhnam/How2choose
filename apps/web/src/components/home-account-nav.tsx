'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, User } from '@/lib/api';
import { HeaderUtilityActions } from './header-utility-actions';

export function HomeAccountNav() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api<{ user: User }>('/auth/me')
      .then(({ user: currentUser }) => {
        setUser(currentUser);
        void api<{ url: string | null }>('/media/avatar')
          .then(({ url }) => setAvatarUrl(url))
          .catch(() => setAvatarUrl(null));
      })
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return <div className="h-10 w-40" aria-label="Đang kiểm tra phiên đăng nhập" />;
  }

  if (user) {
    const label = user.displayName?.trim() || 'Hoàn thiện hồ sơ';
    const initial = user.displayName?.trim().charAt(0).toUpperCase() || '?';
    async function logout() {
      setLoggingOut(true);
      setLogoutError('');
      try {
        await api<{ ok: boolean }>('/auth/logout', { method: 'POST' });
        router.replace('/login');
      } catch (error) {
        setLogoutError((error as Error).message);
        setLoggingOut(false);
      }
    }
    return (
      <div className="flex items-center gap-4 text-sm">
        <HeaderUtilityActions />
        <div className="relative">
          <button type="button" aria-label="Mở menu tài khoản" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 font-semibold text-green-950 hover:bg-green-900/5">
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-green-900 text-white ring-1 ring-green-950/10">
              {avatarUrl
                ? <Image src={avatarUrl} alt="" width={36} height={36} unoptimized className="h-full w-full object-cover" />
                : <span aria-hidden="true">{initial}</span>}
            </span>
            <span className="max-w-32 truncate">{label}</span>
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`}><path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
          </button>
          {menuOpen && <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-[#dfe5d9] bg-white p-2 shadow-xl">
            <Link role="menuitem" href="/profile" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 font-semibold text-[#193f32] no-underline hover:bg-[#edf1e8]">Hồ sơ cá nhân</Link>
            <button role="menuitem" type="button" onClick={() => void logout()} disabled={loggingOut} className="w-full rounded-lg px-3 py-2.5 text-left font-semibold text-[#193f32] hover:bg-[#edf1e8] disabled:opacity-50">{loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</button>
            {logoutError && <p role="alert" className="px-3 py-2 text-xs text-red-700">{logoutError}</p>}
          </div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <HeaderUtilityActions />
      <Link href="/login" className="font-semibold">Đăng nhập</Link>
      <Link href="/register" className="rounded-full bg-green-900 px-4 py-2 font-semibold text-white">Tạo tài khoản</Link>
    </div>
  );
}
