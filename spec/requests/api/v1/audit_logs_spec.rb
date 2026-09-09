require 'rails_helper'

RSpec.describe 'Audit Logs API (Priority 8)', type: :request do
  include AuthHelpers

  let(:user)    { create(:user) }
  let(:headers) { auth_headers_for(user) }

  before do
    AuditService.log(actor: user, action: 'project_created', resource_type: 'Project', resource_id: '1')
    AuditService.log(actor: user, action: 'scan_triggered', resource_type: 'Scan', resource_id: '2')
  end

  describe 'GET /api/v1/audit_logs' do
    it 'returns paginated audit logs' do
      get '/api/v1/audit_logs', headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['data'].size).to be >= 2
      actions = json['data'].map { |d| d['action'] }
      expect(actions).to include('project_created', 'scan_triggered')
      expect(response.headers['X-Total-Count']).to be_present
    end

    it 'filters audit logs by action' do
      get '/api/v1/audit_logs', params: { action_name: 'scan_triggered' }, headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['data'].size).to eq(1)
      expect(json['data'].first['action']).to eq('scan_triggered')
    end
  end
end
