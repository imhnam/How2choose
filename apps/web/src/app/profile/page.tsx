'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddressSelector } from '@/components/address-selector';
import { AccountAddress, api, DeliveryAddress, User } from '@/lib/api';

export default function PersonalProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [addressName, setAddressName] = useState('');
  const [addressPhone, setAddressPhone] = useState('');
  const [address, setAddress] = useState<DeliveryAddress | null>(null);
  const [savedAddress, setSavedAddress] = useState<AccountAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [saved, setSaved] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [addressSaved, setAddressSaved] = useState(false);

  useEffect(() => {
    let active = true;
    api<{ user: User }>('/auth/me')
      .then(({ user: currentUser }) => {
        if (!active) return;
        setUser(currentUser);
        setName(currentUser.displayName ?? '');
        setBirthday(currentUser.birthday ?? '');
        setAddressName(currentUser.displayName ?? '');
        setAddressPhone(currentUser.phone ?? '');
        void api<{ address: AccountAddress | null }>('/auth/me/address')
          .then(({ address: currentAddress }) => {
            if (!active || !currentAddress) return;
            setSavedAddress(currentAddress);
            setAddressName(currentAddress.recipientName);
            setAddressPhone(currentAddress.phone);
          })
          .catch(reason => { if (active) setAddressError((reason as Error).message); });
        void api<{ url: string | null }>('/media/avatar')
          .then(({ url }) => { if (active) setAvatarUrl(url); })
          .catch(reason => { if (active) setAvatarError((reason as Error).message); });
      })
      .catch(reason => {
        if (!active) return;
        if ((reason as { status?: number }).status === 401) router.replace('/login');
        else setError((reason as Error).message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const result = await api<{ user: User }>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName: name.trim(), birthday: birthday || null }),
      });
      setUser(result.user);
      setName(result.user.displayName ?? '');
      setBirthday(result.user.birthday ?? '');
      setAddressName(result.user.displayName ?? '');
      setSaved(true);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file?: File) {
    if (!file) return;
    setUploading(true);
    setAvatarError('');
    const body = new FormData();
    body.append('file', file);
    try {
      const result = await api<{ url: string }>('/media/avatar', { method: 'POST', body });
      setAvatarUrl(result.url);
      window.dispatchEvent(new CustomEvent('how2choose:account-avatar-updated', { detail: result.url }));
    } catch (reason) {
      setAvatarError((reason as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!address || addressSaving) return;
    setAddressSaving(true);
    setAddressError('');
    setAddressSaved(false);
    try {
      const result = await api<{ address: AccountAddress }>('/auth/me/address', {
        method: 'POST',
        body: JSON.stringify({
          recipientName: addressName.trim(),
          phone: addressPhone.trim(),
          version: address.version,
          provinceCode: address.province.code,
          districtCode: address.district?.code,
          wardCode: address.ward.code,
          addressLine: address.addressLine,
        }),
      });
      setSavedAddress(result.address);
      setAddressSaved(true);
    } catch (reason) {
      setAddressError((reason as Error).message);
    } finally {
      setAddressSaving(false);
    }
  }

  if (loading) return <main className="page-container min-h-[50vh] flex-1 py-16" role="status">Đang tải hồ sơ cá nhân...</main>;

  return <main className="page-container flex-1 py-8 sm:py-10">
    <p className="eyebrow">Tài khoản của bạn</p>
    <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Hồ sơ cá nhân</h1>
    <p className="mt-3 max-w-2xl leading-6 text-[#64756b]">Quản lý thông tin tài khoản và địa chỉ giao hàng của bạn.</p>

    {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {user && <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,.8fr)]">
      <form onSubmit={saveProfile} className="surface p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">Thông tin tài khoản</h2>
        <div className="mt-5 flex items-center gap-4">
          <label className={`group relative grid h-16 w-16 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-[#193f32] text-xl font-bold text-white ${uploading ? 'opacity-60' : ''}`} title="Đổi ảnh đại diện">
            {avatarUrl ? <Image src={avatarUrl} alt="Ảnh đại diện" width={64} height={64} unoptimized className="h-full w-full object-cover" /> : (user.displayName?.trim().charAt(0).toUpperCase() || '?')}
            <span className="absolute inset-0 grid place-items-center bg-black/50 text-[10px] opacity-0 transition group-hover:opacity-100">{uploading ? 'Đang tải' : 'Đổi ảnh'}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={event => { void uploadAvatar(event.target.files?.[0]); event.target.value = ''; }} />
          </label>
          <div><p className="font-semibold">{user.displayName || 'Chưa có tên hiển thị'}</p><p className="mt-1 text-xs text-[#64756b]">Ảnh JPG, PNG hoặc WebP</p></div>
        </div>
        {avatarError && <p role="alert" className="mt-3 text-sm text-red-700">{avatarError}</p>}
        <label className="mt-6 block text-sm font-semibold">Họ và tên<input required minLength={2} maxLength={80} value={name} onChange={event => { setName(event.target.value); setSaved(false); }} className="form-control mt-2" placeholder="Nhập họ và tên" /></label>
        <label className="mt-4 block text-sm font-semibold">Ngày sinh<input type="date" value={birthday} onChange={event => { setBirthday(event.target.value); setSaved(false); }} className="form-control mt-2" /></label>
        <label className="mt-4 block text-sm font-semibold">Email đăng nhập<input readOnly value={user.email ?? 'Chưa cập nhật'} className="form-control mt-2 bg-[#f4f6f1] text-[#64756b]" /></label>
        <label className="mt-4 block text-sm font-semibold">Số điện thoại đăng nhập<input readOnly value={user.phone ?? 'Chưa cập nhật'} className="form-control mt-2 bg-[#f4f6f1] text-[#64756b]" /></label>
        <p className="mt-2 text-xs text-[#64756b]">Email và số điện thoại đăng nhập hiện chưa thể chỉnh sửa.</p>
        {saved && <p role="status" className="mt-4 text-sm font-semibold text-[#327450]">Đã lưu thông tin cá nhân.</p>}
        <div className="mt-5 flex justify-end"><button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu thông tin'}</button></div>
      </form>

      <form onSubmit={saveAddress} className="surface p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">Địa chỉ giao hàng mặc định</h2>
        <p className="mt-2 text-sm text-[#64756b]">Địa chỉ được lưu riêng cho tài khoản của bạn.</p>
        <label className="mt-5 block text-sm font-semibold">Tên người nhận hàng<input required minLength={2} maxLength={100} value={addressName} onChange={event => { setAddressName(event.target.value); setAddressSaved(false); }} className="form-control mt-2" placeholder="Tên người nhận" /></label>
        <label className="mt-4 block text-sm font-semibold">Số điện thoại nhận hàng<input required type="tel" pattern="(0[0-9]{9}|\+84[0-9]{9})" title="Nhập số điện thoại 10 chữ số hoặc đầu số +84" value={addressPhone} onChange={event => { setAddressPhone(event.target.value); setAddressSaved(false); }} className="form-control mt-2" placeholder="Ví dụ: 0912345678" /></label>
        {savedAddress && <div className="mt-5"><AddressSelector key={`${savedAddress.version}-${savedAddress.province.code}-${savedAddress.ward.code}-${savedAddress.addressLine}`} onChange={setAddress} initialAddress={savedAddress} /></div>}
        {!savedAddress && <div className="mt-5"><AddressSelector onChange={setAddress} /></div>}
        {addressError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{addressError}</p>}
        {addressSaved && <p role="status" className="mt-4 rounded-lg bg-[#edf1e8] p-3 text-sm font-semibold text-[#327450]">Đã lưu địa chỉ giao hàng mặc định.</p>}
        <button type="submit" disabled={!address || addressSaving} className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50">{addressSaving ? 'Đang lưu...' : 'Lưu địa chỉ'}</button>
      </form>
    </div>}
  </main>;
}
