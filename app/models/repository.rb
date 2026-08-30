# app/models/repository.rb
class Repository < ApplicationRecord
  belongs_to :user
  belongs_to :project, optional: true
  has_many :scans, dependent: :nullify

  validates :name, presence: true
  validates :full_name, presence: true, uniqueness: { scope: :user_id }
  validates :url, presence: true
  validates :provider, presence: true, inclusion: { in: %w[github gitlab bitbucket manual] }

  scope :active, -> { where(active: true) }
  scope :by_language, ->(lang) { where("LOWER(language) = ?", lang.to_s.downcase) }
  scope :recent, -> { order(created_at: :desc) }

  # Detect supported scanners based on repository language
  def supported_scanners
    detected_langs = language.present? ? [language.downcase] : []
    ::Scanners::ScannerRegistry.for(languages: detected_langs).map(&:name)
  end
end
