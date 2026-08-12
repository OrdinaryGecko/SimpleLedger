module Api
  module V1
    class AuthController < ApplicationController
      skip_before_action :authenticate_request, only: [:signup, :login]

      def signup
        user = User.new(email: params[:email], password: params[:password])
        if user.save
          token = JsonWebToken.encode(user_id: user.id)
          render json: { token: token, user: { id: user.id, email: user.email } }, status: :created
        else
          render json: { error: user.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end
      end

      def login
        user = User.find_by(email: params[:email])
        if user&.authenticate(params[:password])
          token = JsonWebToken.encode(user_id: user.id)
          render json: { token: token, user: { id: user.id, email: user.email } }
        else
          render json: { error: "Invalid email or password" }, status: :unauthorized
        end
      end
    end
  end
end
