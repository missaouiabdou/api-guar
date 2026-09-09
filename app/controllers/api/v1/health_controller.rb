# app/controllers/api/v1/health_controller.rb
module Api
  module V1
    class HealthController < ApplicationController
      skip_before_action :authenticate_user!, only: [:show]

      def show
        render json: { status: "ok" }, status: :ok
      end
    end
  end
end
