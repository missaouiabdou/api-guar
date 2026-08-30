# app/services/scanners/scan_result.rb
#
# Normalized result object returned by ALL scanners.
# No scanner-specific format leaks beyond the scanner class.
#
module Scanners
  class ScanResult
    VALID_SEVERITIES  = %w[critical high medium low info].freeze
    VALID_CONFIDENCES = %w[high medium low].freeze
    VALID_SCAN_TYPES  = %w[sast dependency secret container].freeze

    Vulnerability = Struct.new(
      :warning_type,  # e.g. "SQL Injection"
      :message,       # human-readable description
      :severity,      # critical / high / medium / low / info
      :confidence,    # high / medium / low
      :file,          # relative path e.g. app/controllers/foo.rb
      :line,          # Integer or nil
      :cwe,           # Array of Integer CWE IDs e.g. [89]
      :code,          # vulnerable code snippet
      :user_input,    # source of user-controlled data
      :fingerprint,   # unique deterministic hash
      :check_name,    # scanner-specific check identifier
      :warning_code,  # scanner-specific numeric code
      :location,      # Hash { class:, method: } or {}
      :scanner,       # "brakeman" / "semgrep" / "bandit" etc.
      :scan_type,     # "sast" / "dependency" / "secret" / "container"
      keyword_init: true
    )

    attr_reader :scanner, :scan_type, :languages, :vulnerabilities, :raw_output, :scan_info

    def initialize(scanner:, scan_type: 'sast', languages: [], vulnerabilities: [], raw_output: {}, scan_info: {})
      @scanner         = scanner
      @scan_type       = scan_type.to_s
      @languages       = Array(languages)
      @vulnerabilities = Array(vulnerabilities)
      @raw_output      = raw_output
      @scan_info       = scan_info
    end

    # Convenience counts
    def counts
      @counts ||= VALID_SEVERITIES.each_with_object({}) do |sev, h|
        h[sev.to_sym] = vulnerabilities.count { |v| v.severity == sev }
      end
    end

    def total
      vulnerabilities.size
    end

    def empty?
      vulnerabilities.empty?
    end
  end
end

