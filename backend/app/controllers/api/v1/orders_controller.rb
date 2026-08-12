module Api
  module V1
    class OrdersController < ApplicationController
      def index
        render json: { orders: [] }
      end

      def show
        render json: { error: "Not found" }, status: :not_found
      end

      def create
        render json: { error: "Not implemented" }, status: :not_implemented
      end

      def update
        render json: { error: "Not implemented" }, status: :not_implemented
      end

      def destroy
        render json: { error: "Not implemented" }, status: :not_implemented
      end
    end
  end
end
