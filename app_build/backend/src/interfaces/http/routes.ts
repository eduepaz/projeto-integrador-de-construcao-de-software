import { Router } from 'express';
import { AuthController } from './controllers/auth-controller.js';
import { CatalogController } from './controllers/catalog-controller.js';
import { CheckoutController } from './controllers/checkout-controller.js';
import { TicketController } from './controllers/ticket-controller.js';
import { AnalyticsController } from './controllers/analytics-controller.js';
import { authMiddleware, requireRole } from '../../application/middleware/auth-middleware.js';
import { idempotencyMiddleware } from '../../application/middleware/idempotency-middleware.js';

export function createApiRouter(): Router {
  const router = Router();

  const authCtrl = new AuthController();
  const catalogCtrl = new CatalogController();
  const checkoutCtrl = new CheckoutController();
  const ticketCtrl = new TicketController();
  const analyticsCtrl = new AnalyticsController();

  // Rotas de Autenticação
  router.post('/auth/login', authCtrl.login.bind(authCtrl));
  router.get('/auth/me', authMiddleware, authCtrl.me.bind(authCtrl));

  // Rotas do Catálogo & Concorrência de Assentos
  router.get('/catalog/events', catalogCtrl.getEvents.bind(catalogCtrl));
  router.get('/catalog/sessions/:sessionId/seats', catalogCtrl.getSeats.bind(catalogCtrl));
  router.post('/seats/reserve', authMiddleware, catalogCtrl.reserveSeat.bind(catalogCtrl));
  router.post('/seats/release', authMiddleware, catalogCtrl.releaseSeat.bind(catalogCtrl));

  // Rotas de Checkout & Pedidos (Idempotência RFC 7231 obrigatória no Checkout)
  router.post(
    '/orders/checkout',
    authMiddleware,
    idempotencyMiddleware,
    checkoutCtrl.checkout.bind(checkoutCtrl)
  );
  router.get('/orders/:id', authMiddleware, checkoutCtrl.getOrder.bind(checkoutCtrl));
  router.post('/payments/webhook', checkoutCtrl.paymentWebhook.bind(checkoutCtrl));

  // Rotas de Ingressos & Validação de Portaria (< 300ms)
  router.get('/tickets', authMiddleware, ticketCtrl.getMyTickets.bind(ticketCtrl));
  router.get('/tickets/:id', authMiddleware, ticketCtrl.getTicketById.bind(ticketCtrl));
  router.post(
    '/tickets/checkin',
    authMiddleware,
    requireRole('OPERATOR', 'ADMIN'),
    ticketCtrl.checkin.bind(ticketCtrl)
  );

  // Rotas de Telemetria & Analytics
  router.get('/analytics/funnel', analyticsCtrl.getFunnelMetrics.bind(analyticsCtrl));
  router.post('/analytics/telemetry', analyticsCtrl.recordTelemetry.bind(analyticsCtrl));

  return router;
}
