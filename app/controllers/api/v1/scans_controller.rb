# app/controllers/api/v1/scans_controller.rb
module Api
  module V1
    class ScansController < BaseController
      def index
        # Scoped through the owning project's user_id (IDOR-safe) and paginated
        # in SQL. Kept as a bare JSON array for backward compatibility with the
        # frontend's getScans(); pagination is exposed via response headers.
        scope = Scan.joins(:project)
                    .where(projects: { user_id: current_user.id })
                    .order(created_at: :desc)

        scans, pagination = paginate(scope)
        set_pagination_headers(pagination)

        render json: scans
      end

      def show
        scan = Scan.joins(:project)
                   .includes(:vulnerabilities)
                   .find_by!(id: params[:id], projects: { user_id: current_user.id })
        render json: scan.as_json(include: :vulnerabilities)
      end

      # POST /api/v1/scans
      # POST /api/v1/projects/:project_id/scans
      # Priority 4: Manual Scan Trigger with background execution & concurrency guard
      def create
        project_id = params[:project_id] || params.dig(:scan, :project_id)
        project    = current_user.projects.find(project_id)

        branch = params.dig(:scan, :branch).presence ||
                 params[:branch].presence ||
                 project.default_branch.presence ||
                 "main"

        # Concurrency guard: prevent duplicate concurrent scans for same project/branch
        active_scan = project.scans
                             .where(status: %w[pending processing], branch: branch)
                             .order(created_at: :desc)
                             .first

        if active_scan
          return render json: {
            error: "A scan is already in progress for branch '#{branch}'",
            scan_id: active_scan.id,
            status: active_scan.status
          }, status: :conflict
        end

        scan = project.scans.create!(
          scan_id:     "manual-#{SecureRandom.hex(8)}",
          source_type: "manual",
          branch:      branch,
          commit_sha:  params.dig(:scan, :commit_sha).presence || params[:commit_sha].presence || "HEAD",
          status:      "pending",
          scanned_at:  Time.current
        )

        ScanJob.perform_later(scan.id)

        AuditService.log(
          actor:         current_user,
          action:        "scan_triggered",
          resource_type: "Scan",
          resource_id:   scan.id,
          metadata:      {
            project_id: project.id,
            project_name: project.name,
            branch:     branch,
            source:     "manual"
          }
        )

        render json: {
          message: "Scan successfully queued",
          data: scan
        }, status: :accepted
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Project not found" }, status: :not_found
      rescue ActiveRecord::RecordInvalid => e
        render json: { error: e.message }, status: :unprocessable_entity
      end
    end
  end
end
