import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

const notoSans = localFont({
  src: '../../../../lib/Noto_Sans/NotoSans-VariableFont_wdth,wght.ttf',
  variable: '--font-noto-sans',
  weight: '100 900',
  display: 'swap',
});

export const metadata: Metadata = { title: 'How2choose | Chọn quà có tâm', description: 'Tìm món quà phù hợp với người bạn quan tâm.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body className={`${notoSans.variable} flex min-h-screen flex-col`}><SiteHeader /><div className="flex flex-1 flex-col">{children}</div><SiteFooter /></body></html>;
}
