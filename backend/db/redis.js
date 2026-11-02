/**
 * db/redis.js — Redis client and SSE broadcaster
 *
 * Provides two ioredis clients:
 *   publisher  — writes spot/queue snapshots to the "oorushare:live" channel
 *   subscriber — subscribed to the same channel; distributes messages to all
 *                in-process SSE response objects without re-querying the DB
 *
 * When REDIS_URL is not set the module falls back to a lightweight
 * in-process EventEmitter so the server still works without Redis
 * (single-instance dev / in-memory mode).
 *
 * Exports:
 *   publisher    ioredis.Redis | EventEmitter  — call .publish(channel, msg)
 *   subscriber   ioredis.Redis | EventEmitter  — call .subscribe(channel) then on('message')
 *   SSE_CHANNEL  string  — canonical pub/sub channel name
 *   isRedis      boolean — true when real Redis is in use
 */

'use strict';

const SSE_CHANNEL = 'oorushare:live';

if (!process.env.REDIS_URL) {
  // ── In-process EventEmitter fallback (dev / no-Redis mode) ──────────────
  const { EventEmitter } = require('events');
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0); // unlimited SSE clients

  const fakePub = {
    publish(channel, msg) {
      emitter.emit('message', channel, msg);
      return Promise.resolve();
    },
  };
  const fakeSub = {
    subscribe() { return Promise.resolve(); },
    on(event, cb) { emitter.on(event, cb); },
    off(event, cb) { emitter.off(event, cb); },
  };

  module.exports = { publisher: fakePub, subscriber: fakeSub, SSE_CHANNEL, isRedis: false };
} else {
  // ── Real Redis via ioredis ────────────────────────────────────────────────
  const Redis = require('ioredis');

  const makeClient = () => new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,       // required for blocking commands
    enableReadyCheck: true,
    retryStrategy: times => Math.min(times * 100, 3000),
    lazyConnect: false,
  });

  const publisher  = makeClient();
  const subscriber = makeClient(); // separate connection required for SUBSCRIBE mode

  publisher.on('error',  err => console.error('[redis:pub]', err.message));
  subscriber.on('error', err => console.error('[redis:sub]', err.message));

  subscriber.subscribe(SSE_CHANNEL).then(() =>
    console.log(`[redis] Subscribed to ${SSE_CHANNEL}`)
  );

  module.exports = { publisher, subscriber, SSE_CHANNEL, isRedis: true };
}
