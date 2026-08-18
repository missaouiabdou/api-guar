# app/services/scanners/brakeman_scanner.rb
require 'open3'
require 'json'

module Scanners
  class BrakemanScanner
    BRAKEMAN_TIMEOUT = 300 # 5 minutes

    def initialize(scan)
      @scan = scan
    end

    def call
      Rails.logger.info "🔍 Starting Brakeman scan for project=#{scan.project.github_repo}, sha=#{scan.commit_sha[0,7]}"

      # Step 1: Download repo to temp dir
      json_output = ::Scans::RepositoryCloner.new(scan).call do |repo_path|
        # Step 2: Check it's a Rails app
        unless rails_app?(repo_path)
          Rails.logger.info "⚠️ Not a Rails app — skipping Brakeman (#{repo_path})"
          next empty_result("Repository is not a Rails app — Brakeman skipped")
        end

        # Step 3: Run Brakeman on the cloned repo
        run_brakeman(repo_path)
      end

      # Step 4: Parse JSON
      parse_warnings(json_output)
    rescue StandardError => e
      Rails.logger.error "❌ BrakemanScanner failed: #{e.class} - #{e.message}"
      raise
    end

    private

    attr_reader :scan

    def rails_app?(path)
      File.exist?(File.join(path, 'Gemfile')) &&
        File.exist?(File.join(path, 'config', 'application.rb'))
    end

    def run_brakeman(repo_path)
      # ✅ Sal7i: remove --no-parallel flag (ma kay3rrech Brakeman 8.0.5)
      # Process.fork warning machi blocking — Brakeman kayt3awd l sequential auto
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

    def parse_warnings(json)
      warnings = json['warnings'] || []
      scan_info = json['scan_info'] || {}

      counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }

      warnings.each do |w|
        # ✅ FIX: confidence kayn STRING ("High"/"Medium"/"Weak")
        confidence = w['confidence'].to_s.downcase

        case confidence
        when 'high'   then counts[:high] += 1
        when 'medium' then counts[:medium] += 1
        when 'weak'   then counts[:low] += 1
        end
      end

      counts[:info] = warnings.size

      Rails.logger.info "📊 Brakeman found #{warnings.size} warnings " \
                          "(h=#{counts[:high]}, m=#{counts[:medium]}, l=#{counts[:low]})"

      counts.merge(raw_report: json)
    end

    def empty_result(message)
      {
        critical: 0, high: 0, medium: 0, low: 0, info: 0,
        note: message,
        raw_report: { 'note' => message, 'warnings' => [] }
      }
    end
  end
end