class Project < ApplicationRecord
  belongs_to :user

  validates :name, presence: true, length: { minimum: 2, maximum: 100 }
  validates :repository_url, presence: true, url: true
  validates :status, inclusion: { in: %w[active archived] }

  enum :status, { active: 0, archived: 1 }
end