# app/services/scanners/scanner_registry.rb
#
# Central registry that maps languages to scanner classes.
# Each entry carries:
#   - scanner:   fully-qualified class name (String)
#   - languages: Array of language keys that trigger this scanner, or :any
#   - scan_type: :sast | :dependency | :secret | :container
#
# Scanners are tried in priority order: more specific ones first.
#
# Usage:
#   scanner_classes = Scanners::ScannerRegistry.for(languages: ["ruby", "javascript"])
#   scanner_classes.each { |klass| klass.new(scan).call }
#
module Scanners
  class ScannerRegistry
    REGISTRY = [
      # ── SAST ─────────────────────────────────────────────────────────
      # Brakeman: Rails-specific, runs before Semgrep on Ruby projects
      { scanner: "Scanners::BrakemanScanner", languages: ["ruby"], scan_type: :sast },

      # Semgrep: multi-language SAST — runs on every project
      { scanner: "Scanners::SemgrepScanner",  languages: :any,    scan_type: :sast }

      # ── Dependency (Sprint 5 — next sprint) ──────────────────────────
      # { scanner: "Scanners::BundlerAuditScanner", languages: ["ruby"],                     scan_type: :dependency },
      # { scanner: "Scanners::NpmAuditScanner",     languages: ["javascript","typescript"],  scan_type: :dependency },
      # { scanner: "Scanners::PipAuditScanner",     languages: ["python"],                   scan_type: :dependency },

      # ── Secret Detection (Sprint 6) ───────────────────────────────────
      # { scanner: "Scanners::GitleaksScanner", languages: :any, scan_type: :secret },

      # ── Container Security (Sprint 7) ─────────────────────────────────
      # { scanner: "Scanners::TrivyScanner", languages: :any, scan_type: :container }
    ].freeze

    # Returns an array of scanner CLASS objects applicable for the given languages.
    def self.for(languages:)
      new(languages).scanners
    end

    # Returns all currently implemented scanner classes.
    def self.all_scanners
      REGISTRY.filter_map do |entry|
        entry[:scanner].constantize
      rescue NameError
        nil
      end
    end

    # Returns the scan_type string for a given scanner class name.
    # Used when persisting vulnerabilities.
    def self.scan_type_for(scanner_class_name)
      entry = REGISTRY.find { |e| e[:scanner] == scanner_class_name.to_s }
      entry&.fetch(:scan_type, :sast).to_s
    end

    def initialize(languages)
      @languages = Array(languages).map(&:downcase).uniq
    end

    def scanners
      REGISTRY.filter_map do |entry|
        next unless language_match?(entry[:languages])

        entry[:scanner].constantize
      rescue NameError
        # Scanner class not yet implemented — skip until its sprint
        Rails.logger.debug do
          "ScannerRegistry: #{entry[:scanner]} not available yet, skipping"
        end
        nil
      end
    end

    private

    def language_match?(scanner_languages)
      return true if scanner_languages == :any

      (@languages & scanner_languages).any?
    end
  end
end
