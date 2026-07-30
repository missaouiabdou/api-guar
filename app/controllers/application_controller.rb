class ApplicationController < ActionController::API
  before_action :authenticate_user!

  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActionController::ParameterMissing, with: :bad_request
  rescue_from ActiveRecord::RecordInvalid, with: :unprocessable
  rescue_from ActiveRecord::RecordNotSaved, with: :unprocessable

  private

  def not_found
    render json: {
      success: false,
      error: "Resource not found"
    }, status: :not_found
  end

  def bad_request(exception)
    render json: {
      success: false,
      error: exception.message
    }, status: :bad_request
  end

  def unprocessable(exception)
    render json: {
      success: false,
      errors: exception.record.errors.full_messages
    }, status: :unprocessable_entity
  end
end