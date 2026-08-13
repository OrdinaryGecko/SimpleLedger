# SimpleLedger

A web application for creating orders with line items, recording payments, and viewing a dashboard with order status and amounts due.

---

## Prerequisites

- Ruby 3.4.7
- Rails 8.1.2
- PostgreSQL
- Node.js 18+
- npm

## Setup

### Backend

```bash
cd backend
bundle install
rails db:create db:migrate
rails s -p 3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API requests to the backend on port 3001.

---

## API Overview

All endpoints are under `/api/v1`. Authentication uses JWT tokens passed via `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Create a new account |
| POST | `/auth/login` | Login and receive JWT token |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders` | List all orders (supports `?status=`, `?from=`, `?to=` filters) |
| GET | `/orders/:id` | Get order details with line items, payments, refunds |
| POST | `/orders` | Create a new order |
| PATCH | `/orders/:id` | Update an order (only if no payments recorded) |
| DELETE | `/orders/:id` | Delete an order (only if no payments recorded) |
| GET | `/orders/export` | Export orders as CSV (supports `?status=`, `?from=`, `?to=` filters) |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/orders/:order_id/payments` | Record a payment or refund |

**Payment request body:**
```json
{
  "amount": 500.00,
  "kind": "payment",
  "paid_date": "2026-08-15",
  "note": "First installment"
}
```

**Refund request body:**
```json
{
  "amount": 50.00,
  "kind": "refund",
  "paid_date": "2026-08-20",
  "note": "Partial refund"
}
```

### Audit Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders/:order_id/audit_logs` | Get audit log for an order |

### Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/config` | Get app config (currency code, symbol) |

---

## Status Derivation

Order status is fully derived from payments and due date. It is not persisted in the database.

| Status | Condition |
|--------|-----------|
| `pending` | No payments recorded |
| `partially_paid` | Some payment recorded, but less than order total |
| `paid` | Total payments equal or exceed order total |
| `overdue` | Past due date and not fully paid |

**Precedence:** `paid` > `overdue` > `pending` > `partially_paid`

**Derivation logic:**
```
if fully paid
  paid
elsif past due
  overdue
elsif nothing paid
  pending
else
  partially_paid
end
```

### Edge Cases

- **Order becomes paid after being overdue:** Status immediately changes to `paid` (paid takes precedence over overdue).
- **Order with $0 total:** Cannot be paid (no payments allowed).
- **Refund after full payment:** Allowed, does not affect status or amount due.

---

## Business Rules

### Payments

- Total payments must never exceed the order total.
- Multiple partial payments are allowed.
- Over-payment is rejected with a clear error message showing the maximum allowed amount.
- **Orders are locked** (read-only) after the first payment is recorded.

### Refunds

- Refunds are only allowed for fully paid orders.
- Total refunds cannot exceed total payments.
- Refunds do not affect order status or amount due.
- Cumulative refund cap prevents over-refunding.

### Currency

- Default currency is USD.
- To change currency, edit `backend/config/initializers/money.rb` line 1.

---

## Concurrency and Duplicate Prevention

Payment recording uses two mechanisms to ensure data integrity:

### Pessimistic Locking

Pessimistic locking (`with_lock`) on the Order model prevents race conditions when two different payments are submitted simultaneously.

```ruby
def add_payment(amount:, kind: "payment", paid_date: Date.current, note: nil, idempotency_key: nil)
  with_lock do
    # validation and payment creation
  end
end
```

**Concurrent request behavior:**

When two payments are submitted at the same time, the second request waits for the first to complete, then re-validates:

```
Request 1: POST /orders/1/payments {"amount": 500}
Request 2: POST /orders/1/payments {"amount": 500}

Response 1: {"success": true, "payment": {...}}
Response 2: {"error": "Payment exceeds the amount due. The maximum allowed payment is $500.00."}
```

### Idempotency Keys

Idempotency keys prevent duplicate payment submissions (e.g., user double-clicks "Record" button).

Each payment request includes a unique `idempotency_key` (UUID). If a payment with that key already exists, the server returns the existing payment without creating a new one.

```
Request 1: POST /orders/1/payments {"amount": 500, "idempotency_key": "abc-123"}
Request 2: POST /orders/1/payments {"amount": 500, "idempotency_key": "abc-123"}

Response 1: {"success": true, "payment": {...}}
Response 2: {"success": true, "payment": {...}}  (same payment returned, no duplicate)
```

---

## Technical Stack

### Backend

- **Framework:** Ruby on Rails 8.1.2 (API mode)
- **Database:** PostgreSQL
- **Authentication:** JWT (bcrypt + jwt gems)
- **Currency:** money gem
- **Testing:** RSpec, FactoryBot, Faker

### Frontend

- **Framework:** React 19 with Vite
- **Styling:** Tailwind CSS v4
- **HTTP Client:** Axios
- **Routing:** React Router v7

---

## Tests

Run backend tests:

```bash
cd backend
bundle exec rspec
```

**32 test cases covering:**
- Payment allocation and validation
- Status transitions
- Over-payment rejection
- Audit logging
- Authentication
- Concurrency (pessimistic locking)
- Idempotency (duplicate prevention)

---

## Assumptions and Tradeoffs

1. **Internal tracking tool:** This is an internal tool where a user creates orders and manually marks them as paid, partially paid, or refunds them. It is not a tool where one user creates an order for another user to pay.
2. **Manual payments:** No external payment provider is called. Payments are recorded manually by the user.
3. **Single user role:** Users create orders for customers (plain string name). No separate customer model.
4. **No order-level tax/discount:** Subtotal equals order total.
5. **Orders locked after payment:** Prevents data inconsistency but reduces flexibility.
6. **Status derived, not persisted:** Ensures consistency but requires computation on each request.
7. **Currency hardcoded:** Changing currency requires code change and redeployment.

---

## What I Would Improve Before Production

1. **Per-order currency:** Store currency at order level to support multi-currency scenarios.
2. **Customer model:** Proper customer table with relationships instead of plain strings.
3. **Rate limiting:** Protect API endpoints from abuse.
4. **Audit trail improvements:** Track user actions beyond status changes.
5. **Export improvements:** More formats (PDF, Excel), scheduling options.
6. **Search functionality:** Full-text search across orders and customers.

---

## License

MIT
