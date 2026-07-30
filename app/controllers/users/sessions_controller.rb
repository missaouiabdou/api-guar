class Users::SessionsController < Devise::SessionsController
  respond_to :json

  private

  def respond_with(current_user, _opts = {})
    render json: {
      message: "Logged in successfully",
      user: {
        id: current_user.id,
        email: current_user.email
      }
    }, status: :ok
  end

  def respond_to_on_destroy
    render json: {
      message: "Logged out successfully"
    }, status: :ok
  end
end