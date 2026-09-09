# config/initializers/rack_attack.rb
#
# GR-103 — Rate limiting for the GuardRail API.
#
# Limits are intentionally conservative to avoid blocking legitimate use
# while preventing brute-force, credential stuffing, and webhook flooding.
#
# Configuration:
#   All limits are overridable via environment variables:
#     RACK_ATTACK_LOGIN_LIMIT       (default: 5)    — max login attempts per window
#     RACK_ATTACK_LOGIN_PERIOD      (default: 20)   — login window in seconds
#     RACK_ATTACK_SIGNUP_LIMIT      (default: 3)    — max signups per window
#     RACK_ATTACK_SIGNUP_PERIOD     (default: 60)   — signup window in seconds
#     RACK_ATTACK_WEBHOOK_LIMIT     (default: 30)   — max webhook deliveries per window
#     RACK_ATTACK_WEBHOOK_PERIOD    (default: 60)   — webhook window in seconds
#     RACK_ATTACK_API_LIMIT         (default: 100)  — general API requests per window
#     RACK_ATTACK_API_PERIOD        (default: 60)   — general API window in seconds
#
class Rack::Attack
  # Disable throttling in test suite unless explicitly enabled for rate-limiting tests
  Rack::Attack.enabled = false if Rails.env.test? && !ENV["ENABLE_RACK_ATTACK_TEST"]

  # ── 1. Login endpoint — prevent brute-force / credential stuffing ──────
  throttle("auth/login",
    limit:  ->(_req) { ENV.fetch("RACK_ATTACK_LOGIN_LIMIT",  "5").to_i },
    period: ->(_req) { ENV.fetch("RACK_ATTACK_LOGIN_PERIOD", "20").to_i.seconds }
  ) do |req|
    req.ip if req.path == "/api/v1/login" && req.post?
  end

  # ── 2. Signup endpoint — prevent mass account creation ─────────────────
  throttle("auth/signup",
    limit:  ->(_req) { ENV.fetch("RACK_ATTACK_SIGNUP_LIMIT",  "3").to_i },
    period: ->(_req) { ENV.fetch("RACK_ATTACK_SIGNUP_PERIOD", "60").to_i.seconds }
  ) do |req|
    req.ip if req.path == "/api/v1/signup" && req.post?
  end

  # ── 3. Webhook endpoint — allow GitHub burst but prevent flooding ──────
  throttle("webhooks/github",
    limit:  ->(_req) { ENV.fetch("RACK_ATTACK_WEBHOOK_LIMIT",  "30").to_i },
    period: ->(_req) { ENV.fetch("RACK_ATTACK_WEBHOOK_PERIOD", "60").to_i.seconds }
  ) do |req|
    req.ip if req.path == "/api/v1/webhooks/github" && req.post?
  end

  # ── 4. General API — DDoS protection blanket ───────────────────────────
  throttle("api/general",
    limit:  ->(_req) { ENV.fetch("RACK_ATTACK_API_LIMIT",  "100").to_i },
    period: ->(_req) { ENV.fetch("RACK_ATTACK_API_PERIOD", "60").to_i.seconds }
  ) do |req|
    req.ip if req.path.start_with?("/api/")
  end

  # ── Response for throttled requests ────────────────────────────────────
  self.throttled_responder = lambda do |req|
    match_data = req.env["rack.attack.match_data"]
    now        = match_data[:epoch_time]
    retry_after = match_data[:period] - (now % match_data[:period])

    [
      429,
      {
        "Content-Type"  => "application/json",
        "Retry-After"   => retry_after.to_s
      },
      [ { error: "Rate limit exceeded. Retry after #{retry_after} seconds." }.to_json ]
    ]
  end
end
