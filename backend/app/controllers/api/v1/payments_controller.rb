module Api
  module V1
    class PaymentsController < ApplicationController
      before_action :set_order

      def create
        amount = params[:amount].to_f
        kind = params[:kind] || "payment"
        paid_date = params[:paid_date] || Date.current.iso8601
        note = params[:note]

        total = @order.total_amount
        amount_paid = @order.amount_paid
        total_refunded = @order.total_refunded

        if kind == "refund"
          if amount < 0.01
            return render json: { error: "Amount must be at least 0.01" }, status: :unprocessable_entity
          end
          unless @order.derive_status == "paid"
            return render json: {
              error: "Refunds are only allowed for fully paid orders."
            }, status: :unprocessable_entity
          end
          max_refund = [amount_paid - total_refunded, 0].max
          if amount > max_refund
            return render json: {
              error: "Refund exceeds the amount paid. The maximum allowed refund is ₹#{'%.2f' % max_refund}."
            }, status: :unprocessable_entity
          end
        else
          max_payment = [total - amount_paid, 0].max
          if amount < 0.01
            return render json: { error: "Amount must be at least 0.01" }, status: :unprocessable_entity
          end
          if max_payment <= 0
            return render json: {
              error: "This order is already fully paid, so no further payment can be recorded."
            }, status: :unprocessable_entity
          end
          if amount > max_payment
            return render json: {
              error: "Payment exceeds the amount due. The maximum allowed payment is ₹#{'%.2f' % max_payment}."
            }, status: :unprocessable_entity
          end
        end

        payment = @order.payments.build(
          kind: kind,
          amount: amount,
          paid_date: paid_date,
          note: note
        )

        from_status = @order.derive_status

        if payment.save
          to_status = @order.derive_status

          @order.audit_logs.create!(
            event: "#{kind}_recorded",
            from_status: from_status,
            to_status: to_status,
            details: {
              payment_id: payment.id,
              amount: amount,
              kind: kind
            }
          )

          render json: payment_json(payment), status: :created
        else
          render json: { error: payment.errors.full_messages.join(", ") }, status: :unprocessable_entity
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
