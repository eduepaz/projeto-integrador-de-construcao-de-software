import { describe, it, expect } from 'vitest';
import { SeatLockManager, IRedisLockProvider } from '../../domain/seat/seat-lock.js';

class MockRedisProvider implements IRedisLockProvider {
  public data = new Map<string, { val: string; exp: number }>();

  async set(key: string, value: string, mode: 'PX', duration: number, flag: 'NX'): Promise<'OK' | null> {
    const existing = this.data.get(key);
    if (existing && existing.exp > Date.now()) {
      if (flag === 'NX') return null;
    }
    this.data.set(key, { val: value, exp: Date.now() + duration });
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    const existing = this.data.get(key);
    if (!existing) return null;
    if (existing.exp <= Date.now()) {
      this.data.delete(key);
      return null;
    }
    return existing.val;
  }

  async del(key: string): Promise<number> {
    return this.data.delete(key) ? 1 : 0;
  }

  async eval(_script: string, _numkeys: number, ...args: string[]): Promise<unknown> {
    const key = args[0];
    const user = args[1];
    const current = await this.get(key);
    if (current === user) {
      await this.del(key);
      return 1;
    }
    return 0;
  }
}

describe('SeatLockManager - Atomic Locks (Zero Overselling & 10min TTL)', () => {
  it('deve adquirir lock com sucesso para assento disponível', async () => {
    const redis = new MockRedisProvider();
    const lockMgr = new SeatLockManager(redis);

    const seatId = 'seat-vip-10';
    const userId = 'user-alice';

    const acquired = await lockMgr.acquireLock(seatId, userId);
    expect(acquired).toBe(true);

    const isLocked = await lockMgr.isLocked(seatId);
    expect(isLocked).toBe(true);

    const holder = await lockMgr.getLockHolder(seatId);
    expect(holder).toBe(userId);
  });

  it('deve impedir aquisição concorrente do mesmo assento por outro usuário (Zero Overselling)', async () => {
    const redis = new MockRedisProvider();
    const lockMgr = new SeatLockManager(redis);

    const seatId = 'seat-vip-10';

    // Alice adquire primeiro
    const aliceAcquired = await lockMgr.acquireLock(seatId, 'user-alice');
    expect(aliceAcquired).toBe(true);

    // Bob tenta adquirir o mesmo assento antes do lock expirar
    const bobAcquired = await lockMgr.acquireLock(seatId, 'user-bob');
    expect(bobAcquired).toBe(false);

    // Alice ainda é a proprietária
    expect(await lockMgr.getLockHolder(seatId)).toBe('user-alice');
  });

  it('deve liberar o lock quando requisitado pelo proprietário legítimo', async () => {
    const redis = new MockRedisProvider();
    const lockMgr = new SeatLockManager(redis);

    const seatId = 'seat-leste-01';
    await lockMgr.acquireLock(seatId, 'user-alice');

    // Bob tenta liberar o lock de Alice (deve falhar)
    const bobReleased = await lockMgr.releaseLock(seatId, 'user-bob');
    expect(bobReleased).toBe(false);
    expect(await lockMgr.isLocked(seatId)).toBe(true);

    // Alice libera seu próprio lock (deve ter sucesso)
    const aliceReleased = await lockMgr.releaseLock(seatId, 'user-alice');
    expect(aliceReleased).toBe(true);
    expect(await lockMgr.isLocked(seatId)).toBe(false);
  });
});
