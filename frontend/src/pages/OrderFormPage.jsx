import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ordersApi, configApi } from '../lib/api';
import { money, lineAmount, subtotal } from '../lib/utils';
import { Button, Field, Notice, Panel } from '../components/ui-kit';
import { DatePicker } from '../components/DatePicker';

const blank = () => ({
  key: Math.random().toString(36).slice(2),
  description: '',
  quantity: 1,
  unit_price: 0,
});

export function OrderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [customer, setCustomer] = useState('');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  );
  const [items, setItems] = useState([blank()]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  useEffect(() => {
    if (isEdit && !loaded) {
      loadOrder();
    } else if (!isEdit && !loaded) {
      loadConfig();
    }
  }, [id, loaded]);

  const loadConfig = async () => {
    try {
      const { data } = await configApi.get();
      setCurrencySymbol(data.currency_symbol);
      setLoaded(true);
    } catch (err) {
      setCurrencySymbol('$');
      setLoaded(true);
    }
  };

  const loadOrder = async () => {
    try {
      const { data } = await ordersApi.get(id);
      setCustomer(data.customer);
      setDueDate(data.due_date);
      setCurrencySymbol(data.currency_symbol);
      setItems(
        data.items.map((i) => ({
          key: String(i.id),
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
        }))
      );
      setLoaded(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load order');
    }
  };

  const patch = (key, next) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...next } : i)));

  const total = subtotal(items);
  const valid = customer.trim() !== '' && items.some((i) => i.description.trim() && i.quantity >= 1) && total > 0;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        customer_name: customer.trim(),
        due_date: dueDate,
        line_items_attributes: items
          .filter((i) => i.description.trim())
          .map((i) => ({
            id: i.key.match(/^\d+$/) ? i.key : undefined,
            description: i.description.trim(),
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
      };

      if (isEdit) {
        await ordersApi.update(id, payload);
        navigate(`/orders/${id}`);
      } else {
        const { data } = await ordersApi.create(payload);
        navigate(`/orders/${data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save order');
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={isEdit ? `/orders/${id}` : '/dashboard'}
          className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          {isEdit ? '← Order' : '← Dashboard'}
        </Link>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">
          {isEdit ? 'Edit order' : 'New order'}
        </h1>
      </div>

      <Panel title="Details">
        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
          <Field
            label="Customer"
            placeholder="Acme Corp"
            maxLength={120}
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          />
          <DatePicker
            label="Due date"
            value={dueDate}
            onChange={setDueDate}
          />
        </div>
      </Panel>

      <Panel
        title="Line items"
        action={
          <Button variant="ghost" className="h-8 px-2" onClick={() => setItems((p) => [...p, blank()])}>
            + Add line
          </Button>
        }
      >
        <div className="divide-y divide-border">
          <div className="hidden grid-cols-[1fr_100px_140px_140px_40px] gap-4 px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:grid">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit price</span>
            <span className="text-right">Amount</span>
            <span />
          </div>
          {items.map((item) => (
            <div
              key={item.key}
              className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-[1fr_100px_140px_140px_40px] sm:items-center"
            >
              <Field
                placeholder="Description"
                maxLength={200}
                value={item.description}
                onChange={(e) => patch(item.key, { description: e.target.value })}
              />
              <Field
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) =>
                  patch(item.key, { quantity: Math.max(1, Number(e.target.value) || 1) })
                }
              />
              <Field
                type="number"
                min={0}
                step="any"
                value={item.unit_price}
                onChange={(e) =>
                  patch(item.key, {
                    unit_price: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
              <div className="text-right font-mono text-sm tabular-nums">
                {money(lineAmount(item), currencySymbol)}
              </div>
              <button
                onClick={() => setItems((p) => (p.length > 1 ? p.filter((i) => i.key !== item.key) : p))}
                className="justify-self-end text-muted-foreground transition-colors hover:text-destructive"
                aria-label="Remove line"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Total</span>
          <span className="font-mono text-xl tabular-nums">{money(total, currencySymbol)}</span>
        </div>
      </Panel>

      {error ? <Notice>{error}</Notice> : null}

      <div className="flex gap-3">
        <Button disabled={!valid || busy} onClick={() => void submit()}>
          {busy ? 'Saving...' : isEdit ? 'Save changes' : 'Create order'}
        </Button>
        <Link to={isEdit ? `/orders/${id}` : '/dashboard'}>
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>
    </div>
  );
}
