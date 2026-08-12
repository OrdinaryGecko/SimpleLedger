require "csv"

module Api
  module V1
    class ExportsController < ApplicationController
      def index
        orders = current_user.orders.includes(:line_items, :payments)

        if params[:from].present?
          orders = orders.where("created_at >= ?", Date.parse(params[:from]).beginning_of_day)
        end

        if params[:to].present?
          orders = orders.where("created_at <= ?", Date.parse(params[:to]).end_of_day)
        end

        orders = orders.order(created_at: :desc)

        if params[:status].present?
          orders = orders.select { |order| derive_status(order) == params[:status] }
        end

        csv_data = generate_csv(orders)

        send_data csv_data,
                  filename: "orders_#{Date.current.iso8601}.csv",
                  type: "text/csv"
      end

      private

      def derive_status(order)
        total = order.line_items.sum { |li| li.quantity * li.unit_price }
        paid = order.payments.where(kind: "payment").sum(:amount)
        refunded = order.payments.where(kind: "refund").sum(:amount)
        amount_paid = [paid - refunded, 0].max

        if amount_paid >= total && total > 0
          "paid"
        elsif order.due_date < Date.current && amount_paid < total
          "overdue"
        elsif amount_paid > 0
          "partially_paid"
        else
          "pending"
        end
      end

      def generate_csv(orders)
        CSV.generate(headers: true) do |csv|
          csv << ["Order ID", "Customer", "Status", "Due Date", "Total", "Amount Paid", "Amount Due", "Created At"]

          orders.each do |order|
            total = order.line_items.sum { |li| li.quantity * li.unit_price }
            paid = order.payments.where(kind: "payment").sum(:amount)
            refunded = order.payments.where(kind: "refund").sum(:amount)
            amount_paid = [paid - refunded, 0].max
            amount_due = [total - amount_paid, 0].max

            csv << [
              order.id,
              order.customer_name,
              derive_status(order),
              order.due_date.iso8601,
              "%.2f" % total,
              "%.2f" % amount_paid,
              "%.2f" % amount_due,
              order.created_at.iso8601
            ]
          end
        end
      end
    end
  end
end
