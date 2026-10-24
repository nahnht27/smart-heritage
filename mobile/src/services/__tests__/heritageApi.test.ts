/**
 * Smart Heritage - Test cho Heritage Content API Service (LTJ-33)
 *
 * Mock dữ liệu trả về theo shape Backend DTO (sau khi apiRequest đã unwrap envelope
 * ApiResponse<T>), không phải shape giao diện mobile.
 */
import { apiClient } from '../api';
import { heritageApi } from '../heritageApi';

jest.mock('../api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockGet = apiClient.get as jest.Mock;

const backendSite = {
  siteId: 1,
  name: 'Bảo tàng Lịch sử Quốc gia',
  description: 'Nơi lưu giữ lịch sử Việt Nam',
  address: 'Số 1 Tràng Tiền, Hà Nội',
} as const;

const backendArtifact = {
  artifactId: 101,
  siteId: 1,
  siteName: 'Bảo tàng Lịch sử Quốc gia',
  name: 'Trống Đồng Đông Sơn',
  description: 'Hiện vật tiêu biểu',
} as const;

const backendMultimedia = {
  multimediaId: 1,
  artifactId: 101,
  artifactName: 'Trống Đồng Đông Sơn',
  type: 'image',
  title: 'Ảnh trống đồng',
  url: 'https://example.com/img1.jpg',
} as const;

describe('heritageApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHeritageSites', () => {
    it('gọi GET heritage-sites và trả về danh sách site đã map', async () => {
      mockGet.mockResolvedValue({
        data: [backendSite],
        error: null,
        status: 200,
        ok: true,
      });

      const result = await heritageApi.getHeritageSites();

      expect(mockGet).toHaveBeenCalledWith('heritage-sites');
      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toMatchObject({
        id: 1,
        name: 'Bảo tàng Lịch sử Quốc gia',
        location: 'Số 1 Tràng Tiền, Hà Nội',
        description: 'Nơi lưu giữ lịch sử Việt Nam',
      });
    });

    it('trả về error khi API thất bại', async () => {
      mockGet.mockResolvedValue({
        data: null,
        error: 'Server error',
        status: 500,
        ok: false,
      });

      const result = await heritageApi.getHeritageSites();

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Server error');
      expect(result.data).toBeNull();
    });
  });

  describe('getHeritageSiteById', () => {
    it('gọi GET heritage-sites/{id} và trả về site đã map', async () => {
      mockGet.mockResolvedValue({
        data: backendSite,
        error: null,
        status: 200,
        ok: true,
      });

      const result = await heritageApi.getHeritageSiteById(1);

      expect(mockGet).toHaveBeenCalledWith('heritage-sites/1');
      expect(result.ok).toBe(true);
      expect(result.data?.id).toBe(1);
      expect(result.data?.name).toBe('Bảo tàng Lịch sử Quốc gia');
    });
  });

  describe('getArtifactsBySite', () => {
    it('gọi GET artifacts?siteId={siteId} và trả về danh sách artifact đã map', async () => {
      mockGet.mockResolvedValue({
        data: [backendArtifact],
        error: null,
        status: 200,
        ok: true,
      });

      const result = await heritageApi.getArtifactsBySite(1);

      expect(mockGet).toHaveBeenCalledWith('artifacts?siteId=1');
      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toMatchObject({
        id: 101,
        name: 'Trống Đồng Đông Sơn',
        description: 'Hiện vật tiêu biểu',
        isFeatured: false,
      });
    });
  });

  describe('getArtifactById', () => {
    it('gọi GET artifacts/{id} và trả về artifact đã map', async () => {
      mockGet.mockResolvedValue({
        data: backendArtifact,
        error: null,
        status: 200,
        ok: true,
      });

      const result = await heritageApi.getArtifactById('101');

      expect(mockGet).toHaveBeenCalledWith('artifacts/101');
      expect(result.ok).toBe(true);
      expect(result.data?.id).toBe(101);
      expect(result.data?.name).toBe('Trống Đồng Đông Sơn');
    });
  });

  describe('getArtifactMultimedia', () => {
    it('gọi GET multimedia?artifactId={id} và trả về multimedia đã map', async () => {
      mockGet.mockResolvedValue({
        data: [backendMultimedia],
        error: null,
        status: 200,
        ok: true,
      });

      const result = await heritageApi.getArtifactMultimedia('101');

      expect(mockGet).toHaveBeenCalledWith('multimedia?artifactId=101');
      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toMatchObject({
        id: 1,
        artifactId: 101,
        type: 'image',
        url: 'https://example.com/img1.jpg',
      });
    });
  });
});
