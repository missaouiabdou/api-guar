module Api
  module V1
    class WebhooksController < BaseController
      def index
        user_repo_names = (current_user.projects.pluck(:github_repo) +
                           current_user.repositories.pluck(:full_name)).compact.reject(&:blank?).uniq

        events_scope = WebhookEvent.where(repository: user_repo_names)

        # Build configured webhook list per repository/project
        webhooks = current_user.projects.map do |proj|
          repo_name = proj.github_repo.presence || "acme/#{proj.name.parameterize}"
          repo_events = events_scope.where(repository: [repo_name, proj.github_repo].compact)
          deliveries_count = repo_events.count
          failures_count = repo_events.where(status: 'failed').count
          latest_event = repo_events.order(created_at: :desc).first
          is_active = deliveries_count.positive? && (latest_event&.created_at.nil? || latest_event.created_at > 30.days.ago)

          {
            id: proj.id,
            name: "#{proj.name} Hook",
            repo: repo_name,
            url: "#{request.base_url}/api/v1/webhooks/github?project_id=#{proj.id}",
            status: is_active ? 'Active' : 'Inactive',
            events: %w[push pull_request workflow_run],
            deliveries: deliveries_count,
            failures: failures_count,
            last_active: latest_event ? time_ago_in_words_custom(latest_event.created_at) : 'never'
          }
        end

        total_deliveries = events_scope.count
        active_count = webhooks.count { |w| w[:status] == 'Active' }

        render json: {
          data: webhooks,
          meta: {
            total_webhooks: webhooks.size,
            active_webhooks: active_count,
            total_deliveries: total_deliveries,
            avg_response: '124ms'
          }
        }
      end

      def create
        project = current_user.projects.find_by(id: params[:project_id]) || current_user.projects.first
        unless project
          return render json: { error: 'No project found to associate webhook' }, status: :unprocessable_entity
        end

        AuditService.log(
          actor: current_user,
          action: 'webhook_created',
          resource_type: 'Project',
          resource_id: project.id,
          metadata: { name: params[:name], repo: params[:repo] }
        )

        render json: {
          data: {
            id: project.id,
            name: params[:name] || "#{project.name} Hook",
            repo: params[:repo] || project.github_repo,
            url: "#{request.base_url}/api/v1/webhooks/github?project_id=#{project.id}",
            status: 'Active',
            events: params[:events] || %w[push pull_request],
            deliveries: 1,
            failures: 0,
            last_active: 'just now'
          }
        }, status: :created
      end

      def destroy
        AuditService.log(
          actor: current_user,
          action: 'webhook_deleted',
          resource_type: 'Project',
          resource_id: params[:id],
          metadata: { id: params[:id] }
        )
        head :no_content
      end

      private

      def time_ago_in_words_custom(time)
        return 'never' unless time
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
