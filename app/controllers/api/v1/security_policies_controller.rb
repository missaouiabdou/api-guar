# app/controllers/api/v1/security_policies_controller.rb
#
# GR-601 — SecurityPolicy CRUD
#
# Routes:
#   GET    /api/v1/projects/:project_id/security_policies
#   POST   /api/v1/projects/:project_id/security_policies
#   GET    /api/v1/security_policies/:id
#   PATCH  /api/v1/security_policies/:id
#   DELETE /api/v1/security_policies/:id
#
# Authorization:
#   All policies are scoped through current_user.projects — a user can never
#   access or modify a policy belonging to another user's project.
#
module Api
  module V1
    class SecurityPoliciesController < BaseController
      before_action :set_project, only: [:index, :create]
      before_action :set_policy,  only: [:show, :update, :destroy]

      # GET /api/v1/projects/:project_id/security_policies
      def index
        policies = @project.security_policies.order(created_at: :desc)

        render json: {
          project_id: @project.id,
          total:      policies.size,
          policies:   policies.map { |p| serialize(p) }
        }
      end

      # POST /api/v1/projects/:project_id/security_policies
      def create
        policy = @project.security_policies.new(policy_params)

        if policy.save
          render json: { data: serialize(policy) }, status: :created
        else
          render json: { errors: policy.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # GET /api/v1/security_policies/:id
      def show
        render json: { data: serialize(@policy) }
      end

      # PATCH /api/v1/security_policies/:id
      def update
        if @policy.update(policy_params)
          render json: { data: serialize(@policy) }
        else
          render json: { errors: @policy.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/security_policies/:id
      def destroy
        @policy.destroy
        head :no_content
      end

      private

      # ── Authorization ───────────────────────────────────────────────────────

      def set_project
        @project = current_user.projects.find(params[:project_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Project not found" }, status: :not_found
      end

      # Ensure the policy belongs to one of the current user's projects.
      # Prevents IDOR — a user cannot access policies from another user's project.
      def set_policy
        @policy = SecurityPolicy
                    .joins(:project)
                    .where(projects: { user_id: current_user.id })
                    .find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Security policy not found" }, status: :not_found
      end

      # ── Params ──────────────────────────────────────────────────────────────

      def policy_params
        params.require(:security_policy).permit(
          :name,
          :description,
          :minimum_security_score,
          :maximum_critical,
          :maximum_high,
          :enabled,
          :block_on_failure
        )
      end

      # ── Serializer ──────────────────────────────────────────────────────────

      def serialize(policy)
        {
          id:                     policy.id,
          project_id:             policy.project_id,
          name:                   policy.name,
          description:            policy.description,
          minimum_security_score: policy.minimum_security_score,
          maximum_critical:       policy.maximum_critical,
          maximum_high:           policy.maximum_high,
          enabled:                policy.enabled,
          block_on_failure:       policy.block_on_failure,
          created_at:             policy.created_at,
          updated_at:             policy.updated_at
        }
      end
    end
  end
end
