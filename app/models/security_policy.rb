# app/models/security_policy.rb
class SecurityPolicy < ApplicationRecord
  belongs_to :project
  has_many   :policy_evaluations, dependent: :destroy

  # ── Validations ───────────────────────────────────────────────────────────

  validates :name,                   presence: true, length: { maximum: 100 }
  validates :minimum_security_score, numericality: { only_integer: true, in: 0..100 }
  validates :maximum_critical,       numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :maximum_high,           numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  # ── Scopes ────────────────────────────────────────────────────────────────

  scope :enabled,  -> { where(enabled: true) }
  scope :disabled, -> { where(enabled: false) }
end
