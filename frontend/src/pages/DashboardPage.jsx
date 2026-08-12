import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi, exportsApi } from '../lib/api';
import { money, shortDate, STATUS_LABEL } from '../lib/utils';
import { Button, Notice, Panel, Stat, StatusTag } from '../components/ui-kit';

const FILTERS = ['all', 'pending', 'partially_paid', 'paid', 'overdue'];

export function DashboardPage() {
  const [filter, setFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await ordersApi.list(params);
      setOrders(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [filter, from, to]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const billed = orders.reduce((s, o) => s + o.total, 0);
  const collected = orders.reduce((s, o) => s + o.amount_paid, 0);
  const due = orders.reduce((s, o) => s + o.amount_due, 0);
  const overdue = orders.filter((o) => o.status === 'overdue').length;

  const handleExport = () => {
    exportsApi.downloadCsv({ from: from || undefined, to: to || undefined, status: filter });
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-medium tracking-tight">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total billed" value={money(billed)} sub={`${orders.length} orders`} />
        <Stat label="Collected" value={money(collected)} />
        <Stat label="Outstanding" value={money(due)} />
        <Stat label="Overdue" value={String(overdue).padStart(2, '0')} sub="orders past due" />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`border px-3 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                filter === f
                  ? 'border-foreground text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'all' ? 'All' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="mb-1 block">From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 border border-border bg-background px-2 font-mono text-xs text-foreground outline-none focus:border-foreground"
            />
          </label>
          <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="mb-1 block">To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 border border-border bg-background px-2 font-mono text-xs text-foreground outline-none focus:border-foreground"
            />
          </label>
          <Button variant="outline" className="h-9" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </div>

      <Panel
        title="Orders"
        action={
          <Link to="/orders/new">
            <Button variant="outline" className="h-8 px-3">
              New order
            </Button>
          </Link>
        }
      >
        {error ? (
          <div className="p-5">
            <Notice>{error}</Notice>
          </div>
        ) : loading ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No orders here yet.
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <th className="px-5 py-3 font-normal">Order</th>
                <th className="px-5 py-3 font-normal">Customer</th>
                <th className="px-5 py-3 font-normal">Due date</th>
                <th className="px-5 py-3 text-right font-normal">Total</th>
                <th className="px-5 py-3 text-right font-normal">Paid</th>
                <th className="px-5 py-3 text-right font-normal">Balance</th>
                <th className="px-5 py-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0 hover:bg-secondary">
                  <td className="px-5 py-4 font-mono">
                    <Link to={`/orders/${o.id}`} className="hover:text-accent">
                      {String(o.id).padStart(4, '0')}
                    </Link>
                  </td>
                  <td className="px-5 py-4">{o.customer}</td>
                  <td className="px-5 py-4 font-mono text-muted-foreground">
                    {shortDate(o.due_date)}
                  </td>
                  <td className="px-5 py-4 text-right font-mono tabular-nums">{money(o.total)}</td>
                  <td className="px-5 py-4 text-right font-mono tabular-nums text-muted-foreground">
                    {money(o.amount_paid)}
                  </td>
                  <td className="px-5 py-4 text-right font-mono tabular-nums">
                    {money(o.amount_due)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusTag status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
