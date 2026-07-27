class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  before_create :generate_api_token

  private

  def generate_api_token
    self.api_token = loop do
      token = SecureRandom.hex(32)
      break token unless User.exists?(api_token: token)
    end
  end


end
