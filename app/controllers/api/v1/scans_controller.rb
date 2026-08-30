module Api
  module V1
    class ScansController < BaseController
      skip_before_action :authenticate_user!, raise: false

      def index
        user = current_user || User.first
        scans = if user
                  user.projects.includes(:scans).flat_map(&:scans).sort_by(&:created_at).reverse
                else
                  Scan.order(created_at: :desc)
                end
        render json: scans
      end

      def show
        user = current_user || User.first
        scan = if user
                 Scan.joins(:project).includes(:vulnerabilities).find_by!(id: params[:id], projects: { user_id: user.id })
               else
                 Scan.includes(:vulnerabilities).find(params[:id])
               end
        render json: scan.as_json(include: :vulnerabilities)
      end
    end
  end
end