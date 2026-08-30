FactoryBot.define do
  factory :vulnerability do
    association :scan
    sequence(:warning_type) { |n| ["SQL Injection", "Command Injection", "File Access", "Mass Assignment", "Path Traversal"].rotate(n).first }
    message      { "Possible vulnerability detected" }
    confidence   { "High" }
    severity     { "high" }
    status       { "open" }
    file         { "app/controllers/api/v1/vulnerabilities_controller.rb" }
    line         { 16 }
    check_name   { "SQL" }
    warning_code { 0 }
    cwe_id       { [89] }
    location     { { "class" => "Api::V1::VulnerabilitiesController", "method" => "sqli" } }
    location_class  { "Api::V1::VulnerabilitiesController" }
    location_method { "sqli" }
    sequence(:fingerprint) { |n| Digest::SHA256.hexdigest("vuln-factory-#{n}") }
  end
end
