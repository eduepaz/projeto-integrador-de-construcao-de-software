import { describe, it, expect, vi } from 'vitest';
import { idempotencyMiddleware } from '../../application/middleware/idempotency-middleware.js';
import { Request, Response, NextFunction } from 'express';

describe('IdempotencyMiddleware (RFC 7231)', () => {
  it('deve rejeitar requests de checkout sem Idempotency-Key com HTTP 400', () => {
    const req = {
      method: 'POST',
      path: '/api/v1/orders/checkout',
      headers: {},
    } as unknown as Request;

    let responseStatus = 0;
    let responseBody: any = null;

    const res = {
      status: (code: number) => {
        responseStatus = code;
        return {
          json: (body: any) => {
            responseBody = body;
          },
        };
      },
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    idempotencyMiddleware(req, res, next);

    expect(responseStatus).toBe(400);
    expect(responseBody.error).toContain('Idempotency-Key');
    expect(next).not.toHaveBeenCalled();
  });

  it('deve armazenar resposta completada e reutilizá-la em requisições idênticas subsequentes', () => {
    const key = `test-key-${Date.now()}`;
    const req1 = {
      method: 'POST',
      path: '/api/v1/orders/checkout',
      headers: { 'idempotency-key': key },
    } as unknown as Request;

    let res1Status = 201;
    let res1Headers: Record<string, string> = {};
    let capturedBody: any = null;

    const res1 = {
      statusCode: 201,
      status: (c: number) => {
        res1Status = c;
        return res1;
      },
      setHeader: (k: string, v: string) => {
        res1Headers[k] = v;
      },
      json: (body: any) => {
        capturedBody = body;
        return body;
      },
    } as unknown as Response;

    const next1 = vi.fn();
    idempotencyMiddleware(req1, res1, next1);
    expect(next1).toHaveBeenCalled();

    // Simula conclusão do use case enviando json
    res1.json({ orderId: 'ord-123', status: 'RESERVADO' });

    // Segunda chamada com a mesma chave deve responder imediatamente do cache com HIT-IDEMPOTENCY
    const req2 = {
      method: 'POST',
      path: '/api/v1/orders/checkout',
      headers: { 'idempotency-key': key },
    } as unknown as Request;

    let res2Status = 0;
    let res2Headers: Record<string, string> = {};
    let res2Body: any = null;

    const res2 = {
      status: (c: number) => {
        res2Status = c;
        return {
          json: (b: any) => {
            res2Body = b;
          },
        };
      },
      setHeader: (k: string, v: string) => {
        res2Headers[k] = v;
      },
      json: (b: any) => {
        res2Body = b;
      },
    } as unknown as Response;

    const next2 = vi.fn();
    idempotencyMiddleware(req2, res2, next2);

    expect(next2).not.toHaveBeenCalled();
    expect(res2Headers['X-Cache-Lookup']).toBe('HIT-IDEMPOTENCY');
    expect(res2Status).toBe(201);
    expect(res2Body).toEqual({ orderId: 'ord-123', status: 'RESERVADO' });
  });
});
