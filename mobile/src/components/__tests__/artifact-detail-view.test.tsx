/**
 * LTJ-76: lifecycle of the VIEW interaction on the artifact detail screen.
 *
 * Renders the real screen and the real interactionApi. Native host components,
 * the router hooks and the HTTP client are mocked, so this is component-level
 * evidence only (no Expo Router navigator, emulator or database).
 */
import React, { StrictMode } from 'react';
import { act, render, screen } from '@testing-library/react-native';
import ArtifactDetailScreen from '../../app/artifact_detail';
import { apiClient } from '../../services/api';
import { heritageApi } from '../../services/heritageApi';

let mockArtifactId = '41';
let mockIsFocused = true;
let mockUuidSequence = 0;

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style },
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockArtifactId }),
  useIsFocused: () => mockIsFocused,
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () =>
    `00000000-0000-4000-8000-${String(++mockUuidSequence).padStart(12, '0')}`,
}));
jest.mock('../remote-image', () => ({ RemoteImage: () => null }));
jest.mock('../multimedia-player', () => ({ MultimediaPlayer: () => null }));
jest.mock('../../services/api', () => ({ apiClient: { post: jest.fn() } }));
jest.mock('../../services/authStorage', () => ({
  authStorage: { getToken: jest.fn(async () => null) },
}));
jest.mock('../../services/visitorStorage', () => ({
  visitorStorage: {
    getVisitorId: jest.fn(async () => '11111111-1111-4111-8111-111111111111'),
  },
}));
jest.mock('../../services/heritageApi', () => ({
  heritageApi: { getArtifactById: jest.fn(), getArtifactMultimedia: jest.fn() },
  isUsableMediaUrl: () => false,
}));

const mockPost = apiClient.post as jest.Mock;
const mockGetArtifact = heritageApi.getArtifactById as jest.Mock;
const mockGetMultimedia = heritageApi.getArtifactMultimedia as jest.Mock;

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
const sentEvents = () => mockPost.mock.calls.map((call) => call[1]);

async function openDetail(element = <ArtifactDetailScreen />) {
  const view = await render(element);
  await settle();
  return view;
}

describe('ArtifactDetailScreen VIEW interaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockArtifactId = '41';
    mockIsFocused = true;
    mockPost.mockResolvedValue({ ok: true, data: null, error: null, status: 201 });
    mockGetArtifact.mockImplementation(async (id: string) => ({
      ok: true,
      data: { id: Number(id), name: `Artifact ${id}`, address: '', description: '' },
    }));
    mockGetMultimedia.mockResolvedValue({ ok: true, data: [] });
  });

  it('records exactly one VIEW for one visit', async () => {
    await openDetail();

    expect(sentEvents()).toEqual([
      expect.objectContaining({ artifactId: 41, interactionType: 'VIEW' }),
    ]);
  });

  it('does not record again on rerender or focus changes', async () => {
    const view = await openDetail();

    await view.rerender(<ArtifactDetailScreen />);
    mockIsFocused = false;
    await view.rerender(<ArtifactDetailScreen />);
    mockIsFocused = true;
    await view.rerender(<ArtifactDetailScreen />);
    await settle();

    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('records once when StrictMode replays effects', async () => {
    await openDetail(
      <StrictMode>
        <ArtifactDetailScreen />
      </StrictMode>,
    );

    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('records one new VIEW with a new eventId on an intentional revisit', async () => {
    const first = await openDetail();
    await act(async () => {
      await first.unmount();
    });
    await openDetail();

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(sentEvents()[1].eventId).not.toBe(sentEvents()[0].eventId);
  });

  it('records one VIEW for each different artifact', async () => {
    const view = await openDetail();
    mockArtifactId = '42';
    await view.rerender(<ArtifactDetailScreen />);
    await settle();

    expect(sentEvents().map((event) => event.artifactId)).toEqual([41, 42]);
  });

  it.each([
    ['an error response', () => mockPost.mockResolvedValue({ ok: false, error: 'x', status: 500 })],
    ['a rejected request', () => mockPost.mockRejectedValue(new Error('offline'))],
    ['a request that never settles', () => mockPost.mockReturnValue(new Promise(() => {}))],
  ])('keeps content visible after %s', async (_label, arrange) => {
    arrange();

    await openDetail();

    expect(screen.getByText('Artifact 41')).toBeTruthy();
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
