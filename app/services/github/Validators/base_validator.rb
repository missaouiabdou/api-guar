# app/services/github/validators/base_validator.rb
module Github
  module Validators
    class BaseValidator
      def initialize(next_validator: nil)
        @next_validator = next_validator
      end

      def validate!(request)
        # 1. Validation dyal had l class
        perform_validation!(request)

        # 2. Passer l next validator (Chain of Responsibility)
        @next_validator&.validate!(request)
      end

      private

      def perform_validation!(_request)
        raise NotImplementedError, "#{self.class} must implement #perform_validation!"
      end
    end
  end
end