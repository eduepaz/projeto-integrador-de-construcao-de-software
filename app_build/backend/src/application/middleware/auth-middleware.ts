import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env.js';

export interface AuthUser {
  id: string;
  email: string;
  role: 'CLIENT' | 'ORGANIZER' | 'OPERATOR' | 'ADMIN';
  nome: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      correlationId?: string;
    }
  }
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, ENV.JWT_SECRET, { expiresIn: '8h' });
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Para simplificar desenvolvimento local, injeta um usuário default CLIENT se não fornecido
    req.user = {
      id: '44444444-4444-4444-4444-444444444444',
      nome: 'Lucas Oliveira (Cliente Dev)',
      email: 'lucas@cliente.com',
      role: 'CLIENT',
    };
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token de autenticação inválido ou expirado.' });
  }
}

export function requireRole(...allowedRoles: ('CLIENT' | 'ORGANIZER' | 'OPERATOR' | 'ADMIN')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Acesso negado: Requer papel [${allowedRoles.join(', ')}]. Seu papel atual é '${req.user?.role}'.`,
      });
      return;
    }
    next();
  };
}
