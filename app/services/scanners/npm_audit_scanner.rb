# app/services/scanners/npm_audit_scanner.rb
require 'open3'
require 'json'

module Scanners
  class NpmAuditScanner < BaseScanner
    SEVERITY_MAP = {
      'critical' => 'critical',
      'high'     => 'high',
      'moderate' => 'medium',
      'low'      => 'low',
      'info'     => 'info'
    }.freeze

    def scanner_name
      "npm_audit"
    end

    def scan_type
      "dependency"
    end

    def supported?(repo_path)
      File.exist?(File.join(repo_path, 'package.json')) &&
        (File.exist?(File.join(repo_path, 'package-lock.json')) ||
         File.exist?(File.join(repo_path, 'npm-shrinkwrap.json')))
    end

    def scan(repo_path)
      json = run_npm_audit(repo_path)
      build_result(json)
    end

    private

    def run_npm_audit(repo_path)
      # Run npm audit inside repo_path
      cmd = ['npm', 'audit', '--json']

      Rails.logger.info "🔍 Running: #{cmd.join(' ')} in #{repo_path}"
      stdout, stderr, status = Open3.capture3(*cmd, chdir: repo_path)

      out = stdout.to_s.strip
      if out.start_with?('{')
        JSON.parse(out)
      elsif status.success? || out.empty?
        { "vulnerabilities" => {} }
      else
        raise "npm audit failed (exit #{status.exitstatus}): #{stderr.presence || stdout}"
      end
    rescue JSON::ParserError => e
      raise "npm audit JSON parse error: #{e.message}"
    end

    def build_result(json)
      vulns_hash = json['vulnerabilities'] || {}
      vulns = []

      vulns_hash.each do |pkg_name, data|
        via_list = Array(data['via'])
        advisory_items = via_list.select { |item| item.is_a?(Hash) }

        if advisory_items.any?
          advisory_items.each do |adv|
            vulns << build_vulnerability(pkg_name, data, adv)
          end
        else
          # Fallback if via is just package names
          vulns << build_vulnerability(pkg_name, data, nil)
        end
      end

      vulns.compact!
      Rails.logger.info "📊 NpmAudit: #{vulns.size} dependency findings"

      ScanResult.new(
        scanner:         scanner_name,
        scan_type:       scan_type,
        languages:       ['javascript', 'typescript'],
        vulnerabilities: vulns,
        raw_output:      json,
        scan_info:       json['metadata'] || {}
      )
    end

    def build_vulnerability(pkg_name, data, adv)
      severity_raw = adv ? adv['severity'] : data['severity']
      severity     = SEVERITY_MAP[severity_raw.to_s.downcase] || 'medium'
      adv_id       = adv ? (adv['url'].to_s.split('/').last.presence || adv['source'].to_s) : "npm-audit-#{pkg_name}"
      title        = adv ? adv['title'].to_s : "Vulnerable dependency #{pkg_name}"
      range        = adv ? adv['range'].to_s : data['range'].to_s
      cwes         = adv ? Array(adv['cwe']).map { |c| c.to_s.scan(/\d+/).join.to_i }.reject(&:zero?) : []

      fingerprint = generate_dependency_fingerprint(
        scanner: scanner_name,
        package: pkg_name,
        advisory_id: adv_id,
        range: range
      )

      ScanResult::Vulnerability.new(
        warning_type:  "Vulnerable Dependency",
        message:       "#{pkg_name} (#{range}) — #{title}",
        severity:      severity,
        confidence:    "high",
        file:          'package.json',
        line:          nil,
        cwe:           cwes,
        code:          "#{pkg_name} (#{range})",
        user_input:    nil,
        fingerprint:   fingerprint,
        check_name:    adv_id,
        warning_code:  nil,
        location:      { "package" => pkg_name, "range" => range, "fix_available" => data['fixAvailable'] },
        scanner:       scanner_name,
        scan_type:     scan_type
      )
    end

    def generate_dependency_fingerprint(scanner:, package:, advisory_id:, range:)
      Digest::SHA256.hexdigest("#{scanner}|#{package.downcase}|#{advisory_id.upcase}|#{range}")
    end
  end
end
