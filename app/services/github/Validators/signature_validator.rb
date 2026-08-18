# app/services/github/validators/signature_validator.rb
module Github
  module Validators
    class SignatureValidator < BaseValidator
      def initialize(secret:, **kwargs)
        super(**kwargs)
        @secret = secret
      end

      private

      def perform_validation!(request)
        raise InvalidSignatureError, "Missing signature" if request.signature.blank?

        expected = "sha256=" + OpenSSL::HMAC.hexdigest(
          OpenSSL::Digest.new("sha256"), @secret, request.raw_body
        )

        unless ActiveSupport::SecurityUtils.secure_compare(expected, request.signature)
          raise InvalidSignatureError, "Signature mismatch"
        end
      end
    end
  end
end