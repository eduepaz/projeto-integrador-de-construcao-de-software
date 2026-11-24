import { describe, it, expect } from 'vitest';
import {
  OrderStateMachine,
  InvalidStateTransitionError,
  OrderStatus,
} from '../../domain/order/order-fsm.js';

describe('OrderStateMachine (FSM) - Pacote 2 Domain Specification', () => {
  it('deve inicializar com estado CRIADO e TTL de 10 minutos por padrão', () => {
    const fsm = new OrderStateMachine();
    expect(fsm.status).toBe('CRIADO');
    expect(fsm.isFinal()).toBe(false);
    expect(fsm.isExpired()).toBe(false);
    expect(fsm.history.length).toBe(1);
    expect(fsm.history[0].to).toBe('CRIADO');

    const expectedExpiry = Date.now() + 600 * 1000;
    expect(Math.abs(fsm.expiresAt.getTime() - expectedExpiry)).toBeLessThan(2000);
  });

  it('deve seguir o caminho feliz completo: CRIADO -> RESERVADO -> AGUARDANDO_PAGAMENTO -> PAGO', () => {
    const fsm = new OrderStateMachine();

    fsm.reserve('Assento reservado');
    expect(fsm.status).toBe('RESERVADO');

    fsm.awaitPayment('Usuário abriu tela de PIX');
    expect(fsm.status).toBe('AGUARDANDO_PAGAMENTO');

    fsm.markAsPaid('Webhook do gateway aprovou o pagamento');
    expect(fsm.status).toBe('PAGO');
    expect(fsm.isFinal()).toBe(true);

    // Histórico deve conter 4 registros
    expect(fsm.history.length).toBe(4);
    expect(fsm.history.map((h) => h.to)).toEqual([
      'CRIADO',
      'RESERVADO',
      'AGUARDANDO_PAGAMENTO',
      'PAGO',
    ]);
  });

  it('deve permitir cancelamento a partir de CRIADO, RESERVADO e AGUARDANDO_PAGAMENTO', () => {
    const fsm1 = new OrderStateMachine();
    fsm1.cancel('Desistência imediata');
    expect(fsm1.status).toBe('CANCELADO');
    expect(fsm1.isFinal()).toBe(true);

    const fsm2 = new OrderStateMachine();
    fsm2.reserve();
    fsm2.cancel('Desistência após reserva');
    expect(fsm2.status).toBe('CANCELADO');

    const fsm3 = new OrderStateMachine();
    fsm3.reserve();
    fsm3.awaitPayment();
    fsm3.cancel('Cartão não autorizado');
    expect(fsm3.status).toBe('CANCELADO');
  });

  it('deve permitir expiração a partir de RESERVADO ou AGUARDANDO_PAGAMENTO', () => {
    const fsm1 = new OrderStateMachine();
    fsm1.reserve();
    fsm1.expire('Tempo limite de 10 min atingido');
    expect(fsm1.status).toBe('EXPIRADO');
    expect(fsm1.isFinal()).toBe(true);

    const fsm2 = new OrderStateMachine();
    fsm2.reserve();
    fsm2.awaitPayment();
    fsm2.expire('PIX não pago em 10 min');
    expect(fsm2.status).toBe('EXPIRADO');
    expect(fsm2.isFinal()).toBe(true);
  });

  it('deve proibir transições ilegais e disparar InvalidStateTransitionError', () => {
    const fsm = new OrderStateMachine();

    // CRIADO -> PAGO direto é proibido
    expect(() => fsm.markAsPaid()).toThrow(InvalidStateTransitionError);

    // CRIADO -> AGUARDANDO_PAGAMENTO direto é proibido (deve reservar primeiro)
    expect(() => fsm.awaitPayment()).toThrow(InvalidStateTransitionError);

    // PAGO é terminal: nenhuma transição adicional é permitida
    fsm.reserve();
    fsm.awaitPayment();
    fsm.markAsPaid();

    expect(() => fsm.cancel()).toThrow(InvalidStateTransitionError);
    expect(() => fsm.expire()).toThrow(InvalidStateTransitionError);
    expect(() => fsm.reserve()).toThrow(InvalidStateTransitionError);
  });

  it('deve detectar expiração estrita de 10 minutos e bloquear avanço para PAGO', () => {
    const pastDate = new Date(Date.now() - 5000); // Expirado há 5 segundos
    const fsm = new OrderStateMachine('AGUARDANDO_PAGAMENTO', pastDate);

    expect(fsm.isExpired()).toBe(true);

    // Tentativa de marcar como pago após timeout deve falhar
    expect(() => fsm.markAsPaid()).toThrow(InvalidStateTransitionError);
    expect(() => fsm.markAsPaid()).toThrow(/expirou/);

    // Mas transicionar para EXPIRADO é permitido
    expect(() => fsm.expire()).not.toThrow();
    expect(fsm.status).toBe('EXPIRADO');
  });
});
