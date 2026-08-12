module Api
  module V1
    class PaymentsController < ApplicationController
      before_action :set_order

      def create
        result = @order.add_payment(
          amount: params[:amount].to_f,
          kind: params[:kind] || "payment",
          paid_date: params[:paid_date] || Date.current.iso8601,
          note: params[:note]
        )

        if result[:error]
          render json: { error: result[:error] }, status: :unprocessable_entity
        else
          render json: payment_json(result[:payment]), status: :created
        end
      end

      private

      def set_order
        @order = current_user.orders.find(params[:order_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Order not found" }, status: :not_found
      end

      def payment_json(payment)
        {
          id: payment.id,
          kind: payment.kind,
          amount: payment.amount.to_f,
          paid_on: payment.paid_date&.iso8601,
          note: payment.note,
          created_at: payment.created_at.iso8601
        }
      end
    end
  end
end
