import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAuctions } from '../api/auctions';
import { listCategories } from '../api/categories';
import type { AuctionPage, AuctionStatus, Category } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { ErrorMessage } from '../components/ErrorMessage';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate, formatMoney, STATUS_LABELS } from '../utils/format';

const PAGE_SIZE = 9;
const STATUSES = Object.keys(STATUS_LABELS) as AuctionStatus[];

export function AuctionListPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<AuctionStatus | ''>('OPEN');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AuctionPage | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCategories().then(setCategories).catch(setError);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listAuctions({ categoryId: categoryId || undefined, status: status || undefined, page, pageSize: PAGE_SIZE })
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [categoryId, status, page]);

  const categoryName = (id: string) => categories.find((category) => category.id === id)?.name ?? id;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Auctions</h1>
          <p className="muted">Browse auctions by category and status.</p>
        </div>
        {user && (
          <Link to="/auctions/new" className="button">
            Publish auction
          </Link>
        )}
      </div>

      <div className="filters card">
        <label>
          Category
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as AuctionStatus | '');
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ErrorMessage error={error} />

      {loading && <p className="muted">Loading auctions…</p>}

      {!loading && result && result.items.length === 0 && (
        <div className="card empty">
          <p>No auctions match these filters.</p>
        </div>
      )}

      <div className="auction-grid">
        {result?.items.map((auction) => (
          <Link key={auction.id} to={`/auctions/${auction.id}`} className="auction-card card">
            <div className="auction-card-top">
              <span className="category">{categoryName(auction.categoryId)}</span>
              <StatusBadge status={auction.status} />
            </div>
            <h2>{auction.item.name}</h2>
            <p className="muted clamp">{auction.item.description}</p>
            <div className="price">
              <span className="muted">{auction.currentBid ? 'Current bid' : 'Base price'}</span>
              <strong>{formatMoney(auction.currentBid?.amount ?? auction.basePrice)}</strong>
            </div>
            <div className="auction-card-footer muted">
              <span>{auction.totalBids} bids</span>
              <span>Closes {formatDate(auction.closesAt)}</span>
            </div>
          </Link>
        ))}
      </div>

      {result && result.totalPages > 1 && (
        <div className="pagination">
          <button type="button" className="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="muted">
            Page {result.page} of {result.totalPages}
          </span>
          <button
            type="button"
            className="secondary"
            disabled={page >= result.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}