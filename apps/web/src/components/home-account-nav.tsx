'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { api, User } from '@/lib/api';
import { HeaderUtilityActions } from './header-utility-actions';

export function HomeAccountNav() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
    return (
      <div className="flex items-center gap-4 text-sm">
        <HeaderUtilityActions />
        <span className="max-w-48 truncate font-semibold text-green-950">{label}</span>
        <Link href="/recipients" aria-label="Mở trang cá nhân" className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-green-900 font-semibold text-white ring-1 ring-green-950/10">
          {avatarUrl
            ? <Image src={avatarUrl} alt="" width={40} height={40} unoptimized className="h-full w-full object-cover" />
            : <span aria-hidden="true">{initial}</span>}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <Link href="/login" className="font-semibold">Đăng nhập</Link>
      <Link href="/register" className="rounded-full bg-green-900 px-4 py-2 font-semibold text-white">Tạo tài khoản</Link>
    </div>
  );
}
