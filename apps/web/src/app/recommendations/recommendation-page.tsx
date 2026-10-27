'use client';

import Link from 'next/link';
import Image from 'next/image';
import { type CSSProperties, type FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, CatalogProduct, Recipient } from '@/lib/api';
import { ProductArtwork } from '@/components/product-artwork';
import { addToCart } from '@/lib/cart';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
const minBudget = 50000;
const maxBudget = 20000000;
const budgetStep = 50000;
const newIdempotencyKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
  const [clearingHistory, setClearingHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const chatMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatMenuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!chatMenuRef.current?.contains(event.target as Node)) setChatMenuOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setChatMenuOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('mousedown', handlePointerDown); document.removeEventListener('keydown', handleKeyDown); };
  }, [chatMenuOpen]);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const chatSectionRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottomRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [chatHeight, setChatHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const computeChatHeight = () => {
      const element = chatSectionRef.current;
      if (!element) return;
      if (!window.matchMedia('(min-width: 1024px)').matches) { setChatHeight(undefined); return; }
      const top = window.scrollY + element.getBoundingClientRect().top;
      const bottomGap = 20;
      const available = Math.floor(window.innerHeight - top - bottomGap);
      setChatHeight(Math.max(420, Math.min(available, 900)));
    };
    computeChatHeight();
    window.addEventListener('resize', computeChatHeight);
    return () => window.removeEventListener('resize', computeChatHeight);
  }, [loading, recipient?.id, recipients.length]);

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

  function startNewConversation() {
    if (!recipient || requesting || conversationLoading) return;
    setConversationId(null);
    setMessages([]);
    setHasMoreMessages(false);
    setError('');
    setNotice('');
  }

  async function clearHistory() {
    if (!recipientId || clearingHistory || requesting || conversationLoading || !messages.length) return;
    if (!window.confirm('Xóa toàn bộ hội thoại với người nhận này? Hành động này không thể hoàn tác.')) return;
    setClearingHistory(true);
    try {
      await api<{ deleted: number }>(`/recommendations/conversation?recipientId=${encodeURIComponent(recipientId)}`, { method: 'DELETE' });
      setConversationId(null);
      setMessages([]);
      setHasMoreMessages(false);
      setError('');
      setNotice('');
    } catch (reason) {
      if ((reason as { status?: number }).status === 401) router.replace('/login');
      else setError((reason as Error).message);
    } finally {
      setClearingHistory(false);
    }
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
        if (result.budgetVnd !== null && result.budgetVnd >= minBudget && result.budgetVnd <= maxBudget) setBudget(result.budgetVnd);
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
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const result = await api<{ conversationId: string; occasion: string; budgetVnd: number; messages: ChatMessage[] }>('/recommendations', {
        method: 'POST',
        body: JSON.stringify({
          recipientId: recipient.id,
          ...(conversationId ? { conversationId } : {}),
          budgetVnd: budget,
          occasion,
          ...(typedMessage ? { request: typedMessage } : {}),
          idempotencyKey: newIdempotencyKey(),
        }),
        signal: controller.signal,
      });
      setConversationId(result.conversationId);
      shouldScrollToBottomRef.current = true;
      setMessages(current => {
        const byId = new Map([...current.filter(message => message.id !== optimisticMessageId), ...result.messages].map(message => [message.id, message]));
        return [...byId.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      });
      const storedOccasion = occasions.find(item => item.value === result.occasion);
      if (storedOccasion) setOccasion(storedOccasion.value);
      setBudget(Math.min(maxBudget, Math.max(minBudget, result.budgetVnd)));
    } catch (reason) {
      setMessages(current => current.filter(message => message.id !== optimisticMessageId));
      if (typedMessage) setRequestText(current => current || typedMessage);
      if ((reason as Error).name === 'AbortError') {
        setNotice('Đã hủy đợi phản hồi. Yêu cầu vẫn có thể hoàn tất trên máy chủ; tải lại trang để xem hội thoại mới nhất.');
      } else if ((reason as { status?: number }).status === 401) router.replace('/login');
      else setError((reason as Error).message);
    } finally {
      abortControllerRef.current = null;
      setRequesting(false);
    }
  }

  function cancelRequest() {
    abortControllerRef.current?.abort();
  }

  async function addItemToCart(item: RecommendationBundle['items'][number]): Promise<boolean> {
    const variant = item.product.variants.find(entry => entry.id === item.variantId);
    if (!variant) return false;
    try {
      const fresh = await api<CatalogProduct>(`/catalog/products/${encodeURIComponent(item.product.slug)}`);
      const freshVariant = fresh.variants.find(entry => entry.id === item.variantId);
      if (!freshVariant) return false;
      return addToCart(fresh, freshVariant, item.quantity);
    } catch (reason) {
      if (typeof (reason as { status?: number }).status === 'number') return false;
      return addToCart(item.product, variant, item.quantity);
    }
  }

  async function addSingleItem(item: RecommendationBundle['items'][number]) {
    if (await addItemToCart(item)) setNotice(`Đã thêm “${item.product.name}” vào giỏ hàng.`);
    else setError(`Không thể thêm “${item.product.name}” vào giỏ: sản phẩm đã hết hàng hoặc ngừng bán.`);
  }

  async function addBundleToCart(bundle: RecommendationBundle) {
    const results = await Promise.all(bundle.items.map(item => addItemToCart(item)));
    const failed = bundle.items.filter((_, index) => !results[index]);
    if (failed.length === bundle.items.length) {
      setError(`Không thể thêm gói “${bundle.title}” vào giỏ: các sản phẩm đã hết hàng hoặc ngừng bán.`);
      return;
    }
    setNotice(`Đã thêm gói “${bundle.title}” vào giỏ hàng.${failed.length ? ` Bỏ qua ${failed.map(item => item.product.name).join(', ')} vì đã hết hàng hoặc ngừng bán.` : ''}`);
  }

  if (loading) return <main className="page-container flex min-h-[50vh] flex-1 flex-col items-center justify-center py-16 text-center" role="status"><Image src="/images/mascot/mascot-laptop.png" alt="" width={223} height={289} className="w-28 sm:w-32" /><p className="mt-4 text-[#64756b]">Đang tải thông tin người nhận và quà tặng...</p></main>;

  return <main className="page-container flex-1 py-4 sm:py-5">
    <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">Tìm quà cho {recipient?.displayName ?? 'người bạn quan tâm'}</h1>
    <div className={`mt-4 grid items-start gap-4 ${filtersOpen ? 'lg:grid-cols-[260px_200px_minmax(0,1fr)]' : 'lg:grid-cols-[52px_200px_minmax(0,1fr)]'}`} style={chatHeight ? { '--col-h': `${chatHeight}px` } as CSSProperties : undefined}>
      <aside className={`order-3 rounded-2xl border border-[#dfe5d9] bg-white p-3 lg:order-none lg:p-2 ${filtersOpen ? 'space-y-3 lg:flex lg:h-[var(--col-h)] lg:min-h-[420px] lg:flex-col lg:justify-between lg:overflow-y-auto' : 'lg:h-fit lg:pt-2'}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className={`text-xs font-extrabold uppercase tracking-wide text-[#64756b] ${filtersOpen ? '' : 'hidden'}`}>Bộ lọc gợi ý</h2>
          <button type="button" onClick={() => setFiltersOpen(value => !value)} aria-expanded={filtersOpen} aria-label={filtersOpen ? 'Thu gọn bộ lọc gợi ý' : 'Mở bộ lọc gợi ý'} className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#dfe5d9] bg-white text-[#193f32] hover:bg-[#edf1e8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193f32]">{filtersOpen ? '›' : '‹'}</button>
        </div>
        <div className={`${filtersOpen ? 'space-y-3' : 'hidden lg:hidden'}`}>
        <section className="surface p-3.5"><h3 className="font-extrabold">Dịp tặng quà</h3><div className="mt-2.5 flex flex-wrap gap-2">{occasions.map(item=><button key={item.value} type="button" aria-pressed={occasion===item.value} onClick={()=>setOccasion(item.value)} className={`rounded-full border px-3 py-1.5 text-xs ${occasion===item.value?'border-[#193f32] bg-[#193f32] font-bold text-white':'border-[#dfe5d9] bg-white'}`}>{item.label}</button>)}</div></section>
        <section className="surface p-3.5"><h3 className="flex items-center justify-between font-extrabold">Ngân sách tối đa<input aria-label="Nhập ngân sách tối đa" type="number" min={minBudget} max={maxBudget} step={budgetStep} value={budget} onChange={event=>{ const value = Number(event.target.value); if (!Number.isNaN(value)) setBudget(value); }} onBlur={event=>setBudget(Math.min(maxBudget, Math.max(minBudget, Number(event.target.value) || minBudget)))} className="w-28 rounded-lg border border-[#dfe5d9] px-2 py-1 text-right text-sm" /></h3><input aria-label="Ngân sách tối đa" type="range" min={minBudget} max={maxBudget} step={budgetStep} value={budget} onChange={event=>setBudget(Number(event.target.value))} className="mt-3 w-full accent-[#193f32]" /><div className="flex justify-between text-xs text-[#64756b]"><span>{money(minBudget)}</span><span>{money(maxBudget)}</span></div></section>
        <section className="surface p-3.5"><h3 className="font-extrabold">Sở thích</h3><div className="mt-2.5 flex flex-wrap gap-2">{(recipient?.interests.length ? recipient.interests : ['Thêm sở thích trong hồ sơ']).map(item=><span key={item} className="pill">{item}</span>)}</div><h4 className="mt-3 text-sm font-bold">Không thích</h4><div className="mt-2 flex flex-wrap gap-2">{(recipient?.dislikes.length ? recipient.dislikes : ['Chưa có dữ liệu']).map(item=><span key={item} className="rounded-full border border-dashed border-[#b9c7b9] px-3 py-1 text-xs">{item}</span>)}</div><Link href={recipient?`/recipients/${encodeURIComponent(recipient.id)}`:'/recipients'} className="mt-3 inline-block text-xs font-semibold underline">Chỉnh sửa hồ sơ</Link></section>
        {recipient?.notes && <section className="rounded-2xl border border-[#dfe5d9] bg-[#edf1e8] p-3.5"><h3 className="font-extrabold">Ghi chú</h3><p className="mt-1.5 text-sm leading-6 text-[#64756b]">{recipient.notes}</p></section>}
        </div>
        {filtersOpen && <button type="button" disabled={!recipient || requesting || conversationLoading} onClick={() => { void requestRecommendations(); }} className="btn-accent w-full shrink-0 disabled:cursor-not-allowed disabled:opacity-50">{requesting ? 'Đang tìm quà phù hợp...' : messages.length ? 'Tìm gợi ý mới' : 'Tìm quà phù hợp'}</button>}
      </aside>
      <section aria-label="Chọn người nhận" className="order-1 flex gap-3 overflow-x-auto rounded-2xl border border-[#dfe5d9] bg-white p-2 lg:order-none lg:h-[var(--col-h)] lg:min-h-[420px] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto">
        {recipients.length ? recipients.map(person => <button key={person.id} type="button" aria-pressed={recipient?.id === person.id} onClick={() => selectRecipient(person.id)} className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-xl p-1.5 text-center hover:bg-[#f4f6f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193f32] lg:w-full lg:flex-row lg:gap-2.5 lg:p-2 lg:text-left">
        <span className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#edf1e8] font-bold ring-2 ring-offset-2 ${recipient?.id === person.id ? 'ring-[#193f32]' : 'ring-transparent'}`}>
          {person.avatarUrl ? <Image src={person.avatarUrl} alt="" width={48} height={48} unoptimized className="h-full w-full object-cover" /> : person.displayName.slice(0, 2).toUpperCase()}
        </span>
        <span className={`w-full truncate text-xs lg:text-sm ${recipient?.id === person.id ? 'font-bold text-[#193f32]' : 'text-[#64756b]'}`}>{person.displayName}</span>
      </button>) : <div className="flex items-center gap-3 text-sm text-[#64756b]"><span>Chưa có hồ sơ người nhận.</span><Link href="/recipients" className="font-semibold text-[#193f32] underline">Tạo hồ sơ</Link></div>}
      </section>
      <section ref={chatSectionRef} style={chatHeight ? { height: chatHeight } : undefined} className="order-2 flex h-[min(75vh,760px)] min-h-[360px] flex-col overflow-hidden rounded-2xl border border-[#dfe5d9] bg-white lg:order-none lg:h-auto">
        <div className="flex shrink-0 items-center gap-3 border-b border-[#edf1e8] p-4"><span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#edf1e8]"><Image src="/images/mascot/mascot-icon.png" alt="" width={36} height={36} className="h-full w-full scale-110 object-cover" /></span><h2 className="font-bold">Trợ lý chọn quà</h2><div ref={chatMenuRef} className="relative ml-auto"><button type="button" aria-haspopup="menu" aria-expanded={chatMenuOpen} aria-label="Tuỳ chọn hội thoại" onClick={() => setChatMenuOpen(open => !open)} className="grid h-9 w-9 place-items-center rounded-full border border-[#dfe5d9] bg-white text-[#193f32] hover:bg-[#edf1e8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193f32]"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><circle cx="12" cy="5" r="1.9" /><circle cx="12" cy="12" r="1.9" /><circle cx="12" cy="19" r="1.9" /></svg></button>{chatMenuOpen && <div role="menu" aria-label="Tuỳ chọn hội thoại" className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-[#dfe5d9] bg-white p-1.5 shadow-lg"><button type="button" role="menuitem" disabled={!recipient || requesting || conversationLoading || clearingHistory} onClick={() => { setChatMenuOpen(false); startNewConversation(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#193f32] hover:bg-[#edf1e8] disabled:cursor-not-allowed disabled:opacity-50"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Hội thoại mới</button>{messages.length > 0 && <button type="button" role="menuitem" disabled={!recipient || requesting || conversationLoading || clearingHistory} onClick={() => { setChatMenuOpen(false); void clearHistory(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#8a2f2f] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2m-8 0 .7 12a2 2 0 0 0 2 1.9h4.6a2 2 0 0 0 2-1.9L18 7M10 11v6m4-6v6" /></svg>{clearingHistory ? 'Đang xóa...' : 'Xóa lịch sử'}</button>}</div>}</div></div>
        <div ref={chatMessagesRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {conversationLoading && <div role="status" className="flex items-center gap-3"><Image src="/images/mascot/mascot-laptop.png" alt="" width={112} height={145} className="w-10" /><p className="text-xs text-[#849188]">Đang kiểm tra lịch sử trò chuyện...</p></div>}
          {hasMoreMessages && !conversationLoading && <button type="button" disabled={loadingOlderMessages} onClick={() => { void loadOlderMessages(); }} className="mx-auto block rounded-full border border-[#dfe5d9] px-4 py-2 text-sm font-semibold text-[#193f32] disabled:opacity-50">{loadingOlderMessages ? 'Đang tải...' : 'Tải tin nhắn cũ hơn'}</button>}
          {!messages.length && <div className="flex max-w-[60%] items-end gap-3 rounded-2xl rounded-tl-sm bg-[#edf1e8] p-4 text-sm"><Image src="/images/mascot/mascot-wave.png" alt="" width={217} height={304} className="w-16 shrink-0" /><p>{recipient ? `Chào bạn! Hãy chọn dịp, ngân sách và cho mình biết bạn đang tìm món quà như thế nào cho ${recipient.displayName}.` : 'Chọn người nhận để bắt đầu trò chuyện.'}</p></div>}
          {notice && <p role="status" className="rounded-xl bg-[#edf1e8] p-3 text-sm text-green-900">{notice}</p>}
          {messages.map(message => <div key={message.id} className={message.role === 'USER' ? 'ml-auto max-w-[60%]' : 'max-w-[60%]'}>
            <div className={`whitespace-pre-wrap rounded-2xl p-4 text-sm ${message.role === 'USER' ? 'rounded-tr-sm bg-[#193f32] text-white' : 'rounded-tl-sm bg-[#edf1e8]'}`}>{message.content}</div>
            {message.role === 'ASSISTANT' && message.bundles.map((bundle, bundleIndex) => <article key={`${message.id}-${bundleIndex}`} className="mt-3 rounded-2xl border border-[#dfe5d9] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold text-[#64756b]">Gói quà {bundleIndex + 1}</p><h3 className="mt-1 font-extrabold">{bundle.title}</h3></div><div className="text-right"><p className="text-xs text-[#64756b]">Tổng gói</p><strong>{money(bundle.totalPriceVnd)}</strong></div></div>
              {bundle.reason && <p className="mt-2 break-words text-sm text-[#526b5c]">{bundle.reason}</p>}
              <div className="mt-3 space-y-3">{bundle.items.map((item, itemIndex) => {
                const variant = item.product.variants.find(entry => entry.id === item.variantId);
                const image = variant?.media.find(media => media.type === 'IMAGE')?.url;
                return <div key={`${item.variantId}-${itemIndex}`} className="flex min-w-0 items-start gap-3 rounded-xl bg-[#f8f7f1] p-3">
                  <ProductArtwork name={item.product.name} category={item.product.categories[0]?.name} imageUrl={image} className="!h-20 !w-20 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1"><Link href={`/catalog/${item.product.slug}`} className="block break-words font-bold no-underline hover:underline">{item.product.name}</Link><strong className="mt-1 block">{money(item.priceVnd * item.quantity)}</strong><p className="mt-1 break-words text-xs text-[#64756b]">{item.variantLabel} · SL {item.quantity}</p><p className="mt-1 break-words text-sm text-[#526b5c]">{item.reason}</p><button type="button" onClick={() => { void addSingleItem(item); }} className="mt-2 text-xs font-semibold text-[#193f32] underline">Thêm vào giỏ</button></div>
                </div>;
              })}</div>
              <button type="button" onClick={() => { void addBundleToCart(bundle); }} className="btn-primary mt-3 min-h-9 px-4 text-xs">Thêm cả gói vào giỏ</button>
            </article>)}
          </div>)}
          {requesting && <div role="status" className="flex items-center gap-3"><div aria-label="Trợ lý đang nhập tin nhắn" className="flex w-fit items-center gap-2 rounded-2xl rounded-tl-sm px-1 py-1">
            <span className="sr-only">Trợ lý đang nhập tin nhắn</span>
            <Image src="/images/mascot/mascot-idea.png" alt="" width={211} height={322} className="w-8" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#64756b]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#64756b] [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#64756b] [animation-delay:300ms]" />
          </div></div>}
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>
        <form onSubmit={requestRecommendations} className="flex shrink-0 items-center gap-3 border-t border-[#edf1e8] bg-[#f8f7f1] p-4"><input value={requestText} onChange={event=>setRequestText(event.target.value)} maxLength={500} placeholder="Nhắn thêm yêu cầu, ví dụ: ưu tiên quà thủ công..." aria-label="Nhập tin nhắn cho trợ lý chọn quà" className="form-control rounded-full" />{requesting ? <button type="button" onClick={cancelRequest} aria-label="Hủy yêu cầu gợi ý" title="Hủy yêu cầu" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#193f32] text-white hover:bg-[#8a2f2f]"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></svg></button> : <button type="submit" disabled={!recipient || conversationLoading} aria-label="Gửi tin nhắn" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#193f32] text-white disabled:opacity-50">↑</button>}</form>
      </section>
    </div>
  </main>;
}
