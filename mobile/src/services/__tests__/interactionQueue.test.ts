import {
  countQueuedInteractions,
  enqueueInteraction,
  flushInteractionQueue,
} from '../offline/interactionQueue';

jest.mock('@react-native-async-storage/async-storage', () => {
  const memory = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => memory.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        memory.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        memory.delete(key);
      }),
    },
  };
});

const drain = () =>
  flushInteractionQueue(async () => ({ ok: true, status: 201 }));

afterEach(async () => {
  await drain();
});

describe('hàng đợi tương tác offline', () => {
  it('không lưu trùng cùng một eventId', async () => {
    await Promise.all([
      enqueueInteraction({ eventId: 'a' }),
      enqueueInteraction({ eventId: 'a' }),
      enqueueInteraction({ eventId: 'b' }),
    ]);

    expect(await countQueuedInteractions()).toBe(2);
  });

  it('dừng lại và giữ sự kiện khi vẫn mất mạng', async () => {
    await enqueueInteraction({ eventId: 'a' });
    await enqueueInteraction({ eventId: 'b' });
    const send = jest.fn(async () => ({ ok: false, status: 0 }));

    expect(await flushInteractionQueue(send)).toBe(0);
    expect(send).toHaveBeenCalledTimes(1);
    expect(await countQueuedInteractions()).toBe(2);
  });

  it('gửi theo thứ tự và bỏ sự kiện bị máy chủ từ chối hẳn', async () => {
    await enqueueInteraction({ eventId: 'a' });
    await enqueueInteraction({ eventId: 'b' });
    const order: string[] = [];

    const sent = await flushInteractionQueue(async (event) => {
      order.push(event.eventId);
      return event.eventId === 'a'
        ? { ok: false, status: 404 }
        : { ok: true, status: 201 };
    });

    expect(order).toEqual(['a', 'b']);
    expect(sent).toBe(1);
    expect(await countQueuedInteractions()).toBe(0);
  });

  it('không mất sự kiện được thêm trong lúc đang gửi', async () => {
    await enqueueInteraction({ eventId: 'a' });

    await flushInteractionQueue(async () => {
      await enqueueInteraction({ eventId: 'late' });
      return { ok: true, status: 201 };
    });

    expect(await countQueuedInteractions()).toBe(1);
  });
});
