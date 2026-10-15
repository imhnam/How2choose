import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Howtochoose | Chọn quà có tâm', description: 'Tìm món quà phù hợp với người bạn quan tâm.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
