class Order < ApplicationRecord
  belongs_to :user
  has_many :line_items, dependent: :destroy
  has_many :payments, dependent: :destroy

  enum :status, { pending: 0, partially_paid: 1, paid: 2, overdue: 3 }

  validates :customer_name, presence: true
  validates :due_date, presence: true

  accepts_nested_attributes_for :line_items, allow_destroy: true, reject_if: :all_blank

  before_save :compute_totals

  scope :for_user, ->(user) { where(user: user) }

  private

  def compute_totals
    self.subtotal = line_items.sum { |li| li.quantity * li.unit_price }
    self.total = subtotal
  end
end
