require 'devise/jwt/revocation_strategies/jti_matcher'

class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: Devise::JWT::RevocationStrategies::JTIMatcher

  has_many :projects, dependent: :destroy

  before_create :generate_jti

  private

  def generate_jti
    self.jti ||= SecureRandom.uuid
  end
end