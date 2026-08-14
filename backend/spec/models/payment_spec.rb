require 'rails_helper'

RSpec.describe Payment, type: :model do
  describe 'validations' do
    it 'validates amount is greater than 0' do
      payment = build(:payment, amount: 0)
      expect(payment).not_to be_valid
      expect(payment.errors[:amount]).to include("must be greater than 0")
    end

    it 'validates amount is present' do
      payment = build(:payment, amount: nil)
      expect(payment).not_to be_valid
      expect(payment.errors[:amount]).to include("can't be blank")
    end

    it 'validates paid_date is present' do
      payment = build(:payment, paid_date: nil)
      expect(payment).not_to be_valid
      expect(payment.errors[:paid_date]).to include("can't be blank")
    end

    it 'validates kind is payment or refund' do
      expect(build(:payment, kind: :payment)).to be_valid
      expect(build(:payment, kind: :refund)).to be_valid
    end
  end

  describe 'associations' do
    it 'belongs to order' do
      order = create(:order, :with_line_items, item_price: 100, item_quantity: 1)
      payment = create(:payment, order: order)
      expect(payment.order).to be_present
    end
  end
end
