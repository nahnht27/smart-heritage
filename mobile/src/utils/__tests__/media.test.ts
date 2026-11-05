import { isPlayableUrl, normalizeMediaType } from '../media';
import { createEventId } from '../id';

describe('normalizeMediaType', () => {
  it('chấp nhận image/audio/video ở mọi kiểu chữ', () => {
    expect(normalizeMediaType('image')).toBe('image');
    expect(normalizeMediaType('AUDIO')).toBe('audio');
    expect(normalizeMediaType(' Video ')).toBe('video');
  });

  it('trả về unknown cho type không hỗ trợ', () => {
    expect(normalizeMediaType('document')).toBe('unknown');
    expect(normalizeMediaType(null)).toBe('unknown');
    expect(normalizeMediaType(123)).toBe('unknown');
  });
});

describe('isPlayableUrl', () => {
  it('chấp nhận URL http/https/file/content/data', () => {
    expect(isPlayableUrl('https://example.com/a.mp3')).toBe(true);
    expect(isPlayableUrl('http://example.com/a.mp4')).toBe(true);
    expect(isPlayableUrl('file:///tmp/a.mp3')).toBe(true);
    expect(isPlayableUrl('content://media/a.mp3')).toBe(true);
  });

  it('từ chối URL rỗng, sai scheme hoặc không phải string', () => {
    expect(isPlayableUrl('')).toBe(false);
    expect(isPlayableUrl('   ')).toBe(false);
    expect(isPlayableUrl('not-a-url')).toBe(false);
    expect(isPlayableUrl(null)).toBe(false);
    expect(isPlayableUrl(undefined)).toBe(false);
  });
});

describe('createEventId', () => {
  it('trả về UUID v4 hợp lệ', () => {
    expect(createEventId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('tạo ID khác nhau cho mỗi lần gọi', () => {
    expect(createEventId()).not.toBe(createEventId());
  });
});
