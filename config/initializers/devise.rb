# frozen_string_literal: true

Devise.setup do |config|
  # ==> Configuration générale
  config.mailer_sender = 'please-change-me-at-config-initializers-devise@example.com'
  require 'devise/orm/active_record'
  config.case_insensitive_keys = [:email]
  config.strip_whitespace_keys = [:email]
  config.skip_session_storage = [:http_auth, :params_auth, :jwt_auth]
  config.stretches = Rails.env.test? ? 1 : 12
  config.reconfirmable = true
  config.expire_all_remember_me_on_sign_out = true
  config.password_length = 6..128
  config.email_regexp = /\A[^@\s]+@[^@\s]+\z/
  config.reset_password_within = 6.hours
  config.navigational_formats = []
  config.sign_out_via = :delete
  config.responder.error_status = :unprocessable_content
  config.responder.redirect_status = :see_other

  # ==> Configuration JWT
  config.jwt do |jwt|
    jwt.secret = Rails.application.credentials.secret_key_base || ENV.fetch('DEVISE_JWT_SECRET_KEY') {
      raise "FATAL: JWT secret not configured! Set DEVISE_JWT_SECRET_KEY or Rails credentials."}
        jwt.dispatch_requests = [
      ['POST', %r{^/api/v1/login$}],
      ['POST', %r{^/api/v1/signup$}]
    ]
    jwt.revocation_requests = [
      ['DELETE', %r{^/api/v1/logout$}]
    ]
    jwt.expiration_time = 1.day.to_i
  end
end