# app/services/security/regression_detector.rb
module Security
  class RegressionDetector
    SEVERITY_WEIGHTS = {
      "critical" => 100,
      "high"     =>  10,
      "medium"   =>   3,
      "low"      =>   1,
      "info"     =>   0
    }.freeze

    attr_reader :current_scan, :previous_scan

    def self.call(current_scan, previous_scan)
      new(current_scan, previous_scan).call
    end

    def initialize(current_scan, previous_scan)
      @current_scan  = current_scan
      @previous_scan = previous_scan
    end

    def call
      return nil if previous_scan.nil?

      current_result  = Security::ScoreCalculator.call(current_scan)
      previous_result = Security::ScoreCalculator.call(previous_scan)

      current_score  = current_result[:score]
      previous_score = previous_result[:score]
      score_change   = current_score - previous_score

      new_vulns     = new_vulnerabilities
      fixed_vulns   = fixed_vulnerabilities
      regression    = score_change < 0 && new_vulns.any?

      {
        regression:        regression,
        current_score:     current_score,
        previous_score:    previous_score,
        score_change:      score_change,
        score_change_label: format_change(score_change),
        current_risk:      current_result[:risk_level],
        previous_risk:     previous_result[:risk_level],
        new_vulnerabilities: new_vulns.map { |v| { warning_type: v.warning_type, severity: v.severity } },
        fixed_vulnerabilities: fixed_vulns.map { |v| { warning_type: v.warning_type, severity: v.severity } },
        previous_scan_id:  previous_scan.id,
        message:           regression_message(regression, score_change, new_vulns)
      }
    end

    private

    def current_fingerprints
      @current_fingerprints ||= current_scan.vulnerabilities.pluck(:fingerprint).to_set
    end

    def previous_fingerprints
      @previous_fingerprints ||= previous_scan.vulnerabilities.pluck(:fingerprint).to_set
    end

    # Triaged false positives (ignored) are neither "new" nor "fixed" —
    # they are deliberate decisions, not regressions.
    def new_vulnerabilities
      new_fps = current_fingerprints - previous_fingerprints
      current_scan.vulnerabilities
                  .where(fingerprint: new_fps.to_a)
                  .where.not(status: "ignored")
    end

    def fixed_vulnerabilities
      fixed_fps = previous_fingerprints - current_fingerprints
      previous_scan.vulnerabilities
                   .where(fingerprint: fixed_fps.to_a)
                   .where.not(status: "ignored")
    end

    def format_change(delta)
      return "+#{delta}" if delta > 0
      return "#{delta}"  if delta < 0
      "±0"
    end

    def regression_message(regression, score_change, new_vulns)
      if regression
        "⚠️ Security regression detected: #{new_vulns.size} new vulnerability(ies) introduced (score #{format_change(score_change)})"
      elsif score_change > 0
        "✅ Security improved: score #{format_change(score_change)}"
      else
        "➡️ No security change"
      end
    end
  end
end
