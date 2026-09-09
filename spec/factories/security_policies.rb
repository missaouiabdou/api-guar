FactoryBot.define do
  factory :security_policy do
    association :project
    sequence(:name) { |n| "Production Policy #{n}" }
    description            { "Blocks releases with critical vulns" }
    minimum_security_score { 70 }
    maximum_critical       { 0 }
    maximum_high           { 5 }
    fail_on_secrets        { false }
    fail_on_regressions    { false }
    enabled                { true }
    block_on_failure       { false }
  end
end
