# app/services/scanners/bundler_audit_scanner.rb
require 'open3'
require 'json'

module Scanners
  class BundlerAuditScanner < BaseScanner
    def scanner_name
      "bundler_audit"
    end

    def scan_type
      "dependency"
    end

    def supported?(repo_path)
      File.exist?(File.join(repo_path, 'Gemfile.lock'))
    end

    def scan(repo_path)
      json = run_bundler_audit(repo_path)
      build_result(json)
    end

    private

    def run_bundler_audit(repo_path)
      cmd = [
        'bundle-audit',
        'check',
        repo_path,
        '--format=json',
        '--no-update'
      ]

      Rails.logger.info "🔍 Running: #{cmd.join(' ')}"
      stdout, stderr, status = Open3.capture3(*cmd)

      # bundle-audit returns exit status 1 if vulnerabilities are found, 0 if clean
      out = stdout.to_s.strip
      if out.start_with?('{')
        JSON.parse(out)
      elsif status.success? || out.empty?
        { "results" => [] }
      else
        raise "bundle-audit failed (exit #{status.exitstatus}): #{stderr.presence || stdout}"
      end
    rescue JSON::ParserError => e
      raise "bundle-audit JSON parse error: #{e.message}"
    end

    def build_result(json)
      results = json['results'] || []
      vulns   = results.filter_map { |res| build_vulnerability(res) }

      Rails.logger.info "📊 BundlerAudit: #{vulns.size} dependency findings"

      ScanResult.new(
        scanner:         scanner_name,
        scan_type:       scan_type,
        languages:       ['ruby'],
        vulnerabilities: vulns,
        raw_output:      json,
        scan_info:       { "version" => json['version'] }
      )
    end

    def build_vulnerability(res)
      if res['type'] == 'unpatched_gem'
        gem_data = res['gem'] || {}
        advisory = res['advisory'] || {}

        gem_name = gem_data['name'].to_s
        gem_version = gem_data['version'].to_s
        adv_id = advisory['id'].to_s.presence || advisory['cve'].to_s.presence || advisory['ghsa'].to_s.presence || "advisory"
        title = advisory['title'].to_s.presence || "Vulnerable dependency: #{gem_name} (#{gem_version})"
        cve_num = advisory['cve'].to_s.scan(/\d+/).join.to_i
        cwe = cve_num.positive? ? [cve_num] : []

        severity = map_severity(advisory['criticality'].to_s)
        file = 'Gemfile.lock'

        ScanResult::Vulnerability.new(
          warning_type:  "Vulnerable Dependency",
          message:       "#{gem_name} #{gem_version} — #{title}",
          severity:      severity,
          confidence:    "high",
          file:          file,
          line:          nil,
          cwe:           cwe,
          code:          "#{gem_name} (#{gem_version})",
          user_input:    nil,
          fingerprint:   generate_dependency_fingerprint(
                           scanner: scanner_name,
                           package: gem_name,
                           advisory_id: adv_id,
                           version: gem_version
                         ),
          check_name:    adv_id,
          warning_code:  nil,
          location:      { "gem" => gem_name, "version" => gem_version, "patched_versions" => advisory['patched_versions'] },
          scanner:       scanner_name,
          scan_type:     scan_type
        )
      elsif res['type'] == 'insecure_source'
        source = res['source'].to_s
        ScanResult::Vulnerability.new(
          warning_type:  "Insecure Dependency Source",
          message:       "Insecure source URI detected: #{source}",
          severity:      "medium",
          confidence:    "high",
          file:          'Gemfile',
          line:          nil,
          cwe:           [319],
          code:          source,
          user_input:    nil,
          fingerprint:   Digest::SHA256.hexdigest("#{scanner_name}|insecure_source|Gemfile|#{source}"),
          check_name:    "insecure_source",
          warning_code:  nil,
          location:      {},
          scanner:       scanner_name,
          scan_type:     scan_type
        )
      end
    end

    def generate_dependency_fingerprint(scanner:, package:, advisory_id:, version:)
      Digest::SHA256.hexdigest("#{scanner}|#{package.downcase}|#{advisory_id.upcase}|#{version}")
    end

    def map_severity(criticality)
      case criticality.to_s.downcase
      when 'critical' then 'critical'
      when 'high'     then 'high'
      when 'medium'   then 'medium'
      when 'low'      then 'low'
      else                 'high'
      end
    end
  end
end
