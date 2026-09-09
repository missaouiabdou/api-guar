# app/services/security/policy_evaluator.rb
#
# GR-602 — Policy Evaluation
# GR-603 — Persist evaluation results after scan completes
#
# Evaluates a SecurityPolicy against a completed Scan.
# Checks each policy rule and records violations.
#
# Usage:
#   result = Security::PolicyEvaluator.call(scan: scan, policy: policy)
#   result[:passed]     # => false
#   result[:violations] # => [{rule: "maximum_high", expected: 2, actual: 5}]
#
# Persist to DB:
#   Security::PolicyEvaluator.call(scan: scan, policy: policy, persist: true)
#
module Security
  class PolicyEvaluator
    # Supported rules in evaluation order
    RULES = %i[minimum_security_score maximum_critical maximum_high fail_on_secrets fail_on_regressions].freeze

    def self.call(scan:, policy:, persist: false)
      new(scan: scan, policy: policy, persist: persist).call
    end

    def initialize(scan:, policy:, persist: false)
      @scan    = scan
      @policy  = policy
      @persist = persist
    end

    def call
      violations = evaluate_all_rules
      passed     = violations.empty?

      persist_result(passed, violations) if @persist

      {
        passed:     passed,
        policy_id:  policy.id,
        policy_name: policy.name,
        violations: violations
      }
    end

    private

    attr_reader :scan, :policy

    # ── Rule Evaluation ────────────────────────────────────────────────────

    def evaluate_all_rules
      RULES.each_with_object([]) do |rule, violations|
        violation = send(:"check_#{rule}")
        violations << violation if violation
      end
    end

    # Rule: security score must be >= minimum_security_score
    def check_minimum_security_score
      actual   = score_data[:score]
      expected = policy.minimum_security_score
      return nil if actual >= expected

      {
        rule:     "minimum_security_score",
        expected: expected,
        actual:   actual,
        message:  "Security score #{actual} is below minimum #{expected}"
      }
    end

    # Rule: open critical vulnerabilities must be <= maximum_critical
    def check_maximum_critical
      actual   = open_vulnerabilities.where(severity: "critical").count
      expected = policy.maximum_critical
      return nil if actual <= expected

      {
        rule:     "maximum_critical",
        expected: expected,
        actual:   actual,
        message:  "#{actual} critical vulnerabilities exceed maximum of #{expected}"
      }
    end

    # Rule: open high vulnerabilities must be <= maximum_high
    def check_maximum_high
      actual   = open_vulnerabilities.where(severity: "high").count
      expected = policy.maximum_high
      return nil if actual <= expected

      {
        rule:     "maximum_high",
        expected: expected,
        actual:   actual,
        message:  "#{actual} high vulnerabilities exceed maximum of #{expected}"
      }
    end

    # Rule: fail on any hardcoded secrets detected
    def check_fail_on_secrets
      return nil unless policy.respond_to?(:fail_on_secrets) && policy.fail_on_secrets

      actual = open_vulnerabilities.where(scan_type: "secret").count
      return nil if actual.zero?

      {
        rule:     "fail_on_secrets",
        expected: 0,
        actual:   actual,
        message:  "#{actual} hardcoded secret(s) detected with 'fail_on_secrets' policy enabled"
      }
    end

    # Rule: fail on any security score regression
    def check_fail_on_regressions
      return nil unless policy.respond_to?(:fail_on_regressions) && policy.fail_on_regressions

      reg = regression_data
      return nil unless reg && reg[:regression]

      {
        rule:     "fail_on_regressions",
        expected: "no_regression",
        actual:   "regression_detected",
        message:  reg[:message]
      }
    end

    # ── Persistence (GR-603) ──────────────────────────────────────────────

    # Uses find_or_initialize_by for idempotent, transaction-safe persistence.
    # Avoids upsert() which can leave the enclosing transaction in an aborted
    # state on constraint conflict (breaks spec transactional fixtures).
    def persist_result(passed, violations)
      evaluation = PolicyEvaluation
                     .find_or_initialize_by(security_policy_id: policy.id, scan_id: scan.id)
      evaluation.assign_attributes(
        passed:       passed,
        violations:   violations.map { |v| v.transform_keys(&:to_s) },
        evaluated_at: Time.current
      )
      evaluation.save!
    rescue StandardError => e
      Rails.logger.error "⚠️ PolicyEvaluation persist failed: #{e.message}"
    end

    # ── Memoized Helpers ──────────────────────────────────────────────────

    def score_data
      @score_data ||= Security::ScoreCalculator.call(scan)
    end

    def open_vulnerabilities
      @open_vulnerabilities ||= scan.vulnerabilities.active
    end

    def regression_data
      @regression_data ||= begin
        prev = scan.project.scans.completed
                   .where("id < ?", scan.id)
                   .order(id: :desc)
                   .first
        Security::RegressionDetector.call(scan, prev)
      end
    end
  end
end
