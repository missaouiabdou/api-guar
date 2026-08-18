class WebhookEvent < ApplicationRecord
  belongs_to :scan, optional: true

  validates :source, presence: true
  validates :event_type, presence: true

  scope :recent, -> { order(created_at: :desc) }
  scope :failed, -> { where(status: 'failed') }
  scope :from_github, -> { where(source: 'github') }

  # ⚠️ 7ayed: serialize :headers, JSON
  # Headers deja kaynin f controller b .to_json

  def mark_processed!(scan)
    update!(
      status: 'processed',
      scan: scan,
      response_status: 202,
      response_body: { status: 'accepted', scan_id: scan.id }.to_json
    )
  end

  def mark_failed!(error, status_code = 422)
    update!(
      status: 'failed',
      error_message: error.to_s,
      response_status: status_code,
      response_body: { error: error.to_s }.to_json
    )
  end

  # Helper bach tparse headers mn JSON string
  def parsed_headers
    headers.present? ? JSON.parse(headers) : {}
  rescue JSON::ParserError
    {}
  end
end