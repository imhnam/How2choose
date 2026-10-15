export function HeaderUtilityActions() {
  return (
    <div className="flex items-center gap-1" aria-label="Tiện ích tài khoản">
      <button type="button" aria-label="Thông báo" title="Chưa có thông báo" className="grid h-10 w-10 place-items-center rounded-full text-green-950 transition hover:bg-green-900/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      </button>
      <button type="button" aria-label="Giỏ hàng" title="Giỏ hàng trống" className="grid h-10 w-10 place-items-center rounded-full text-green-950 transition hover:bg-green-900/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="20" r="1" />
          <circle cx="19" cy="20" r="1" />
          <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 8H6" />
        </svg>
      </button>
    </div>
  );
}
