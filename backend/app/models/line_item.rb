class LineItem < ApplicationRecord
  belongs_to :order

  validates :description, presence: true
  validates :quantity, presence: true, numericality: { greater_than_or_equal_to: 1 }
  validates :unit_price, presence: true, numericality: { greater_than_or_equal_to: 0 }
end
