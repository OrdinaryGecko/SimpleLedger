class Order < ApplicationRecord
  belongs_to :user
  has_many :line_items, dependent: :destroy
  has_many :payments, dependent: :destroy
  has_many :audit_logs, dependent: :destroy

  validates :customer_name, presence: true
  validates :due_date, presence: true

  accepts_nested_attributes_for :line_items, allow_destroy: true, reject_if: :all_blank

  before_save :compute_totals

  scope :for_user, ->(user) { where(user: user) }

  def amount_paid
    paid = payments.where(kind: "payment").sum(:amount)
    refunded = payments.where(kind: "refund").sum(:amount)
    [paid - refunded, 0].max
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

  private

  def compute_totals
    self.subtotal = line_items.sum { |li| li.quantity * li.unit_price }
    self.total = subtotal
  end
end
