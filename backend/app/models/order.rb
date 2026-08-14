class Order < ApplicationRecord
  belongs_to :user
  has_many :line_items, dependent: :destroy
  has_many :payments, dependent: :destroy
  has_many :audit_logs, dependent: :destroy

  validates :customer_name, presence: true
  validates :due_date, presence: true
  validate :total_must_be_positive, on: :create

  accepts_nested_attributes_for :line_items, allow_destroy: true, reject_if: :all_blank

  before_save :compute_totals

  scope :for_user, ->(user) { where(user: user) }

  def amount_paid
    payments.where(kind: "payment").sum(:amount)
  end

  def total_refunded
    payments.where(kind: "refund").sum(:amount)
  end

  def total_amount
    line_items.sum { |li| li.quantity * li.unit_price }
  end

  def amount_due
    [total_amount - amount_paid, 0].max
  end

  def derive_status
    total = total_amount
    paid = amount_paid
    fully_paid = paid >= total && total > 0
    past_due = due_date < Date.current

    if fully_paid
      "paid"
    elsif past_due
      "overdue"
    elsif paid == 0
      "pending"
    else
      "partially_paid"
    end
  end

  def add_payment(amount:, kind: "payment", paid_date: Date.current, note: nil, idempotency_key: nil)
    with_lock do
      if idempotency_key.present?
        existing = payments.find_by(idempotency_key: idempotency_key)
        return { success: true, payment: existing, idempotent_replay: true } if existing
      end

      reload
      result = validate_payment(amount, kind)
      return result if result[:error]

      payment = payments.build(
        kind: kind,
        amount: amount,
        paid_date: paid_date,
        note: note,
        idempotency_key: idempotency_key
      )

      from_status = derive_status

      if payment.save
        audit_logs.create!(
          event: "#{kind}_recorded",
          from_status: from_status,
          to_status: derive_status,
          details: {
            payment_id: payment.id,
            amount: amount,
            kind: kind
          }
        )
        { success: true, payment: payment }
      else
        { error: payment.errors.full_messages.join(", ") }
      end
    end
  end

  private

  def validate_payment(amount, kind)
    if amount < 0.01
      return { error: "Amount must be at least 0.01" }
    end

    if kind == "refund"
      unless derive_status == "paid"
        return { error: "Refunds are only allowed for fully paid orders." }
      end
      max_refund = [amount_paid - total_refunded, 0].max
      if amount > max_refund
        return { error: "Refund exceeds the amount paid. The maximum allowed refund is #{Money.new((max_refund * 100).round).format}." }
      end
    else
      max_payment = [total_amount - amount_paid, 0].max
      if max_payment <= 0
        return { error: "This order is already fully paid, so no further payment can be recorded." }
      end
      if amount > max_payment
        return { error: "Payment exceeds the amount due. The maximum allowed payment is #{Money.new((max_payment * 100).round).format}." }
      end
    end

    {}
  end

  def compute_totals
    self.subtotal = line_items.sum { |li| li.quantity * li.unit_price }
    self.total = subtotal
  end

  def total_must_be_positive
    if line_items.empty? || line_items.sum { |li| li.quantity * li.unit_price } <= 0
      errors.add(:base, "Order total must be greater than zero")
    end
  end
end
