# app/services/scans/repository_cloner.rb
require 'net/http'
require 'uri'
require 'zlib'
require 'stringio'
require 'rubygems/package'
require 'fileutils'
require 'tmpdir'

module Scans
  class RepositoryCloner
    DEFAULT_TIMEOUT = 120 # seconds

    def initialize(scan, timeout: DEFAULT_TIMEOUT)
      @scan = scan
      @timeout = timeout
    end

    # Yields the extracted repo path. Auto-cleans temp dir after block.
    # Returns whatever the block returns.
    def call
      Dir.mktmpdir("scan-#{scan.id}-") do |dir|
        tarball = download_tarball
        extract_tarball(tarball, dir)
        Rails.logger.info "✅ Repository cloned to #{dir} (#{Dir.glob(File.join(dir, '**', '*')).count} files)"

        if block_given?
          yield dir
        else
          dir
        end
      end
    end

    private

    attr_reader :scan, :timeout

    def github_repo
      @github_repo ||= begin
        repo = scan.project.github_repo.presence
        return repo if repo.present?

        url = scan.project.repository_url.to_s
        if url =~ %r{github\.com[:/]([^/]+/[^/.]+?)(?:\.git)?\z}i || url =~ %r{github\.com/([^/]+/[^/]+)}i
          $1
        else
          raise("Project##{scan.project_id} has no github_repo set")
        end
      end
    end

    def commit_sha
      scan.commit_sha || raise("Scan##{scan.id} has no commit_sha")
    end

    def target_ref
      if commit_sha.present? && commit_sha != "HEAD"
        commit_sha
      else
        scan.branch.presence || scan.project.default_branch.presence || "main"
      end
    end

    def tarball_url
      @tarball_url ||= URI.parse(
        "https://api.github.com/repos/#{github_repo}/tarball/#{target_ref}"
      )
    end

    def download_tarball
      Rails.logger.info "⬇️ Downloading #{tarball_url} (repo=#{github_repo}, sha=#{commit_sha[0, 7]})"
      response = http_get(tarball_url)
      Rails.logger.info "✅ Downloaded #{response.body.bytesize} bytes"
      response.body
    end

    # Follows redirects (GitHub may 302 to S3)
    def http_get(uri, redirect_limit = 5)
      raise "Too many redirects" if redirect_limit.zero?

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = (uri.scheme == 'https')
      http.read_timeout = timeout
      http.open_timeout = timeout

      request = Net::HTTP::Get.new(uri.request_uri)
      request['Accept'] = 'application/vnd.github.v3+json'
      # Send auth only to api.github.com (not to S3 redirect targets)
      if github_token && uri.host.end_with?('github.com')
        request['Authorization'] = "Bearer #{github_token}"
      end
      request['User-Agent'] = 'Guardrail-API/1.0'

      response = http.request(request)

      case response
      when Net::HTTPSuccess
        response
      when Net::HTTPRedirection
        Rails.logger.info "↪️ Redirected to #{response['Location']}"
        http_get(URI.parse(response['Location']), redirect_limit - 1)
      when Net::HTTPNotFound
        raise "Repo '#{github_repo}' or commit '#{commit_sha[0,7]}' not found on GitHub"
      when Net::HTTPUnauthorized, Net::HTTPForbidden
        if github_token
          raise "GitHub API access denied — token may be invalid or revoked"
        else
          raise "GitHub API rate limit exceeded or private repo — set GITHUB_TOKEN"
        end
      else
        raise "GitHub API error #{response.code}: #{response.message}"
      end
    end

    def github_token
      @github_token ||= ENV['GITHUB_TOKEN'] ||
                        ENV['GITHUB_ACCESS_TOKEN'] ||
                        Rails.application.credentials.dig(:github, :token)
    end

    def extract_tarball(tarball_bytes, dest_path)
      Rails.logger.info "📦 Extracting #{tarball_bytes.bytesize} bytes to #{dest_path}"

      # GitHub tarballs are gzipped tar files
      gz = Zlib::GzipReader.new(StringIO.new(tarball_bytes))

      file_count = 0
      Gem::Package::TarReader.new(gz) do |tar|
        tar.each do |entry|
          next unless entry.file? # skip directories and symlinks

          # GitHub wraps everything in a top-level dir like
          # "missaouiabdou-guardial-2ba0dcaa/" — strip it
          parts = entry.full_name.split('/')
          relative = parts.drop(1).join('/')
          next if relative.empty?

          out_file = File.join(dest_path, relative)

          # Security: prevent path traversal
          next unless Pathname.new(out_file).cleanpath.to_s.start_with?(
            Pathname.new(dest_path).cleanpath.to_s
          )

          FileUtils.mkdir_p(File.dirname(out_file))
          File.binwrite(out_file, entry.read)
          file_count += 1
        end
      end

      Rails.logger.info "✅ Extracted #{file_count} files"
    end
  end
end