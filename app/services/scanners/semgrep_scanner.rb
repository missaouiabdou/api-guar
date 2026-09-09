# app/services/scanners/semgrep_scanner.rb
# GR-406 / GR-407 — Semgrep online scanning + normalize findings
require 'open3'
require 'json'

module Scanners
  class SemgrepScanner < BaseScanner
    # Semgrep rulesets per language — using free OSS registry rules
    # GR-406: online rulesets; offline/custom rules planned for Sprint 5
    RULESETS = {
      "ruby"       => "p/ruby",
      "javascript" => "p/javascript",
      "typescript" => "p/typescript",
      "python"     => "p/python",
      "java"       => "p/java",
      "go"         => "p/go",
      "php"        => "p/php"
    }.freeze

    # Semgrep severity → GuardRail severity
    SEVERITY_MAP = {
      "ERROR"   => "high",
      "WARNING" => "medium",
      "INFO"    => "low"
    }.freeze

    def scanner_name
      "semgrep"
    end

    def scan_type
      "sast"
    end

    def supported?(_repo_path)
      semgrep_available?
    end

    def scan(repo_path)
      # GR-403: detect languages from actual files in the cloned repo
      detected_languages = ::Scanners::LanguageDetector.call(repo_path)
      rulesets = select_rulesets(detected_languages)

      if rulesets.empty?
        Rails.logger.info "[SEMGREP] No applicable rulesets for: #{detected_languages.join(', ')}"
        return empty_result
      end

      Rails.logger.info "[SEMGREP] Rulesets: #{rulesets.join(', ')} (langs: #{detected_languages.join(', ')})"

      json = run_semgrep(repo_path, rulesets)
      build_result(json, detected_languages)
    end

    private

    def select_rulesets(languages)
      languages.filter_map { |lang| RULESETS[lang] }.uniq
    end

    def run_semgrep(repo_path, rulesets)
      config_args = rulesets.flat_map { |r| ["--config", r] }
      cmd = build_cmd(repo_path, config_args)

      Rails.logger.info "🔍 Running: #{cmd.join(' ')}"
      stdout, stderr, status = Open3.capture3(*cmd)

      # Semgrep exits with code 1 when findings exist — that is OK
      # Semgrep exits with code 2+ on fatal errors
      unless stdout.strip.start_with?('{')
        raise "Semgrep failed (exit #{status.exitstatus}): #{stderr.presence || 'no output'}"
      end

      JSON.parse(stdout)
    rescue JSON::ParserError => e
      raise "Semgrep JSON parse error: #{e.message}"
    end

    def build_cmd(repo_path, config_args)
      if native_semgrep?
        [
          "semgrep",
          "--json",
          "--quiet",
          "--no-git-ignore",
          *config_args,
          repo_path
        ]
      else
        # Docker mode: mount repo_path to /src inside semgrep container
        clean_repo_dir = File.expand_path(repo_path)
        [
          "docker", "run", "--rm",
          "-v", "#{clean_repo_dir}:/src",
          "semgrep/semgrep",
          "semgrep",
          "--json",
          "--quiet",
          "--no-git-ignore",
          *config_args,
          "/src"
        ]
      end
    end

    def build_result(json, languages)
      findings = json['results'] || []
      vulns    = findings.map { |f| build_vulnerability(f) }

      Rails.logger.info "📊 Semgrep: #{vulns.size} findings " \
                        "(h=#{count(vulns, 'high')}, m=#{count(vulns, 'medium')}, l=#{count(vulns, 'low')})"

      ScanResult.new(
        scanner:         scanner_name,
        scan_type:       scan_type,
        languages:       languages,
        vulnerabilities: vulns,
        raw_output:      json,
        scan_info:       { "version" => json['version'] }
      )
    end

    # GR-407: normalize a single Semgrep finding → ScanResult::Vulnerability
    def build_vulnerability(finding)
      meta    = finding['extra'] || {}
      message = meta['message'].to_s
      sev_raw = meta['severity'].to_s.upcase

      raw_file = finding['path'].to_s
      file     = clean_path(raw_file.sub(%r{\A/src/}, ''))
      line     = finding.dig('start', 'line')
      rule     = finding['check_id'].to_s

      # CWE IDs from Semgrep metadata, e.g. "CWE-89: SQL Injection"
      cwe = Array(meta.dig('metadata', 'cwe'))
              .map { |c| c.to_s.scan(/\d+/).first.to_i }
              .compact
              .reject(&:zero?)

      ScanResult::Vulnerability.new(
        warning_type:  rule_to_warning_type(rule),
        message:       message.presence || rule,
        severity:      SEVERITY_MAP[sev_raw] || 'info',
        confidence:    normalize_confidence(meta.dig('metadata', 'confidence')),
        file:          file,
        line:          line.is_a?(Integer) ? line : nil,
        cwe:           cwe,
        code:          meta['lines'].to_s,
        user_input:    nil,
        fingerprint:   generate_fingerprint(
                         scanner: scanner_name,
                         rule_id:  rule,
                         file:     file,
                         code:     meta['lines'],
                         line:     line
                       ),
        check_name:    rule,
        warning_code:  nil,
        location:      {},
        scanner:       scanner_name,
        scan_type:     scan_type
      )
    end

    # Convert Semgrep check_id → human-readable warning type
    # e.g. "python.lang.security.audit.sqli" → "Sqli"
    # e.g. "javascript.express.security.audit.xss" → "Xss"
    def rule_to_warning_type(rule_id)
      last_part = rule_id.split('.').last.to_s
      last_part.split('-').map(&:capitalize).join(' ')
    end

    def normalize_confidence(raw)
      case raw.to_s.downcase
      when 'high'   then 'high'
      when 'medium' then 'medium'
      when 'low'    then 'low'
      else               'medium'
      end
    end

    def count(vulns, severity)
      vulns.count { |v| v.severity == severity }
    end

    def semgrep_available?
      native_semgrep? || docker_available?
    end

    def native_semgrep?
      checker = Gem.win_platform? ? "where semgrep" : "which semgrep"
      system(checker, out: File::NULL, err: File::NULL)
    end

    def docker_available?
      checker = Gem.win_platform? ? "where docker" : "which docker"
      system(checker, out: File::NULL, err: File::NULL)
    end
  end
end

