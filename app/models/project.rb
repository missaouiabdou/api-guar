class Project < ApplicationRecord
  belongs_to :user

  # Relations
  has_many :scans,             dependent: :destroy
  has_many :vulnerabilities,   through: :scans
  has_many :repositories,      dependent: :nullify
  has_many :security_policies, dependent: :destroy

  # Existing + New validations
  validates :name, presence: true, length: { minimum: 2, maximum: 100 }
  validates :repository_url, presence: true, url: true
  validates :github_repo, uniqueness: true, allow_nil: true
  # validates :repository_url, uniqueness: true, allow_nil: true  # DEJA presence: true, donc ma n3awedch

  # Existing enum
  enum :status, { active: 0, archived: 1 }

  # NEW: Callback
  before_create :generate_webhook_secret

  # NEW: Scopes (using enum to avoid conflict with boolean active column)
  scope :active_projects, -> { where(status: :active) }

  # NEW: Methods
  def recent_scans(limit = 10)
    scans.order(scanned_at: :desc).limit(limit)
  end

  def vulnerability_stats
    {
      critical: 0,  # ⚠️ Update when Vulnerability model exists
      high: 0,
      medium: 0,
      low: 0
    }
  end

  private

  def generate_webhook_secret
    self.webhook_secret ||= SecureRandom.hex(32)
  end
end
