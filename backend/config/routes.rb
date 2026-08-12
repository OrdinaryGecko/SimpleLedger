Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      post "auth/signup", to: "auth#signup"
      post "auth/login", to: "auth#login"

      resources :orders, only: [:index, :show, :create, :update, :destroy] do
        resources :payments, only: [:create]
      end
    end
  end
end
