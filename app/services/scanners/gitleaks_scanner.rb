# app/services/scanners/gitleaks_scanner.rb
require 'open3'
require 'json'
require 'tempfile'
require 'find'

module Scanners
  class GitleaksScanner < BaseScanner
    SECRET_PATTERNS = [
      { rule_id: "aws-access-key-id", desc: "AWS Access Key ID", regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/, severity: "critical" },
      { rule_id: "github-pat", desc: "GitHub Personal Access Token", regex: /ghp_[0-9a-zA-Z]{36}/, severity: "critical" },
      { rule_id: "github-oauth", desc: "GitHub OAuth Access Token", regex: /gho_[0-9a-zA-Z]{36}/, severity: "critical" },
      { rule_id: "slack-token", desc: "Slack Token", regex: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/, severity: "critical" },
      { rule_id: "private-key", desc: "Private Key Header", regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/, severity: "critical" },
      { rule_id: "generic-api-key", desc: "Generic API Key / Secret", regex: /(?:api_key|apikey|secret_key|api_secret|access_token|auth_token)\s*[:=]\s*["']([0-9a-zA-Z_\-]{20,})["']/i, severity: "high" }
    ].freeze

    def scanner_name
      "gitleaks"
    end

    def scan_type
      "secret"
    end

    def supported?(_repo_path)
      true # Applicable to any project
    end

    def scan(repo_path)
      findings = []
      if native_gitleaks?
        findings = (run_native_gitleaks(repo_path) rescue [])
      elsif docker_available?
        findings = (run_docker_gitleaks(repo_path) rescue [])
      end

      findings = run_pattern_scan(repo_path) if findings.blank?

      build_result(findings)
    rescue StandardError => e
      Rails.logger.warn "Gitleaks execution fallback to pattern scan: #{e.message}"
      findings = run_pattern_scan(repo_path)
      build_result(findings)
    end

    private

    def build_result(findings)
      vulns = findings.map { |f| build_vulnerability(f) }

      Rails.logger.info "📊 Gitleaks: #{vulns.size} secret findings"

      ScanResult.new(
        scanner:         scanner_name,
        scan_type:       scan_type,
        languages:       [:any],
        vulnerabilities: vulns,
        raw_output:      { "findings_count" => vulns.size, "results" => findings },
        scan_info:       { "scanner" => "gitleaks" }
      )
    end

    def build_vulnerability(f)
      rule_id  = f[:rule_id] || f['RuleID'] || 'secret-detected'
      desc     = f[:description] || f['Description'] || 'Hardcoded secret detected'
      file     = clean_path(f[:file] || f['File'])
      line     = f[:line] || f['StartLine']
      secret   = f[:secret] || f['Secret'] || f['Match'] || ''
      severity = f[:severity] || 'critical'

      # Mask the secret for safe presentation (e.g. ghp_1234...xxxx)
      masked = mask_secret(secret)
      secret_hash = Digest::SHA256.hexdigest(secret.to_s)[0..15]
      fingerprint = Digest::SHA256.hexdigest("#{scanner_name}|#{rule_id}|#{file}|#{secret_hash}")

      ScanResult::Vulnerability.new(
        warning_type:  "Secret Detected",
        message:       "#{desc} found in #{file}#{line ? ":#{line}" : ''}",
        severity:      severity,
        confidence:    "high",
        file:          file,
        line:          line.is_a?(Integer) ? line : nil,
        cwe:           [798], # CWE-798: Use of Hard-coded Credentials
        code:          masked,
        user_input:    nil,
        fingerprint:   fingerprint,
        check_name:    rule_id,
        warning_code:  nil,
        location:      { "rule" => rule_id, "masked_secret" => masked },
        scanner:       scanner_name,
        scan_type:     scan_type
      )
    end

    def mask_secret(secret)
      s = secret.to_s.strip
      return "" if s.empty?
      return "****" if s.length <= 6

      "#{s[0..3]}...#{s[-4..]}"
    end

    def run_native_gitleaks(repo_path)
      Tempfile.create(['gitleaks-report', '.json']) do |tmp|
        cmd = [
          'gitleaks',
          'detect',
          '--no-git',
          '--source', repo_path,
          '--report-format', 'json',
          '--report-path', tmp.path,
          '--exit-code', '0'
        ]

        Open3.capture3(*cmd)
        content = tmp.read
        content.present? ? JSON.parse(content) : []
      end
    end

    def run_docker_gitleaks(repo_path)
      clean_repo_dir = File.expand_path(repo_path)
      cmd = [
        'docker', 'run', '--rm',
        '-v', "#{clean_repo_dir}:/src",
        'zricethezav/gitleaks:latest',
        'detect',
        '--no-git',
        '--source=/src',
        '--report-format=json',
        '--report-path=/dev/stdout'
      ]

      stdout, _stderr, _status = Open3.capture3(*cmd)
      out = stdout.to_s.strip
      out.start_with?('[') ? JSON.parse(out) : []
    end

    def run_pattern_scan(repo_path)
      findings = []
      ignore_dirs = %w[.git node_modules vendor tmp log storage dist coverage build]

      Find.find(repo_path) do |path|
        if File.directory?(path)
          Find.prune if ignore_dirs.include?(File.basename(path))
          next
        end

        next unless File.file?(path)
        next if File.size(path) > 1_000_000 # Skip files larger than 1MB

        begin
          File.foreach(path).with_index(1) do |line_content, line_num|
            SECRET_PATTERNS.each do |pattern|
              match = line_content.match(pattern[:regex])
              next unless match

              findings << {
                rule_id:     pattern[:rule_id],
                description: pattern[:desc],
                file:        path.sub("#{repo_path}/", '').sub("#{repo_path}\\", ''),
                line:        line_num,
                secret:      match[0],
                severity:    pattern[:severity]
              }
            end
          end
        rescue ArgumentError, Encoding::InvalidByteSequenceError
          # Binary file, skip
          next
        end
      end

      findings
    end

    def native_gitleaks?
      checker = Gem.win_platform? ? "where gitleaks" : "which gitleaks"
      system(checker, out: File::NULL, err: File::NULL)
    end

    def docker_available?
      checker = Gem.win_platform? ? "where docker" : "which docker"
      system(checker, out: File::NULL, err: File::NULL)
    end
  end
end
