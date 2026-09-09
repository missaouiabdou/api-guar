class Users::SessionsController < Devise::SessionsController
  respond_to :json

  private

  def respond_with(current_user, _opts = {})
    AuditService.log(
      actor: current_user,
      action: "user_login",
      resource_type: "User",
      resource_id: current_user.id,
      metadata: { email: current_user.email }
    )

    render json: {
      message: "Logged in successfully",
      user: {
        id: current_user.id,
        email: current_user.email
      }
    }, status: :ok
  end

  def respond_to_on_destroy
    AuditService.log(
      actor: current_user,
      action: "user_logout",
      resource_type: "User",
      resource_id: current_user&.id,
      metadata: { email: current_user&.email }
    )

    render json: {
      message: "Logged out successfully"
    }, status: :ok
  end
end