require 'rails_helper'

RSpec.describe 'Api::V1::Dashboard', type: :request do
  include AuthHelpers

  let(:user)    { create(:user) }
  let(:project) { create(:project, user: user) }
  let(:headers) { auth_headers_for(user) }

  describe 'GET /api/v1/dashboard' do
    before do
      scan = create(:scan, project: project, status: 'completed', completed_at: Time.current)
      create(:vulnerability, scan: scan, severity: 'critical', status: 'open')
      create(:vulnerability, scan: scan, severity: 'high', status: 'open')
      create(:repository, user: user, name: 'guardial', language: 'Ruby')
      create(:webhook_event, repository: 'missaouiabdou/guardial', status: 'processed')
    end

    it 'returns complete dashboard metrics matching screenshot aggregates' do
      get '/api/v1/dashboard', headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)

      expect(json['projects']).to have_key('total')
      expect(json['repositories']['total']).to eq(1)
      expect(json['security']['open_alerts']).to eq(2)
      expect(json['security']['critical_alerts']).to eq(1)
      expect(json['pipelines']['success_rate']).to eq(100)
      expect(json['deployments']).to have_key('last_7_days')
      expect(json['webhooks']).to have_key('activity_24h')
      expect(json['webhooks']).to have_key('recent_events')
    end
  end
end
