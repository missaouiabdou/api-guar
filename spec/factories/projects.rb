FactoryBot.define do
  factory :project do
    sequence(:name) { |n| "Project #{n}" }
    repository_url { "https://github.com/test/repo" }
    sequence(:github_repo) { |n| "test/repo-#{n}" }
    status { :active }
    association :user
  end
end