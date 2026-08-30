FactoryBot.define do
  factory :repository do
    association :user
    sequence(:name) { |n| "repo-#{n}" }
    sequence(:full_name) { |n| "acme/repo-#{n}" }
    url { "https://github.com/acme/repo" }
    provider { "github" }
    default_branch { "main" }
    language { "Ruby" }
    active { true }
  end
end
