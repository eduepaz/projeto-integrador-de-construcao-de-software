import { describe, it, expect } from 'vitest';
import { HmacTicketSigner, TicketPayload } from '../../domain/ticket/hmac-signer.js';

describe('HmacTicketSigner - Assinatura Digital & Portaria (< 300ms)', () => {
  const secretKey = 'segredo_hmac_muito_seguro_e_longo_de_producao_2026';
  const signer = new HmacTicketSigner(secretKey);

  const samplePayload: TicketPayload = {
    ticketId: '99887766-5544-3322-1100-aabbccddeeff',
    orderId: '7f9c2d11-4432-4821-9921-001122334455',
    seatId: 'seat-42',
    userId: '11223344-5566-7788-99aa-bbccddeeff00',
    rescueCode: 'A1B2C3D4',
    issuedAt: Date.now(),
  };

  it('deve gerar assinatura e QR code payload consistentes', () => {
    const signature = signer.sign(samplePayload);
    expect(signature).toBeDefined();
    expect(signature.length).toBe(64); // SHA-256 produz 64 caracteres hexadecimais

    const qrPayload = signer.generateQrCodePayload(samplePayload);
    expect(qrPayload).toContain('.');
  });

  it('deve validar QR Code íntegro com latência ultrabaixa (< 50ms)', () => {
    const qrPayload = signer.generateQrCodePayload(samplePayload);

    const start = performance.now();
    const result = signer.verifyQrCode(qrPayload);
    const duration = performance.now() - start;

    expect(result.valid).toBe(true);
    expect(result.payload?.ticketId).toBe(samplePayload.ticketId);
    expect(result.payload?.rescueCode).toBe('A1B2C3D4');
    expect(duration).toBeLessThan(50); // Bem abaixo do requisito de 300ms
  });

  it('deve detectar e rejeitar tentativas de adulteração no payload do QR Code', () => {
    const qrPayload = signer.generateQrCodePayload(samplePayload);
    const [encodedPayload, sig] = qrPayload.split('.');

    // Decodifica, altera o assento de seat-42 para seat-99 (VIP), e recodifica sem a assinatura legítima
    const originalJson = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
    originalJson.seatId = 'seat-99-tampered';
    const tamperedEncoded = Buffer.from(JSON.stringify(originalJson)).toString('base64url');

    const tamperedQr = `${tamperedEncoded}.${sig}`;
    const result = signer.verifyQrCode(tamperedQr);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('adulteração detectada');
  });

  it('deve rejeitar QR Code corrompido ou malformado', () => {
    expect(signer.verifyQrCode('').valid).toBe(false);
    expect(signer.verifyQrCode('payload-sem-ponto').valid).toBe(false);
    expect(signer.verifyQrCode('dGVzdGU=.assinatura-invalida').valid).toBe(false);
  });
});
