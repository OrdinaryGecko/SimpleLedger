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
        {
          id: order.id,
          customer: order.customer_name,
          due_date: order.due_date.iso8601,
          status: order.derive_status,
          total: order.total_amount.to_f,
          amount_paid: order.amount_paid.to_f,
          total_refunded: order.total_refunded.to_f,
          amount_due: order.amount_due.to_f,
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
          payments: order.payments.where(kind: "payment").order(created_at: :asc).map { |p|
            {
              id: p.id,
              kind: p.kind,
              amount: p.amount.to_f,
              paid_on: p.paid_date&.iso8601,
              note: p.note,
              created_at: p.created_at.iso8601
            }
          },
          refunds: order.payments.where(kind: "refund").order(created_at: :asc).map { |p|
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
