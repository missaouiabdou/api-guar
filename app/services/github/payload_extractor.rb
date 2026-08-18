# app/services/github/payload_extractor.rb
module Github
  class PayloadExtractor
    def self.call(raw_body)
      return {} if raw_body.blank?

      JSON.parse(raw_body)
    rescue JSON::ParserError
      raise InvalidPayloadError, "Invalid JSON payload"
    end
  end
end