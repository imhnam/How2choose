'use client';

import { useEffect, useState } from 'react';
import { api, AddressVersion, DeliveryAddress, Place } from '@/lib/api';

export function AddressSelector({ onChange, initialAddress = null }: { onChange: (address: DeliveryAddress | null) => void; initialAddress?: DeliveryAddress | null }) {
  const [version, setVersion] = useState<AddressVersion>(initialAddress?.version ?? 'current');
  const [provinces, setProvinces] = useState<Place[]>([]);
  const [districts, setDistricts] = useState<Place[]>([]);
  const [wards, setWards] = useState<Place[]>([]);
  const [provinceCode, setProvinceCode] = useState(initialAddress ? String(initialAddress.province.code) : '');
  const [districtCode, setDistrictCode] = useState(initialAddress?.district ? String(initialAddress.district.code) : '');
  const [wardCode, setWardCode] = useState(initialAddress ? String(initialAddress.ward.code) : '');
  const [addressLine, setAddressLine] = useState(initialAddress?.addressLine ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    api<Place[]>(`/locations/provinces?version=${version}`)
      .then(data => { if (active) { setProvinces(data); setError(''); } })
      .catch(error => { if (active) setError((error as Error).message); });
    return () => { active = false; };
  }, [version]);

  useEffect(() => {
    if (!provinceCode) return;
    let active = true;
    const path = version === 'legacy' ? `/locations/districts?provinceCode=${provinceCode}` : `/locations/wards?version=current&parentCode=${provinceCode}`;
    api<Place[]>(path).then(data => { if (active) { if (version === 'legacy') setDistricts(data); else setWards(data); setError(''); } })
      .catch(error => { if (active) setError((error as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [provinceCode, version]);

  useEffect(() => {
    if (version !== 'legacy' || !districtCode) return;
    let active = true;
    api<Place[]>(`/locations/wards?version=legacy&parentCode=${districtCode}`)
      .then(data => { if (active) { setWards(data); setError(''); } })
      .catch(error => { if (active) setError((error as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [districtCode, version]);

  useEffect(() => {
    const province = provinces.find(item => String(item.code) === provinceCode);
    const district = districts.find(item => String(item.code) === districtCode);
    const ward = wards.find(item => String(item.code) === wardCode);
    onChange(province && ward && (version === 'current' || district) && addressLine.trim()
      ? { version, province, district: version === 'legacy' ? district ?? null : null, ward, addressLine: addressLine.trim() }
      : null);
  }, [version, provinces, districts, wards, provinceCode, districtCode, wardCode, addressLine, onChange]);

  function changeVersion(value: AddressVersion) {
    setVersion(value); setProvinces([]); setDistricts([]); setWards([]); setLoading(false);
    setProvinceCode(''); setDistrictCode(''); setWardCode(''); setError('');
  }

  const selectClass = 'form-control mt-2';
  return <div className="space-y-4">
    <fieldset><legend className="text-sm font-semibold">Địa chỉ theo địa giới</legend><div className="mt-3 flex flex-wrap gap-4 text-sm">
      <label className="flex items-center gap-2"><input type="radio" className="accent-[#193f32]" name="address-version" checked={version === 'current'} onChange={() => changeVersion('current')} /> <span>Sau sáp nhập (từ 01/07/2025)</span></label>
      <label className="flex items-center gap-2"><input type="radio" className="accent-[#193f32]" name="address-version" checked={version === 'legacy'} onChange={() => changeVersion('legacy')} /> <span>Trước sáp nhập</span></label>
    </div></fieldset>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Tỉnh/thành phố *<select required className={selectClass} value={provinceCode} onChange={event => { setProvinceCode(event.target.value); setDistrictCode(''); setWardCode(''); setDistricts([]); setWards([]); setLoading(Boolean(event.target.value)); }}><option value="">Chọn tỉnh/thành phố</option>{provinces.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
      {version === 'legacy' && <label className="text-sm font-semibold">Quận/huyện *<select required className={selectClass} value={districtCode} disabled={!provinceCode || loading} onChange={event => { setDistrictCode(event.target.value); setWardCode(''); setWards([]); setLoading(Boolean(event.target.value)); }}><option value="">Chọn quận/huyện</option>{districts.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>}
      <label className="text-sm font-semibold">Phường/xã *<select required className={selectClass} value={wardCode} disabled={!provinceCode || (version === 'legacy' && !districtCode) || loading} onChange={event => setWardCode(event.target.value)}><option value="">Chọn phường/xã</option>{wards.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
    </div>
    <label className="block text-sm font-semibold">Số nhà, tên đường *<input required maxLength={200} value={addressLine} onChange={event => setAddressLine(event.target.value)} placeholder="Ví dụ: 12 Nguyễn Trãi" className={selectClass} /></label>
    {loading && <p role="status" className="text-sm text-stone-500">Đang tải địa chỉ...</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
