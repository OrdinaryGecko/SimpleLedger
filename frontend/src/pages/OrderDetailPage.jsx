import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ordersApi, paymentsApi, auditLogsApi } from '../lib/api';
import { money, shortDate, dateTime } from '../lib/utils';
import { Button, Field, Notice, Panel, StatusTag } from '../components/ui-kit';
import { DatePicker } from '../components/DatePicker';

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState('payment');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [paymentError, setPaymentError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOrder();
    fetchAuditLogs();
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

  const fetchAuditLogs = async () => {
    try {
      const { data } = await auditLogsApi.list(id);
      setAuditLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs');
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

  const submitPayment = async () => {
    const value = parseFloat(amount);
    if (!value || value < 0.01) {
      setPaymentError('Amount must be at least 0.01');
      return;
    }

    setSubmitting(true);
    setPaymentError(null);

    try {
      await paymentsApi.create(id, {
        amount: value,
        kind,
        paid_date: date,
        note: note.trim() || null,
        idempotency_key: crypto.randomUUID(),
      });
      setAmount('');
      setNote('');
      await Promise.all([fetchOrder(), fetchAuditLogs()]);
    } catch (err) {
      setPaymentError(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const maxAmount = kind === 'refund'
    ? Math.max((order?.amount_paid || 0) - (order?.total_refunded || 0), 0)
    : Math.max(order?.amount_due || 0, 0);

  const isDisabled = maxAmount === 0 || (kind === 'refund' && order?.status !== 'paid');

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
          <StatusTag status={order.status} />
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
                      {i.unit_price_formatted}
                    </td>
                    <td className="px-5 py-4 text-right font-mono tabular-nums">
                      {i.line_total_formatted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="border-t border-border">
              {[
                ['Total', order.total_formatted],
                ['Paid', order.amount_paid_formatted],
                order.total_refunded > 0 ? ['Refunded', order.total_refunded_formatted] : null,
                ['Balance due', order.amount_due_formatted],
              ].filter(Boolean).map(([k, v], idx, arr) => (
                <div
                  key={k}
                  className="flex items-center justify-between px-5 py-3 text-sm last:border-t last:border-border"
                >
                  <dt
                    className={
                      idx === arr.length - 1
                        ? 'text-[10px] uppercase tracking-[0.2em]'
                        : 'text-muted-foreground'
                    }
                  >
                    {k}
                  </dt>
                  <dd className={`font-mono tabular-nums ${idx === arr.length - 1 ? 'text-lg' : ''}`}>{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Payments">
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
                      Payment
                      {p.note ? ` · ${p.note}` : ''}
                    </span>
                    <span className="font-mono tabular-nums">
                      {p.amount_formatted}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {order.refunds.length > 0 && (
            <Panel title="Refunds">
              <ul className="divide-y divide-border">
                {order.refunds.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                    <span className="font-mono text-muted-foreground">{shortDate(r.paid_on)}</span>
                    <span className="flex-1 truncate text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Refund
                      {r.note ? ` · ${r.note}` : ''}
                    </span>
                    <span className="font-mono tabular-nums text-destructive">
                      -{r.amount_formatted}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Audit log">
            {auditLogs.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {auditLogs.map((a) => (
                  <li key={a.id} className="flex items-baseline justify-between gap-4 px-5 py-3 text-xs">
                    <span className="uppercase tracking-[0.16em] text-muted-foreground">
                      {a.event.replace(/_/g, ' ')}
                      {a.from_status && a.to_status ? ` · ${a.from_status} → ${a.to_status}` : ''}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {dateTime(a.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-8">
          <Panel title={kind === 'refund' ? 'Issue refund' : 'Record payment'} className="h-fit">
            <div className="space-y-5 p-5">
              <div className="flex gap-2">
                {['payment', 'refund'].map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      setKind(k);
                      setPaymentError(null);
                    }}
                    className={`flex-1 border px-3 py-2 text-[10px] uppercase tracking-[0.16em] ${
                      kind === k
                        ? 'border-foreground text-foreground'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <Field
                label="Amount"
                type="number"
                min={0}
                step="any"
                placeholder="0.00"
                value={amount}
                disabled={isDisabled}
                onChange={(e) => setAmount(e.target.value)}
              />
              <DatePicker
                label="Date"
                value={date}
                onChange={setDate}
                disabled={isDisabled}
              />
              <Field
                label="Note"
                placeholder="Payment reference, reason..."
                maxLength={500}
                value={note}
                disabled={isDisabled}
                onChange={(e) => setNote(e.target.value)}
              />
              {paymentError ? <Notice>{paymentError}</Notice> : null}
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={isDisabled || submitting}
                  onClick={submitPayment}
                >
                  {submitting ? 'Saving...' : 'Record'}
                </Button>
                <Button
                  variant="outline"
                  disabled={isDisabled}
                  onClick={() => setAmount(String(maxAmount))}
                >
                  Max
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {kind === 'refund'
                  ? order.status !== 'paid'
                    ? 'Refunds are only allowed for fully paid orders.'
                    : `Up to ${money(maxAmount, order.currency_symbol)} can be refunded.`
                  : order.amount_due === 0
                    ? 'This order is fully settled.'
                    : `${order.amount_due_formatted} remaining.`}
              </p>
            </div>
          </Panel>

          <Panel title="Manage order" className="h-fit">
              <div className="space-y-3 p-5">
                {order.locked ? (
                  <div className="group relative">
                    <Button variant="outline" className="w-full" disabled>
                      Edit order
                    </Button>
                    <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap border border-border bg-background px-3 py-2 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      Orders with recorded payments cannot be edited or deleted.
                    </span>
                  </div>
                ) : (
                  <Link to={`/orders/${id}/edit`} className="block">
                    <Button variant="outline" className="w-full">
                      Edit order
                    </Button>
                  </Link>
                )}
                {order.locked ? (
                  <div className="group relative">
                    <Button variant="outline" className="w-full" disabled>
                      Delete order
                    </Button>
                    <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap border border-border bg-background px-3 py-2 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      Orders with recorded payments cannot be edited or deleted.
                    </span>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" onClick={handleDelete}>
                    Delete order
                  </Button>
                )}
              </div>
            </Panel>
        </div>
      </div>
    </div>
  );
}
