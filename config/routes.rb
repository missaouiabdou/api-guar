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
      get "dashboard", to: "dashboard#show"
      resources :repositories
      resources :projects do
        get :security, on: :member, to: "security#project_overview"

        # Sprint 1 — Security Dashboard
        get :dashboard,    on: :member, to: "security#dashboard"   # GR-501/502/505
        get "security/history", on: :member, to: "security#history" # GR-503

        # Sprint 1 — Recent vulnerabilities (project-scoped)
        resources :vulnerabilities, only: [] do
          collection do
            get :recent, to: "security#recent_vulnerabilities"      # GR-504
          end
        end

        # Sprint 2 — Security Policies (GR-601)
        resources :security_policies, only: [:index, :create]
      end

      # Sprint 2 — Security Policies (member routes / GR-601)
      resources :security_policies, only: [:show, :update, :destroy]

      resources :scans, only: [:index, :show] do
        resources :vulnerabilities, only: [:index]
        get :security_summary, on: :member, to: "security#scan_summary"

        # Sprint 2 — Policy results per scan (GR-604)
        get :policy_results, on: :member, to: "security#policy_results"

        # Sprint 6 — Security Gate for CI/CD (GR-901)
        get :gate, on: :member, to: "security#gate"
      end
      resources :vulnerabilities, only: [:index, :show, :update]

      # Webhooks GitHub (Phase 2)
      namespace :webhooks do
        post "github", to: "github#create"
      end
    end
  end

  # Health check — inchangé
  get "up" => "rails/health#show", as: :rails_health_check
end