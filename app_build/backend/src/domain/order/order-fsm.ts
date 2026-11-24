/**
 * Order State Machine (FSM)
 * Conforme especificado no Pacote 2:
 * Estados: CRIADO -> RESERVADO -> AGUARDANDO_PAGAMENTO -> PAGO
 * Estados terminais: PAGO, EXPIRADO, CANCELADO
 */

export type OrderStatus =
  | 'CRIADO'
  | 'RESERVADO'
  | 'AGUARDANDO_PAGAMENTO'
  | 'PAGO'
  | 'EXPIRADO'
  | 'CANCELADO';

export interface StateTransitionRecord {
  from: OrderStatus;
  to: OrderStatus;
  timestamp: Date;
  reason?: string;
}

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly current: OrderStatus,
    public readonly target: OrderStatus,
    message?: string
  ) {
    super(
      message ||
        `Transição de estado inválida: Não é permitido mover o pedido de '${current}' para '${target}'.`
    );
    this.name = 'InvalidStateTransitionError';
  }
}

export class OrderStateMachine {
  private _status: OrderStatus;
  private readonly _history: StateTransitionRecord[] = [];
  private readonly _expiresAt: Date;

  private static readonly ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    CRIADO: ['RESERVADO', 'CANCELADO'],
    RESERVADO: ['AGUARDANDO_PAGAMENTO', 'PAGO', 'EXPIRADO', 'CANCELADO'],
    AGUARDANDO_PAGAMENTO: ['PAGO', 'EXPIRADO', 'CANCELADO'],
    PAGO: [], // Estado Final (Terminal)
    EXPIRADO: [], // Estado Final (Terminal)
    CANCELADO: [], // Estado Final (Terminal)
  };

  constructor(
    initialStatus: OrderStatus = 'CRIADO',
    expiresAt?: Date
  ) {
    this._status = initialStatus;
    // Padrão: 10 minutos (600 segundos) de expiração estrita
    this._expiresAt = expiresAt || new Date(Date.now() + 600 * 1000);
    this._history.push({
      from: initialStatus,
      to: initialStatus,
      timestamp: new Date(),
      reason: 'Estado inicial',
    });
  }

  public get status(): OrderStatus {
    return this._status;
  }

  public get history(): ReadonlyArray<StateTransitionRecord> {
    return this._history;
  }

  public get expiresAt(): Date {
    return this._expiresAt;
  }

  public isFinal(): boolean {
    return (
      this._status === 'PAGO' ||
      this._status === 'EXPIRADO' ||
      this._status === 'CANCELADO'
    );
  }

  public isExpired(now: Date = new Date()): boolean {
    if (this._status === 'PAGO') return false;
    return now.getTime() > this._expiresAt.getTime();
  }

  public canTransitionTo(target: OrderStatus): boolean {
    const allowed = OrderStateMachine.ALLOWED_TRANSITIONS[this._status];
    return allowed.includes(target);
  }

  public transitionTo(target: OrderStatus, reason?: string, now: Date = new Date()): void {
    if (this.isFinal()) {
      throw new InvalidStateTransitionError(
        this._status,
        target,
        `Não é possível alterar o estado de um pedido finalizado ('${this._status}').`
      );
    }

    // Se estiver expirado e tentar ir para PAGO ou AGUARDANDO_PAGAMENTO, forçar transição para EXPIRADO
    if (this.isExpired(now) && target !== 'EXPIRADO') {
      throw new InvalidStateTransitionError(
        this._status,
        target,
        `O tempo limite de 10 minutos da reserva expirou em ${this._expiresAt.toISOString()}.`
      );
    }

    if (!this.canTransitionTo(target)) {
      throw new InvalidStateTransitionError(this._status, target);
    }

    const from = this._status;
    this._status = target;
    this._history.push({
      from,
      to: target,
      timestamp: now,
      reason,
    });
  }

  public reserve(reason?: string): void {
    this.transitionTo('RESERVADO', reason || 'Assentos alocados temporariamente com lock');
  }

  public awaitPayment(reason?: string): void {
    this.transitionTo('AGUARDANDO_PAGAMENTO', reason || 'Checkout iniciado, aguardando liquidação');
  }

  public markAsPaid(reason?: string): void {
    this.transitionTo('PAGO', reason || 'Pagamento confirmado com sucesso via gateway');
  }

  public expire(reason?: string): void {
    this.transitionTo('EXPIRADO', reason || 'TTL de 10 minutos expirado sem pagamento');
  }

  public cancel(reason?: string): void {
    this.transitionTo('CANCELADO', reason || 'Cancelado pelo usuário ou erro no processamento');
  }
}
