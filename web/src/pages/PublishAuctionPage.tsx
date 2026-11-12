import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { publishAuction } from '../api/auctions';
import { listCategories } from '../api/categories';
import type { Category } from '../api/types';
import { ErrorMessage } from '../components/ErrorMessage';

function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function PublishAuctionPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [minIncrement, setMinIncrement] = useState('');
  const [closesAt, setClosesAt] = useState(() => toLocalInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000)));
  const [error, setError] = useState<unknown>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    listCategories()
      .then((data) => {
        setCategories(data);
        if (data.length > 0) setCategoryId(data[0].id);
      })
      .catch(setError);
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      const auction = await publishAuction({
        categoryId,
        item: { name, description, condition },
        basePrice: Number(basePrice),
        minIncrement: Number(minIncrement),
        closesAt: new Date(closesAt).toISOString(),
      });
      navigate(`/auctions/${auction.id}`);
    } catch (err) {
      setError(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card form-card">
      <h1>Publish auction</h1>
      <p className="muted">The auction must last between 1 hour and 30 days.</p>
      <form onSubmit={handleSubmit}>
        <label>
          Item name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />
        </label>
        <div className="form-row">
          <label>
            Category
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Condition
            <input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="New, used…" required />
          </label>
        </div>
        <div className="form-row">
          <label>
            Base price (COP)
            <input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required />
          </label>
          <label>
            Minimum increment (COP)
            <input type="number" value={minIncrement} onChange={(e) => setMinIncrement(e.target.value)} required />
          </label>
        </div>
        <label>
          Closes at
          <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} required />
        </label>
        <ErrorMessage error={error} />
        <button type="submit" disabled={sending}>
          {sending ? 'Publishing…' : 'Publish auction'}
        </button>
      </form>
    </section>
  );
}