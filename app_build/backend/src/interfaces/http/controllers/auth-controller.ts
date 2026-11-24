import { Request, Response } from 'express';
import { generateToken, AuthUser } from '../../../application/middleware/auth-middleware.js';

export class AuthController {
  public async login(req: Request, res: Response): Promise<void> {
    const { email, role } = req.body;

    const user: AuthUser = {
      id: req.body.id || '44444444-4444-4444-4444-444444444444',
      email: email || 'lucas@cliente.com',
      role: role || 'CLIENT',
      nome: req.body.nome || 'Lucas Oliveira',
    };

    const token = generateToken(user);
    res.json({ token, user });
  }

  public async me(req: Request, res: Response): Promise<void> {
    res.json({ user: req.user });
  }
}
