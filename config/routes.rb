# config/routes.rb
Rails.application.routes.draw do
  # Devise (authentification) — inchangé
  devise_for :users,
             path: "api/v1",
             path_names: {
               sign_in: "login",
               sign_out: "logout",
               registration: "signup"
             },
             controllers: {
               sessions: "users/sessions",
               registrations: "users/registrations"
             }

  # API V1
  namespace :api do
    namespace :v1 do
      resources :projects
      resources :scans, only: [:index, :show]

      # Webhooks GitHub (Phase 2)
      namespace :webhooks do
        post "github", to: "github#create"
      end
    end
  end

  # Health check — inchangé
  get "up" => "rails/health#show", as: :rails_health_check
end