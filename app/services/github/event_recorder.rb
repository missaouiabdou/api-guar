module Github
  class EventRecorder
    include Contracts::Recordable

    def call(event_type:, delivery_id:, repository:, payload:, signature: nil, headers: {}, status: "pending")
      WebhookEvent.create!(
        event_type:  event_type,
        delivery_id: delivery_id,
        source:      'github',        # ← HADI l-fix l-mohim
        repository:  repository,
        payload:     payload,
        signature:   signature,
        headers:     headers.to_json,
        status:      status
      )
    end
  end
end