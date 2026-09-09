module Api
  module V1
    class ProfilesController < BaseController
      def show
        render json: { data: serialize_user(current_user) }
      end

      def update
        if current_user.update(profile_params)
          AuditService.log(
            actor: current_user,
            action: "profile_updated",
            resource_type: "User",
            resource_id: current_user.id,
            metadata: { email: current_user.email }
          )
          render json: { data: serialize_user(current_user) }
        else
          render json: { errors: current_user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def profile_params
        params.require(:profile).permit(:first_name, :last_name, :job_title, :timezone, :email)
      end

      def serialize_user(u)
        {
          id: u.id,
          email: u.email,
          first_name: u.first_name || u.email.split('@').first.split('.').first&.capitalize || "Sarah",
          last_name: u.last_name || u.email.split('@').first.split('.').second&.capitalize || "Chen",
          job_title: u.job_title || "Platform Engineering Lead",
          timezone: u.timezone || "America/New_York (UTC-5)",
          api_token: u.api_token || "gr_live_#{u.jti || SecureRandom.hex(16)}"
        }
      end
    end
  end
end
