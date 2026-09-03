export interface PaymentEvent {
  id: string;
  paymentOrderId: string;
  externalEventId: string;
  result: 'SUCCESSFUL' | 'FAILED';
  receivedAt: Date;
}