class Users::RegistrationsController < Devise::RegistrationsController
  respond_to :json

  def create
    build_resource(sign_up_params)

    if resource.save
      if resource.active_for_authentication?
        sign_in(resource_name, resource, store: false)
        render json: {
          message: "Signed up successfully",
          user: {
            id: resource.id,
            email: resource.email
          }
        }, status: :created
      else
        expire_data_after_sign_in!
        render json: {
          message: "Signed up successfully",
          user: {
            id: resource.id,
            email: resource.email
          }
        }, status: :created
      end
    else
      clean_up_passwords resource
      set_minimum_password_length
      render json: {
        message: "User could not be created",
        errors: resource.errors.full_messages
      }, status: :unprocessable_entity
    end
  end
end
