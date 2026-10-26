'use client';

import Link from 'next/link';
import Image from 'next/image';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, Recipient } from '@/lib/api';
import { ProductArtwork } from '@/components/product-artwork';
import { addToCart } from '@/lib/cart';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
const occasions = [
  { value: 'birthday', label: 'Sinh nhật' },
  { value: 'anniversary', label: 'Kỷ niệm' },
  { value: 'holiday', label: 'Lễ tết' },
  { value: 'thank-you', label: 'Cảm ơn' },
  { value: 'other', label: 'Khác' },
] as const;
const occasionPrompts: Record<(typeof occasions)[number]['value'], string> = {
  birthday: 'sinh nhật',
  anniversary: 'kỷ niệm',
  holiday: 'lễ hoặc dịp đặc biệt',
  'thank-you': 'cảm ơn',
  other: 'dịp khác',
};
type RecommendationProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  ratingAverage: number;
  ratingCount: number;
  categories: Array<{ name: string }>;
  variants: Array<{
    id: string;
    sku: string;
    color: string | null;
    size: string | null;
    material: string | null;
    priceVnd: number;
    priceAfterDiscountVnd: number;
    stock: number;
    media: Array<{ type: string; url: string }>;
  }>;
};
type Recommendation = { product: RecommendationProduct; variantId: string; variantLabel: string; priceVnd: number; reason: string };
type RecommendationBundle = { title: string; reason: string; totalPriceVnd: number; items: Array<Recommendation & { quantity: number }> };
type ChatMessage = { id: string; role: 'USER' | 'ASSISTANT'; content: string; bundles: RecommendationBundle[]; createdAt: string };

export default function RecommendationPage({ initialRecipient }: { initialRecipient?: string }) {
  const router = useRouter();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const selectedRecipientIdRef = useRef<string | undefined>(undefined);
  const [budget, setBudget] = useState(700000);
  const [occasion, setOccasion] = useState<(typeof occasions)[number]['value']>('birthday');
  const [requestText, setRequestText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottomRef = useRef(false);

  useEffect(() => {
    selectedRecipientIdRef.current = recipient?.id;
  }, [recipient?.id]);

  useEffect(() => {
    if (!shouldScrollToBottomRef.current) return;
    shouldScrollToBottomRef.current = false;
    chatMessagesRef.current?.scrollTo({ top: chatMessagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, requesting]);

  useEffect(() => {
    let active = true;
    api<Recipient[]>('/recipients')
      .then(people => {
        if (!active) return;
        setRecipients(people);
        const selected = people.find(person => person.id === initialRecipient) ?? people[0] ?? null;
        if (selectedRecipientIdRef.current !== selected?.id) {
          setRecipient(selected);
          setConversationLoading(Boolean(selected));
        }
      })
      .catch(reason => {
        if (!active) return;
        if ((reason as { status?: number }).status === 401) router.replace('/login');
        else setError((reason as Error).message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initialRecipient, router]);

  function selectRecipient(value: string) {
    const selected = recipients.find(person => person.id === value) ?? null;
    setRecipient(selected);
    setConversationId(null);
    setMessages([]);
    setHasMoreMessages(false);
    setConversationLoading(Boolean(selected));
    setError('');
    setNotice('');
    router.replace(selected ? `/recommendations?recipient=${encodeURIComponent(selected.id)}` : '/recommendations');
  }

  const recipientId = recipient?.id;
  useEffect(() => {
    if (!recipientId) return;
    let active = true;
    api<{ conversationId: string | null; occasion: string | null; budgetVnd: number | null; messages: ChatMessage[]; hasMoreMessages: boolean }>(`/recommendations/conversation?recipientId=${encodeURIComponent(recipientId)}`)
      .then(result => {
        if (!active) return;
        setConversationId(result.conversationId);
        shouldScrollToBottomRef.current = true;
        setMessages(result.messages);
        setHasMoreMessages(result.hasMoreMessages);
        const storedOccasion = occasions.find(item => item.value === result.occasion);
        if (storedOccasion) setOccasion(storedOccasion.value);
        if (result.budgetVnd !== null && result.budgetVnd >= 50000 && result.budgetVnd <= 2000000) setBudget(result.budgetVnd);
      })
      .catch(reason => {
        if (active) {
          if ((reason as { status?: number }).status === 401) router.replace('/login');
          else setError((reason as Error).message);
        }
      })
      .finally(() => { if (active) setConversationLoading(false); });
    return () => { active = false; };
  }, [recipientId, router]);

  async function loadOlderMessages() {
    if (!recipientId || !messages.length || loadingOlderMessages) return;
    setLoadingOlderMessages(true);
    try {
      const before = encodeURIComponent(messages[0].createdAt);
      const result = await api<{ messages: ChatMessage[]; hasMoreMessages: boolean }>(`/recommendations/conversation?recipientId=${encodeURIComponent(recipientId)}&before=${before}`);
      setMessages(current => [...result.messages, ...current]);
      setHasMoreMessages(result.hasMoreMessages);
    } catch (reason) {
      if ((reason as { status?: number }).status === 401) router.replace('/login');
      else setError((reason as Error).message);
    } finally {
      setLoadingOlderMessages(false);
    }
  }

  async function requestRecommendations(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!recipient || requesting) return;
    const typedMessage = requestText.trim();
    const messageContent = typedMessage || `Tìm gợi ý quà dịp ${occasionPrompts[occasion]}, ngân sách tối đa ${new Intl.NumberFormat('vi-VN').format(budget)}₫.`;
    const optimisticMessageId = `pending-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticMessageId,
      role: 'USER',
      content: messageContent,
      bundles: [],
      createdAt: new Date().toISOString(),
    };
    setRequesting(true);
    setError('');
    setNotice('');
    setRequestText('');
    shouldScrollToBottomRef.current = true;
    setMessages(current => [...current, optimisticMessage]);
    try {
      const result = await api<{ conversationId: string; occasion: string; budgetVnd: number; messages: ChatMessage[] }>('/recommendations', {
        method: 'POST',
        body: JSON.stringify({
          recipientId: recipient.id,
          ...(conversationId ? { conversationId } : {}),
          budgetVnd: budget,
          occasion,
          ...(requestText.trim() ? { request: requestText.trim() } : {}),
        }),
      });
      setConversationId(result.conversationId);
      shouldScrollToBottomRef.current = true;
      setMessages(current => {
        const byId = new Map([...current.filter(message => message.id !== optimisticMessageId), ...result.messages].map(message => [message.id, message]));
        return [...byId.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      });
      const storedOccasion = occasions.find(item => item.value === result.occasion);
      if (storedOccasion) setOccasion(storedOccasion.value);
      setBudget(Math.min(2000000, Math.max(50000, result.budgetVnd)));
    } catch (reason) {
      setMessages(current => current.filter(message => message.id !== optimisticMessageId));
      if (typedMessage) setRequestText(current => current || typedMessage);
      if ((reason as { status?: number }).status === 401) router.replace('/login');
      else setError((reason as Error).message);
    } finally {
      setRequesting(false);
    }
  }

  function addBundleToCart(bundle: RecommendationBundle) {
    for (const item of bundle.items) {
      const variant = item.product.variants.find(entry => entry.id === item.variantId);
      if (variant && variant.stock > 0) addToCart(item.product, variant, item.quantity);
    }
    setNotice(`Đã thêm gói “${bundle.title}” vào giỏ hàng.`);
  }

  if (loading) return <main className="page-container min-h-[50vh] flex-1 py-16" role="status">Đang tải thông tin người nhận và quà tặng...</main>;

  return <main className="page-container flex-1 py-8 sm:py-10">
    <p className="eyebrow">Gợi ý quà bằng AI</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Tìm quà cho {recipient?.displayName ?? 'người bạn quan tâm'}</h1>
    <section aria-label="Chọn người nhận" className="mt-5 flex gap-5 overflow-x-auto rounded-2xl border border-[#dfe5d9] bg-white p-4">
      {recipients.length ? recipients.map(person => <button key={person.id} type="button" aria-pressed={recipient?.id === person.id} onClick={() => selectRecipient(person.id)} className="flex w-20 shrink-0 flex-col items-center gap-2 rounded-xl p-2 text-center hover:bg-[#f4f6f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193f32]">
        <span className={`grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-[#edf1e8] font-bold ring-2 ring-offset-2 ${recipient?.id === person.id ? 'ring-[#193f32]' : 'ring-transparent'}`}>
          {person.avatarUrl ? <Image src={person.avatarUrl} alt="" width={56} height={56} unoptimized className="h-full w-full object-cover" /> : person.displayName.slice(0, 2).toUpperCase()}
        </span>
        <span className={`w-full truncate text-xs ${recipient?.id === person.id ? 'font-bold text-[#193f32]' : 'text-[#64756b]'}`}>{person.displayName}</span>
      </button>) : <div className="flex items-center gap-3 text-sm text-[#64756b]"><span>Chưa có hồ sơ người nhận.</span><Link href="/recipients" className="font-semibold text-[#193f32] underline">Tạo hồ sơ</Link></div>}
    </section>
    <div className="mt-6 grid items-start gap-5 lg:grid-cols-[285px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <section className="surface p-4"><h2 className="font-extrabold">Dịp tặng quà</h2><div className="mt-3 flex flex-wrap gap-2">{occasions.map(item=><button key={item.value} type="button" aria-pressed={occasion===item.value} onClick={()=>setOccasion(item.value)} className={`rounded-full border px-3 py-2 text-xs ${occasion===item.value?'border-[#193f32] bg-[#193f32] font-bold text-white':'border-[#dfe5d9] bg-white'}`}>{item.label}</button>)}</div></section>
        <section className="surface p-4"><div className="flex items-center justify-between"><h2 className="font-extrabold">Ngân sách tối đa</h2><span className="text-sm font-bold">{money(budget)}</span></div><input aria-label="Ngân sách tối đa" type="range" min="50000" max="2000000" step="50000" value={budget} onChange={event=>setBudget(Number(event.target.value))} className="mt-4 w-full accent-[#193f32]" /><div className="flex justify-between text-xs text-[#64756b]"><span>50.000₫</span><span>2.000.000₫</span></div></section>
        <section className="surface p-4"><h2 className="font-extrabold">Sở thích</h2><div className="mt-3 flex flex-wrap gap-2">{(recipient?.interests.length ? recipient.interests : ['Thêm sở thích trong hồ sơ']).map(item=><span key={item} className="pill">{item}</span>)}</div><h3 className="mt-5 text-sm font-bold">Không thích</h3><div className="mt-3 flex flex-wrap gap-2">{(recipient?.dislikes.length ? recipient.dislikes : ['Chưa có dữ liệu']).map(item=><span key={item} className="rounded-full border border-dashed border-[#b9c7b9] px-3 py-1.5 text-xs">{item}</span>)}</div><Link href={recipient?`/recipients/${encodeURIComponent(recipient.id)}`:'/recipients'} className="mt-4 inline-block text-xs font-semibold underline">Chỉnh sửa hồ sơ</Link></section>
        {recipient?.notes && <section className="rounded-2xl border border-[#dfe5d9] bg-[#edf1e8] p-4"><h2 className="font-extrabold">Ghi chú</h2><p className="mt-2 text-sm leading-6 text-[#64756b]">{recipient.notes}</p></section>}
        <button type="button" disabled={!recipient || requesting || conversationLoading} onClick={() => { void requestRecommendations(); }} className="btn-accent w-full disabled:cursor-not-allowed disabled:opacity-50">{requesting ? 'Đang tìm quà phù hợp...' : messages.length ? 'Tìm gợi ý mới' : 'Tìm quà phù hợp'}</button>
      </aside>
      <section className="flex h-[min(75vh,760px)] min-h-[360px] flex-col overflow-hidden rounded-2xl border border-[#dfe5d9] bg-white">
        <div className="flex shrink-0 items-center gap-3 border-b border-[#edf1e8] p-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#193f32] text-white">✧</span><div><h2 className="font-bold">Trợ lý chọn quà</h2></div></div>
        <div ref={chatMessagesRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {conversationLoading && <p role="status" className="text-xs text-[#849188]">Đang kiểm tra lịch sử trò chuyện...</p>}
          {hasMoreMessages && !conversationLoading && <button type="button" disabled={loadingOlderMessages} onClick={() => { void loadOlderMessages(); }} className="mx-auto block rounded-full border border-[#dfe5d9] px-4 py-2 text-sm font-semibold text-[#193f32] disabled:opacity-50">{loadingOlderMessages ? 'Đang tải...' : 'Tải tin nhắn cũ hơn'}</button>}
          {!messages.length && <div className="max-w-[86%] rounded-2xl rounded-tl-sm bg-[#edf1e8] p-4 text-sm"><p>{recipient ? `Chào bạn! Hãy chọn dịp, ngân sách và cho mình biết bạn đang tìm món quà như thế nào cho ${recipient.displayName}.` : 'Chọn người nhận để bắt đầu trò chuyện.'}</p></div>}
          {notice && <p role="status" className="rounded-xl bg-[#edf1e8] p-3 text-sm text-green-900">{notice}</p>}
          {messages.map(message => <div key={message.id} className={message.role === 'USER' ? 'ml-auto max-w-[85%]' : 'max-w-[95%]'}>
            <div className={`whitespace-pre-wrap rounded-2xl p-4 text-sm ${message.role === 'USER' ? 'rounded-tr-sm bg-[#193f32] text-white' : 'rounded-tl-sm bg-[#edf1e8]'}`}>{message.content}</div>
            {message.role === 'ASSISTANT' && message.bundles.map((bundle, bundleIndex) => <article key={`${message.id}-${bundleIndex}`} className="mt-3 rounded-2xl border border-[#dfe5d9] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold text-[#64756b]">Gói quà {bundleIndex + 1}</p><h3 className="mt-1 font-extrabold">{bundle.title}</h3></div><div className="text-right"><p className="text-xs text-[#64756b]">Tổng gói</p><strong>{money(bundle.totalPriceVnd)}</strong></div></div>
              {bundle.reason && <p className="mt-2 break-words text-sm text-[#526b5c]">{bundle.reason}</p>}
              <div className="mt-3 space-y-3">{bundle.items.map((item, itemIndex) => {
                const variant = item.product.variants.find(entry => entry.id === item.variantId);
                const image = variant?.media.find(media => media.type === 'IMAGE')?.url;
                return <div key={`${item.variantId}-${itemIndex}`} className="flex min-w-0 items-start gap-3 rounded-xl bg-[#f8f7f1] p-3">
                  <ProductArtwork name={item.product.name} category={item.product.categories[0]?.name} imageUrl={image} className="!h-20 !w-20 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1"><Link href={`/catalog/${item.product.slug}`} className="block break-words font-bold no-underline hover:underline">{item.product.name}</Link><strong className="mt-1 block">{money(item.priceVnd * item.quantity)}</strong><p className="mt-1 break-words text-xs text-[#64756b]">{item.variantLabel} · SL {item.quantity}</p><p className="mt-1 break-words text-sm text-[#526b5c]">{item.reason}</p></div>
                </div>;
              })}</div>
              <button type="button" onClick={() => addBundleToCart(bundle)} className="btn-primary mt-3 min-h-9 px-4 text-xs">Thêm cả gói vào giỏ</button>
            </article>)}
          </div>)}
          {requesting && <div role="status" aria-label="Trợ lý đang nhập tin nhắn" className="flex w-fit items-center gap-1.5 rounded-2xl rounded-tl-sm bg-[#edf1e8] px-4 py-3">
            <span className="sr-only">Trợ lý đang nhập tin nhắn</span>
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#64756b]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#64756b] [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#64756b] [animation-delay:300ms]" />
          </div>}
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>
        <form onSubmit={requestRecommendations} className="flex shrink-0 items-center gap-3 border-t border-[#edf1e8] bg-[#f8f7f1] p-4"><input value={requestText} onChange={event=>setRequestText(event.target.value)} maxLength={500} placeholder="Nhắn thêm yêu cầu, ví dụ: ưu tiên quà thủ công..." aria-label="Nhập tin nhắn cho trợ lý chọn quà" className="form-control rounded-full" /><button type="submit" disabled={!recipient || requesting || conversationLoading} aria-label="Gửi tin nhắn" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#193f32] text-white disabled:opacity-50">{requesting?'…':'→'}</button></form>
      </section>
    </div>
  </main>;
}
