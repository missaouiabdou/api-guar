Rails.application.routes.draw do
  post '/login', to: 'authentication#login'

  namespace :api do
    namespace :v1 do
      resources :projects, only: [:index, :show, :create, :update, :destroy]
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
