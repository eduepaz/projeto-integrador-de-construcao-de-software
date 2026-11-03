import crypto from 'crypto';
import QRCode from 'qrcode';
import { IDatabaseClient } from '../../infrastructure/database/db-client.js';
import { HmacTicketSigner, TicketPayload } from '../../domain/ticket/hmac-signer.js';
import { IdempotentConsumer } from '../../infrastructure/messaging/idempotent-consumer.js';
import { wsGateway } from '../../infrastructure/websocket/ws-server.js';
import { ENV } from '../../config/env.js';

export interface IssuedTicketResult {
  ticketId: string;
  orderId: string;
  rescueCode: string;
  qrCodeSignature: string;
  qrCodeDataUrl: string;
  status: string;
}

export class TicketIssuanceUseCase {
  private signer: HmacTicketSigner;
  private idempotentConsumer: IdempotentConsumer;

  constructor(private readonly db: IDatabaseClient) {
    this.signer = new HmacTicketSigner(ENV.HMAC_TICKET_SECRET);
    this.idempotentConsumer = new IdempotentConsumer(db);
  }

  public async issueTicketForOrder(orderId: string, userId: string): Promise<IssuedTicketResult[]> {
    // Garantir deduplicação: Se este evento já foi processado por este consumidor, não duplicar emissão
    const canProcess = await this.idempotentConsumer.tryProcessEvent(orderId, 'ticketing-group');
    if (!canProcess) {
      // Retorna ingressos já emitidos anteriormente
      const { rows } = await this.db.query('SELECT * FROM ingressos WHERE pedido_id = $1', [orderId]);
      if (rows.length > 0) {
        return rows.map((r: any) => ({
          ticketId: r.id,
          orderId: r.pedido_id,
          rescueCode: r.codigo_resgate,
          qrCodeSignature: r.qr_code_signature,
          qrCodeDataUrl: '',
          status: r.status,
        }));
      }
    }

    const { rows: items } = await this.db.query(
      'SELECT assento_id FROM itens_pedido WHERE pedido_id = $1',
      [orderId]
    );

    const seatIds = items.length > 0 ? items.map((i: any) => i.assento_id) : ['seat-default'];
    const results: IssuedTicketResult[] = [];

    for (const seatId of seatIds) {
      const ticketId = crypto.randomUUID();
      const rescueCode = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 caracteres

      const payload: TicketPayload = {
        ticketId,
        orderId,
        seatId,
        userId,
        rescueCode,
        issuedAt: Date.now(),
      };

      const rawQrCode = this.signer.generateQrCodePayload(payload);
      let qrCodeDataUrl = '';
      try {
        qrCodeDataUrl = await QRCode.toDataURL(rawQrCode, { margin: 1, width: 256 });
      } catch {
        qrCodeDataUrl = rawQrCode;
      }

      await this.db.query(
        `INSERT INTO ingressos (id, pedido_id, assento_id, usuario_id, codigo_resgate, qr_code_signature, pdf_url, status, emitido_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'VALIDO', NOW())`,
        [ticketId, orderId, seatId, userId, rescueCode, rawQrCode, `/tickets/pdf/${ticketId}`]
      );

      const ticketResult = {
        ticketId,
        orderId,
        rescueCode,
        qrCodeSignature: rawQrCode,
        qrCodeDataUrl,
        status: 'VALIDO',
      };

      results.push(ticketResult);

      wsGateway.broadcast('TICKET_ISSUED', {
        ticketId,
        orderId,
        userId,
        rescueCode,
      });
    }

    return results;
  }
}
