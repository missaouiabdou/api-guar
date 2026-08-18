# app/services/github/contracts/recordable.rb
module Github
  module Contracts
    module Recordable
      def call(event_type:, delivery_id:, repository:, payload:)
        raise NotImplementedError, "#{self.class} must implement #call"
      end
    end
  end
end