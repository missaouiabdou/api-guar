# app/services/github/webhook_request.rb
module Github
  class WebhookRequest
    attr_reader :raw_body, :signature, :event_type, :delivery_id, :payload, :headers

    def initialize(raw_body:, signature:, event_type:, delivery_id:, payload:, headers: {})
      @raw_body    = raw_body
      @signature   = signature
      @event_type  = event_type
      @delivery_id = delivery_id
      @payload     = payload
      @headers     = headers
    end

    def repository
      payload.dig("repository", "full_name")
    end
  end
end