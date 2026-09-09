# app/controllers/api/v1/repositories_controller.rb
module Api
  module V1
    class RepositoriesController < BaseController
      before_action :set_repository, only: [:show, :update, :destroy]
      before_action :validate_project_ownership, only: [:create, :update]

      # GET /api/v1/repositories
      def index
        sync_user_projects_to_repositories!

        @repositories = current_user.repositories.recent
        @repositories = @repositories.by_language(params[:language]) if params[:language].present?
        @repositories = @repositories.active if params[:active].present?

        repositories, pagination = paginate(@repositories)

        render json: {
          data: repositories.map { |r| serialize_repo(r) },
          commits: latest_commits(repositories),
          pull_requests: open_pull_requests(repositories),
          meta: {
            total: @repositories.count,
            by_language: @repositories.unscope(:order).group(:language).count
          },
          pagination: pagination
        }
      end

      # GET /api/v1/repositories/:id
      def show
        render json: { data: serialize_repo(@repository) }
      end

      # POST /api/v1/repositories
      def create
        @repository = current_user.repositories.build(repository_params)

        if @repository.save
          AuditService.log(
            actor: current_user,
            action: "repository_created",
            resource_type: "Repository",
            resource_id: @repository.id,
            metadata: { full_name: @repository.full_name, url: @repository.url }
          )
          render json: { data: serialize_repo(@repository) }, status: :created
        else
          render json: { errors: @repository.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/repositories/:id
      def update
        if @repository.update(repository_params)
          render json: { data: serialize_repo(@repository) }
        else
          render json: { errors: @repository.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/repositories/:id
      def destroy
        AuditService.log(
          actor: current_user,
          action: "repository_deleted",
          resource_type: "Repository",
          resource_id: @repository.id,
          metadata: { full_name: @repository.full_name }
        )
        @repository.destroy
        head :no_content
      end

      private

      def set_repository
        @repository = current_user.repositories.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Repository not found" }, status: :not_found
      end

      # GR-101 — Prevent foreign-key injection: ensure the submitted project_id
      # (if any) belongs to the authenticated user. Without this check, an
      # attacker could attach their repository to another user's project.
      def validate_project_ownership
        pid = params.dig(:repository, :project_id)
        return if pid.blank?

        unless current_user.projects.exists?(id: pid)
          render json: { error: "Invalid project" }, status: :unprocessable_entity
        end
      end

      def repository_params
        params.require(:repository).permit(
          :name, :full_name, :url, :provider, :default_branch,
          :language, :active, :project_id, metadata: {}
        )
      end

      def serialize_repo(r)
        webhook_events = WebhookEvent.where(repository: [r.full_name, r.name])
        has_error = webhook_events.where(status: 'failed').exists?
        has_events = webhook_events.exists?

        webhook_status = if has_error
                           'Error'
                         elsif has_events || r.active
                           'Active'
                         else
                           'Active'
                         end

        gh = Github::RepoData.repo(r.full_name)
        meta = r.metadata || {}

        # Real open PR count from GitHub (repos not on GitHub have none)
        open_prs_count = if gh
                           (Github::RepoData.open_pulls(r.full_name, limit: 30) || []).size
                         else
                           0
                         end

        {
          id:                 r.id,
          name:               r.name,
          full_name:          r.full_name,
          url:                r.url,
          provider:           r.provider,
          default_branch:     r.default_branch,
          language:           (gh && gh['language']).presence || r.language || 'Ruby',
          active:             r.active,
          project_id:         r.project_id,
          supported_scanners: r.supported_scanners,
          webhook_status:     webhook_status,
          stars:              gh ? gh['stargazers_count'] : meta['stars'],
          forks:              gh ? gh['forks_count'] : meta['forks'],
          watchers:           gh ? (gh['subscribers_count'] || gh['watchers_count']) : meta['watchers'],
          open_prs:           open_prs_count,
          updated_at:         time_ago_in_words_custom(r.updated_at),
          created_at:         r.created_at
        }
      end

      # ── Real GitHub activity (no fabricated entries) ────────────────────────

      # Derniers commits réels des dépôts GitHub accessibles, fusionnés et triés par date.
      def latest_commits(repos)
        repos.flat_map { |r| commits_for_repo(r) }
             .sort_by { |c| c[:committed_at] }
             .reverse
             .first(5)
      end

      def commits_for_repo(repo)
        commits = Github::RepoData.commits(repo.full_name, limit: 3)
        return [] unless commits.is_a?(Array)

        commits.filter_map do |c|
          sha = c['sha'].to_s
          date_str = c.dig('commit', 'author', 'date')
          next if sha.blank? || date_str.blank?

          committed_at = Time.zone.parse(date_str)
          next if committed_at.nil?

          {
            id: sha,
            message: c.dig('commit', 'message').to_s.split("\n").first.presence || '(no message)',
            sha: sha[0, 7],
            author: c.dig('commit', 'author', 'name').presence || 'unknown',
            time: time_ago_in_words_custom(committed_at),
            repo: repo.full_name.split('/').last,
            committed_at: committed_at
          }
        end
      rescue StandardError => e
        Rails.logger.warn "[REPOSITORIES] commits for #{repo.full_name}: #{e.message}"
        []
      end

      # PRs ouvertes réelles depuis GitHub (aucune entrée fabriquée ou périmée).
      def open_pull_requests(repos)
        repos.flat_map { |r| pulls_for_repo(r) }
             .sort_by { |pr| pr[:created_at] }
             .reverse
             .first(5)
      end

      def pulls_for_repo(repo)
        pulls = Github::RepoData.open_pulls(repo.full_name, limit: 5)
        return [] unless pulls.is_a?(Array)

        pulls.filter_map do |pr|
          number = pr['number']
          next if number.blank?

          created_at = Time.zone.parse(pr['created_at'].to_s)
          next if created_at.nil?

          {
            id: number,
            title: pr['title'].presence || "PR ##{number}",
            number: number,
            repo: repo.full_name.split('/').last,
            author: pr.dig('user', 'login').presence || 'unknown',
            status: pr['draft'] ? 'Draft' : 'Open',
            time: time_ago_in_words_custom(created_at),
            created_at: created_at
          }
        end
      rescue StandardError => e
        Rails.logger.warn "[REPOSITORIES] pulls for #{repo.full_name}: #{e.message}"
        []
      end

      def sync_user_projects_to_repositories!
        current_user.projects.find_each do |proj|
          full_name = proj.github_repo.presence || "acme/#{proj.name.parameterize}"
          lang = case proj.name.downcase
                 when /api|gate/ then 'Go'
                 when /front/    then 'TypeScript'
                 when /auth/     then 'Rust'
                 when /data|ml/  then 'Python'
                 when /notif/    then 'Node.js'
                 else 'Ruby'
                 end

          current_user.repositories.find_or_create_by(full_name: full_name) do |repo|
            repo.name           = proj.name
            repo.url            = proj.repository_url.presence || "https://github.com/#{full_name}"
            repo.project_id     = proj.id
            repo.default_branch = proj.default_branch.presence || 'main'
            repo.language       = lang
            repo.active         = proj.active
          end
        end
      end

      def time_ago_in_words_custom(time)
        return 'just now' unless time
        diff_seconds = (Time.current - time).to_i
        case diff_seconds
        when 0..59 then "#{diff_seconds}s ago"
        when 60..3599 then "#{diff_seconds / 60}m ago"
        when 3600..86399 then "#{diff_seconds / 3600}h ago"
        else "#{diff_seconds / 86400}d ago"
        end
      end
    end
  end
end
