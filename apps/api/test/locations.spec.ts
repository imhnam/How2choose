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
});
