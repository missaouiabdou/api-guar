class Scan < ApplicationRecord
  belongs_to :project
  has_one :webhook_event

  validates :scan_id, presence: true, uniqueness: { scope: :project_id }
  validates :source_type, presence: true, inclusion: {
    in: %w[sonarqube trivy github_push github_pr manual github_workflow]
  }
  validates :commit_sha, presence: true
  validates :branch, presence: true
  validates :status, inclusion: { in: %w[pending processing completed failed] }

  scope :completed, -> { where(status: 'completed') }
  scope :failed, -> { where(status: 'failed') }
  scope :recent, -> { order(scanned_at: :desc) }
  scope :for_branch, ->(branch) { where(branch: branch) }

  def pending?;   status == 'pending';   end
  def processing?; status == 'processing'; end
  def completed?;  status == 'completed';  end
  def failed?;     status == 'failed';     end

  def start_processing!
    update!(status: 'processing', error_message: nil)
  end

  def complete!
    update!(
      status: 'completed',
      completed_at: Time.current
    )
  end

  def fail!(error)
    update!(status: 'failed', error_message: error.to_s, completed_at: Time.current)
  end

  def total_vulnerabilities
    critical_count + high_count + medium_count + low_count + info_count
  end

  def critical?
    critical_count > 0
  end
end