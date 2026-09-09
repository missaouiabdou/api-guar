# app/controllers/api/v1/projects_controller.rb
module Api
  module V1
    class ProjectsController < BaseController
      before_action :set_project, only: [:show, :update, :destroy]

      def index
        scope = current_user.projects.includes(:scans).order(created_at: :desc)
        projects, pagination = paginate(scope)

        render json: {
          data:       projects.map { |p| serialize_project(p) },
          pagination: pagination
        }
      end

      def show
        render json: { data: serialize_project(@project) }
      end

      def create
        @project = current_user.projects.build(project_params)

        if @project.save
          AuditService.log(
            actor: current_user,
            action: "project_created",
            resource_type: "Project",
            resource_id: @project.id,
            metadata: { name: @project.name, repo: @project.github_repo }
          )
          render json: @project, status: :created
        else
          render json: { errors: @project.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @project.update(project_params)
          AuditService.log(
            actor: current_user,
            action: "project_updated",
            resource_type: "Project",
            resource_id: @project.id,
            metadata: { name: @project.name }
          )
          render json: @project
        else
          render json: { errors: @project.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        AuditService.log(
          actor: current_user,
          action: "project_deleted",
          resource_type: "Project",
          resource_id: @project.id,
          metadata: { name: @project.name }
        )
        @project.destroy
        head :no_content
      end

      private

      def set_project
        @project = current_user.projects.find(params[:id])
      end

      def project_params
        params.require(:project).permit(:name, :description, :repository_url, :status, :github_repo)
      end

      def serialize_project(project)
        latest_scan = project.scans.completed.order(created_at: :desc).first
        score_data = latest_scan ? Security::ScoreCalculator.call(latest_scan) : nil
        scan_ids = project.scans.pluck(:id)
        open_vulns_count = Vulnerability.where(scan_id: scan_ids).open.count
        repo = project.repositories.first || Repository.find_by(full_name: project.github_repo)

        {
          id:                 project.id,
          name:               project.name,
          description:        project.description,
          repository_url:     project.repository_url,
          github_repo:        project.github_repo,
          default_branch:     project.default_branch || 'main',
          status:             project.status,
          language:           repo&.language,
          scans_count:        project.scans.count,
          open_vulns_count:   open_vulns_count,
          security_score:     score_data ? score_data[:score] : nil,
          risk_level:         score_data ? score_data[:risk_level] : nil,
          last_scanned_at:    latest_scan&.completed_at || latest_scan&.created_at,
          created_at:         project.created_at,
          updated_at:         project.updated_at
        }
      end
    end
  end
end