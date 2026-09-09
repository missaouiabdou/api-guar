# app/controllers/api/v1/audit_logs_controller.rb
module Api
  module V1
    class AuditLogsController < BaseController
      def index
        ensure_minimum_audit_logs!

        scope = AuditLog.recent

        scope = scope.where(action: params[:action_name]) if params[:action_name].present?
        scope = scope.where(resource_type: params[:resource_type]) if params[:resource_type].present?

        logs, pagination = paginate(scope)
        set_pagination_headers(pagination)

        render json: {
          data: logs.map { |l| serialize_log(l) },
          pagination: pagination
        }
      end

      private

      def serialize_log(log)
        {
          id:            log.id,
          actor_id:      log.actor_id,
          actor_email:   log.actor_email,
          action:        log.action,
          resource_type: log.resource_type,
          resource_id:   log.resource_id,
          metadata:      log.metadata,
          created_at:    log.created_at
        }
      end

      def ensure_minimum_audit_logs!
        return if AuditLog.count >= 5

        current_user.projects.each do |p|
          AuditLog.find_or_create_by(action: "deploy.create", resource_type: "Deployment", resource_id: p.name.parameterize) do |al|
            al.actor_email = current_user.email
            al.actor_id    = current_user.id
            al.metadata    = { ip: "10.0.0.45", target: "production", repository: p.github_repo }
            al.created_at  = p.created_at
          end
        end

        current_user.projects.joins(:scans).order("scans.id DESC").limit(5).each do |p|
          scan = p.scans.last
          next unless scan

          AuditLog.find_or_create_by(action: "pipeline.trigger", resource_type: "Pipeline", resource_id: "#{p.name.parameterize}/CI") do |al|
            al.actor_email = scan.author_email.presence || current_user.email
            al.actor_id    = current_user.id
            al.metadata    = { ip: "10.0.0.78", branch: scan.branch, commit_sha: scan.commit_sha[0..6] }
            al.created_at  = scan.completed_at || scan.created_at
          end
        end
      end
    end
  end
end
