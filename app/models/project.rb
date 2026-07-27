# frozen_string_literal: true

class Project  < ApplicationRecord
  validates :name, presence: true
  validates :repository_url, presence: true

  enum :status, {
    active: 0,
    archived: 1
  }
end
