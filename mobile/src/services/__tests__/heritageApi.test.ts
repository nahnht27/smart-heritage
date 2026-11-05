/**
 * Smart Heritage - Test cho Heritage API Service (LTJ-33)
 */
import { apiClient } from '../api';
import {
  heritageApi,
  isUsableMediaUrl,
  normalizeMultimediaType,
  selectArtifactThumbnail,
  type Multimedia,
} from '../heritageApi';

jest.mock('../api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockGet = apiClient.get as jest.Mock;

describe('heritageApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHeritageSites', () => {
    it('trả về danh sách heritage sites', async () => {
      mockGet.mockResolvedValue({
        data: [
          { siteId: 1, name: 'Site A', description: 'desc', address: 'addr' },
          { siteId: 2, name: 'Site B', description: 'desc', address: 'addr2' },
        ],
        error: null,
        status: 200,
        ok: true,
      });

      const result = await heritageApi.getHeritageSites();

      expect(mockGet).toHaveBeenCalledWith('heritage-sites');
      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].id).toBe(1);
      expect(result.data?.[0].name).toBe('Site A');
      expect(result.data?.[0].address).toBe('addr');
    });

    it('trả về null khi API lỗi', async () => {
      mockGet.mockResolvedValue({
        data: null,
        error: 'Network error',
        status: 500,
        ok: false,
      });

      const result = await heritageApi.getHeritageSites();

      expect(result.ok).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Network error');
    });
  });

  describe('getArtifactsBySite', () => {
    it('trả về danh sách artifacts theo siteId', async () => {
      mockGet.mockResolvedValue({
        data: [
          { artifactId: 1, siteId: 1, siteName: 'Site A', name: 'Artifact A', description: 'desc' },
        ],
        error: null,
        status: 200,
        ok: true,
      });

      const result = await heritageApi.getArtifactsBySite(1);

      expect(mockGet).toHaveBeenCalledWith('artifacts?siteId=1');
      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].id).toBe(1);
      expect(result.data?.[0].name).toBe('Artifact A');
    });

    it('trả về null khi site không có artifact', async () => {
      mockGet.mockResolvedValue({
        data: [],
        error: null,
        status: 200,
        ok: true,
      });

      const result = await heritageApi.getArtifactsBySite(999);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getArtifactById', () => {
    it('trả về artifact theo id', async () => {
      mockGet.mockResolvedValue({
        data: {
          artifactId: 1,
          siteId: 1,
          siteName: 'Site A',
          name: 'Artifact A',
          description: 'desc',
        },
        error: null,
        status: 200,
        ok: true,
      });

      const result = await heritageApi.getArtifactById(1);

      expect(mockGet).toHaveBeenCalledWith('artifacts/1');
      expect(result.ok).toBe(true);
      expect(result.data?.id).toBe(1);
      expect(result.data?.name).toBe('Artifact A');
    });

    it('trả về null khi artifact không tồn tại', async () => {
      mockGet.mockResolvedValue({
        data: null,
        error: 'Not found',
        status: 404,
        ok: false,
      });

      const result = await heritageApi.getArtifactById(999);

      expect(result.ok).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Not found');
    });
  });

  describe('getArtifactMultimedia', () => {
    it('trả về danh sách multimedia theo artifactId', async () => {
      mockGet.mockResolvedValue({
        data: [
          {
            multimediaId: 1,
            artifactId: 1,
            artifactName: 'Artifact A',
            type: 'image',
            title: 'Image 1',
            url: 'http://example.com/img.jpg',
          },
        ],
        error: null,
        status: 200,
        ok: true,
      });

      const result = await heritageApi.getArtifactMultimedia(1);

      expect(mockGet).toHaveBeenCalledWith('multimedia?artifactId=1');
      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].id).toBe(1);
      expect(result.data?.[0].type).toBe('IMAGE');
    });

    it('trả về danh sách rỗng khi không có multimedia', async () => {
      mockGet.mockResolvedValue({
        data: [],
        error: null,
        status: 200,
        ok: true,
      });

      const result = await heritageApi.getArtifactMultimedia(1);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getArtifactsWithThumbnailsBySite', () => {
    it('lấy image multimedia đầu tiên làm thumbnail và bỏ qua artifact không có ảnh', async () => {
      mockGet
        .mockResolvedValueOnce({
          data: [
            { artifactId: 1, siteId: 1, siteName: 'Site A', name: 'Artifact A', description: 'desc' },
            { artifactId: 2, siteId: 1, siteName: 'Site A', name: 'Artifact B', description: 'desc' },
          ],
          error: null,
          status: 200,
          ok: true,
        })
        .mockResolvedValueOnce({
          data: [
            {
              multimediaId: 10,
              artifactId: 1,
              artifactName: 'Artifact A',
              type: 'image',
              title: 'Image A',
              url: 'https://example.com/a.jpg',
            },
          ],
          error: null,
          status: 200,
          ok: true,
        })
        .mockResolvedValueOnce({
          data: [
            {
              multimediaId: 11,
              artifactId: 2,
              artifactName: 'Artifact B',
              type: 'AUDIO',
              title: 'Audio B',
              url: 'https://example.com/b.mp3',
            },
          ],
          error: null,
          status: 200,
          ok: true,
        });

      const result = await heritageApi.getArtifactsWithThumbnailsBySite(1);

      expect(result.ok).toBe(true);
      expect(result.data?.[0].imageUrl).toBe('https://example.com/a.jpg');
      expect(result.data?.[1].imageUrl).toBeNull();
    });

    it('chỉ lấy thumbnail cho số artifact được giới hạn', async () => {
      mockGet
        .mockResolvedValueOnce({
          data: [
            { artifactId: 1, siteId: 1, siteName: 'Site A', name: 'Artifact A', description: 'desc' },
            { artifactId: 2, siteId: 1, siteName: 'Site A', name: 'Artifact B', description: 'desc' },
          ],
          error: null,
          status: 200,
          ok: true,
        })
        .mockResolvedValueOnce({
          data: [],
          error: null,
          status: 200,
          ok: true,
        });

      const result = await heritageApi.getArtifactsWithThumbnailsBySite(1, 1);

      expect(result.data).toHaveLength(1);
      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });
});

describe('normalizeMultimediaType', () => {
  it.each([
    ['IMAGE', 'IMAGE'],
    ['image', 'IMAGE'],
    [' Image ', 'IMAGE'],
    ['AUDIO', 'AUDIO'],
    ['video', 'VIDEO'],
    ['', 'UNKNOWN'],
    [null, 'UNKNOWN'],
    [undefined, 'UNKNOWN'],
    ['PANORAMA', 'UNKNOWN'],
  ] as const)('normalizes %s to %s', (input, expected) => {
    expect(normalizeMultimediaType(input)).toBe(expected);
  });
});

describe('selectArtifactThumbnail', () => {
  function media(type: Multimedia['type'], url: string): Multimedia {
    return {
      id: 1,
      artifactId: 1,
      type,
      title: null,
      url,
    };
  }

  it('trả về ảnh IMAGE hợp lệ đầu tiên', () => {
    expect(
      selectArtifactThumbnail([
        media('AUDIO', 'https://example.com/a.mp3'),
        media('IMAGE', 'https://example.com/a.jpg'),
        media('IMAGE', 'https://example.com/b.jpg'),
      ]),
    ).toBe('https://example.com/a.jpg');
  });

  it('trả về null khi danh sách rỗng, không có IMAGE hoặc URL không hợp lệ', () => {
    expect(selectArtifactThumbnail([])).toBeNull();
    expect(selectArtifactThumbnail(null)).toBeNull();
    expect(
      selectArtifactThumbnail([
        media('AUDIO', 'https://example.com/a.mp3'),
        media('VIDEO', 'https://example.com/a.mp4'),
        media('UNKNOWN', 'https://example.com/a.bin'),
      ]),
    ).toBeNull();
    expect(
      selectArtifactThumbnail([media('IMAGE', 'not-a-url')]),
    ).toBeNull();
  });
});

describe('isUsableMediaUrl', () => {
  it.each([
    ['https://example.com/image.jpg', true],
    ['http://example.com/image.jpg', true],
    [' https://example.com/image.jpg ', true],
    ['', false],
    [null, false],
    [undefined, false],
    ['ftp://example.com/image.jpg', false],
    ['/relative/image.jpg', false],
    ['not-a-url', false],
  ] as const)('validates %s', (input, expected) => {
    expect(isUsableMediaUrl(input)).toBe(expected);
  });
});
