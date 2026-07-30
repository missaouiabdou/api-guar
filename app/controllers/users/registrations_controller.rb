class Users::RegistrationsController < Devise::RegistrationsController
  respond_to :json

  def create
    build_resource(sign_up_params)

    if resource.save
      sign_in(resource_name, resource, store: false)
      render json: {
        message: "Signed up successfully",
        user: {
          id: resource.id,
          email: resource.email
        }
      }, status: :created
    else
      render json: {
        message: "User could not be created",
        errors: resource.errors.full_messages
      }, status: :unprocessable_entity
    end
  end
end