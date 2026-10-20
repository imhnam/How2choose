import Image from 'next/image';

export function ProductArtwork({ name, category, imageUrl, className = '', imageFit = 'cover' }: { name: string; category?: string; imageUrl?: string | null; className?: string; imageFit?: 'cover' | 'contain' }) {
  const subject = `${category ?? ''} ${name}`.toLocaleLowerCase('vi');
  const bg = subject.includes('nến') ? '#e9eedf' : subject.includes('bình') ? '#f3e5d8' : subject.includes('sổ') || subject.includes('sách') ? '#e2ebe6' : subject.includes('tai nghe') ? '#f0ebdc' : '#e8eddf';
  const type = subject.includes('nến') ? 'candle' : subject.includes('bình') ? 'bottle' : subject.includes('sổ') || subject.includes('sách') ? 'book' : subject.includes('tai nghe') ? 'headphones' : subject.includes('cà phê') ? 'coffee' : 'gift';

  return (
    <div className={`product-artwork relative aspect-square w-full ${className}`} style={{ backgroundColor: bg }}>
      {imageUrl ? <Image src={imageUrl} alt={name} fill unoptimized className={imageFit === 'contain' ? 'object-contain' : 'object-cover'} /> : (
        <svg viewBox="0 0 240 220" fill="none" aria-hidden="true">
          <ellipse cx="120" cy="190" rx="76" ry="9" fill="#193F32" opacity=".1" />
          {type === 'candle' && <>
            <path d="M120 24c-10 13-12 24-7 32 3 5 11 5 14 0 5-8 3-19-7-32Z" fill="#FF4D00" stroke="#193F32" strokeWidth="4" />
            <path d="M120 58v14" stroke="#193F32" strokeWidth="4" />
            <rect x="54" y="72" width="132" height="108" rx="20" fill="white" stroke="#193F32" strokeWidth="4" />
            <path d="M55 98h130" stroke="#193F32" strokeWidth="4" />
            <rect x="80" y="118" width="80" height="42" rx="5" fill="#F8F7F1" stroke="#193F32" strokeWidth="4" />
            <path d="M95 132h50m-50 11h34" stroke="#193F32" strokeWidth="3" strokeLinecap="round" />
          </>}
          {type === 'bottle' && <>
            <rect x="91" y="27" width="58" height="37" rx="12" fill="#193F32" />
            <rect x="75" y="60" width="90" height="126" rx="27" fill="white" stroke="#193F32" strokeWidth="4" />
            <path d="M77 111h86v17H77z" fill="#FF4D00" stroke="#193F32" strokeWidth="4" />
            <path d="M94 142v29" stroke="#9AB1A5" strokeWidth="4" strokeLinecap="round" />
          </>}
          {type === 'book' && <>
            <rect x="66" y="36" width="108" height="144" rx="8" fill="white" stroke="#193F32" strokeWidth="4" />
            <path d="M79 36v144" stroke="#193F32" strokeWidth="12" />
            <path d="M93 80h59m-59 13h47" stroke="#193F32" strokeWidth="3" strokeLinecap="round" />
            <circle cx="139" cy="138" r="14" fill="#FF4D00" stroke="#193F32" strokeWidth="3" />
          </>}
          {type === 'headphones' && <>
            <path d="M66 123V96a54 54 0 0 1 108 0v27" stroke="#193F32" strokeWidth="13" strokeLinecap="round" />
            <rect x="48" y="106" width="36" height="66" rx="15" fill="#193F32" />
            <rect x="156" y="106" width="36" height="66" rx="15" fill="#193F32" />
            <rect x="57" y="125" width="18" height="29" rx="9" fill="#FF4D00" />
            <rect x="165" y="125" width="18" height="29" rx="9" fill="#FF4D00" />
          </>}
          {type === 'coffee' && <>
            <path d="M69 54h102l13 126H56L69 54Z" fill="white" stroke="#193F32" strokeWidth="4" />
            <path d="M69 54h102l4 15H65l4-15Z" fill="#193F32" />
            <rect x="83" y="91" width="74" height="52" rx="8" fill="#F8F7F1" stroke="#193F32" strokeWidth="4" />
            <circle cx="120" cy="117" r="15" fill="#FF4D00" stroke="#193F32" strokeWidth="3" />
          </>}
          {type === 'gift' && <>
            <rect x="61" y="77" width="118" height="99" rx="12" fill="white" stroke="#193F32" strokeWidth="4" />
            <path d="M120 77v99M61 106h118" stroke="#193F32" strokeWidth="4" />
            <path d="M120 77c-29 0-46-28-24-35 16-5 24 35 24 35Zm0 0c29 0 46-28 24-35-16-5-24 35-24 35Z" fill="#FF4D00" stroke="#193F32" strokeWidth="4" strokeLinejoin="round" />
          </>}
        </svg>
      )}
    </div>
  );
}
