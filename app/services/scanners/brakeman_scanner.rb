# app/services/scanners/brakeman_scanner.rb
require 'open3'
require 'json'

module Scanners
  class BrakemanScanner < BaseScanner
    BRAKEMAN_TIMEOUT = 300

    # Brakeman warning_type → GuardRail severity
    SEVERITY_MAP = {
      # Critical
      "Remote Code Execution"                        => "critical",
      "Command Injection"                            => "critical",
      "Dangerous Eval"                               => "critical",
      "Deserialization of User Input"                => "critical",
      "Remote Code Execution (Dynamic Render Path)"  => "critical",
      # High
      "SQL Injection"                                => "high",
      "Cross-Site Scripting"                         => "high",
      "Authentication"                               => "high",
      "Mass Assignment"                              => "high",
      "Redirect"                                     => "high",
      "Session Fixation"                             => "high",
      "Server-Side Request Forgery"                  => "high",
      # Medium
      "Path Traversal"                               => "medium",
      "File Access"                                  => "medium",
      "Directory Traversal"                          => "medium",
      "Information Disclosure"                       => "medium",
      "CSRF"                                         => "medium",
      "Weak Cryptography"                            => "medium",
      # Low
      "Dynamic Render Path"                          => "low",
      "Format Validation"                            => "low",
      "Regex Injection"                              => "low",
      "Template Injection"                           => "low"
    }.freeze

    def scanner_name
      "brakeman"
    end

    def supported?(repo_path)
      File.exist?(File.join(repo_path, 'Gemfile')) &&
        File.exist?(File.join(repo_path, 'config', 'application.rb'))
    end

    def scan(repo_path)
      json = run_brakeman(repo_path)
      build_result(json)
    end

    private

    def run_brakeman(repo_path)
      cmd = [
        'brakeman',
        '-q',
        '-f', 'json',
        '--no-progress',
        '--no-exit-on-warn',
        '--force',
        repo_path
      ]

      Rails.logger.info "🔍 Running: #{cmd.join(' ')}"
      stdout, stderr, status = Open3.capture3(*cmd)

      unless status.success? || stdout.strip.start_with?('{')
        raise "Brakeman failed (exit #{status.exitstatus}): #{stderr}"
      end

      JSON.parse(stdout)
    end

    # Convert Brakeman JSON → ScanResult
    def build_result(json)
      warnings = json['warnings'] || []

      vulns = warnings.map { |w| build_vulnerability(w) }

      Rails.logger.info "📊 Brakeman: #{vulns.size} warnings " \
                        "(c=#{count(vulns, 'critical')}, h=#{count(vulns, 'high')}, " \
                        "m=#{count(vulns, 'medium')}, l=#{count(vulns, 'low')})"

      ScanResult.new(
        scanner:         scanner_name,
        scan_type:       scan_type,
        languages:       ['ruby'],
        vulnerabilities: vulns,
        raw_output:      json,
        scan_info:       json['scan_info'] || {}
      )
    end

    def build_vulnerability(w)
      ScanResult::Vulnerability.new(
        warning_type:  w['warning_type'].to_s,
        message:       w['message'].to_s.presence || 'No message',
        severity:      map_severity(w),
        confidence:    normalize_confidence(w['confidence']),
        file:          clean_path(w['file'].to_s),
        line:          w['line'].is_a?(Integer) ? w['line'] : nil,
        cwe:           Array(w['cwe_id']),
        code:          w['code'].to_s,
        user_input:    w['user_input'].to_s,
        fingerprint:   generate_fingerprint(
                         scanner: scanner_name,
                         rule_id:  w['check_name'].to_s,
                         file:     clean_path(w['file'].to_s),
                         code:     w['code'],
                         line:     w['line']
                       ),
        check_name:    w['check_name'].to_s,
        warning_code:  w['warning_code'].is_a?(Integer) ? w['warning_code'] : nil,
        location:      w['location'].is_a?(Hash) ? w['location'] : {},
        scanner:       scanner_name,
        scan_type:     scan_type
      )
    end

    def map_severity(w)
      SEVERITY_MAP[w['warning_type'].to_s] ||
        case w['confidence'].to_s.downcase
        when 'high'   then 'high'
        when 'medium' then 'medium'
        when 'weak'   then 'low'
        else               'info'
        end
    end

    def normalize_confidence(raw)
      case raw.to_s.downcase
      when 'high'         then 'high'
      when 'medium'       then 'medium'
      when 'weak', 'low'  then 'low'
      else                     'low'
      end
    end

    def count(vulns, severity)
      vulns.count { |v| v.severity == severity }
    end
  end
end