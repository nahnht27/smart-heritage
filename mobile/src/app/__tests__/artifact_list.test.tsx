import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ArtifactListScreen from '../artifact_list';
import { heritageApi, type Artifact } from '../../services/heritageApi';

const mockPush = jest.fn();
let mockParams: Record<string, string | undefined> = {};

const mockGetArtifactsBySite = heritageApi.getArtifactsBySite as jest.Mock;
const mockGetArtifacts = heritageApi.getArtifacts as jest.Mock;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('../../services/heritageApi', () => ({
  heritageApi: {
    getArtifactsBySite: jest.fn(),
    getArtifacts: jest.fn(),
  },
}));

const firstArtifact: Artifact = {
  id: 101,
  siteId: 2,
  name: 'Trống Đồng Đông Sơn',
  era: 'Văn hóa Đông Sơn',
  category: 'Hiện vật đồng',
  description: 'Biểu tượng văn hóa Đông Sơn',
  locationInMuseum: 'Tầng 2',
  imageUrl: null,
};

const secondArtifact: Artifact = {
  id: 102,
  siteId: 2,
  name: 'Kiếm Cổ Thời Trần',
  era: 'Thời Trần',
  category: 'Vũ khí',
  description: 'Vũ khí cổ thời nhà Trần',
  locationInMuseum: 'Tầng 3',
  imageUrl: null,
};

describe('ArtifactListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { siteId: '2', siteName: 'Bảo tàng Lịch sử' };
    mockGetArtifactsBySite.mockResolvedValue({
      data: [firstArtifact, secondArtifact],
      error: null,
      status: 200,
      ok: true,
    });
    mockGetArtifacts.mockResolvedValue({
      data: [firstArtifact, secondArtifact],
      error: null,
      status: 200,
      ok: true,
    });
  });

  it('lấy siteId động từ navigation và điều hướng bằng ID thật', async () => {
    render(<ArtifactListScreen />);

    expect(screen.getByTestId('loading-container')).toBeTruthy();

    await screen.findByText('Trống Đồng Đông Sơn');
    expect(mockGetArtifactsBySite).toHaveBeenCalledWith('2');
    expect(mockGetArtifacts).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Trống Đồng Đông Sơn'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/artifact_detail',
      params: { id: 101, name: 'Trống Đồng Đông Sơn' },
    });
  });

  it('tải tất cả artifact khi không có siteId', async () => {
    mockParams = {};

    render(<ArtifactListScreen />);

    await screen.findByText('Trống Đồng Đông Sơn');
    expect(mockGetArtifacts).toHaveBeenCalledTimes(1);
    expect(mockGetArtifactsBySite).not.toHaveBeenCalled();
  });

  it('lọc danh sách theo từ khóa tìm kiếm', async () => {
    render(<ArtifactListScreen />);

    await screen.findByText('Trống Đồng Đông Sơn');

    fireEvent.changeText(
      screen.getByPlaceholderText('Tìm kiếm hiện vật...'),
      'kiếm'
    );

    expect(screen.getByText('Kiếm Cổ Thời Trần')).toBeTruthy();
    expect(screen.queryByText('Trống Đồng Đông Sơn')).toBeNull();
  });

  it('hiển thị empty state khi không có artifact', async () => {
    mockGetArtifactsBySite.mockResolvedValue({
      data: [],
      error: null,
      status: 200,
      ok: true,
    });

    render(<ArtifactListScreen />);

    await screen.findByText('Chưa có hiện vật nào được hiển thị');
  });

  it('hiển thị lỗi và retry tải lại danh sách', async () => {
    mockGetArtifactsBySite
      .mockResolvedValueOnce({
        data: null,
        error: 'Lỗi kết nối mạng. Vui lòng thử lại.',
        status: 0,
        ok: false,
      })
      .mockResolvedValueOnce({
        data: [firstArtifact],
        error: null,
        status: 200,
        ok: true,
      });

    render(<ArtifactListScreen />);

    await screen.findByText('Lỗi kết nối mạng. Vui lòng thử lại.');
    fireEvent.press(screen.getByText('Thử lại'));

    await screen.findByText('Trống Đồng Đông Sơn');
    await waitFor(() => expect(mockGetArtifactsBySite).toHaveBeenCalledTimes(2));
  });
});
