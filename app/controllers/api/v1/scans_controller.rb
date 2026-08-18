module Api
  module V1
    class ScansController < BaseController
      def index
        scans = current_user.projects.includes(:scans).flat_map(&:scans).sort_by(&:created_at).reverse
        render json: scans
      end

      def show
        scan = Scan.joins(:project).find_by!(id: params[:id], projects: { user_id: current_user.id })
        render json: scan
      end
    end
  end
end