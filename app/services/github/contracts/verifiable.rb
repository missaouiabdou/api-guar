# app/services/github/contracts/verifiable.rb
module Github
  module Contracts
    module Verifiable
      def verify!(payload_body, signature_header)
        raise NotImplementedError, "#{self.class} must implement #verify!"
      end
    end
  end
end