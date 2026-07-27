class ProjectsController < ApplicationController
  #before_action :authenticate_user!
  before_action :set_project, only: [:show, :update, :destroy]

  def index
    render json: Project.all
  end

  def show
    render json: @project
  end

  def create
    project = Project.new(project_params)

    if project.save
      render json: project, status: :created
    else
      render json: { errors: project.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @project.update(project_params)
      render json: @project
    else
      render json: { errors: @project.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @project.destroy
    head :no_content
  end

  private

  def set_project
    @project = Project.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Project not found" }, status: :not_found
  end

  def project_params
    params.require(:project).permit(
      :name,
      :description,
      :repository_url,
      :status
    )
  end
end