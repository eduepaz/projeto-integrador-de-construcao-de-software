import crypto from 'crypto';

export interface TicketPayload {
  ticketId: string;
  orderId: string;
  seatId: string;
  userId: string;
  rescueCode: string;
  issuedAt: number;
}

export interface VerificationResult {
  valid: boolean;
  payload?: TicketPayload;
  error?: string;
}

export class HmacTicketSigner {
  constructor(private readonly secretKey: string) {
    if (!secretKey || secretKey.length < 16) {
      throw new Error('A chave secreta HMAC deve possuir no mínimo 16 caracteres para segurança de produção.');
    }
  }

  /**
   * Assina digitalmente os dados do bilhete utilizando HMAC-SHA256
   */
  public sign(payload: TicketPayload): string {
    const serialized = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(serialized);
    return hmac.digest('hex');
  }

  /**
   * Cria o payload codificado para impressão no QR Code:
   * Formato: <base64url(payload)>.<signature_hex>
   */
  public generateQrCodePayload(payload: TicketPayload): string {
    const serialized = JSON.stringify(payload);
    const encodedPayload = Buffer.from(serialized).toString('base64url');
    const signature = this.sign(payload);
    return `${encodedPayload}.${signature}`;
  }

  /**
   * Valida a integridade do QR Code na portaria com latência ultrabaixa (< 300ms)
   */
  public verifyQrCode(rawQrCode: string): VerificationResult {
    try {
      if (!rawQrCode || !rawQrCode.includes('.')) {
        return { valid: false, error: 'Formato de QR Code inválido' };
      }

      const [encodedPayload, providedSignature] = rawQrCode.split('.');
      if (!encodedPayload || !providedSignature) {
        return { valid: false, error: 'Componentes do QR Code ausentes' };
      }

      const decodedString = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
      const payload: TicketPayload = JSON.parse(decodedString);

      // Recalcula a assinatura esperada
      const expectedSignature = this.sign(payload);

      // Comparação em tempo constante (timing attack protection)
      const sigBuffer = Buffer.from(providedSignature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return { valid: false, error: 'Assinatura digital HMAC inválida (tentativa de adulteração detectada)' };
      }

      return { valid: true, payload };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha desconhecida';
      return { valid: false, error: `Falha ao decodificar QR Code: ${message}` };
    }
  }
}
