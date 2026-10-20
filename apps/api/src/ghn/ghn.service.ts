import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { LocationsService } from '../locations/locations.service';

type GhnEnvelope<T> = { code: number; message?: string; data: T | null };
type GhnProvince = { ProvinceID: number; ProvinceName: string };
type GhnDistrict = { DistrictID: number; DistrictName: string };
type GhnWard = { WardCode: string; WardName: string };
type GhnServiceOption = { service_id: number; service_type_id: number; short_name: string };
export type GhnLegacyAddress = {
  provinceCode: number;
  districtCode: number;
  wardCode: number;
};
export type GhnShipmentItem = {
  name: string;
  code: string;
  quantity: number;
  price: number;
  weight: number;
  length: number;
  width: number;
  height: number;
};
export type GhnQuoteInput = {
  address: GhnLegacyAddress;
  weight: number;
  length: number;
  width: number;
  height: number;
  insuranceValue: number;
  items: GhnShipmentItem[];
};
export type GhnQuote = { feeVnd: number; serviceTypeId: number; package: Pick<GhnQuoteInput, 'weight' | 'length' | 'width' | 'height'> };

@Injectable()
export class GhnService {
  private readonly baseUrl = 'https://dev-online-gateway.ghn.vn/shiip/public-api';
  private readonly cache = new Map<string, { expiresAt: number; value: unknown }>();

  constructor(private readonly locations: LocationsService) {}

  private credentials() {
    const token = process.env.GHN_TOKEN?.trim();
    const shopId = Number(process.env.GHN_SHOP_ID);
    const fromDistrict = Number(process.env.GHN_FROM_DISTRICT_ID);
    if (!token || !Number.isSafeInteger(shopId) || shopId <= 0 || !Number.isSafeInteger(fromDistrict) || fromDistrict <= 0) {
      throw new ServiceUnavailableException('GHN staging chưa được cấu hình đầy đủ.');
    }
    return { token, shopId, fromDistrict };
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const { token, shopId } = this.credentials();
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { Token: token, ShopId: String(shopId), 'Content-Type': 'application/json', ...init.headers },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new BadGatewayException('Không kết nối được GHN staging. Vui lòng thử lại.');
    }
    let envelope: GhnEnvelope<T>;
    try {
      envelope = await response.json() as GhnEnvelope<T>;
    } catch {
      throw new BadGatewayException('GHN staging trả về dữ liệu không hợp lệ.');
    }
    if (!response.ok || envelope.code !== 200 || envelope.data === null) {
      throw new BadGatewayException(envelope.message || 'GHN staging từ chối yêu cầu.');
    }
    return envelope.data;
  }

  private async cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    const value = await loader();
    this.cache.set(key, { value, expiresAt: Date.now() + 6 * 60 * 60 * 1000 });
    return value;
  }

  private provinces() {
    return this.cached('provinces', () => this.request<GhnProvince[]>('/master-data/province'));
  }

  private districts(provinceId: number) {
    return this.cached(`districts:${provinceId}`, () => this.request<GhnDistrict[]>(`/master-data/district?province_id=${provinceId}`));
  }

  private wards(districtId: number) {
    return this.cached(`wards:${districtId}`, () => this.request<GhnWard[]>(`/master-data/ward?district_id=${districtId}`));
  }

  private normalizeName(name: string) {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLocaleLowerCase('vi').replace(/[.]/g, ' ').trim()
      .replace(/^(tinh|thanh pho|tp|quan|huyen|thi xa|phuong|xa|thi tran)\s+/u, '').replace(/[^a-z0-9]/g, '');
  }

  private uniqueNameMatch<T>(values: T[], name: string, getName: (value: T) => string, label: string): T {
    const target = this.normalizeName(name);
    const matches = values.filter(value => this.normalizeName(getName(value)) === target);
    if (matches.length !== 1) throw new BadRequestException(`Không ánh xạ được ${label} sang danh mục GHN. Vui lòng chọn lại địa chỉ.`);
    return matches[0];
  }

  async resolveLegacyAddress(address: GhnLegacyAddress) {
    const provinces = await this.locations.provinces('legacy');
    const province = provinces.find(item => item.code === address.provinceCode);
    if (!province) throw new BadRequestException('Tỉnh/thành giao hàng không hợp lệ.');
    const localDistricts = await this.locations.districts(address.provinceCode);
    const district = localDistricts.find(item => item.code === address.districtCode);
    if (!district) throw new BadRequestException('Quận/huyện không thuộc tỉnh/thành đã chọn.');
    const localWards = await this.locations.wards('legacy', address.districtCode);
    const ward = localWards.find(item => item.code === address.wardCode);
    if (!ward) throw new BadRequestException('Phường/xã không thuộc quận/huyện đã chọn.');

    const ghnProvince = this.uniqueNameMatch(await this.provinces(), province.name, item => item.ProvinceName, 'tỉnh/thành');
    const ghnDistrict = this.uniqueNameMatch(await this.districts(ghnProvince.ProvinceID), district.name, item => item.DistrictName, 'quận/huyện');
    const ghnWard = this.uniqueNameMatch(await this.wards(ghnDistrict.DistrictID), ward.name, item => item.WardName, 'phường/xã');
    return { province: ghnProvince, district: ghnDistrict, ward: ghnWard };
  }

  private async serviceTypeId(toDistrictId: number, weight: number) {
    const { shopId, fromDistrict } = this.credentials();
    const services = await this.request<GhnServiceOption[]>('/v2/shipping-order/available-services', {
      method: 'POST', body: JSON.stringify({ shop_id: shopId, from_district: fromDistrict, to_district: toDistrictId }),
    });
    const preferredType = weight >= 20_000 ? 5 : 2;
    if (!services.some(service => service.service_type_id === preferredType)) {
      throw new BadRequestException('GHN hiện không có dịch vụ phù hợp cho tuyến giao hàng này.');
    }
    return preferredType;
  }

  async quote(input: GhnQuoteInput): Promise<GhnQuote> {
    const { district, ward } = await this.resolveLegacyAddress(input.address);
    const serviceTypeId = await this.serviceTypeId(district.DistrictID, input.weight);
    const items = input.items.map(item => ({
      name: item.name.slice(0, 512), code: item.code.slice(0, 50), quantity: item.quantity, price: item.price,
      ...(serviceTypeId === 5 ? { weight: item.weight, length: item.length, width: item.width, height: item.height } : {}),
    }));
    const data = await this.request<{ total: number }>('/v2/shipping-order/fee', {
      method: 'POST',
      body: JSON.stringify({
        to_district_id: district.DistrictID, to_ward_code: ward.WardCode,
        service_type_id: serviceTypeId, weight: input.weight,
        length: input.length, width: input.width, height: input.height,
        insurance_value: Math.min(input.insuranceValue, 5_000_000), cod_value: 0, items,
      }),
    });
    if (!Number.isSafeInteger(data.total) || data.total < 0) throw new BadGatewayException('GHN staging trả phí không hợp lệ.');
    return { feeVnd: data.total, serviceTypeId, package: { weight: input.weight, length: input.length, width: input.width, height: input.height } };
  }

  async createShipment(order: {
    orderNumber: string;
    recipientName: string;
    phone: string;
    addressLine: string;
    provinceName: string;
    districtName: string;
    wardName: string;
    deliveryNote: string | null;
    address: GhnLegacyAddress;
    quote: GhnQuote;
    subtotalVnd: number;
    items: GhnShipmentItem[];
  }) {
    const { province, district, ward } = await this.resolveLegacyAddress(order.address);
    const requiredNote = process.env.GHN_REQUIRED_NOTE?.trim();
    if (!['KHONGCHOXEMHANG', 'CHOXEMHANGKHONGTHU', 'CHOTHUHANG'].includes(requiredNote ?? '')) {
      throw new ServiceUnavailableException('GHN_REQUIRED_NOTE chưa được cấu hình hợp lệ.');
    }
    const data = await this.request<{ order_code: string }>('/v2/shipping-order/create', {
      method: 'POST',
      body: JSON.stringify({
        client_order_code: order.orderNumber,
        payment_type_id: 1,
        required_note: requiredNote,
        to_name: order.recipientName,
        to_phone: order.phone,
        to_address: `${order.addressLine}, ${ward.WardName}, ${district.DistrictName}, ${province.ProvinceName}`.slice(0, 1024),
        to_ward_name: ward.WardName,
        to_district_name: district.DistrictName,
        to_province_name: province.ProvinceName,
        is_new_to_address: false,
        cod_amount: 0,
        order_value: order.subtotalVnd,
        insurance_value: Math.min(order.subtotalVnd, 5_000_000),
        service_type_id: order.quote.serviceTypeId,
        content: order.items.map(item => `${item.name} x${item.quantity}`).join(', ').slice(0, 2000),
        note: order.deliveryNote?.slice(0, 5000) ?? '',
        weight: order.quote.package.weight,
        length: order.quote.package.length,
        width: order.quote.package.width,
        height: order.quote.package.height,
        items: order.items.map(item => ({
          name: item.name.slice(0, 512), code: item.code.slice(0, 50), quantity: item.quantity, price: item.price,
          ...(order.quote.serviceTypeId === 5 ? { weight: item.weight, length: item.length, width: item.width, height: item.height } : {}),
        })),
      }),
    });
    if (!data.order_code) throw new BadGatewayException('GHN staging không trả mã vận đơn.');
    return data.order_code;
  }
}