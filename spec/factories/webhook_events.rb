FactoryBot.define do
  factory :webhook_event do
    sequence(:delivery_id) { |n| "delivery-#{n}-#{SecureRandom.hex(4)}" }
    event_type { "push" }
    sequence(:repository) { |n| "acme/repo-#{n}" }
    source { "github" }
    status { "pending" }
    payload do
      {
        "ref" => "refs/heads/main",
        "repository" => { "full_name" => "acme/repo" }
      }
    end
  end
end
