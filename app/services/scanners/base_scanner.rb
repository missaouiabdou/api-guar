# app/services/scanners/base_scanner.rb
#
# Abstract base class for all scanners.
# Subclasses MUST implement:
#   - scanner_name  → String  e.g. "brakeman"
#   - supported?    → Boolean given a repo_path, is this scanner applicable?
#   - scan(repo_path) → Scanners::ScanResult
#
# Subclasses MAY override:
#   - scan_type     → String  default "sast" — override for dependency/secret/container
#
module Scanners
  class BaseScanner
    def initialize(scan)
      @scan = scan
    end

    # Entry point — clones repo internally, detects support, runs scan.
    # Used when this scanner manages its own clone lifecycle.
    def call
      Rails.logger.info "[#{scanner_name.upcase}] Starting scan for #{repo_ref}"

      ::Scans::RepositoryCloner.new(@scan).call do |repo_path|
        scan_at(repo_path)
      end
    rescue StandardError => e
      Rails.logger.error "[#{scanner_name.upcase}] Failed: #{e.class} — #{e.message}"
      raise
    end

    # Entry point — runs scan on an ALREADY CLONED repo_path.
    # Used by Executor when it clones once and distributes path to all scanners.
    # GR-402: avoids re-downloading the repo for each scanner.
    def scan_at(repo_path)
      unless supported?(repo_path)
        Rails.logger.info "[#{scanner_name.upcase}] Not applicable for #{repo_path} — skipping"
        return empty_result
      end

      scan(repo_path)
    rescue StandardError => e
      Rails.logger.error "[#{scanner_name.upcase}] Failed at #{repo_path}: #{e.class} — #{e.message}"
      raise
    end

    # ── Abstract interface ────────────────────────────────────────────────

    def scanner_name
      raise NotImplementedError, "#{self.class}#scanner_name must be implemented"
    end

    def supported?(_repo_path)
      raise NotImplementedError, "#{self.class}#supported? must be implemented"
    end

    def scan(_repo_path)
      raise NotImplementedError, "#{self.class}#scan must be implemented"
    end

    # Type of scan performed — override in subclasses for non-SAST scanners
    def scan_type
      "sast"
    end

    private

    attr_reader :scan_record

    def repo_ref
      "#{@scan.project.github_repo}@#{@scan.commit_sha[0, 7]}"
    end

    def empty_result
      ScanResult.new(
        scanner:   scanner_name,
        scan_type: scan_type,
        languages: [],
        vulnerabilities: [],
        raw_output: { "note" => "Scanner not applicable" }
      )
    end

    # Shared helper — strips temp dir prefix from Brakeman/Semgrep file paths
    def clean_path(raw_path)
      return raw_path.to_s if raw_path.blank?

      %w[app lib config db src test spec].each do |root|
        idx = raw_path.index("/#{root}/")
        return raw_path[idx + 1..] if idx
      end

      raw_path.to_s
    end

    # GR-201 — Stable Fingerprint Algorithm (v1)
    #
    # Formula:
    #   SHA256( "#{scanner}|#{rule_id}|#{normalized_relative_path}|#{content}" )
    #
    # Identifiers:
    #   - scanner:    scanner name (e.g. "brakeman", "semgrep")
    #   - rule_id:    check/rule identifier (e.g. "dangerous_eval", "ruby.lang.security...")
    #   - file:       normalized relative file path within repository
    #   - content:    normalized code snippet (stripped, whitespace collapsed).
    #                 Falls back to "line:#{line}" only when code is absent (e.g. SCA).
    #
    # Stability Guarantees:
    #   - Line movement: developer inserting/deleting lines does NOT change fingerprint
    #   - Whitespace: reformatted code preserves fingerprint
    #   - Semantic changes: modifying the actual vulnerable expression changes fingerprint
    def generate_fingerprint(scanner:, rule_id:, file:, code: nil, line: nil)
      content = normalize_code(code).presence || "line:#{line}"
      Digest::SHA256.hexdigest("#{scanner}|#{rule_id}|#{file}|#{content}")
    end

    def normalize_code(code)
      code.to_s.strip.gsub(/\s+/, " ")
    end
  end
end
