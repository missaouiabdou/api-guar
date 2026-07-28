class Project < ApplicationRecord
  belongs_to :user

  validates :name, presence: true
  validates :repository_url, presence: true

  enum :status, { active: 0, archived: 1 }
end