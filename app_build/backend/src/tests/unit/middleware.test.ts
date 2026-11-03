import { describe, it, expect, vi } from 'vitest';
import {
  authMiddleware,
  generateToken,
  requireRole,
  AuthUser,
} from '../../application/middleware/auth-middleware.js';
import { correlationIdMiddleware } from '../../application/middleware/correlation-id-middleware.js';
import { Request, Response, NextFunction } from 'express';

describe('Application Middleware Suite', () => {
  it('correlationIdMiddleware deve injetar correlation ID se ausente', () => {
    const req = { headers: {} } as Request;
    let headerKey = '';
    let headerVal = '';
    const res = {
      setHeader: (k: string, v: string) => {
        headerKey = k;
        headerVal = v;
      },
    } as Response;
    const next = vi.fn();

    correlationIdMiddleware(req, res, next);
    expect(req.correlationId).toBeDefined();
    expect(req.correlationId).toMatch(/^corr-/);
    expect(headerKey).toBe('X-Correlation-ID');
    expect(headerVal).toBe(req.correlationId);
    expect(next).toHaveBeenCalled();
  });

  it('generateToken e authMiddleware devem validar token JWT', () => {
    const user: AuthUser = {
      id: 'user-1',
      nome: 'Teste',
      email: 'teste@pulsepass.com',
      role: 'CLIENT',
    };

    const token = generateToken(user);
    expect(token).toBeDefined();

    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as Request;
    const res = {} as Response;
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(req.user?.id).toBe('user-1');
    expect(req.user?.role).toBe('CLIENT');
    expect(next).toHaveBeenCalled();
  });

  it('authMiddleware deve atribuir cliente default se cabeçalho ausente em modo dev', () => {
    const req = { headers: {} } as Request;
    const res = {} as Response;
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(req.user).toBeDefined();
    expect(req.user?.role).toBe('CLIENT');
    expect(next).toHaveBeenCalled();
  });

  it('requireRole deve permitir papel autorizado e bloquear não autorizado', () => {
    const allowedMw = requireRole('ADMIN', 'OPERATOR');

    const reqAllowed = { user: { role: 'OPERATOR' } } as Request;
    const resAllowed = {} as Response;
    const nextAllowed = vi.fn();
    allowedMw(reqAllowed, resAllowed, nextAllowed);
    expect(nextAllowed).toHaveBeenCalled();

    let deniedStatus = 0;
    const reqDenied = { user: { role: 'CLIENT' } } as Request;
    const resDenied = {
      status: (code: number) => {
        deniedStatus = code;
        return { json: vi.fn() };
      },
    } as unknown as Response;
    const nextDenied = vi.fn();
    allowedMw(reqDenied, resDenied, nextDenied);
    expect(deniedStatus).toBe(403);
    expect(nextDenied).not.toHaveBeenCalled();
  });
});
