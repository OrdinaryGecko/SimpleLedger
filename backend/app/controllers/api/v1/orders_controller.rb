module Api
  module V1
    class OrdersController < ApplicationController
      before_action :set_order, only: [:show, :update, :destroy]

      def index
        orders = current_user.orders.includes(:line_items, :payments).order(created_at: :desc)
        orders = orders.where(status: params[:status]) if params[:status].present?
        orders = orders.where("created_at >= ?", Date.parse(params[:from]).beginning_of_day) if params[:from].present?
        orders = orders.where("created_at <= ?", Date.parse(params[:to]).end_of_day) if params[:to].present?

        render json: orders.map { |order| order_view(order) }
      end

      def show
        render json: order_view(@order)
      end

      def create
        order = current_user.orders.build(order_params)

        if order.save
          render json: order_view(order), status: :created
        else
          render json: { error: order.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end
      end

      def update
        if @order.payments.exists?
          return render json: { error: "Order has payments and cannot be edited" }, status: :unprocessable_entity
        end

        if @order.update(order_params)
          render json: order_view(@order)
        else
          render json: { error: @order.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end
      end

      def destroy
        if @order.payments.exists?
          return render json: { error: "Order has payments and cannot be deleted" }, status: :unprocessable_entity
        end

        @order.destroy
        render json: { id: @order.id }
      end

      private

      def set_order
        @order = current_user.orders.includes(:line_items, :payments).find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Order not found" }, status: :not_found
      end

      def order_params
        params.permit(
          :customer_name, :due_date,
          line_items_attributes: [:id, :description, :quantity, :unit_price, :_destroy]
        )
      end

      def order_view(order)
        total = order.line_items.sum { |li| li.quantity * li.unit_price }
        paid = order.payments.where(kind: "payment").sum(:amount)
        refunded = order.payments.where(kind: "refund").sum(:amount)
        amount_paid = [paid - refunded, 0].max
        amount_due = [total - amount_paid, 0].max

        derived_status = if amount_paid >= total && total > 0
                           "paid"
                         elsif order.due_date < Date.current && amount_paid < total
                           "overdue"
                         elsif amount_paid > 0
                           "partially_paid"
                         else
                           "pending"
                         end

        {
          id: order.id,
          customer: order.customer_name,
          due_date: order.due_date.iso8601,
          status: order.status,
          derived_status: derived_status,
          total: total.to_f,
          amount_paid: amount_paid.to_f,
          amount_due: amount_due.to_f,
          locked: order.payments.exists?,
          created_at: order.created_at.iso8601,
          updated_at: order.updated_at.iso8601,
          items: order.line_items.map { |li|
            {
              id: li.id,
              description: li.description,
              quantity: li.quantity,
              unit_price: li.unit_price.to_f
            }
          },
          payments: order.payments.order(created_at: :asc).map { |p|
            {
              id: p.id,
              kind: p.kind,
              amount: p.amount.to_f,
              paid_on: p.paid_date&.iso8601,
              note: p.note,
              created_at: p.created_at.iso8601
            }
          }
        }
      end
    end
  end
end
