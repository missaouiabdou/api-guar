# app/models/policy_evaluation.rb
class PolicyEvaluation < ApplicationRecord
  belongs_to :security_policy
  belongs_to :scan

  # ── Validations ───────────────────────────────────────────────────────────

  validates :evaluated_at, presence: true
  validates :passed,       inclusion: { in: [true, false] }
  validates :scan_id, uniqueness: {
    scope: :security_policy_id,
    message: "already evaluated for this policy"
  }

  # ── Scopes ────────────────────────────────────────────────────────────────

  scope :passed,  -> { where(passed: true) }
  scope :failed,  -> { where(passed: false) }
  scope :recent,  -> { order(evaluated_at: :desc) }
end
