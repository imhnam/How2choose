import Link from 'next/link';
export const dynamic = 'force-dynamic';
async function getApiStatus() {
  try {
    const response = await fetch((process.env.API_URL ?? 'http://localhost:3001') + '/api/health', { cache: 'no-store', signal: AbortSignal.timeout(2000) });
    const data = await response.json();
    return response.ok && data.status === 'ok';
  } catch { return false; }
}
export default async function Home() {
  const apiReady = await getApiStatus();
  return <main className="mx-auto max-w-6xl px-6 py-8 sm:px-12">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-green-900/15 pb-6">
      <span className="text-xl font-bold tracking-tight">howtochoose<span className="text-orange-600">.</span></span>
      <div className="flex items-center gap-4 text-sm"><Link href="/login" className="font-semibold">Đăng nhập</Link><Link href="/register" className="rounded-full bg-green-900 px-4 py-2 font-semibold text-white">Tạo tài khoản</Link></div>
    </header>
    <section className="max-w-3xl py-20 sm:py-28">
      <p className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-green-800">Dành cho những người bạn quan tâm</p>
      <h1 className="text-5xl font-semibold leading-tight tracking-tight sm:text-7xl">Một món quà.<br /><span className="text-orange-600">Nhiều điều muốn nói.</span></h1>
        <p className="mt-7 max-w-xl text-lg leading-8 text-stone-600">Howtochoose đang được xây dựng để giúp bạn chọn quà theo sở thích, dịp tặng và ngân sách — và ghi nhớ những món quà đã trao.</p>
        <Link href="/recipients" className="mt-8 inline-block rounded-xl bg-green-900 px-6 py-3 font-semibold text-white">Tạo hồ sơ người nhận</Link>
    </section>
    <section className="grid gap-5 md:grid-cols-3" aria-label="Các tính năng dự kiến">
      {[
        ['01','Hiểu người nhận','Lưu sở thích và những điều cần tránh trong từng hồ sơ.'],
        ['02','Chọn quà phù hợp','AI tư vấn từ sản phẩm có thật trong cửa hàng.'],
        ['03','Ghi nhớ lần tặng trước','Tham khảo lịch sử để mỗi dịp có một lựa chọn phù hợp.'],
      ].map(([number,title,description]) => <article key={number} className="rounded-2xl border border-green-900/10 bg-white/70 p-7"><span className="text-sm text-orange-600">{number}</span><h2 className="mt-6 text-xl font-semibold">{title}</h2><p className="mt-3 leading-7 text-stone-600">{description}</p><p className="mt-5 text-xs text-stone-500">Trong kế hoạch phát triển</p></article>)}
    </section>
    <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-green-900/15 py-6 text-sm text-stone-600">
      <p>Nền tảng đã khởi tạo. Chức năng mua hàng chưa được mở.</p>
      <p role="status">API: {apiReady ? 'Đã kết nối' : 'Chưa kết nối'}</p>
    </footer>
  </main>;
}
