import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import HomeScreen from '../home';
import { heritageApi, type Artifact, type HeritageSite } from '../../services/heritageApi';

const mockPush = jest.fn();
const mockReplace = jest.fn();

const mockGetHeritageSites = heritageApi.getHeritageSites as jest.Mock;
const mockGetArtifacts = heritageApi.getArtifacts as jest.Mock;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock('../../services/heritageApi', () => ({
  heritageApi: {
    getHeritageSites: jest.fn(),
    getArtifacts: jest.fn(),
  },
}));

jest.mock('../../services/authStorage', () => ({
  authStorage: {
    getToken: jest.fn().mockResolvedValue(null),
    clearToken: jest.fn(),
  },
}));

const site: HeritageSite = {
  id: 2,
  name: 'Bảo tàng Lịch sử Quốc gia',
  tagline: 'Nơi lưu giữ lịch sử',
  location: 'Hà Nội',
  openHours: '08:00 - 17:00',
  ticketPrice: null,
  description: 'Bảo tàng lịch sử',
  heroImageUrl: null,
};

const artifact: Artifact = {
  id: 101,
  siteId: 2,
  name: 'Trống Đồng Đông Sơn',
  era: 'Văn hóa Đông Sơn',
  category: 'Hiện vật đồng',
  description: 'Biểu tượng văn hóa Đông Sơn',
  locationInMuseum: 'Tầng 2',
  imageUrl: null,
};

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHeritageSites.mockResolvedValue({
      data: [site],
      error: null,
      status: 200,
      ok: true,
    });
    mockGetArtifacts.mockResolvedValue({
      data: [artifact],
      error: null,
      status: 200,
      ok: true,
    });
  });

  it('hiển thị di sản và artifact từ API thật', async () => {
    render(<HomeScreen />);

    expect(screen.getByTestId('loading-container')).toBeTruthy();

    const siteNames = await screen.findAllByText('Bảo tàng Lịch sử Quốc gia');
    expect(siteNames.length).toBeGreaterThan(0);
    expect(screen.getByText('Trống Đồng Đông Sơn')).toBeTruthy();
    expect(mockGetHeritageSites).toHaveBeenCalledTimes(1);
    expect(mockGetArtifacts).toHaveBeenCalledTimes(1);
  });

  it('điều hướng sang artifact list với siteId động khi chọn địa điểm', async () => {
    render(<HomeScreen />);

    const siteNames = await screen.findAllByText('Bảo tàng Lịch sử Quốc gia');
    fireEvent.press(siteNames[siteNames.length - 1]);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/artifact_list',
      params: { siteId: '2', siteName: 'Bảo tàng Lịch sử Quốc gia' },
    });
  });

  it('điều hướng sang artifact detail bằng ID thật', async () => {
    render(<HomeScreen />);

    await screen.findByText('Trống Đồng Đông Sơn');
    fireEvent.press(screen.getByText('Trống Đồng Đông Sơn'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/artifact_detail',
      params: { id: 101, name: 'Trống Đồng Đông Sơn' },
    });
  });

  it('hiển thị lỗi và retry tải lại nội dung', async () => {
    mockGetHeritageSites
      .mockResolvedValueOnce({
        data: null,
        error: 'Lỗi kết nối mạng. Vui lòng thử lại.',
        status: 0,
        ok: false,
      })
      .mockResolvedValueOnce({
        data: [site],
        error: null,
        status: 200,
        ok: true,
      });

    render(<HomeScreen />);

    await screen.findByText('Lỗi kết nối mạng. Vui lòng thử lại.');
    fireEvent.press(screen.getByText('Thử lại'));

    const siteNames = await screen.findAllByText('Bảo tàng Lịch sử Quốc gia');
    expect(siteNames.length).toBeGreaterThan(0);
    await waitFor(() => expect(mockGetHeritageSites).toHaveBeenCalledTimes(2));
  });
});
