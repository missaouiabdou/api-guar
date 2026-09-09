# app/services/github/status_poster.rb
require 'net/http'
require 'uri'
require 'json'

module Github
  class StatusPoster
    def self.call(scan)
      new(scan).call
    end

    def initialize(scan)
      @scan = scan
      @project = scan.project
    end

    def call
      token = ENV['GITHUB_TOKEN'].presence
      unless token
        Rails.logger.info "[GITHUB STATUS] GITHUB_TOKEN not configured — skipping commit status update"
        return nil
      end

      repo = @project.github_repo.presence
      sha  = @scan.commit_sha.presence

      if repo.blank? || sha.blank? || sha == "HEAD" || sha == "unknown"
        Rails.logger.info "[GITHUB STATUS] Incomplete repo (#{repo}) or commit sha (#{sha}) — skipping status update"
        return nil
      end

      # Evaluate gate status
      score_data  = Security::ScoreCalculator.call(@scan)
      evaluations = @scan.policy_evaluations.includes(:security_policy)

      policy_passed   = evaluations.empty? || evaluations.all?(&:passed)
      blocking_failed = evaluations.any? { |ev| !ev.passed && ev.security_policy&.block_on_failure }

      state, description = compute_status(score_data[:score], policy_passed, blocking_failed, evaluations)
      target_url = build_target_url

      post_status(token: token, repo: repo, sha: sha, state: state, description: description, target_url: target_url)
    rescue StandardError => e
      Rails.logger.warn "[GITHUB STATUS] Failed to post status for Scan ##{@scan.id}: #{e.message}"
      nil
    end

    private

    def compute_status(score, policy_passed, blocking_failed, evaluations)
      if blocking_failed || score < 40
        failed_ev = evaluations.find { |ev| !ev.passed }
        violation = failed_ev&.violations&.first
        reason = violation ? (violation['message'] || violation[:message]) : "Score #{score}/100 below minimum threshold"
        ["failure", "Gate FAILED: #{reason.to_s.truncate(100)}"]
      elsif !policy_passed || score < 70
        ["success", "Gate PASSED with warnings: Score #{score}/100"]
      else
        ["success", "Gate PASSED: Score #{score}/100 — All policies satisfied"]
      end
    end

    def build_target_url
      host = ENV.fetch('APP_HOST_URL', 'http://localhost:5173').sub(%r{/+\z}, '')
      "#{host}/security"
    end

    def post_status(token:, repo:, sha:, state:, description:, target_url:)
      uri = URI("https://api.github.com/repos/#{repo}/statuses/#{sha}")
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.read_timeout = 10
      http.open_timeout = 5

      req = Net::HTTP::Post.new(uri.path)
      req['Authorization'] = "Bearer #{token}"
      req['Accept']        = "application/vnd.github.v3+json"
      req['Content-Type']  = "application/json"
      req['User-Agent']    = "GuardRail-DevSecOps/1.0"

      body = {
        state:       state,
        target_url:  target_url,
        description: description,
        context:     "GuardRail / Security Gate"
      }
      req.body = body.to_json

      res = http.request(req)
      Rails.logger.info "[GITHUB STATUS] Posted #{state} status to #{repo}@#{sha[0..6]} (HTTP #{res.code})"
      res.is_a?(Net::HTTPSuccess)
    end
  end
end
