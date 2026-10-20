import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

export type AddressVersion = 'legacy' | 'current';
type Place = { code: number; name: string; province_code?: number; district_code?: number };

@Injectable()
export class LocationsService {
  private readonly cache = new Map<string, { expires: number; value: unknown }>();
  private readonly baseUrl = 'https://provinces.open-api.vn/api';

  version(value?: string): AddressVersion {
    if (value === 'legacy' || value === 'current') return value;
    throw new BadRequestException('Phiên bản địa chỉ không hợp lệ.');
  }

  code(value?: string): number {
    if (!value || !/^[1-9]\d{0,5}$/.test(value)) throw new BadRequestException('Mã địa giới không hợp lệ.');
    return Number(value);
  }

  private async request<T>(version: AddressVersion, path: string): Promise<T> {
    const url = `${this.baseUrl}/${version === 'legacy' ? 'v1' : 'v2'}${path}`;
    const cached = this.cache.get(url);
    if (cached && cached.expires > Date.now()) return cached.value as T;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (response.status === 404) throw new NotFoundException('Không tìm thấy địa giới.');
      if (!response.ok) throw new Error(`Provider returned ${response.status}`);
      const value: unknown = await response.json();
      this.cache.set(url, { value, expires: Date.now() + 24 * 60 * 60 * 1000 });
      return value as T;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadGatewayException('Chưa tải được danh sách địa chỉ. Vui lòng thử lại.');
    }
  }

  async provinces(version: AddressVersion) {
    const places = await this.request<Place[]>(version, '/p/');
    return places.map(({ code, name }) => ({ code, name }));
  }

  async districts(provinceCode: number) {
    const province = await this.request<{ districts: Place[] }>('legacy', `/p/${provinceCode}?depth=2`);
    return province.districts.map(({ code, name }) => ({ code, name }));
  }

  async wards(version: AddressVersion, parentCode: number) {
    const path = version === 'legacy' ? `/d/${parentCode}?depth=2` : `/p/${parentCode}?depth=2`;
    const parent = await this.request<{ wards: Place[] }>(version, path);
    return parent.wards.map(({ code, name }) => ({ code, name }));
  }

  async currentFromLegacyWard(wardCode: number) {
    const mappings = await this.request<Array<{ source_code: number; ward: Place }>>('current', `/w/from-legacy/?legacy_code=${wardCode}`);
    return mappings.map(({ ward }) => ({ code: ward.code, name: ward.name, provinceCode: ward.province_code }));
  }
}
