import { heritageApi } from '../heritageApi';
import { beaconApi } from '../beacon/beaconApi';
import { apiClient } from '../api';
import { isOfflineManifest, planDownload } from '../offline/plan';
import { setOfflinePack, type OfflineManifest } from '../offline/store';

jest.mock('../api', () => ({
  apiClient: { get: jest.fn() },
  getApiBaseUrl: () => 'http://192.168.1.10:8081/api',
}));

const get = apiClient.get as jest.Mock;
const SHA = 'a'.repeat(64);

const manifest: OfflineManifest = {
  contentVersion: 'v1',
  sites: [{ siteId: 1, name: 'Bảo tàng', description: 'd', address: 'Hà Nội' }],
  artifacts: [
    { artifactId: 1, siteId: 1, siteName: 'Bảo tàng', name: 'Trống', description: 'd' },
    { artifactId: 2, siteId: 9, siteName: 'Khác', name: 'Bia', description: 'd' },
  ],
  multimedia: [
    {
      multimediaId: 10,
      artifactId: 1,
      artifactName: 'Trống',
      type: 'IMAGE',
      title: 't',
      url: 'https://example.com/a.jpg',
      hasFileData: true,
      contentType: 'image/jpeg',
      fileSize: 5,
      sha256: SHA,
    },
    {
      multimediaId: 11,
      artifactId: 1,
      artifactName: 'Trống',
      type: 'AUDIO',
      title: null,
      url: 'https://example.com/a.mp3',
      hasFileData: false,
    },
  ],
  beacons: [
    {
      beaconId: 3,
      name: 'B',
      uuid: 'e2c56db5-dffb-48d2-b060-d0f5a71096e0',
      major: 1,
      minor: 101,
      enabled: true,
      artifactId: 1,
      artifactName: 'Trống',
      siteId: 1,
      siteName: 'Bảo tàng',
    },
  ],
};

const savePack = () =>
  setOfflinePack({
    manifest,
    localFiles: { 10: 'file:///data/offline/media/a.jpg' },
    downloadedAt: '2026-11-28T00:00:00Z',
    totalBytes: 5,
  });

beforeEach(() => {
  get.mockReset();
  setOfflinePack(null);
});

describe('planDownload', () => {
  it('chỉ tải tệp lưu trên máy chủ, đặt tên theo mã băm', () => {
    expect(planDownload(manifest)).toEqual([
      { multimediaId: 10, localName: `${SHA}.jpg`, size: 5 },
    ]);
  });

  it('từ chối mã băm có thể thoát khỏi thư mục tải', () => {
    const unsafe = {
      ...manifest,
      multimedia: [{ ...manifest.multimedia[0], sha256: '../../etc' }],
    };
    expect(planDownload(unsafe)).toEqual([]);
  });

  it('kiểm tra hình dạng manifest', () => {
    expect(isOfflineManifest(manifest)).toBe(true);
    expect(isOfflineManifest({ contentVersion: 'v1' })).toBe(false);
    expect(isOfflineManifest(null)).toBe(false);
  });
});

describe('đọc nội dung khi đã tải gói offline', () => {
  it('không gọi mạng và dùng tệp trên máy', async () => {
    savePack();

    const artifacts = await heritageApi.getArtifactsBySite(1);
    const media = await heritageApi.getArtifactMultimedia(1);
    const detail = await heritageApi.getArtifactById('1');

    expect(artifacts.data?.map((item) => item.id)).toEqual([1]);
    expect(detail.data?.name).toBe('Trống');
    expect(media.data?.map((item) => item.url)).toEqual([
      'file:///data/offline/media/a.jpg',
      'https://example.com/a.mp3',
    ]);
    expect(get).not.toHaveBeenCalled();
  });

  it('vẫn hỏi máy chủ với hiện vật mới hơn gói đã tải', async () => {
    savePack();
    get.mockResolvedValue({ data: null, error: 'offline', status: 0, ok: false });

    await heritageApi.getArtifactById(99);

    expect(get).toHaveBeenCalledWith('artifacts/99');
  });

  it('phát tệp từ máy chủ khi chưa tải về', async () => {
    get.mockResolvedValue({
      data: manifest.multimedia,
      error: null,
      status: 200,
      ok: true,
    });

    const media = await heritageApi.getArtifactMultimedia(1);

    expect(media.data?.[0].url).toBe(
      'http://192.168.1.10:8081/api/multimedia/10/file',
    );
  });

  it('phân giải beacon ngay trên máy', async () => {
    savePack();

    const result = await beaconApi.resolve({
      uuid: 'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0',
      major: 1,
      minor: 101,
    });

    expect(result.data?.artifactId).toBe(1);
    expect(get).not.toHaveBeenCalled();
  });
});
