import { Request, Response, NextFunction } from 'express';

interface IdempotencyEntry {
  status: 'PENDING' | 'COMPLETED';
  statusCode?: number;
  body?: any;
  createdAt: number;
}

const memoryStore = new Map<string, IdempotencyEntry>();

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Apenas mutações necessitam de idempotência
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    // Se o endpoint requer estritamente Idempotency-Key
    if (req.path.includes('/checkout')) {
      res.status(400).json({
        error: "Cabeçalho obrigatório 'Idempotency-Key' não fornecido conforme RFC 7231.",
      });
      return;
    }
    return next();
  }

  const entry = memoryStore.get(idempotencyKey);

  if (entry) {
    if (entry.status === 'PENDING') {
      res.status(409).json({
        error: 'Requisição concorrente em processamento para a mesma Idempotency-Key. Aguarde.',
      });
      return;
    }

    if (entry.status === 'COMPLETED') {
      res.setHeader('X-Cache-Lookup', 'HIT-IDEMPOTENCY');
      res.status(entry.statusCode || 200).json(entry.body);
      return;
    }
  }

  // Registra como em andamento
  memoryStore.set(idempotencyKey, { status: 'PENDING', createdAt: Date.now() });

  // Intercepta a resposta para gravar o resultado final
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    memoryStore.set(idempotencyKey, {
      status: 'COMPLETED',
      statusCode: res.statusCode,
      body,
      createdAt: Date.now(),
    });
    return originalJson(body);
  };

  next();
}
