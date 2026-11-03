import crypto from 'crypto';
import { IDatabaseClient } from '../../infrastructure/database/db-client.js';
import { HmacTicketSigner } from '../../domain/ticket/hmac-signer.js';
import { wsGateway } from '../../infrastructure/websocket/ws-server.js';
import { ENV } from '../../config/env.js';

export interface CheckinInput {
  qrCode: string;
  operadorId: string;
  dispositivoId: string;
}

export interface CheckinResult {
  sucesso: boolean;
  mensagem: string;
  status: 'SUCESSO' | 'INGRESSO_JA_UTILIZADO' | 'ASSINATURA_INVALIDA' | 'INGRESSO_CANCELADO';
  ticketId?: string;
  detalhes?: any;
  tempoProcessamentoMs: number;
}

export class CheckinValidationUseCase {
  private signer: HmacTicketSigner;

  constructor(private readonly db: IDatabaseClient) {
    this.signer = new HmacTicketSigner(ENV.HMAC_TICKET_SECRET);
  }

  public async execute(input: CheckinInput): Promise<CheckinResult> {
    const startTime = performance.now();

    // 1. Validação Criptográfica HMAC-SHA256
    const verification = this.signer.verifyQrCode(input.qrCode);
    if (!verification.valid || !verification.payload) {
      const elapsed = Math.round(performance.now() - startTime);
      return {
        sucesso: false,
        status: 'ASSINATURA_INVALIDA',
        mensagem: verification.error || 'QR Code inválido ou assinatura corrompida.',
        tempoProcessamentoMs: elapsed,
      };
    }

    const { ticketId } = verification.payload;

    // 2. Busca o estado atual do ingresso no banco
    const { rows: tickets } = await this.db.query(
      'SELECT id, pedido_id, assento_id, status FROM ingressos WHERE id = $1',
      [ticketId]
    );

    const ticket = tickets[0];
    const logId = crypto.randomUUID();

    if (!ticket) {
      // Se não encontrado por ID, tenta buscar pelo código de resgate
      const elapsed = Math.round(performance.now() - startTime);
      return {
        sucesso: false,
        status: 'ASSINATURA_INVALIDA',
        mensagem: 'Ingresso não cadastrado na base de dados.',
        tempoProcessamentoMs: elapsed,
      };
    }

    if (ticket.status === 'UTILIZADO') {
      const elapsed = Math.round(performance.now() - startTime);
      await this.db.query(
        `INSERT INTO checkin_logs (id, ingresso_id, operador_id, resultado, dispositivo_id, lido_em)
         VALUES ($1, $2, $3, 'INGRESSO_JA_UTILIZADO', $4, NOW())`,
        [logId, ticketId, input.operadorId, input.dispositivoId]
      );

      return {
        sucesso: false,
        status: 'INGRESSO_JA_UTILIZADO',
        mensagem: 'Acesso Negado: Este ingresso já realizou check-in anteriormente.',
        ticketId,
        tempoProcessamentoMs: elapsed,
      };
    }

    if (ticket.status === 'CANCELADO') {
      const elapsed = Math.round(performance.now() - startTime);
      await this.db.query(
        `INSERT INTO checkin_logs (id, ingresso_id, operador_id, resultado, dispositivo_id, lido_em)
         VALUES ($1, $2, $3, 'INGRESSO_CANCELADO', $4, NOW())`,
        [logId, ticketId, input.operadorId, input.dispositivoId]
      );

      return {
        sucesso: false,
        status: 'INGRESSO_CANCELADO',
        mensagem: 'Acesso Negado: Ingresso cancelado ou estornado.',
        ticketId,
        tempoProcessamentoMs: elapsed,
      };
    }

    // 3. Atualiza para UTILIZADO e grava log de auditoria
    await this.db.transaction(async (tx) => {
      await tx.query('UPDATE ingressos SET status = $1 WHERE id = $2', ['UTILIZADO', ticketId]);
      await tx.query(
        `INSERT INTO checkin_logs (id, ingresso_id, operador_id, resultado, dispositivo_id, lido_em)
         VALUES ($1, $2, $3, 'SUCESSO', $4, NOW())`,
        [logId, ticketId, input.operadorId, input.dispositivoId]
      );
    });

    const elapsed = Math.round(performance.now() - startTime);

    wsGateway.broadcast('CHECKIN_SUCCESS', {
      ticketId,
      dispositivoId: input.dispositivoId,
      lidoEm: new Date().toISOString(),
    });

    return {
      sucesso: true,
      status: 'SUCESSO',
      mensagem: 'Acesso Liberado: Catraca liberada com sucesso!',
      ticketId,
      detalhes: {
        assentoId: ticket.assento_id,
        orderId: ticket.pedido_id,
      },
      tempoProcessamentoMs: elapsed,
    };
  }
}
