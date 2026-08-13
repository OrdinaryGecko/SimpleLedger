module Api
  module V1
    class OrdersController < ApplicationController
      before_action :set_order, only: [:show, :update, :destroy]

      def index
        orders = current_user.orders.includes(:line_items, :payments).order(created_at: :desc)
        orders = orders.select { |order| order.derive_status == params[:status] } if params[:status].present?
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
        total = order.total_amount.to_f
        amount_paid = order.amount_paid.to_f
        total_refunded = order.total_refunded.to_f
        amount_due = order.amount_due.to_f

        {
          id: order.id,
          customer: order.customer_name,
          currency: Money.default_currency.iso_code,
          currency_symbol: Money.default_currency.symbol,
          due_date: order.due_date.iso8601,
          status: order.derive_status,
          total: total,
          total_formatted: Money.new((total * 100).round).format,
          amount_paid: amount_paid,
          amount_paid_formatted: Money.new((amount_paid * 100).round).format,
          total_refunded: total_refunded,
          total_refunded_formatted: Money.new((total_refunded * 100).round).format,
          amount_due: amount_due,
          amount_due_formatted: Money.new((amount_due * 100).round).format,
          locked: order.payments.exists?,
          created_at: order.created_at.iso8601,
          updated_at: order.updated_at.iso8601,
          items: order.line_items.map { |li|
            unit_price = li.unit_price.to_f
            line_total = (li.quantity * li.unit_price).to_f
            {
              id: li.id,
              description: li.description,
              quantity: li.quantity,
              unit_price: unit_price,
              unit_price_formatted: Money.new((unit_price * 100).round).format,
              line_total: line_total,
              line_total_formatted: Money.new((line_total * 100).round).format
            }
          },
          payments: order.payments.where(kind: "payment").order(created_at: :asc).map { |p|
            amount = p.amount.to_f
            {
              id: p.id,
              kind: p.kind,
              amount: amount,
              amount_formatted: Money.new((amount * 100).round).format,
              paid_on: p.paid_date&.iso8601,
              note: p.note,
              created_at: p.created_at.iso8601
            }
          },
          refunds: order.payments.where(kind: "refund").order(created_at: :asc).map { |p|
            amount = p.amount.to_f
            {
              id: p.id,
              kind: p.kind,
              amount: amount,
              amount_formatted: Money.new((amount * 100).round).format,
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
