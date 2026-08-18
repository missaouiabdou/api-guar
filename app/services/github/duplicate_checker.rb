# app/services/github/duplicate_checker.rb
module Github
  class DuplicateChecker
    def call(delivery_id)
      return if delivery_id.blank?

      if WebhookEvent.exists?(delivery_id: delivery_id)
        raise DuplicateEventError, "Event #{delivery_id} already processed"
      end
    end
  end
end