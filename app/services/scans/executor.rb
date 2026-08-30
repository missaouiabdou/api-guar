# app/services/scans/executor.rb
#
# Orchestrates all scanners for a given scan:
#
#   1. Clone repo ONCE into a temp dir               ← GR-402/403
#   2. Detect languages from actual cloned files      ← GR-403
#   3. Look up applicable scanners via registry       ← GR-401
#   4. Run each scanner directly on the cloned path   ← GR-402
#   5. Merge all ScanResults into one aggregate       ← GR-407
#
module Scans
  class Executor
    def initialize(scan)
      @scan = scan
    end

    def call
      ::Scans::RepositoryCloner.new(scan).call do |repo_path|
        # GR-403: detect languages from actual files — not just GitHub metadata
        languages = detect_languages(repo_path)

        # Persist detected languages early so they're visible even if scan fails
        scan.update_column(:languages, languages) if scan.languages.blank?

        scanners = ::Scanners::ScannerRegistry.for(languages: languages)

        if scanners.empty?
          Rails.logger.warn "⚠️  No scanners available for languages: #{languages.join(', ')}"
          next empty_result(languages)
        end

        Rails.logger.info "🔎 Detected languages: #{languages.join(', ')}"
        Rails.logger.info "🔎 Running scanners: #{scanners.map(&:name).join(', ')}"

        # GR-402: pass repo_path directly — scanners skip internal re-clone
        results = run_all_scanners(scanners, repo_path)
        aggregate(results, languages)
      end
    end

    private

    attr_reader :scan

    # GR-402/403: two-phase language detection
    #   Phase 1 — fast: use GitHub webhook metadata (no I/O)
    #   Phase 2 — accurate: scan actual files in cloned repo
    def detect_languages(repo_path)
      # Always run file-based detection since we already have the repo
      file_detected = ::Scanners::LanguageDetector.call(repo_path)
      return file_detected if file_detected.any?

      # Fallback: GitHub webhook-reported primary language
      github_lang = scan.raw_payload&.dig('repository', 'language').to_s.downcase.presence
      if github_lang
        mapped = GITHUB_LANG_MAP.fetch(github_lang, github_lang)
        return [mapped].compact.reject(&:empty?) if mapped.present?
      end

      # Final fallback (should rarely reach here with real repos)
      Rails.logger.warn "⚠️  Could not detect language for scan ##{scan.id} — defaulting to ruby"
      ['ruby']
    end

    # Maps GitHub-reported language names to our internal keys
    GITHUB_LANG_MAP = {
      'ruby'       => 'ruby',
      'java'       => 'java',
      'python'     => 'python',
      'javascript' => 'javascript',
      'typescript' => 'typescript',
      'go'         => 'go',
      'php'        => 'php',
      'c#'         => 'csharp',
      'rust'       => 'rust',
      'html'       => nil,  # HTML-only: no scanner yet, LanguageDetector handles mixed repos
      'c++'        => nil   # Not yet supported
    }.freeze

    # GR-402: run each scanner with already-cloned repo_path (no re-download)
    def run_all_scanners(scanners, repo_path)
      scanners.filter_map do |scanner_class|
        scanner_class.new(scan).scan_at(repo_path)
      rescue StandardError => e
        Rails.logger.error "❌ Scanner #{scanner_class.name} failed: #{e.message}"
        nil
      end
    end

    # Merge multiple ScanResults into one aggregate hash for Runner
    def aggregate(results, languages)
      all_vulns    = results.flat_map(&:vulnerabilities)
      all_raw      = results.each_with_object({}) { |r, h| h[r.scanner] = r.raw_output }
      scanner_names = results.map(&:scanner).uniq.join(", ")

      counts = ::Scanners::ScanResult::VALID_SEVERITIES.each_with_object({}) do |sev, h|
        h[sev.to_sym] = all_vulns.count { |v| v.severity == sev }
      end

      Rails.logger.info "📊 Aggregate: #{all_vulns.size} total findings across #{results.size} scanner(s)"

      {
        critical:     counts[:critical],
        high:         counts[:high],
        medium:       counts[:medium],
        low:          counts[:low],
        info:         counts[:info],
        languages:    languages,
        scanner:      scanner_names,
        raw_report:   all_raw,
        scan_results: results  # passed to Runner for vulnerability persistence
      }
    end

    def empty_result(languages)
      counts = ::Scanners::ScanResult::VALID_SEVERITIES.each_with_object({}) { |s, h| h[s.to_sym] = 0 }
      counts.merge(languages: languages, scanner: "none", raw_report: {}, scan_results: [])
    end
  end
end