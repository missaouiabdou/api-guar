# app/services/security/dashboard_builder.rb
#
# GR-501 — Security Dashboard KPIs
# GR-502 — Vulnerability Analytics
# GR-505 — Regression Alerts
#
# Builds a complete security dashboard payload for a single project.
# All queries are scoped to the given project — never leaks cross-project data.
#
# Usage:
#   result = Security::DashboardBuilder.call(project)
#   result[:overview]
#   result[:vulnerabilities_by_severity]
#   result[:regression]
#
module Security
  class DashboardBuilder
    def self.call(project)
      new(project).call
    end

    def initialize(project)
      @project = project
    end

    def call
      {
        project:    project_info,
        overview:   overview,

        # GR-502 — Analytics
        vulnerabilities_by_severity: by_severity,
        vulnerabilities_by_scanner:  by_scanner,
        vulnerabilities_by_scan_type: by_scan_type,

        # GR-505 — Regression
        regression: regression_data
      }
    end

    private

    attr_reader :project

    # ── Project ──────────────────────────────────────────────────────────────

    def project_info
      {
        id:         project.id,
        name:       project.name,
        github_repo: project.github_repo
      }
    end

    # ── Overview KPIs (GR-501) ────────────────────────────────────────────────

    def overview
      score_data = latest_scan ? Security::ScoreCalculator.call(latest_scan) : nil

      {
        total_scans:               project.scans.count,
        completed_scans:           project.scans.completed.count,
        open_vulnerabilities:      open_project_vulns.count,
        critical_vulnerabilities:  open_project_vulns.where(severity: "critical").count,
        high_vulnerabilities:      open_project_vulns.where(severity: "high").count,
        security_score:            score_data&.dig(:score),
        risk_level:                score_data&.dig(:risk_level),
        last_scan_at:              latest_scan&.completed_at,
        last_scan_id:              latest_scan&.id,
        last_scan_status:          latest_scan&.status
      }
    end

    # ── Analytics (GR-502) ────────────────────────────────────────────────────

    def by_severity
      counts = open_project_vulns
                 .group(:severity)
                 .count

      # Ensure all severities are present even if count = 0
      Vulnerability::SEVERITIES.each_with_object({}) do |sev, h|
        h[sev] = counts[sev] || 0
      end
    end

    def by_scanner
      counts = open_project_vulns
                 .group(:scanner)
                 .count

      # Build from known scanners, but also include any DB scanners not in the list
      known = Vulnerability::SCANNERS.each_with_object({}) do |scanner, h|
        h[scanner] = counts[scanner] || 0
      end

      # Merge in any extra scanners found in DB (e.g. future scanners)
      counts.each { |scanner, count| known[scanner] ||= count }

      # Remove zero-count scanners for cleaner output
      known.reject { |_, v| v.zero? }
    end

    def by_scan_type
      counts = open_project_vulns
                 .group(:scan_type)
                 .count

      Vulnerability::SCAN_TYPES.each_with_object({}) do |type, h|
        h[type] = counts[type] || 0
      end
    end

    # ── Regression (GR-505) ───────────────────────────────────────────────────
    #
    # Reuses Security::RegressionDetector (single source of truth for regression
    # logic) and projects its richer result onto the exact shape the GR-505 ticket
    # specifies. We intentionally do NOT change RegressionDetector's own output,
    # since other endpoints (project_overview, scan_summary) rely on its full hash.
    def regression_data
      return nil unless latest_scan && previous_scan

      raw = Security::RegressionDetector.call(latest_scan, previous_scan)
      return nil unless raw

      {
        detected:            raw[:regression],
        previous_score:      raw[:previous_score],
        current_score:       raw[:current_score],
        score_change:        raw[:score_change],
        new_vulnerabilities: Array(raw[:new_vulnerabilities]).size
      }
    end

    # ── Helpers ───────────────────────────────────────────────────────────────

    # All OPEN vulnerabilities scoped to this project (across all scans)
    # Uses a JOIN to avoid loading scan objects
    def open_project_vulns
      @open_project_vulns ||= Vulnerability
                                .joins(:scan)
                                .where(scans: { project_id: project.id })
                                .open
    end

    def completed_scans
      @completed_scans ||= project.scans.completed.recent
    end

    def latest_scan
      @latest_scan ||= completed_scans.first
    end

    def previous_scan
      @previous_scan ||= completed_scans.second
    end
  end
end
