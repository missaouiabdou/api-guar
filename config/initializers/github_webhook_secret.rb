# config/initializers/github_webhook_secret.rb
require "securerandom"

module GithubWebhookSecret
  SECRET_FILE = Rails.root.join("tmp", ".github_webhook_secret")

  def self.current
    # 1. Essayer ENV
    secret = ENV["GITHUB_WEBHOOK_SECRET"].presence

    # 2. Essayer credentials
    secret ||= Rails.application.credentials.github_webhook_secret.presence

    # 3. Auto-générer en dev/test si tjr vide
    if secret.blank? && (Rails.env.development? || Rails.env.test?)
      if File.exist?(SECRET_FILE)
        secret = File.read(SECRET_FILE).strip
      else
        secret = SecureRandom.hex(32)
        File.write(SECRET_FILE, secret)
      end

      # Affiche une seule fois au démarrage
      Rails.logger.info "\n\n🐙 ==========================================="
      Rails.logger.info "🐙 GitHub Webhook Secret (auto-generated dev):"
      Rails.logger.info "🐙 #{secret}"
      Rails.logger.info "🐙 Copie cette valeur dans Postman (env: github_webhook_secret)"
      Rails.logger.info "🐙 ===========================================\n\n"
    end

    # 4. Production = obligatoire
    secret.presence || raise(
      "GitHub webhook secret not configured! " \
        "Set GITHUB_WEBHOOK_SECRET env var or Rails credentials."
    )
  end
end

Rails.application.config.github_webhook_secret = GithubWebhookSecret.current