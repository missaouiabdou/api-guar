# db/seeds.rb
user = User.find_by(email: "ahmed@example.com") || User.first || User.create!(
  email: "sarah.chen@acme.com",
  password: "Password123!",
  password_confirmation: "Password123!",
  first_name: "Sarah",
  last_name: "Chen",
  job_title: "Platform Engineering Lead",
  timezone: "America/New_York (UTC-5)"
)

user.update_columns(
  first_name: "Sarah",
  last_name: "Chen",
  job_title: "Platform Engineering Lead",
  timezone: "America/New_York (UTC-5)"
)

# Seed Repositories
repos_data = [
  { name: "api-gateway", full_name: "acme/api-gateway", language: "Go", url: "https://github.com/acme/api-gateway" },
  { name: "frontend-app", full_name: "acme/frontend-app", language: "TypeScript", url: "https://github.com/acme/frontend-app" },
  { name: "auth-service", full_name: "acme/auth-service", language: "Rust", url: "https://github.com/acme/auth-service" },
  { name: "data-pipeline", full_name: "acme/data-pipeline", language: "Python", url: "https://github.com/acme/data-pipeline" },
  { name: "notification-svc", full_name: "acme/notification-svc", language: "Node.js", url: "https://github.com/acme/notification-svc" },
  { name: "ml-inference", full_name: "acme/ml-inference", language: "Python", url: "https://github.com/acme/ml-inference" }
]

repos_data.each_with_index do |rdata, idx|
  repo = user.repositories.find_or_initialize_by(full_name: rdata[:full_name])
  repo.name = rdata[:name]
  repo.language = rdata[:language]
  repo.url = rdata[:url]
  repo.default_branch = "main"
  repo.active = true
  repo.metadata = {
    "stars" => [234, 891, 156, 67, 43, 312][idx],
    "forks" => [18, 67, 12, 8, 5, 41][idx],
    "watchers" => [45, 112, 34, 22, 15, 78][idx]
  }
  repo.save!
end

# Seed Audit Logs if few exist
if AuditLog.count < 10
  audit_samples = [
    { action: "deploy.create", actor: "sarah.chen@acme.com", res_type: "Deployment", res_id: "api-gateway", meta: { ip: "10.0.0.45", target: "production", version: "v2.4.1" }, time: 2.hours.ago },
    { action: "secret.view", actor: "marcus.dev@acme.com", res_type: "Secret", res_id: "STRIPE_API_KEY", meta: { ip: "10.0.0.12", reason: "incident triage" }, time: 5.hours.ago },
    { action: "pipeline.trigger", actor: "alex.kim@acme.com", res_type: "Pipeline", res_id: "auth-service/CI", meta: { ip: "10.0.0.78", status: "failed", scan_id: 88 }, time: 1.day.ago },
    { action: "user.invite", actor: "admin@acme.com", res_type: "User", res_id: "diana.lee@acme.com", meta: { ip: "192.168.1.100", role: "security_engineer" }, time: 1.day.ago },
    { action: "webhook.delete", actor: "priya.nair@acme.com", res_type: "Webhook", res_id: "data-pipeline-hook", meta: { ip: "10.0.0.55", repo: "acme/data-pipeline" }, time: 2.days.ago },
    { action: "apikey.rotate", actor: "tom.walker@acme.com", res_type: "APIKey", res_id: "ci-cd-token", meta: { ip: "10.0.0.33", key_id: "gr_tok_9912" }, time: 3.days.ago },
    { action: "auth.login", actor: "unknown@security.net", res_type: "Auth", res_id: "admin@acme.com", meta: { ip: "203.0.113.42", error: "invalid_password" }, time: 3.days.ago },
    { action: "policy.created", actor: "sarah.chen@acme.com", res_type: "SecurityPolicy", res_id: "1", meta: { name: "Zero Criticals Rule", min_score: 80 }, time: 4.days.ago }
  ]

  audit_samples.each do |sample|
    AuditLog.create!(
      action: sample[:action],
      actor_email: sample[:actor],
      actor_id: user.id,
      resource_type: sample[:res_type],
      resource_id: sample[:res_id],
      metadata: sample[:meta],
      created_at: sample[:time]
    )
  end
end

puts "Database seeded successfully with dynamic Repositories, Audit Logs, and User Profile!"
