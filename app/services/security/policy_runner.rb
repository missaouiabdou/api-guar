# app/services/security/policy_runner.rb
#
# GR-603 — Scan Policy Results
#
# Runs all enabled SecurityPolicies for a scan's project and persists the
# evaluation results (delegates to Security::PolicyEvaluator).
#
# Called from Scans::Runner after a scan completes.
#
# Failures are logged but never crash the scan lifecycle — policy
# evaluation is a downstream, non-blocking concern.
#
# Usage:
#   Security::PolicyRunner.call(scan)
#
module Security
  class PolicyRunner
    def self.call(scan)
      new(scan).call
    end

    def initialize(scan)
      @scan = scan
    end

    def call
      return [] unless @scan.project

      policies = @scan.project.security_policies.enabled
      return [] if policies.empty?

      policies.map do |policy|
        Security::PolicyEvaluator.call(scan: @scan, policy: policy, persist: true)
      end
    rescue StandardError => e
      Rails.logger.error "⚠️ Security::PolicyRunner failed for scan ##{@scan.id}: #{e.class} - #{e.message}"
      []
    end
  end
end
