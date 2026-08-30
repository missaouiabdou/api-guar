require 'devise/jwt/revocation_strategies/jti_matcher'

class User < ApplicationRecord
  include Devise::JWT::RevocationStrategies::JTIMatcher

  devise :database_authenticatable, :registerable,
         :recoverable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: self

  has_many :projects, dependent: :destroy
  has_many :repositories, dependent: :destroy

  before_create :generate_jti

  private

  def generate_jti
    self.jti ||= SecureRandom.uuid
  end
end