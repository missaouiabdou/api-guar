require 'rails_helper'

RSpec.describe "Authentication", type: :request do
  let!(:user) { create(:user) }

  describe "POST /api/v1/login" do
    it "returns JWT token with valid credentials" do
      post "/api/v1/login",
           params: { user: { email: user.email, password: "password123" } },
           as: :json

      expect(response).to have_http_status(:ok)
      expect(response.headers["Authorization"]).to be_present
      expect(JSON.parse(response.body)["message"]).to eq("Logged in successfully")
    end

    it "returns 401 with invalid credentials" do
      post "/api/v1/login",
           params: { user: { email: user.email, password: "wrong" } },
           as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /api/v1/signup" do
    it "returns 201 with valid params" do
      post "/api/v1/signup",
           params: { user: { email: "new@example.com", password: "password123", password_confirmation: "password123" } },
           as: :json

      expect(response).to have_http_status(:created)
      expect(response.headers["Authorization"]).to be_present
    end

    it "returns 422 with duplicate email" do
      post "/api/v1/signup",
           params: { user: { email: user.email, password: "password123", password_confirmation: "password123" } },
           as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end