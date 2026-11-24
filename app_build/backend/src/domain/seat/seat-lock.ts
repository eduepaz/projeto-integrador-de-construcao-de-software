/**
 * Seat Lock Manager - Redlock / Redis Atomic Lock
 * Garante RNF-01: Zero Overselling e RNF-02: TTL de 10 min (600s)
 */

export interface IRedisLockProvider {
  set(key: string, value: string, mode: 'PX', duration: number, flag: 'NX'): Promise<'OK' | null>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  eval(script: string, numkeys: number, ...args: string[]): Promise<unknown>;
}

export class SeatLockManager {
  private static readonly TTL_MS = 600 * 1000; // 10 minutos (600.000 ms)
  private static readonly KEY_PREFIX = 'seat';

  constructor(private readonly redisClient: IRedisLockProvider) {}

  public static getLockKey(seatId: string): string {
    return `${SeatLockManager.KEY_PREFIX}:${seatId}:lock`;
  }

  /**
   * Tenta adquirir um lock atômico exclusivo para o assento.
   * Retorna true se o lock foi adquirido, false se o assento já estiver bloqueado por outro usuário.
   */
  public async acquireLock(seatId: string, userId: string, ttlMs: number = SeatLockManager.TTL_MS): Promise<boolean> {
    const key = SeatLockManager.getLockKey(seatId);
    const result = await this.redisClient.set(key, userId, 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  /**
   * Libera o lock atômico de forma segura usando verificação de propriedade.
   * Apenas o usuário que possui o lock (ou override forçado) pode liberá-lo.
   */
  public async releaseLock(seatId: string, userId: string, force: boolean = false): Promise<boolean> {
    const key = SeatLockManager.getLockKey(seatId);

    if (force) {
      const deleted = await this.redisClient.del(key);
      return deleted > 0;
    }

    // Lua script para release atômico: se o valor for igual ao userId, deleta a chave
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await this.redisClient.eval(luaScript, 1, key, userId);
      return result === 1;
    } catch {
      // Fallback para clientes que não suportam eval
      const currentHolder = await this.redisClient.get(key);
      if (currentHolder === userId) {
        await this.redisClient.del(key);
        return true;
      }
      return false;
    }
  }

  /**
   * Verifica se o assento está atualmente com lock ativo.
   */
  public async isLocked(seatId: string): Promise<boolean> {
    const key = SeatLockManager.getLockKey(seatId);
    const holder = await this.redisClient.get(key);
    return holder !== null;
  }

  /**
   * Obtém o identificador do usuário detentor do lock.
   */
  public async getLockHolder(seatId: string): Promise<string | null> {
    const key = SeatLockManager.getLockKey(seatId);
    return await this.redisClient.get(key);
  }
}
