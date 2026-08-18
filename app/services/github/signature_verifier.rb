# app/services/github/signature_verifier.rb
module Github
  class SignatureVerifier
    def initialize(secret: Rails.application.config.github_webhook_secret)
      @secret = secret.to_s
      raise InvalidSignatureError, "Webhook secret not configured" if @secret.blank?
    end

    def verify!(payload_body, signature_header)
      raise InvalidSignatureError, "Missing signature header" if signature_header.blank?
      raise InvalidSignatureError, "Empty payload body" if payload_body.blank?

      expected = "sha256=" + OpenSSL::HMAC.hexdigest(
        OpenSSL::Digest.new("sha256"), @secret, payload_body
      )

      unless ActiveSupport::SecurityUtils.secure_compare(expected, signature_header)
        raise InvalidSignatureError, "Signature mismatch"
      end

      true
    end
  end
end