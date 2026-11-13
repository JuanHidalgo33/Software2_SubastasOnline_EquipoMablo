import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cancelAuction, getAuction, placeBid } from '../api/auctions';
import type { Auction } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { ErrorMessage } from '../components/ErrorMessage';
import { PaymentOrderCard } from '../components/PaymentOrderCard';
import { StatusBadge } from '../components/StatusBadge';
import { Toasts, type Toast } from '../components/Toasts';
import { formatRemaining, useCountdown } from '../hooks/useCountdown';
import type { ServerMessage } from '../realtime/messages';
import { useAuctionSocket } from '../realtime/useAuctionSocket';
import { formatDate, formatMoney } from '../utils/format';

const NOTIFICATION_TITLES = {
  BID_OUTBID: 'You were outbid',
  AUCTION_WON: 'You won the auction',
  AUCTION_CLOSED: 'Your auction closed',
  PAYMENT_CONFIRMED: 'Payment confirmed',
};

function nextMinimumBid(auction: Auction): number {
  return auction.currentBid ? auction.currentBid.amount + auction.minIncrement : auction.basePrice;
}

export function AuctionDetailPage() {
  const { id = '' } = useParams();
  const { user, token } = useAuth();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [amount, setAmount] = useState('');
  const [bidError, setBidError] = useState<unknown>(null);
  const [bidSuccess, setBidSuccess] = useState('');
  const [sending, setSending] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [paymentRefresh, setPaymentRefresh] = useState(0);

  const reload = useCallback(async () => {
    try {
      const data = await getAuction(id);
      setAuction(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleMessage = useCallback(
    (message: ServerMessage) => {
      if (message.type === 'bid.placed' || message.type === 'auction.closed') {
        void reload();
      }
      if (message.type === 'bid.placed' && message.bidderId !== user?.id) {
        setBidSuccess('');
      }
      if (message.type === 'notification') {
        const { notification } = message;
        if (notification.type === 'PAYMENT_CONFIRMED') {
          setPaymentRefresh((current) => current + 1);
        }
        setToasts((current) => [
          ...current,
          { id: notification.id, title: NOTIFICATION_TITLES[notification.type], message: notification.message },
        ]);
      }
    },
    [reload, user?.id],
  );

  const { connected, viewers } = useAuctionSocket(id, token, handleMessage);
  const remaining = useCountdown(auction?.closesAt ?? new Date().toISOString());
  const isOpen = auction?.status === 'OPEN';

  useEffect(() => {
    if (isOpen && remaining === 0) {
      void reload();
    }
  }, [isOpen, remaining, reload]);

  if (loadError) {
    return <ErrorMessage error={loadError} />;
  }

  if (!auction) {
    return <p className="muted">Loading auction…</p>;
  }

  const isSeller = user?.id === auction.sellerId;
  const isWinner = user?.id === auction.winnerId;
  const minimum = nextMinimumBid(auction);
  const bidderLabel = (userId: string) => (userId === user?.id ? 'You' : `Bidder ${userId.slice(0, 6)}`);

  async function handleBid(event: FormEvent) {
    event.preventDefault();
    setBidError(null);
    setBidSuccess('');
    setSending(true);
    try {
      const bid = await placeBid(id, Number(amount));
      setBidSuccess(`Your bid of ${formatMoney(bid.amount)} is now the highest.`);
      setAmount('');
      await reload();
    } catch (err) {
      setBidError(err);
    } finally {
      setSending(false);
    }
  }

  async function handleCancel() {
    setBidError(null);
    try {
      await cancelAuction(id);
      await reload();
    } catch (err) {
      setBidError(err);
    }
  }

  return (
    <>
      <Toasts toasts={toasts} onDismiss={(toastId) => setToasts((current) => current.filter((t) => t.id !== toastId))} />

      <Link to="/" className="back-link">
        ← Back to auctions
      </Link>

      <div className="detail-layout">
        <section className="card">
          <div className="auction-card-top">
            <StatusBadge status={auction.status} />
            {token && (
              <span className={`live ${connected ? 'on' : ''}`}>
                {connected ? `Live · ${viewers} watching` : 'Connecting…'}
              </span>
            )}
          </div>
          <h1>{auction.item.name}</h1>
          <p className="muted">{auction.item.description}</p>
          <dl className="facts">
            <div>
              <dt>Condition</dt>
              <dd>{auction.item.condition}</dd>
            </div>
            <div>
              <dt>Base price</dt>
              <dd>{formatMoney(auction.basePrice)}</dd>
            </div>
            <div>
              <dt>Minimum increment</dt>
              <dd>{formatMoney(auction.minIncrement)}</dd>
            </div>
            <div>
              <dt>Closes</dt>
              <dd>{formatDate(auction.closesAt)}</dd>
            </div>
          </dl>
        </section>

        <aside className="card bid-panel">
          <span className="muted">{auction.currentBid ? 'Current bid' : 'Starting price'}</span>
          <strong className="current-amount">{formatMoney(auction.currentBid?.amount ?? auction.basePrice)}</strong>
          <span className="muted">{auction.totalBids} bids</span>

          {isOpen && (
            <div className="countdown">
              <span className="muted">Time left</span>
              <strong>{formatRemaining(remaining)}</strong>
            </div>
          )}

          {auction.status === 'AWARDED' && (
            <p className="success">
              {isWinner ? 'You won this auction.' : `Awarded for ${formatMoney(auction.currentBid?.amount ?? 0)}.`}
            </p>
          )}

          {isWinner && (auction.status === 'AWARDED' || auction.status === 'DEFAULTED') && (
            <PaymentOrderCard auctionId={auction.id} refreshKey={paymentRefresh} />
          )}

          {isOpen && !user && (
            <p className="muted">
              <Link to="/login">Log in</Link> to bid and receive live updates.
            </p>
          )}

          {isOpen && user && !isSeller && (
            <form onSubmit={handleBid}>
              <label>
                Your bid (minimum {formatMoney(minimum)})
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(minimum)} required />
              </label>
              <ErrorMessage error={bidError} />
              {bidSuccess && <p className="success">{bidSuccess}</p>}
              <button type="submit" disabled={sending}>
                {sending ? 'Placing bid…' : 'Place bid'}
              </button>
            </form>
          )}

          {isOpen && isSeller && (
            <>
              <p className="muted">You published this auction.</p>
              {auction.totalBids === 0 && (
                <button type="button" className="secondary" onClick={handleCancel}>
                  Cancel auction
                </button>
              )}
              <ErrorMessage error={bidError} />
            </>
          )}
        </aside>
      </div>

      <section className="card">
        <h2>Bid history</h2>
        {auction.bidHistory.length === 0 ? (
          <p className="muted">No bids yet.</p>
        ) : (
          <table className="bids">
            <thead>
              <tr>
                <th>Bidder</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {[...auction.bidHistory].reverse().map((bid) => (
                <tr key={bid.id} className={bid.id === auction.currentBid?.id ? 'leading' : ''}>
                  <td>{bidderLabel(bid.userId)}</td>
                  <td>{formatMoney(bid.amount)}</td>
                  <td>{formatDate(bid.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}