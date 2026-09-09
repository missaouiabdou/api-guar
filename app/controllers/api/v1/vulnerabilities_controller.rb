# app/controllers/api/v1/vulnerabilities_controller.rb
module Api
  module V1
    class VulnerabilitiesController < BaseController
      before_action :set_vulnerability, only: [ :show, :update ]

      # GET /api/v1/scans/:scan_id/vulnerabilities
      # GET /api/v1/vulnerabilities
      def index
        vulns   = scoped_vulnerabilities
        vulns   = apply_filters(vulns)
        ordered = vulns.by_severity

        records, pagination = paginate(ordered)

        render json: {
          data:       serialize_list(records),
          meta:       build_meta(vulns),
          pagination: pagination
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
        when "reopened" then @vulnerability.reopen!
        when "open"     then @vulnerability.update!(status: "open", reason: nil, resolved_at: nil)
        end

        AuditService.log(
          actor:         current_user,
          action:        "vulnerability_#{new_status}",
          resource_type: "Vulnerability",
          resource_id:   @vulnerability.id,
          metadata:      {
            fingerprint:  @vulnerability.fingerprint,
            file:         @vulnerability.file,
            severity:     @vulnerability.severity,
            reason:       reason
          }
        )

        render json: { data: serialize_detail(@vulnerability) }
      end

      private

      # ── Authorization ────────────────────────────────────────────────────────

      def user_scan_ids
        @user_scan_ids ||= current_user.projects.joins(:scans).pluck("scans.id")
      end

      def set_vulnerability
        @vulnerability = Vulnerability.where(scan_id: user_scan_ids).find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Vulnerability not found" }, status: :not_found
      end

      # ── Scoping ───────────────────────────────────────────────────────────────

      def scoped_vulnerabilities
        if params[:scan_id].present?
          # nested route: GET /scans/:scan_id/vulnerabilities
          scan = Scan.joins(:project)
                     .find_by!(id: params[:scan_id], projects: { user_id: current_user.id })
          scan.vulnerabilities
        elsif params[:project_id].present?
          project = current_user.projects.find(params[:project_id])
          if params[:latest].to_s == 'true' || params[:latest].to_s == '1' || params[:status] == 'open'
            latest_scan = project.scans.completed.order(created_at: :desc).first
            latest_scan ? latest_scan.vulnerabilities : Vulnerability.none
          else
            Vulnerability.joins(:scan).where(scans: { project_id: project.id })
          end
        else
          Vulnerability.where(scan_id: user_scan_ids)
        end
      end

      def apply_filters(scope)
        scope = scope.where(severity:  params[:severity])  if params[:severity].present?
        scope = scope.where(status:    params[:status])    if params[:status].present?
        scope = scope.where(scanner:   params[:scanner])   if params[:scanner].present?
        scope = scope.where(scan_type: params[:scan_type]) if params[:scan_type].present?
        if params[:query].present?
          q = "%#{params[:query]}%"
          scope = scope.where("message ILIKE :q OR file ILIKE :q OR warning_type ILIKE :q", q: q)
        end
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
            id:           v.id,
            warning_type: v.warning_type,
            severity:     v.severity,
            confidence:   v.confidence,
            message:      v.message,
            cwe:          Array(v.cwe_id).map { |id| "CWE-#{id}" },
            file:         v.file,
            line:         v.line,
            code:         v.code,
            scanner:      v.scanner,
            scan_type:    v.scan_type,
            fingerprint:  v.fingerprint,
            status:       v.status,
            scan_id:      v.scan_id,
            created_at:   v.created_at
          }
        end
      end

      def serialize_detail(v)
        # Find lifecycle occurrences for the same fingerprint across historical scans
        history_records = Vulnerability.where(fingerprint: v.fingerprint)
                                       .joins(:scan)
                                       .where(scans: { project_id: v.scan&.project_id })
                                       .order("scans.created_at DESC")
                                       .limit(10)
                                       .map do |h|
          {
            scan_id:     h.scan_id,
            commit_sha:  h.scan&.commit_sha,
            branch:      h.scan&.branch,
            status:      h.status,
            reason:      h.reason,
            resolved_at: h.resolved_at,
            reopened_at: h.reopened_at,
            scanned_at:  h.scan&.completed_at || h.created_at
          }
        end

        remediation = generate_remediation(v)

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
          scanner:       v.scanner,
          scan_type:     v.scan_type,
          user_input:    v.user_input,
          location:      {
            class:  v.location_class,
            method: v.location_method
          },
          fingerprint:   v.fingerprint,
          status:        v.status,
          reason:        v.reason,
          remediation:   remediation,
          lifecycle_history: history_records,
          resolved_at:   v.resolved_at,
          reopened_at:   v.reopened_at,
          scan_id:       v.scan_id,
          created_at:    v.created_at
        }
      end

      def generate_remediation(v)
        case v.scan_type
        when "secret"
          "1. Immediately rotate and revoke the exposed credential in the respective cloud provider or service.\n" \
          "2. Remove the secret from source code and replace with an environment variable or secrets manager.\n" \
          "3. Purge the secret from Git commit history if committed to a remote repository."
        when "dependency"
          patched = v.location.is_a?(Hash) ? v.location["patched_versions"] : nil
          if patched.present?
            "Upgrade dependency to patched version: #{Array(patched).join(', ')} via package manager."
          else
            "Update the vulnerable package to the latest secure release using your package manager (bundler or npm)."
          end
        else
          "Review the flagged code and sanitize user input. Avoid raw command execution, SQL interpolation, or unvalidated parameters."
        end
      end

      # Aggregate counts computed in SQL (GROUP BY) rather than loading every
      # matching row into memory — safe for scans with thousands of findings.
      def build_meta(vulns)
        base        = vulns.unscope(:order)
        by_status   = base.group(:status).count
        by_severity = base.group(:severity).count

        {
          total:    by_status.values.sum,
          open:     by_status["open"]     || 0,
          resolved: by_status["resolved"] || 0,
          ignored:  by_status["ignored"]  || 0,
          by_severity: {
            critical: by_severity["critical"] || 0,
            high:     by_severity["high"]     || 0,
            medium:   by_severity["medium"]   || 0,
            low:      by_severity["low"]      || 0,
            info:     by_severity["info"]     || 0
          }
        }
      end
    end
  end
end
