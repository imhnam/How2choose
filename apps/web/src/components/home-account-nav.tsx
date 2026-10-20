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
        <Link href="/recipients" aria-label={`Mở trang cá nhân của ${label}`} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 font-semibold text-green-950 hover:bg-green-900/5">
          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-green-900 text-white ring-1 ring-green-950/10">
            {avatarUrl
              ? <Image src={avatarUrl} alt="" width={36} height={36} unoptimized className="h-full w-full object-cover" />
              : <span aria-hidden="true">{initial}</span>}
          </span>
          <span className="max-w-32 truncate">{label}</span>
        </Link>
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
