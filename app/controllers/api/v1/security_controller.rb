# app/controllers/api/v1/security_controller.rb
module Api
  module V1
    class SecurityController < BaseController
      before_action :set_scan,    only: [:scan_summary, :policy_results, :gate]
      before_action :set_project, only: [:project_overview, :dashboard, :history, :recent_vulnerabilities]

      # GET /api/v1/scans/:scan_id/security_summary
      def scan_summary
        result    = Security::ScoreCalculator.call(@scan)
        vulns     = @scan.vulnerabilities
        regression = detect_regression(@scan)

        render json: {
          scan_id:        @scan.id,
          project_id:     @scan.project_id,
          commit_sha:     @scan.commit_sha,
          branch:         @scan.branch,
          scanned_at:     @scan.completed_at,
          security_score: result[:score],
          risk_level:     result[:risk_level],
          vulnerabilities: {
            critical: vulns.count { |v| v.severity == "critical" },
            high:     vulns.count { |v| v.severity == "high" },
            medium:   vulns.count { |v| v.severity == "medium" },
            low:      vulns.count { |v| v.severity == "low" },
            info:     vulns.count { |v| v.severity == "info" }
          },
          status: {
            open:     vulns.count { |v| v.status == "open" },
            resolved: vulns.count { |v| v.status == "resolved" },
            ignored:  vulns.count { |v| v.status == "ignored" }
          },
          score_breakdown: result[:breakdown],
          regression:      regression
        }
      end

      # GET /api/v1/projects/:project_id/security
      def project_overview
        scans   = @project.scans.completed.recent
        latest  = scans.first
        prev    = scans.second

        unless latest
          return render json: { message: "No completed scans for this project" }, status: :not_found
        end

        latest_result   = Security::ScoreCalculator.call(latest)
        previous_result = prev ? Security::ScoreCalculator.call(prev) : nil
        regression      = Security::RegressionDetector.call(latest, prev)

        render json: {
          project_id:   @project.id,
          project_name: @project.name,
          github_repo:  @project.github_repo,
          latest_scan: {
            id:          latest.id,
            branch:      latest.branch,
            commit_sha:  latest.commit_sha,
            scanned_at:  latest.completed_at,
            score:       latest_result[:score],
            risk_level:  latest_result[:risk_level],
            vulnerabilities: {
              critical: latest.critical_count,
              high:     latest.high_count,
              medium:   latest.medium_count,
              low:      latest.low_count
            }
          },
          trend:  build_trend(latest_result, previous_result, prev),
          regression: regression,
          scan_history: scans.first(5).map { |s|
            sr = Security::ScoreCalculator.call(s)
            {
              id:         s.id,
              branch:     s.branch,
              commit_sha: s.commit_sha,
              score:      sr[:score],
              risk_level: sr[:risk_level],
              scanned_at: s.completed_at
            }
          }
        }
      end

      # GET /api/v1/projects/:project_id/dashboard
      # GR-501 — Dashboard KPIs, GR-502 — Analytics, GR-505 — Regression
      def dashboard
        payload = Security::DashboardBuilder.call(@project)
        render json: payload
      end

      # GET /api/v1/projects/:project_id/security/history
      # GR-503 — Score History
      def history
        limit = [[params.fetch(:limit, 20).to_i, 1].max, 100].min

        scans = @project.scans
                        .completed
                        .recent
                        .limit(limit)

        render json: {
          project_id: @project.id,
          total:      scans.size,
          limit:      limit,
          history:    scans.map { |s| serialize_scan_history(s) }
        }
      end

      # GET /api/v1/projects/:project_id/vulnerabilities/recent
      # GR-504 — Recent Vulnerabilities
      def recent_vulnerabilities
        limit = [[params.fetch(:limit, 10).to_i, 1].max, 100].min

        scan_ids = @project.scans.pluck(:id)
        vulns    = Vulnerability
                     .where(scan_id: scan_ids)
                     .open
                     .by_severity
                     .order(created_at: :desc)
                     .limit(limit)

        render json: {
          project_id: @project.id,
          total:      vulns.size,
          limit:      limit,
          vulnerabilities: vulns.map { |v| serialize_recent_vuln(v) }
        }
      end

      # GET /api/v1/scans/:scan_id/policy_results
      # GR-604 — Scan Policy Results
      #
      # Returns the persisted policy evaluation results for a scan.
      # If no evaluations exist yet (e.g. no policies defined at scan time),
      # returns passed: true with an empty policies array.
      def policy_results
        evaluations = @scan.policy_evaluations.includes(:security_policy)

        policies_payload = evaluations.map { |ev| serialize_policy_evaluation(ev) }
        overall_passed   = evaluations.empty? || evaluations.all?(&:passed)

        render json: {
          scan_id:  @scan.id,
          passed:   overall_passed,
          total:    policies_payload.size,
          policies: policies_payload
        }
      end

      # GET /api/v1/scans/:scan_id/gate
      # GR-901 — Security Gate Endpoint (CI/CD friendly)
      #
      # Combines security score + policy evaluation results into a single
      # decision suitable for CI/CD systems.
      #
      # Status semantics:
      #   passed  — score >= 70 AND all policies passed
      #   warning — score in 40..69 AND policies passed (or no policies)
      #   failed  — score < 40 OR any blocking policy failed
      def gate
        score_data  = Security::ScoreCalculator.call(@scan)
        evaluations = @scan.policy_evaluations.includes(:security_policy)

        policy_passed   = evaluations.empty? || evaluations.all?(&:passed)
        blocking_failed = evaluations.any? { |ev| !ev.passed && ev.security_policy&.block_on_failure }

        status = compute_gate_status(score_data[:score], policy_passed, blocking_failed)

        open_by_severity = @scan.vulnerabilities.open.group(:severity).count

        render json: {
          scan_id:        @scan.id,
          status:         status,
          security_score: score_data[:score],
          risk_level:     score_data[:risk_level],
          policy_passed:  policy_passed,
          critical:       open_by_severity["critical"] || 0,
          high:           open_by_severity["high"]     || 0,
          medium:         open_by_severity["medium"]   || 0,
          low:            open_by_severity["low"]      || 0,
          policies:       evaluations.map { |ev| serialize_policy_evaluation(ev) }
        }
      end

      private

      # ── Authorization ──────────────────────────────────────────────────────

      def set_scan
        # Verify the scan belongs to one of the current user's projects.
        # Accept both :scan_id (nested routes) and :id (member routes).
        scan_id = params[:scan_id] || params[:id]
        project_ids = current_user.projects.pluck(:id)
        @scan = Scan.includes(:vulnerabilities)
                    .where(project_id: project_ids)
                    .find(scan_id)
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Scan not found" }, status: :not_found
      end

      def set_project
        @project = current_user.projects.find(params[:project_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Project not found" }, status: :not_found
      end

      # ── Helpers ───────────────────────────────────────────────────────────

      def detect_regression(scan)
        prev = scan.project.scans.completed
                   .where("id < ?", scan.id)
                   .order(id: :desc)
                   .first
        Security::RegressionDetector.call(scan, prev)
      end

      def build_trend(latest_result, previous_result, prev_scan)
        return nil unless previous_result

        {
          previous_scan_id: prev_scan.id,
          previous_score:   previous_result[:score],
          current_score:    latest_result[:score],
          change:           latest_result[:score] - previous_result[:score],
          change_label:     format_change(latest_result[:score] - previous_result[:score])
        }
      end

      def format_change(delta)
        return "+#{delta}" if delta > 0
        return delta.to_s  if delta < 0
        "±0"
      end

      # ── Serializers ───────────────────────────────────────────────────────

      def serialize_scan_history(scan)
        result = Security::ScoreCalculator.call(scan)
        {
          scan_id:              scan.id,
          branch:               scan.branch,
          commit_sha:           scan.commit_sha,
          security_score:       result[:score],
          risk_level:           result[:risk_level],
          open_vulnerabilities: scan.vulnerabilities.open.count,
          created_at:           scan.completed_at
        }
      end

      def serialize_recent_vuln(v)
        {
          id:           v.id,
          warning_type: v.warning_type,
          severity:     v.severity,
          scanner:      v.scanner,
          scan_type:    v.scan_type,
          status:       v.status,
          file:         v.file,
          line:         v.line,
          message:      v.message,
          scan_id:      v.scan_id,
          created_at:   v.created_at
        }
      end

      # GR-604 / GR-901 — Policy evaluation serialization
      def serialize_policy_evaluation(ev)
        policy = ev.security_policy
        {
          policy_id:        ev.security_policy_id,
          name:             policy&.name,
          passed:           ev.passed,
          block_on_failure: policy&.block_on_failure,
          violations:       ev.violations || [],
          evaluated_at:     ev.evaluated_at
        }
      end

      # GR-901 — Gate status decision
      def compute_gate_status(score, policy_passed, blocking_failed)
        return "failed" if blocking_failed
        return "failed" if score < 40
        return "warning" if score < 70 || !policy_passed
        "passed"
      end
    end
  end
end
