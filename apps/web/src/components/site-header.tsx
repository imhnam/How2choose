'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { HomeAccountNav } from '@/components/home-account-nav';

const navigation = [
  { href: '/', label: 'Trang chủ', matches: (path: string) => path === '/' },
  { href: '/recipients', label: 'Hồ sơ người nhận', matches: (path: string) => path.startsWith('/recipients') },
  { href: '/recommendations', label: 'Gợi ý AI', matches: (path: string) => path.startsWith('/recommendations') },
  { href: '/catalog', label: 'Catalog quà tặng', matches: (path: string) => path.startsWith('/catalog') || path.startsWith('/cart') || path.startsWith('/checkout') },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/catalog?q=${encodeURIComponent(value)}` : '/catalog');
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="flex w-fit items-center gap-2 text-xl font-extrabold tracking-tight no-underline" aria-label="How2choose - Trang chủ">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 text-[#193f32]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="9" width="16" height="12" rx="2" /><path d="M12 9v12M4 13h16M12 9c-4 0-6-5-3-5 2 0 3 5 3 5Zm0 0c4 0 6-5 3-5-2 0-3 5-3 5Z" /><path d="M18 5h2" stroke="#ff4d00" /></svg>
          <span>How<span className="text-orange-600">2</span>choose</span>
        </Link>
        <form onSubmit={search} role="search" className="site-search flex items-center rounded-full border border-[#d4ddd1] bg-white px-4 focus-within:border-[#193f32]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#64756b]" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.2 4.2" /></svg>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm quà tặng, sản phẩm, dịp đặc biệt..." aria-label="Tìm quà tặng" className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-sm outline-none" />
        </form>
        <div className="site-header-account justify-self-end"><HomeAccountNav /></div>
      </div>
      <nav aria-label="Điều hướng chính" className="site-nav">
        <div className="site-nav-inner">
          {navigation.map(item => <Link key={item.href} href={item.href} className="site-nav-link" aria-current={item.matches(pathname) ? 'page' : undefined}>{item.label}</Link>)}
        </div>
      </nav>
    </header>
  );
}
