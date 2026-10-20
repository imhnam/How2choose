import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="grid gap-8 pb-8 sm:grid-cols-[1fr_auto_auto] sm:gap-16">
          <div className="max-w-sm">
            <Link href="/" className="text-2xl font-extrabold tracking-tight text-white no-underline">How<span className="text-orange-500">2</span>choose</Link>
            <p className="mt-3 leading-6 text-white/75">Chọn quà chu đáo cho những người bạn quan tâm, và nhớ mình đã tặng gì.</p>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/70">Khám phá</h2>
            <ul className="mt-3 space-y-2.5 text-sm"><li><Link className="footer-link" href="/catalog">Catalog quà tặng</Link></li><li><Link className="footer-link" href="/recipients">Hồ sơ người nhận</Link></li><li><Link className="footer-link" href="/recommendations">Gợi ý quà bằng AI</Link></li></ul>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/70">Hỗ trợ</h2>
            <ul className="mt-3 space-y-2.5 text-sm"><li><span>Chính sách giao hàng</span></li><li><span>Đổi trả trong 7 ngày</span></li><li><a className="footer-link" href="mailto:hello@how2choose.vn">Liên hệ How2choose</a></li></ul>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t border-white/15 pt-5 text-sm text-white/75">
          <p>© 2026 How2choose. Bảo lưu mọi quyền.</p>
          <p>Vận chuyển qua GHN · Thanh toán qua VNPAY</p>
        </div>
      </div>
    </footer>
  );
}
