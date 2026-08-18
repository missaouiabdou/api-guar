# Guide : Création Automatique de Repository & Webhook GitHub depuis GuardRail

Ce guide détaille étape par étape comment configurer GuardRail pour que, lorsqu'un utilisateur crée un projet dans l'application, GuardRail s'occupe **automatiquement** de :
1. **Créer le repository** sur GitHub via l'API REST de GitHub.
2. **Créer et enregistrer le Webhook** sur le nouveau repository GitHub pour pointer vers GuardRail.

---

## 🏗️ Architecture Globale

```
Client (POST /api/v1/projects)
       │ (auto_create_github: true)
       ▼
ProjectsController
       │
       ▼
Github::RepositoryCreatorService
       │
       ├──► 1. Octokit.create_repository("my-app", private: true)
       │    └── Output: github_repo = "owner/my-app", repository_url = "https://..."
       │
       └──► 2. Octokit.create_hook("owner/my-app", "web", config)
            └── Output: webhook_id enregistré
       │
       ▼
Project Saved in DB (avec github_repo & webhook_id)
```

---

## Étape 1 : Obtenir un Token d'Accès GitHub (PAT)

Pour que votre application Rails puisse créer des repositories et des webhooks sur GitHub, elle doit être authentifiée avec les permissions nécessaires.

1. Allez sur GitHub : **Settings** → **Developer Settings** → **Personal Access Tokens** → **Tokens (classic)**.
2. Cliquez sur **Generate new token**.
3. Cochez les scopes suivants :
   - ✅ `repo` (accès complet aux repositories privés et publics)
   - ✅ `admin:repo_hook` (créer, lire et supprimer les webhooks)
4. Copiez le token généré (ex: `ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`).
5. Ajoutez le token à vos variables d'environnement (ex: `.env` ou credentials Rails) :
   ```env
   GITHUB_ACCESS_TOKEN=ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   APP_HOST_URL=https://votre-domaine-ngrok-ou-prod.com
   ```

---

## Étape 2 : Ajouter la Gem `octokit` au `Gemfile`

Octokit est le SDK Ruby officiel pour l'API REST de GitHub.

1. Ouvrez `Gemfile` et ajoutez :
   ```ruby
   # SDK Ruby officiel pour l'API GitHub
   gem "octokit", "~> 9.0"
   ```

2. Installez la gem :
   ```bash
   bundle install
   ```

---

## Étape 3 : Migration de la Base de Données

Ajoutez une colonne `github_hook_id` à la table `projects` pour pouvoir suivre et gérer le webhook GitHub créé.

1. Générez la migration :
   ```bash
   rails g migration AddGithubHookIdToProjects github_hook_id:string
   ```

2. Exécutez la migration :
   ```bash
   rails db:migrate
   ```

---

## Étape 4 : Créer le Service `Github::RepositoryCreatorService`

Créez le fichier `app/services/github/repository_creator_service.rb` :

```ruby
# app/services/github/repository_creator_service.rb
module Github
  class RepositoryCreatorService
    attr_reader :project, :access_token, :app_host

    def initialize(project:, access_token: ENV["GITHUB_ACCESS_TOKEN"], app_host: ENV["APP_HOST_URL"])
      @project = project
      @access_token = access_token
      @app_host = app_host
    end

    def call
      raise ArgumentError, "GITHUB_ACCESS_TOKEN is missing" if access_token.blank?
      raise ArgumentError, "APP_HOST_URL is missing" if app_host.blank?

      client = Octokit::Client.new(access_token: access_token)

      # 1. Créer le repository sur GitHub
      repo_name = project.name.parameterize
      github_repo = client.create_repository(
        repo_name,
        description: project.description,
        private: true,
        auto_init: true # Crée un commit initial avec un README
      )

      # 2. Configurer et créer le Webhook GitHub
      webhook_url = "#{app_host}/api/v1/webhooks/github"
      webhook_secret = project.webhook_secret || Rails.application.config.github_webhook_secret

      hook = client.create_hook(
        github_repo.full_name,
        "web",
        {
          url: webhook_url,
          content_type: "json",
          secret: webhook_secret
        },
        {
          events: ["push", "pull_request"],
          active: true
        }
      )

      # 3. Mettre à jour le projet avec les vraies informations GitHub
      project.update!(
        github_repo: github_repo.full_name,
        repository_url: github_repo.html_url,
        github_hook_id: hook.id.to_s
      )

      project
    rescue Octokit::Error => e
      Rails.logger.error("GitHub API Error: #{e.message}")
      raise Github::InvalidPayloadError, "Erreur API GitHub : #{e.message}"
    end
  end
end
```

---

## Étape 5 : Mettre à jour `ProjectsController`

Modifiez `app/controllers/api/v1/projects_controller.rb` pour permettre la création automatique sur GitHub lors de la création du projet :

```ruby
# app/controllers/api/v1/projects_controller.rb
module Api
  module V1
    class ProjectsController < BaseController
      before_action :set_project, only: [:show, :update, :destroy]

      def create
        @project = current_user.projects.build(project_params)

        if @project.save
          # Si demandé, créer automatiquement sur GitHub
          if params[:auto_create_github] == true || params.dig(:project, :auto_create_github) == true
            Github::RepositoryCreatorService.new(project: @project).call
          end

          render json: @project, status: :created
        else
          render json: { errors: @project.errors.full_messages }, status: :unprocessable_entity
        end
      rescue Github::InvalidPayloadError => e
        render json: { error: e.message, project: @project }, status: :bad_gateway
      end

      private

      def set_project
        @project = current_user.projects.find(params[:id])
      end

      def project_params
        params.require(:project).permit(:name, :description, :repository_url, :github_repo, :status)
      end
    end
  end
end
```

---

## Étape 6 (Optionnelle mais recommandée) : Traitement Asynchrone (ActiveJob)

Pour éviter de bloquer la requête HTTP pendant que l'API de GitHub répond, vous pouvez déporter la création dans un background job via `Solid Queue` (déjà configuré dans Rails 8 dans votre Gemfile).

1. Générez le job :
   ```bash
   rails g job create_github_repository
   ```

2. Implémentez `app/jobs/create_github_repository_job.rb` :
   ```ruby
   class CreateGithubRepositoryJob < ApplicationJob
     queue_as :default

     def perform(project_id)
       project = Project.find(project_id)
       Github::RepositoryCreatorService.new(project: project).call
     end
   end
   ```

3. Déclenchez-le dans le controller :
   ```ruby
   CreateGithubRepositoryJob.perform_later(@project.id)
   ```

---

## Étape 7 : Test Manuel de l'Automatisation

Envoyez la requête suivante depuis Postman ou PowerShell :

```powershell
$body = @{
    project = @{
        name = "my-auto-sec-repo"
        description = "Automated repository created from GuardRail"
    }
    auto_create_github = $true
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/v1/projects" `
  -Method POST -ContentType "application/json" `
  -Headers @{ "Authorization" = $token } `
  -Body $body
```

### Résultat :
1. Un nouveau repository privé `votre-user/my-auto-sec-repo` est créé sur GitHub.
2. Le Webhook est automatiquement configuré sur le repo GitHub vers `https://votre-domaine.com/api/v1/webhooks/github`.
3. Le projet dans GuardRail enregistre automatiquement `github_repo` et `repository_url`.

---

## Summary / Récapitulatif

| Composant | Rôle |
|-----------|------|
| `octokit` | Gem Ruby pour interagir avec l'API GitHub |
| `GITHUB_ACCESS_TOKEN` | Token d'accès avec droits `repo` et `admin:repo_hook` |
| `Github::RepositoryCreatorService` | Service qui appelle `create_repository` et `create_hook` |
| `auto_create_github` | Paramètre optionnel à la création du projet |
