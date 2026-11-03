/**
 * Smart Heritage - Test cho Heritage API Service (LTJ-33)
 */
import { apiClient } from '../api';
import { heritageApi } from '../heritageApi';

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
      expect(result.data?.[0].type).toBe('image');
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
});
