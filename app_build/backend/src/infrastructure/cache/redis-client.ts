import { Redis } from 'ioredis';
import { ENV } from '../../config/env.js';
import { IRedisLockProvider } from '../../domain/seat/seat-lock.js';

class InMemoryRedisProvider implements IRedisLockProvider {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async set(key: string, value: string, mode: 'PX', duration: number, flag: 'NX'): Promise<'OK' | null> {
    const existing = this.store.get(key);
    const now = Date.now();

    if (existing && (!existing.expiresAt || existing.expiresAt > now)) {
      if (flag === 'NX') {
        return null; // Chave já existe e não expirou
      }
    }

    const expiresAt = mode === 'PX' ? now + duration : undefined;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async del(key: string): Promise<number> {
    const deleted = this.store.delete(key);
    return deleted ? 1 : 0;
  }

  async eval(script: string, numkeys: number, ...args: string[]): Promise<unknown> {
    const key = args[0];
    const expectedVal = args[1];
    const current = await this.get(key);
    if (current === expectedVal) {
      await this.del(key);
      return 1;
    }
    return 0;
  }
}

class ResilientRedisClient implements IRedisLockProvider {
  private client: Redis | null = null;
  private inMemory = new InMemoryRedisProvider();
  private isConnected = false;
  private connectionAttempted = false;

  constructor() {
    this.tryConnect();
  }

  private tryConnect() {
    if (this.connectionAttempted) return;
    this.connectionAttempted = true;

    try {
      this.client = new Redis(ENV.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: () => null, // Não trava o app tentando reconectar indefinidamente
        lazyConnect: true,
      });

      this.client.connect()
        .then(() => {
          this.isConnected = true;
          console.log('✅ [Redis] Conectado ao Redis com sucesso.');
        })
        .catch(() => {
          this.isConnected = false;
          console.warn('⚠️ [Redis] Redis indisponível. Utilizando store em memória para locks atômicos.');
        });
    } catch {
      this.isConnected = false;
    }
  }

  async set(key: string, value: string, mode: 'PX', duration: number, flag: 'NX'): Promise<'OK' | null> {
    if (this.isConnected && this.client) {
      try {
        return (await this.client.set(key, value, mode, duration, flag)) as 'OK' | null;
      } catch {
        return await this.inMemory.set(key, value, mode, duration, flag);
      }
    }
    return await this.inMemory.set(key, value, mode, duration, flag);
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch {
        return await this.inMemory.get(key);
      }
    }
    return await this.inMemory.get(key);
  }

  async del(key: string): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.del(key);
      } catch {
        return await this.inMemory.del(key);
      }
    }
    return await this.inMemory.del(key);
  }

  async eval(script: string, numkeys: number, ...args: string[]): Promise<unknown> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.eval(script, numkeys, ...args);
      } catch {
        return await this.inMemory.eval(script, numkeys, ...args);
      }
    }
    return await this.inMemory.eval(script, numkeys, ...args);
  }
}

export const redisClient: IRedisLockProvider = new ResilientRedisClient();
