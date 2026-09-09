# app/services/audit_service.rb
class AuditService
  FILTERED_KEYS = %w[
    password password_confirmation secret token api_key authorization
    jti private_key access_token bearer
  ].freeze

  def self.log(action:, resource_type:, actor: nil, resource_id: nil, metadata: {})
    actor_id    = actor.is_a?(User) ? actor.id : (actor.is_a?(Integer) ? actor : nil)
    actor_email = actor.is_a?(User) ? actor.email : (actor.is_a?(String) ? actor : (actor ? "user##{actor_id}" : "system"))

    sanitized_meta = sanitize(metadata)

    AuditLog.create!(
      actor_id:      actor_id,
      actor_email:   actor_email,
      action:        action.to_s,
      resource_type: resource_type.to_s,
      resource_id:   resource_id.to_s,
      metadata:      sanitized_meta,
      created_at:    Time.current
    )
  rescue StandardError => e
    Rails.logger.error "⚠️ Failed to record audit log (#{action}): #{e.message}"
    nil
  end

  def self.sanitize(data)
    return {} unless data.is_a?(Hash)

    data.each_with_object({}) do |(k, v), acc|
      key_str = k.to_s.downcase
      if FILTERED_KEYS.any? { |f| key_str.include?(f) }
        acc[k] = "[FILTERED]"
      elsif v.is_a?(Hash)
        acc[k] = sanitize(v)
      elsif v.is_a?(Array)
        acc[k] = v.map { |item| item.is_a?(Hash) ? sanitize(item) : item }
      else
        acc[k] = v
      end
    end
  end
end
