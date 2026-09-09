# app/services/scans/runner.rb
module Scans
  class Runner
    def initialize(scan)
      @scan = scan
    end

    def call
      scan.start_processing!

      result = Scans::Executor.new(scan).call

      # GR-202 — Persist findings, carrying triage states (ignored/resolved)
      # forward from the previous scan instead of wiping history.
      counts = Scans::VulnerabilitySync.call(scan, result[:scan_results] || [])

      scan.update!(
        critical_count: counts["critical"],
        high_count:     counts["high"],
        medium_count:   counts["medium"],
        low_count:      counts["low"],
        info_count:     counts["info"],
        languages:      result[:languages] || [],
        scanner:        result[:scanner],
        parsed_data:    result[:raw_report],
        completed_at:   Time.current
      )

      scan.complete!

      # GR-603 — Evaluate all enabled security policies after scan completes.
      # Non-blocking: failures are logged inside PolicyRunner, never crash the scan.
      Security::PolicyRunner.call(scan)

      # Priority 6 — Post PR / Commit status feedback to GitHub
      Github::StatusPoster.call(scan)

      Rails.logger.info(
        "✅ Scan #{scan.id} completed " \
        "(c=#{counts['critical']}, h=#{counts['high']}, " \
        "m=#{counts['medium']}, l=#{counts['low']}, i=#{counts['info']}) " \
        "lang=#{result[:languages]&.join(',')} scanner=#{result[:scanner]}"
      )
    rescue StandardError => e
      scan.fail!(e.message)
      Rails.logger.error "❌ Scan #{scan.id} failed: #{e.class} - #{e.message}"
      raise
    end

    private

    attr_reader :scan
  end
end