# app/models/audit_log.rb
class AuditLog < ApplicationRecord
  validates :action,        presence: true
  validates :resource_type, presence: true

  # Immutable audit trail: persisted logs can never be modified or destroyed
  def readonly?
    persisted?
  end

  before_destroy { raise ActiveRecord::ReadOnlyRecord, "Audit logs are strictly immutable and cannot be deleted." }

  scope :recent, -> { order(created_at: :desc) }
  scope :by_action, ->(act) { where(action: act) }
  scope :by_resource, ->(type) { where(resource_type: type) }
end
