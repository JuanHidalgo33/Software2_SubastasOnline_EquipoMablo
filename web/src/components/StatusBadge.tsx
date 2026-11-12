import type { AuctionStatus } from '../api/types';
import { STATUS_LABELS } from '../utils/format';

export function StatusBadge({ status }: { status: AuctionStatus }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{STATUS_LABELS[status]}</span>;
}