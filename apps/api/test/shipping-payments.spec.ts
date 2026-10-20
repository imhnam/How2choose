import { BadRequestException } from '@nestjs/common';
import { GhnService } from '../src/ghn/ghn.service';
import { LocationsService } from '../src/locations/locations.service';
import { VnpayService } from '../src/orders/vnpay.service';

const ghAddress = { provinceCode: 79, districtCode: 1, wardCode: 11 };

function response(data: unknown) {
  return new Response(JSON.stringify({ code: 200, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('GHN staging adapter', () => {
  const originalFetch = global.fetch;
  const oldEnv = { ...process.env };
  let fetchMock: jest.Mock;
  let locations: Pick<LocationsService, 'provinces' | 'districts' | 'wards'>;

  beforeEach(() => {
    process.env.GHN_TOKEN = 'staging-token';
    process.env.GHN_SHOP_ID = '92837';
    process.env.GHN_FROM_DISTRICT_ID = '1452';
    locations = {
      provinces: jest.fn().mockResolvedValue([{ code: 79, name: 'Thành phố Hồ Chí Minh' }]),
      districts: jest.fn().mockResolvedValue([{ code: 1, name: 'Quận 1' }]),
      wards: jest.fn().mockResolvedValue([{ code: 11, name: 'Phường Bến Nghé' }]),
    };
    fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/master-data/province')) return response([{ ProvinceID: 202, ProvinceName: 'Hồ Chí Minh' }]);
      if (url.includes('/master-data/district?')) return response([{ DistrictID: 3695, DistrictName: 'Quận 1' }]);
      if (url.includes('/master-data/ward?')) return response([{ WardCode: '90795', WardName: 'Phường Bến Nghé' }]);
      if (url.endsWith('/v2/shipping-order/available-services')) return response([{ service_id: 123, service_type_id: 2, short_name: 'Hàng nhẹ' }]);
      if (url.endsWith('/v2/shipping-order/fee')) return response({ total: 20900 });
      throw new Error(`Unexpected GHN URL ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...oldEnv };
  });

  it('maps legacy places to GHN identifiers and quotes the supported route', async () => {
    const service = new GhnService(locations as LocationsService);
    const quote = await service.quote({
      address: ghAddress, weight: 600, length: 25, width: 20, height: 8, insuranceValue: 285000,
      items: [{ name: 'Áo thun size M', code: 'SKU-M', quantity: 2, price: 142500, weight: 300, length: 12, width: 12, height: 12 }],
    });

    expect(quote).toEqual({ feeVnd: 20900, serviceTypeId: 2, package: { weight: 600, length: 25, width: 20, height: 8 } });
    const feeCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/v2/shipping-order/fee'));
    expect(JSON.parse(feeCall?.[1]?.body as string)).toMatchObject({ to_district_id: 3695, to_ward_code: '90795', service_type_id: 2 });
    const servicesCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/v2/shipping-order/available-services'));
    expect(JSON.parse(servicesCall?.[1]?.body as string)).toEqual({ shop_id: 92837, from_district: 1452, to_district: 3695 });
  });

  it('rejects ambiguous master-data names instead of quoting a guessed route', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/master-data/province')) return response([{ ProvinceID: 202, ProvinceName: 'Hồ Chí Minh' }]);
      if (url.includes('/master-data/district?')) return response([{ DistrictID: 3695, DistrictName: 'Quận 1' }]);
      if (url.includes('/master-data/ward?')) return response([
        { WardCode: '90795', WardName: 'Phường Bến Nghé' },
        { WardCode: '90796', WardName: 'Phường Bến Nghé' },
      ]);
      throw new Error(`Unexpected GHN URL ${url}`);
    });
    const service = new GhnService(locations as LocationsService);
    await expect(service.resolveLegacyAddress(ghAddress)).rejects.toThrow(BadRequestException);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('VNPAY sandbox signing', () => {
  const oldEnv = { ...process.env };

  beforeEach(() => {
    process.env.VNPAY_TMN_CODE = 'DEMO1234';
    process.env.VNPAY_HASH_SECRET = 'sandbox-hash-secret';
    process.env.API_PUBLIC_URL = 'https://api.example.test';
    process.env.VNPAY_IPN_URL = 'https://api.example.test/api/payments/vnpay/ipn';
  });

  afterEach(() => { process.env = { ...oldEnv }; });

  it('verifies the signed amount and rejects tampered callback fields', () => {
    const service = new VnpayService();
    const url = new URL(service.createPaymentUrl({
      txnRef: '1771000000123456', amountVnd: 20900, orderNumber: 'HTC20261015ABC123', expiresAt: new Date(Date.now() + 900_000),
    }));
    const callback = Object.fromEntries(url.searchParams.entries());

    expect(callback.vnp_Amount).toBe('2090000');
    expect(service.isValidSignature(callback)).toBe(true);
    expect(service.isValidSignature({ ...callback, vnp_Amount: '100' })).toBe(false);
  });
});