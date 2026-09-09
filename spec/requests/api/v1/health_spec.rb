require 'rails_helper'

RSpec.describe 'Health API (Priority 10)', type: :request do
  describe 'GET /api/v1/health' do
    it 'returns 200 ok without authentication' do
      get '/api/v1/health'

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json).to eq({ 'status' => 'ok' })
    end
  end
end
