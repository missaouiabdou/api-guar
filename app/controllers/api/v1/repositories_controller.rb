# app/controllers/api/v1/repositories_controller.rb
module Api
  module V1
    class RepositoriesController < BaseController
      skip_before_action :authenticate_user!, raise: false
      before_action :set_repository, only: [:show, :update, :destroy]

      # GET /api/v1/repositories
      def index
        user = current_user || User.first
        @repositories = user ? user.repositories.recent : Repository.all.recent
        @repositories = @repositories.by_language(params[:language]) if params[:language].present?
        @repositories = @repositories.active if params[:active].present?

        render json: {
          data: @repositories.map { |r| serialize_repo(r) },
          meta: {
            total: @repositories.count,
            by_language: @repositories.unscope(:order).group(:language).count
          }
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
        @repository.destroy
        render json: { message: "Repository deleted successfully" }
      end

      private

      def set_repository
        @repository = current_user.repositories.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Repository not found" }, status: :not_found
      end

      def repository_params
        params.require(:repository).permit(
          :name, :full_name, :url, :provider, :default_branch,
          :language, :active, :project_id, metadata: {}
        )
      end

      def serialize_repo(r)
        {
          id:                 r.id,
          name:               r.name,
          full_name:          r.full_name,
          url:                r.url,
          provider:           r.provider,
          default_branch:     r.default_branch,
          language:           r.language,
          active:             r.active,
          project_id:         r.project_id,
          supported_scanners: r.supported_scanners,
          created_at:         r.created_at,
          updated_at:         r.updated_at
        }
      end
    end
  end
end
