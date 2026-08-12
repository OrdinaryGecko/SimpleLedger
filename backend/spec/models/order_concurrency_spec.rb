require 'rails_helper'

RSpec.describe "Order concurrency", type: :model do
  let(:user) { create(:user) }
  let(:order) { create(:order, :with_line_items, user: user, item_price: 100, item_quantity: 1) }

  describe "pessimistic locking on payments" do
    it "prevents overpayment from concurrent requests" do
      barrier = Queue.new
      results = []

      t1 = Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          barrier.pop
          order.with_lock do
            # Simulate processing time inside the lock
            sleep 0.05
            amount_paid = order.amount_paid
            total = order.total_amount
            if amount_paid + 80 <= total
              order.payments.create!(kind: "payment", amount: 80, paid_date: Date.current)
              results << { success: true }
            else
              results << { success: false, error: "exceeds balance" }
            end
          end
        end
      end

      t2 = Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          barrier.pop
          order.with_lock do
            sleep 0.05
            amount_paid = order.amount_paid
            total = order.total_amount
            if amount_paid + 80 <= total
              order.payments.create!(kind: "payment", amount: 80, paid_date: Date.current)
              results << { success: true }
            else
              results << { success: false, error: "exceeds balance" }
            end
          end
        end
      end

      barrier.push(true)
      barrier.push(true)

      t1.join
      t2.join

      successes = results.count { |r| r[:success] }
      failures = results.count { |r| !r[:success] }

      expect(successes).to eq(1)
      expect(failures).to eq(1)
      expect(order.reload.amount_paid).to eq(80)
    end

    it "allows concurrent payments within balance" do
      barrier = Queue.new
      results = []

      t1 = Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          barrier.pop
          order.with_lock do
            sleep 0.05
            amount_paid = order.amount_paid
            total = order.total_amount
            if amount_paid + 50 <= total
              order.payments.create!(kind: "payment", amount: 50, paid_date: Date.current)
              results << { success: true }
            else
              results << { success: false }
            end
          end
        end
      end

      t2 = Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          barrier.pop
          order.with_lock do
            sleep 0.05
            amount_paid = order.amount_paid
            total = order.total_amount
            if amount_paid + 50 <= total
              order.payments.create!(kind: "payment", amount: 50, paid_date: Date.current)
              results << { success: true }
            else
              results << { success: false }
            end
          end
        end
      end

      barrier.push(true)
      barrier.push(true)

      t1.join
      t2.join

      expect(results).to all(include(success: true))
      expect(order.reload.amount_paid).to eq(100)
    end
  end
end
