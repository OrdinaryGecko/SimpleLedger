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
          orders = orders.select { |order| order.derive_status == params[:status] }
        end

        if orders.empty?
          render json: { error: "No orders to export for the selected filters" }, status: :unprocessable_entity
          return
        end

        csv_data = generate_csv(orders)

        send_data csv_data,
                  filename: "orders_#{Date.current.iso8601}.csv",
                  type: "text/csv"
      end

      private

      def generate_csv(orders)
        CSV.generate(headers: true) do |csv|
          csv << ["Order ID", "Customer", "Status", "Due Date", "Total", "Amount Paid", "Amount Due", "Created At"]

          orders.each do |order|
            csv << [
              order.id,
              order.customer_name,
              order.derive_status,
              order.due_date.iso8601,
              "%.2f" % order.total_amount,
              "%.2f" % order.amount_paid,
              "%.2f" % order.amount_due,
              order.created_at.iso8601
            ]
          end
        end
      end
    end
  end
end
