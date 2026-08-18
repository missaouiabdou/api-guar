FactoryBot.define do
  factory :scan do
    association :project
    sequence(:scan_id) { |n| "scans-#{n}" }
    source_type { "github_push" }
    commit_sha { SecureRandom.hex(20) }
    branch { "main" }
    status { "pending" }
    scanned_at { Time.current }
  end
end