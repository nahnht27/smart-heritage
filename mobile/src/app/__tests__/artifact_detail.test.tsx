import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ArtifactDetailScreen from '../artifact_detail';
import { heritageApi, type Artifact, type Multimedia } from '../../services/heritageApi';
import { interactionApi } from '../../services/interactionApi';

const mockGetArtifactById = heritageApi.getArtifactById as jest.Mock;
const mockGetArtifactMultimedia = heritageApi.getArtifactMultimedia as jest.Mock;
const mockSendInteraction = interactionApi.sendInteraction as jest.Mock;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: '101' }),
}));

jest.mock('../../services/heritageApi', () => ({
  heritageApi: {
    getArtifactById: jest.fn(),
    getArtifactMultimedia: jest.fn(),
  },
}));

jest.mock('../../services/interactionApi', () => ({
  interactionApi: {
    sendInteraction: jest.fn(),
  },
}));

jest.mock('../../components/multimedia-player', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    MultimediaPlayer: ({ item }: { item: { type: string; title?: string } }) =>
      React.createElement(Text, null, `media:${item.type}:${item.title ?? ''}`),
  };
});

const artifact: Artifact = {
  id: 101,
  siteId: 1,
  name: 'Trống Đồng Đông Sơn',
  era: 'Văn hóa Đông Sơn',
  category: 'Hiện vật đồng',
  description: 'Biểu tượng văn hóa Đông Sơn',
  locationInMuseum: 'Tầng 2',
  imageUrl: 'https://example.com/artifact.jpg',
};

function media(overrides: Partial<Multimedia>): Multimedia {
  return {
    id: 1,
    artifactId: 101,
    type: 'audio',
    url: 'https://example.com/audio.mp3',
    title: 'Thuyết minh',
    ...overrides,
  };
}

describe('ArtifactDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetArtifactById.mockResolvedValue({
      data: artifact,
      error: null,
      status: 200,
      ok: true,
    });
    mockGetArtifactMultimedia.mockResolvedValue({
      data: [],
      error: null,
      status: 200,
      ok: true,
    });
    mockSendInteraction.mockResolvedValue({ ok: true, error: null, status: 201 });
  });

  it('hiển thị loading rồi nội dung artifact và gửi VIEW đúng một lần', async () => {
    const { rerender } = render(<ArtifactDetailScreen />);

    expect(screen.getByTestId('loading-container')).toBeTruthy();

    await screen.findByText('Trống Đồng Đông Sơn');

    expect(mockSendInteraction).toHaveBeenCalledTimes(1);
    expect(mockSendInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactId: 101,
        interactionType: 'VIEW',
        languageCode: 'vi',
        eventId: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        ),
      })
    );

    rerender(<ArtifactDetailScreen />);
    await waitFor(() => expect(mockSendInteraction).toHaveBeenCalledTimes(1));
  });

  it('không gửi VIEW khi artifact tải thất bại', async () => {
    mockGetArtifactById.mockResolvedValue({
      data: null,
      error: 'Artifact not found',
      status: 404,
      ok: false,
    });

    render(<ArtifactDetailScreen />);

    await screen.findByText('Artifact not found');
    expect(mockSendInteraction).not.toHaveBeenCalled();
    expect(screen.getByText('Thử lại')).toBeTruthy();
  });

  it('hiển thị fallback khi artifact và multimedia không có ảnh hợp lệ', async () => {
    mockGetArtifactById.mockResolvedValue({
      data: { ...artifact, imageUrl: null },
      error: null,
      status: 200,
      ok: true,
    });
    mockGetArtifactMultimedia.mockResolvedValue({
      data: [
        media({ id: 1, type: 'image', url: 'not-a-url', title: 'Ảnh hỏng' }),
      ],
      error: null,
      status: 200,
      ok: true,
    });

    render(<ArtifactDetailScreen />);

    await screen.findByText('Trống Đồng Đông Sơn');
    expect(screen.getByText('🏺')).toBeTruthy();
  });

  it('hiển thị audio/video lấy từ backend', async () => {
    mockGetArtifactMultimedia.mockResolvedValue({
      data: [
        media({ id: 1, type: 'audio', title: 'Thuyết minh' }),
        media({
          id: 2,
          type: 'video',
          url: 'https://example.com/video.mp4',
          title: 'Tư liệu',
        }),
      ],
      error: null,
      status: 200,
      ok: true,
    });

    render(<ArtifactDetailScreen />);

    await screen.findByText('media:audio:Thuyết minh');
    expect(screen.getByText('media:video:Tư liệu')).toBeTruthy();
  });

  it('retry tải lại artifact sau khi lỗi', async () => {
    mockGetArtifactById
      .mockResolvedValueOnce({
        data: null,
        error: 'Lỗi kết nối mạng. Vui lòng thử lại.',
        status: 0,
        ok: false,
      })
      .mockResolvedValueOnce({
        data: artifact,
        error: null,
        status: 200,
        ok: true,
      });

    render(<ArtifactDetailScreen />);

    await screen.findByText('Lỗi kết nối mạng. Vui lòng thử lại.');
    fireEvent.press(screen.getByText('Thử lại'));

    await screen.findByText('Trống Đồng Đông Sơn');
    expect(mockGetArtifactById).toHaveBeenCalledTimes(2);
  });
});
