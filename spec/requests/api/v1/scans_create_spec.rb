require 'rails_helper'

RSpec.describe 'Scans Manual Trigger API (Priority 4)', type: :request do
  include AuthHelpers
  include ActiveJob::TestHelper

  let(:user)    { create(:user) }
  let(:project) { create(:project, user: user) }
  let(:headers) { auth_headers_for(user) }

  describe 'POST /api/v1/scans' do
    it 'creates a scan asynchronously and returns 202 Accepted' do
      expect {
        post '/api/v1/scans',
             params: { scan: { project_id: project.id, branch: 'feature/login' } },
             headers: headers,
             as: :json
      }.to have_enqueued_job(ScanJob)

      expect(response).to have_http_status(:accepted)
      json = JSON.parse(response.body)
      expect(json['message']).to eq('Scan successfully queued')
      expect(json['data']['status']).to eq('pending')
      expect(json['data']['branch']).to eq('feature/login')
      expect(json['data']['source_type']).to eq('manual')
    end

    it 'blocks concurrent scans on the same branch (concurrency guard)' do
      create(:scan, project: project, branch: 'main', status: 'processing')

      post '/api/v1/scans',
           params: { scan: { project_id: project.id, branch: 'main' } },
           headers: headers,
           as: :json

      expect(response).to have_http_status(:conflict)
      json = JSON.parse(response.body)
      expect(json['error']).to include('already in progress')
    end

    it 'prevents IDOR: cannot trigger scan for another user project' do
      other_user    = create(:user)
      other_project = create(:project, user: other_user)

      post '/api/v1/scans',
           params: { scan: { project_id: other_project.id } },
           headers: headers,
           as: :json

      expect(response).to have_http_status(:not_found)
    end
  end
end
