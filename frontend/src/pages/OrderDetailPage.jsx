import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ordersApi } from '../lib/api';
import { money, shortDate } from '../lib/utils';
import { Button, Notice, Panel, StatusTag } from '../components/ui-kit';

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const { data } = await ordersApi.get(id);
      setOrder(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
      await ordersApi.delete(id);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete order');
    }
  };

  if (loading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Loading order...</p>;
  }

  if (error && !order) {
    return (
      <div className="border border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">This order could not be loaded.</p>
        <Link to="/dashboard" className="mt-4 inline-block text-sm underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/dashboard"
          className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          ← Dashboard
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <h1 className="font-mono text-3xl tracking-tight">
            {String(order.id).padStart(4, '0')}
          </h1>
          <StatusTag status={order.derived_status} />
          {order.locked ? (
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Locked - payments recorded
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {order.customer} · created {shortDate(order.created_at.slice(0, 10))} · due{' '}
          {shortDate(order.due_date)}
        </p>
      </div>

      {error ? <Notice>{error}</Notice> : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          <Panel title="Line items">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-5 py-3 font-normal">Description</th>
                  <th className="px-5 py-3 text-right font-normal">Qty</th>
                  <th className="px-5 py-3 text-right font-normal">Unit</th>
                  <th className="px-5 py-3 text-right font-normal">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-4">{i.description}</td>
                    <td className="px-5 py-4 text-right font-mono tabular-nums">{i.quantity}</td>
                    <td className="px-5 py-4 text-right font-mono tabular-nums">
                      {money(i.unit_price)}
                    </td>
                    <td className="px-5 py-4 text-right font-mono tabular-nums">
                      {money(i.quantity * i.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="border-t border-border">
              {[
                ['Total', money(order.total)],
                ['Paid', money(order.amount_paid)],
                ['Balance due', money(order.amount_due)],
              ].map(([k, v], idx) => (
                <div
                  key={k}
                  className="flex items-center justify-between px-5 py-3 text-sm last:border-t last:border-border"
                >
                  <dt
                    className={
                      idx === 2
                        ? 'text-[10px] uppercase tracking-[0.2em]'
                        : 'text-muted-foreground'
                    }
                  >
                    {k}
                  </dt>
                  <dd className={`font-mono tabular-nums ${idx === 2 ? 'text-lg' : ''}`}>{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Payment history">
            {order.payments.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                    <span className="font-mono text-muted-foreground">{shortDate(p.paid_on)}</span>
                    <span className="flex-1 truncate text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {p.kind === 'refund' ? 'Refund' : 'Payment'}
                      {p.note ? ` · ${p.note}` : ''}
                    </span>
                    <span
                      className={`font-mono tabular-nums ${p.kind === 'refund' ? 'text-destructive' : ''}`}
                    >
                      {p.kind === 'refund' ? '−' : ''}
                      {money(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-8">
          {!order.locked ? (
            <Panel title="Manage order" className="h-fit">
              <div className="space-y-3 p-5">
                <Link to={`/orders/${id}/edit`} className="block">
                  <Button variant="outline" className="w-full">
                    Edit order
                  </Button>
                </Link>
                <Button variant="outline" className="w-full" onClick={handleDelete}>
                  Delete order
                </Button>
                <p className="text-xs text-muted-foreground">
                  Orders with recorded payments cannot be deleted or edited.
                </p>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
