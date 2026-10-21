import { BadRequestException } from '@nestjs/common';
import { LocationsService } from '../src/locations/locations.service';

describe('LocationsService', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('loads each address hierarchy without a depth-3 request and caches responses', async () => {
    const fetchMock = jest.fn(async (url: string) => ({
      ok: true, status: 200,
      json: async () => url.includes('/p/1')
        ? { districts: [{ code: 1, name: 'Ba Đình' }], wards: [{ code: 4, name: 'Ba Đình' }] }
        : { wards: [{ code: 1, name: 'Phúc Xá' }] },
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const service = new LocationsService();
    expect(await service.districts(1)).toEqual([{ code: 1, name: 'Ba Đình' }]);
    expect(await service.wards('legacy', 1)).toEqual([{ code: 1, name: 'Phúc Xá' }]);
    expect(await service.wards('current', 1)).toEqual([{ code: 4, name: 'Ba Đình' }]);
    await service.districts(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.every(([url]) => !url.includes('depth=3'))).toBe(true);
  });

  it('rejects unknown versions and malformed codes before calling the provider', () => {
    const service = new LocationsService();
    expect(() => service.version('v3')).toThrow(BadRequestException);
    expect(() => service.code('1/../../')).toThrow(BadRequestException);
    expect(() => service.code('0')).toThrow(BadRequestException);
  });

  it('resolves structured recipient addresses to authoritative place names', async () => {
    const service = new LocationsService();
    jest.spyOn(service, 'provinces').mockResolvedValue([{ code: 79, name: 'TP. Hồ Chí Minh' }]);
    jest.spyOn(service, 'wards').mockResolvedValue([{ code: 76001, name: 'Phường Bến Nghé' }]);
    await expect(service.resolveAddress({
      version: 'current',
      provinceCode: 79,
      wardCode: 76001,
      addressLine: '  12 Nguyễn Huệ  ',
    })).resolves.toEqual({
      addressVersion: 'current',
      addressProvinceCode: 79,
      addressProvinceName: 'TP. Hồ Chí Minh',
      addressDistrictCode: null,
      addressDistrictName: null,
      addressWardCode: 76001,
      addressWardName: 'Phường Bến Nghé',
      addressLine: '12 Nguyễn Huệ',
    });
    await expect(service.resolveAddress({
      version: 'current',
      provinceCode: 1,
      wardCode: 76001,
      addressLine: '12 Nguyễn Huệ',
    })).rejects.toThrow(BadRequestException);
  });
});
