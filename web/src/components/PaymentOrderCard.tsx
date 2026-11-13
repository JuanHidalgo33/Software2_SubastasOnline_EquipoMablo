import { useEffect, useState } from 'react';
import { getPaymentOrder } from '../api/auctions';
import type { PaymentOrder, PaymentOrderStatus } from '../api/types';
import { formatDate, formatMoney } from '../utils/format';
import { ErrorMessage } from './ErrorMessage';

const PAYMENT_LABELS: Record<PaymentOrderStatus, string> = {
  PENDING: 'Pending payment',
  CONFIRMED: 'Payment confirmed',
  EXPIRED: 'Payment expired',
};

interface PaymentOrderCardProps {
  auctionId: string;
  refreshKey: number;
}

export function PaymentOrderCard({ auctionId, refreshKey }: PaymentOrderCardProps) {
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    getPaymentOrder(auctionId)
      .then((data) => {
        if (!active) return;
        setOrder(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (active) setError(err);
      });
    return () => {
      active = false;
    };
  }, [auctionId, refreshKey]);

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (!order) {
    return <p className="muted">Loading payment order…</p>;
  }

  return (
    <div className={`payment-order payment-${order.status.toLowerCase()}`}>
      <strong>{PAYMENT_LABELS[order.status]}</strong>
      <dl className="facts">
        <div>
          <dt>Amount</dt>
          <dd>{formatMoney(order.amount)}</dd>
        </div>
        <div>
          <dt>Pay before</dt>
          <dd>{formatDate(order.paymentDueAt)}</dd>
        </div>
      </dl>
      <span className="order-id">Order {order.id}</span>
    </div>
  );
}
