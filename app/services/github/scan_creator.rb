module Github
  class ScanCreator
    EVENT_SOURCE_MAP = {
      "push" => "github_push",
      "pull_request" => "github_pr",
      "workflow_run" => "github_workflow",
      "workflow_job" => "github_workflow"
    }.freeze

    def call(project:, request:)
      Scan.create!(
        project: project,
        scan_id: build_scan_id(request.delivery_id),
        source_type: EVENT_SOURCE_MAP.fetch(request.event_type, "manual"),
        commit_sha: extract_commit_sha(request),
        branch: extract_branch(request),
        status: "pending",
        scanned_at: Time.current,
        raw_payload: request.payload
      )
    end

    private

    def build_scan_id(delivery_id)
      "gh-#{delivery_id.presence || SecureRandom.uuid}"
    end

    def extract_commit_sha(request)
      request.payload["after"].presence ||
        request.payload.dig("pull_request", "head", "sha").presence ||
        request.payload.dig("workflow_run", "head_sha").presence ||
        request.payload.dig("workflow_job", "head_sha").presence ||
        request.payload.dig("workflow_job", "head_commit", "id").presence ||
        "unknown"
    end

    def extract_branch(request)
      request.payload["ref"].to_s.sub(%r{^refs/heads/}, "").presence ||
        request.payload.dig("pull_request", "head", "ref").presence ||
        request.payload.dig("workflow_run", "head_branch").presence ||
        request.payload.dig("workflow_job", "head_branch").presence ||
        "unknown"
    end
  end
end