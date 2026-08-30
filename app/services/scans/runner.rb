# app/services/scans/runner.rb
module Scans
  class Runner
    def initialize(scan)
      @scan = scan
    end

    def call
      scan.start_processing!

      result = Scans::Executor.new(scan).call

      # Persist vulnerability records from all scanners
      persist_vulnerabilities(result[:scan_results])

      scan.update!(
        critical_count: result[:critical],
        high_count:     result[:high],
        medium_count:   result[:medium],
        low_count:      result[:low],
        info_count:     result[:info],
        languages:      result[:languages] || [],
        scanner:        result[:scanner],
        parsed_data:    result[:raw_report],
        completed_at:   Time.current
      )

      scan.complete!

      # GR-603 — Evaluate all enabled security policies after scan completes.
      # Non-blocking: failures are logged inside PolicyRunner, never crash the scan.
      Security::PolicyRunner.call(scan)

      Rails.logger.info(
        "✅ Scan #{scan.id} completed " \
        "(c=#{result[:critical]}, h=#{result[:high]}, " \
        "m=#{result[:medium]}, l=#{result[:low]}, i=#{result[:info]}) " \
        "lang=#{result[:languages]&.join(',')} scanner=#{result[:scanner]}"
      )
    rescue StandardError => e
      scan.fail!(e.message)
      Rails.logger.error "❌ Scan #{scan.id} failed: #{e.class} - #{e.message}"
      raise
    end

    private

    attr_reader :scan

    def persist_vulnerabilities(scan_results)
      return if scan_results.nil? || scan_results.empty?

      # Destroy once — then each persister inserts (no double-destroy)
      scan.vulnerabilities.destroy_all

      scan_results.each do |scan_result|
        # Re-use persister but skip the destroy_all since we already did it
        scan_result.vulnerabilities.each do |v|
          scan.vulnerabilities.create!(
            warning_type:    v.warning_type,
            message:         v.message.presence || 'No message',
            confidence:      v.confidence.to_s,
            severity:        v.severity,
            file:            v.file.to_s,
            line:            v.line,
            cwe_id:          Array(v.cwe),
            code:            v.code.to_s,
            user_input:      v.user_input.to_s,
            location:        v.location.is_a?(Hash) ? v.location : {},
            location_class:  v.location.is_a?(Hash) ? v.location['class'].to_s : '',
            location_method: v.location.is_a?(Hash) ? v.location['method'].to_s : '',
            fingerprint:     v.fingerprint,
            check_name:      v.check_name.to_s,
            warning_code:    v.warning_code,
            scanner:         v.scanner.to_s,
            scan_type:       v.scan_type.to_s.presence || scan_result.scan_type || 'sast',
            status:          'open'
          )
        rescue ActiveRecord::RecordInvalid => e
          Rails.logger.warn "⚠️ Skipped vulnerability: #{e.message}"
        end
      end

      Rails.logger.info "🛡️ Persisted #{scan.vulnerabilities.count} total vulnerabilities for Scan ##{scan.id}"
    end
  end
end