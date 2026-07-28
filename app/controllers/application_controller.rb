class ApplicationController < ActionController::API
  before_action :authenticate_user!


  private

  def authenticate_user!
    Rails.logger.info "=== AUTH FILTER EXECUTED ==="
    Rails.logger.info "Headers: #{request.headers['Authorization'].inspect}"

    token = request.headers['Authorization']&.split(' ')&.last
    
    if token.blank?
      Rails.logger.info "=== DENYING ACCESS: TOKEN MISSING ==="
      render json: { error: 'Unauthorized: Token missing' }, status: :unauthorized and return
    end

    @current_user = User.find_by(api_token: token)

    Rails.logger.info "Token: #{token.inspect}"
    Rails.logger.info "User found: #{@current_user.inspect}"

    unless @current_user
      Rails.logger.info "=== DENYING ACCESS: INVALID TOKEN ==="
      render json: { error: 'Unauthorized: Invalid token' }, status: :unauthorized and return
    end

    Rails.logger.info "=== ACCESS GRANTED ==="
  end

  def current_user
    @current_user
  end
end