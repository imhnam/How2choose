import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return <main className="page-container flex flex-1 flex-col items-center justify-center py-16 text-center">
    <Image src="/images/mascot/mascot-back.png" alt="" width={182} height={241} className="w-36 sm:w-44" />
    <p className="eyebrow mt-6">Lỗi 404</p>
    <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Không tìm thấy trang bạn cần</h1>
    <p className="mt-4 max-w-md leading-6 text-[#64756b]">Có thể liên kết đã bị sai hoặc trang đã được di chuyển. Để mình dẫn bạn về nơi an toàn nhé!</p>
    <div className="mt-7 flex flex-wrap justify-center gap-3"><Link href="/" className="btn-accent">Về trang chủ</Link><Link href="/catalog" className="btn-outline">Xem catalog quà tặng</Link></div>
  </main>;
}
