module Api
  module V1
    class AuditLogsController < ApplicationController
      before_action :set_order

      def index
        audit_logs = @order.audit_logs.order(created_at: :desc)
        render json: audit_logs.map { |log| audit_log_json(log) }
      end

      private

      def set_order
        @order = current_user.orders.find(params[:order_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Order not found" }, status: :not_found
      end

      def audit_log_json(log)
        {
          id: log.id,
          event: log.event,
          from_status: log.from_status,
          to_status: log.to_status,
          details: log.details,
          created_at: log.created_at.iso8601
        }
      end
    end
  end
end
