# app/controllers/api/v1/vulnerabilities_controller.rb
module Api
  module V1
    class VulnerabilitiesController < BaseController
      skip_before_action :authenticate_user!, raise: false
      before_action :set_vulnerability, only: [:show, :update]

      # GET /api/v1/scans/:scan_id/vulnerabilities
      # GET /api/v1/vulnerabilities
      def index
        vulns = scoped_vulnerabilities
        vulns = apply_filters(vulns)
        vulns = vulns.by_severity

        render json: {
          data: serialize_list(vulns),
          meta: build_meta(vulns)
        }
      end

      # GET /api/v1/vulnerabilities/:id
      def show
        render json: { data: serialize_detail(@vulnerability) }
      end

      # PATCH /api/v1/vulnerabilities/:id
      def update
        new_status = vulnerability_params[:status]
        reason     = vulnerability_params[:reason]

        unless Vulnerability::STATUSES.include?(new_status)
          return render json: {
            error: "Invalid status '#{new_status}'. Valid: #{Vulnerability::STATUSES.join(', ')}"
          }, status: :unprocessable_entity
        end

        case new_status
        when "resolved" then @vulnerability.resolve!(reason: reason)
        when "ignored"  then @vulnerability.ignore!(reason: reason)
        when "open"     then @vulnerability.reopen!
        end

        render json: { data: serialize_detail(@vulnerability) }
      end

      private

      # ── Authorization ────────────────────────────────────────────────────────

      def user_scan_ids
        user = current_user || User.first
        @user_scan_ids ||= if user
                             user.projects.joins(:scans).pluck("scans.id")
                           else
                             Scan.pluck(:id)
                           end
      end

      def set_vulnerability
        @vulnerability = Vulnerability.where(scan_id: user_scan_ids).find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Vulnerability not found" }, status: :not_found
      end

      # ── Scoping ───────────────────────────────────────────────────────────────

      def scoped_vulnerabilities
        user = current_user || User.first
        if params[:scan_id].present?
          # nested route: GET /scans/:scan_id/vulnerabilities
          scan = if user
                   Scan.joins(:project)
                       .find_by!(id: params[:scan_id], projects: { user_id: user.id })
                 else
                   Scan.find(params[:scan_id])
                 end
          scan.vulnerabilities
        else
          Vulnerability.where(scan_id: user_scan_ids)
        end
      end

      def apply_filters(scope)
        scope = scope.where(severity: params[:severity]) if params[:severity].present?
        scope = scope.where(status:   params[:status])   if params[:status].present?
        scope
      end

      # ── Params ────────────────────────────────────────────────────────────────

      def vulnerability_params
        params.require(:vulnerability).permit(:status, :reason)
      end

      # ── Serializers ───────────────────────────────────────────────────────────

      def serialize_list(vulns)
        vulns.map do |v|
          {
            id:          v.id,
            warning_type: v.warning_type,
            severity:    v.severity,
            confidence:  v.confidence,
            message:     v.message,
            cwe:         Array(v.cwe_id).map { |id| "CWE-#{id}" },
            file:        v.file,
            line:        v.line,
            status:      v.status,
            scan_id:     v.scan_id
          }
        end
      end

      def serialize_detail(v)
        {
          id:            v.id,
          warning_type:  v.warning_type,
          check_name:    v.check_name,
          severity:      v.severity,
          confidence:    v.confidence,
          message:       v.message,
          cwe:           Array(v.cwe_id).map { |id| "CWE-#{id}" },
          file:          v.file,
          line:          v.line,
          code:          v.code,
          user_input:    v.user_input,
          location:      {
            class:  v.location_class,
            method: v.location_method
          },
          fingerprint:   v.fingerprint,
          status:        v.status,
          reason:        v.reason,
          resolved_at:   v.resolved_at,
          scan_id:       v.scan_id,
          created_at:    v.created_at
        }
      end

      def build_meta(vulns)
        all = vulns.to_a
        {
          total:    all.size,
          open:     all.count { |v| v.status == "open" },
          resolved: all.count { |v| v.status == "resolved" },
          ignored:  all.count { |v| v.status == "ignored" },
          by_severity: {
            critical: all.count { |v| v.severity == "critical" },
            high:     all.count { |v| v.severity == "high" },
            medium:   all.count { |v| v.severity == "medium" },
            low:      all.count { |v| v.severity == "low" },
            info:     all.count { |v| v.severity == "info" }
          }
        }
      end
    end
  end
end
