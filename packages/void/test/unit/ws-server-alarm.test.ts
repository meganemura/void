import { expect, it, vi } from 'vite-plus/test';
import { createWebSocketDurableObject } from '../../src/runtime/ws-server.ts';
import { defineRoom } from '../../src/runtime/ws.ts';
import type { StandardSchemaV1 } from '../../src/standard-schema.ts';

const schema: StandardSchemaV1 = {
  '~standard': { version: 1, vendor: 'test', validate: (value) => ({ value }) },
};
const route = { pattern: '/chat', params: [], className: 'ChatWs', bindingName: 'CHAT_WS' };

it('runs onAlarm with env, storage and the room', async () => {
  const send = vi.fn();
  const webSocket = {
    send,
    deserializeAttachment: () => ({ id: 'a', roomId: 'default', params: {}, user: null }),
  } as unknown as WebSocket;
  const storage = {} as DurableObjectStorage;
  const state = { storage, getWebSockets: () => [webSocket] } as unknown as DurableObjectState;
  const info = { isRetry: false, retryCount: 0, scheduledTime: 1 };
  const DurableObject = createWebSocketDurableObject(
    defineRoom({
      messages: { client: schema, server: schema },
      async onAlarm(ctx, received) {
        expect(ctx.env).toEqual({ KEY: 'value' });
        expect(ctx.storage).toBe(storage);
        expect(received).toBe(info);
        await ctx.room.broadcast({ type: 'expired' });
      },
    }),
    route,
  );

  await new DurableObject(state, { KEY: 'value' }).alarm!(info);

  expect(send).toHaveBeenCalledWith('{"type":"expired"}');
});
