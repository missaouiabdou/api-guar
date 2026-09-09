# GR-103 — Multi-user isolation tests (IDOR protection)
require 'rails_helper'

RSpec.describe 'Auth & multi-user isolation', type: :request do
  include AuthHelpers

  let(:user)       { create(:user) }
  let(:other_user) { create(:user) }
  let(:project)       { create(:project, user: user) }
  let(:other_project) { create(:project, user: other_user) }
  let(:scan)          { create(:scan, project: project) }
  let(:other_scan)    { create(:scan, project: other_project) }
  let!(:vuln)         { create(:vulnerability, scan: scan) }
  let!(:other_vuln)   { create(:vulnerability, scan: other_scan) }
  let!(:repo)         { create(:repository, user: user) }
  let!(:other_repo)   { create(:repository, user: other_user) }

  let(:headers)      { auth_headers_for(user) }
  let(:other_headers) { auth_headers_for(other_user) }

  describe 'unauthenticated access' do
    it 'rejects all protected endpoints with 401' do
      [ '/api/v1/scans',
        '/api/v1/vulnerabilities',
        '/api/v1/repositories',
        '/api/v1/projects',
        '/api/v1/dashboard',
        "/api/v1/scans/#{scan.id}",
        "/api/v1/scans/#{scan.id}/gate" ].each do |path|
        get path, headers: { 'Accept' => 'application/json' }
        expect(response).to have_http_status(:unauthorized),
          "expected 401 for #{path}, got #{response.status}"
      end
    end

    it 'rejects unauthenticated vulnerability update' do
      patch "/api/v1/vulnerabilities/#{vuln.id}",
            params: { vulnerability: { status: 'ignored' } }.to_json,
            headers: { 'Content-Type' => 'application/json', 'Accept' => 'application/json' }
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'cross-user access (IDOR)' do
    it 'hides other users scans' do
      get '/api/v1/scans', headers: headers
      ids = JSON.parse(response.body).map { |s| s['id'] }
      expect(ids).to include(scan.id)
      expect(ids).not_to include(other_scan.id)
    end

    it 'returns 404 for another users scan' do
      get "/api/v1/scans/#{other_scan.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it 'returns 404 for another users scan vulnerabilities' do
      get "/api/v1/scans/#{other_scan.id}/vulnerabilities", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it 'hides other users vulnerabilities' do
      get '/api/v1/vulnerabilities', headers: headers
      ids = JSON.parse(response.body)['data'].map { |v| v['id'] }
      expect(ids).to include(vuln.id)
      expect(ids).not_to include(other_vuln.id)
    end

    it 'returns 404 for another users vulnerability' do
      get "/api/v1/vulnerabilities/#{other_vuln.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it 'prevents updating another users vulnerability' do
      patch "/api/v1/vulnerabilities/#{other_vuln.id}",
            params: { vulnerability: { status: 'ignored' } }.to_json,
            headers: headers.merge('Content-Type' => 'application/json')
      expect(response).to have_http_status(:not_found)
      expect(other_vuln.reload.status).to eq('open')
    end

    it 'hides other users repositories' do
      get '/api/v1/repositories', headers: headers
      ids = JSON.parse(response.body)['data'].map { |r| r['id'] }
      expect(ids).to include(repo.id)
      expect(ids).not_to include(other_repo.id)
    end

    it 'returns 404 for another users repository' do
      get "/api/v1/repositories/#{other_repo.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it 'prevents destroying another users repository' do
      expect {
        delete "/api/v1/repositories/#{other_repo.id}", headers: headers
      }.not_to change(Repository, :count)
      expect(response).to have_http_status(:not_found)
    end

    it 'lets the owner access their own data' do
      get "/api/v1/scans/#{other_scan.id}", headers: other_headers
      expect(response).to have_http_status(:ok)
    end
  end

  # GR-101 — project_id foreign-key injection prevention
  describe 'repository project_id injection (GR-101)' do
    it 'rejects creating a repository with another users project_id' do
      post '/api/v1/repositories',
           params: { repository: {
             name: 'injected-repo', full_name: 'evil/injected',
             url: 'https://github.com/evil/injected', provider: 'github',
             project_id: other_project.id
           } }.to_json,
           headers: headers.merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)['error']).to eq('Invalid project')
    end

    it 'allows creating a repository with own project_id' do
      post '/api/v1/repositories',
           params: { repository: {
             name: 'own-repo', full_name: 'me/own-repo',
             url: 'https://github.com/me/own-repo', provider: 'github',
             project_id: project.id
           } }.to_json,
           headers: headers.merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:created)
    end

    it 'rejects updating a repository to link to another users project' do
      patch "/api/v1/repositories/#{repo.id}",
            params: { repository: { project_id: other_project.id } }.to_json,
            headers: headers.merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:unprocessable_entity)
      expect(repo.reload.project_id).not_to eq(other_project.id)
    end
  end
end
