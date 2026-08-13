module Api
  module V1
    class ConfigController < ApplicationController
      def index
        render json: {
          currency: Money.default_currency.iso_code,
          currency_symbol: Money.default_currency.symbol
        }
      end
    end
  end
end
