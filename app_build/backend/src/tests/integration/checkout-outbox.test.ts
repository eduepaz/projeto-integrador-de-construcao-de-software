import { describe, it, expect } from 'vitest';
import { db } from '../../infrastructure/database/db-client.js';
import { eventBroker } from '../../infrastructure/messaging/kafka-client.js';
import { CheckoutUseCase } from '../../application/use-cases/checkout-use-case.js';
import { OutboxPublisherWorker } from '../../infrastructure/messaging/outbox-publisher.js';
import { PaymentWebhookUseCase } from '../../application/use-cases/payment-webhook-use-case.js';
import { TicketIssuanceUseCase } from '../../application/use-cases/ticket-issuance-use-case.js';
import { CheckinValidationUseCase } from '../../application/use-cases/checkin-validation-use-case.js';

describe('Integração Ponta a Ponta: Checkout, Transactional Outbox, Liquidação e Portaria', () => {
  it('deve orquestrar o ciclo completo de compra, outbox, liquidação e check-in com sucesso', async () => {
    const checkoutUseCase = new CheckoutUseCase(db);
    const ticketIssuer = new TicketIssuanceUseCase(db);
    const paymentWebhookUseCase = new PaymentWebhookUseCase(db, ticketIssuer);
    const outboxWorker = new OutboxPublisherWorker(db, eventBroker, 5000);
    const checkinUseCase = new CheckinValidationUseCase(db);

    const userId = '44444444-4444-4444-4444-444444444444';
    const idempotencyKey = `idem-integration-${Date.now()}`;

    // 1. Execução do Checkout (ACID: Pedido + Outbox Event)
    const checkoutResult = await checkoutUseCase.execute({
      userId,
      idempotencyKey,
      items: [
        {
          seatId: 'seat-1',
          preco: 350.0,
          setor: 'Cadeira Inferior Leste',
          linha: 'A',
          numero: 1,
        },
      ],
    });

    expect(checkoutResult.orderId).toBeDefined();
    expect(checkoutResult.status).toBe('RESERVADO');
    expect(checkoutResult.valorTotal).toBe(350.0);

    // 2. Outbox Worker processa eventos pendentes no banco e despacha ao broker
    const processedEventsCount = await outboxWorker.processPendingEvents();
    expect(processedEventsCount).toBeGreaterThanOrEqual(1);

    // 3. Liquidação do Pagamento via Webhook
    const paymentResult = await paymentWebhookUseCase.execute({
      orderId: checkoutResult.orderId,
      gatewayTransactionId: `TX-INTEG-${Date.now()}`,
      metodoPagamento: 'PIX',
      valor: 350.0,
    });

    expect(paymentResult.success).toBe(true);
    expect(paymentResult.status).toBe('PAGO');

    // 4. Verificação da Emissão do Ingresso
    const { rows: tickets } = await db.query(
      'SELECT * FROM ingressos WHERE pedido_id = $1',
      [checkoutResult.orderId]
    );

    expect(tickets.length).toBe(1);
    const ticket = tickets[0];
    expect(ticket.status).toBe('VALIDO');
    expect(ticket.qr_code_signature).toBeDefined();

    // 5. Validação de Check-in na Portaria (< 300ms)
    const checkinResult = await checkinUseCase.execute({
      qrCode: ticket.qr_code_signature,
      operadorId: '33333333-3333-3333-3333-333333333333',
      dispositivoId: 'CATRACA_A_TEST',
    });

    expect(checkinResult.sucesso).toBe(true);
    expect(checkinResult.status).toBe('SUCESSO');
    expect(checkinResult.tempoProcessamentoMs).toBeLessThan(300);

    // 6. Segunda Leitura do Mesmo Ingresso deve ser rejeitada como INGRESSO_JA_UTILIZADO
    const secondScan = await checkinUseCase.execute({
      qrCode: ticket.qr_code_signature,
      operadorId: '33333333-3333-3333-3333-333333333333',
      dispositivoId: 'CATRACA_A_TEST',
    });

    expect(secondScan.sucesso).toBe(false);
    expect(secondScan.status).toBe('INGRESSO_JA_UTILIZADO');
  });
});
