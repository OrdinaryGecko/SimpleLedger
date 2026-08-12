class Payment < ApplicationRecord
  belongs_to :order

  enum :kind, { payment: 0, refund: 1 }

  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :paid_date, presence: true
end
