require 'rails_helper'

RSpec.describe 'Api::V1::Repositories', type: :request do
  include AuthHelpers

  let(:user)       { create(:user) }
  let(:other_user) { create(:user) }
  let(:headers)    { auth_headers_for(user) }

  let!(:repo_ruby)   { create(:repository, user: user, name: 'guardial', language: 'Ruby') }
  let!(:repo_java)   { create(:repository, user: user, name: 'spring-service', language: 'Java') }
  let!(:other_repo)  { create(:repository, user: other_user, name: 'private-repo') }

  describe 'GET /api/v1/repositories' do
    it 'returns user repositories with supported scanners' do
      get '/api/v1/repositories', headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['data'].length).to eq(2)
      expect(json['data'].first['supported_scanners']).to be_an(Array)
    end

    it 'filters by language' do
      get '/api/v1/repositories?language=java', headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['data'].length).to eq(1)
      expect(json['data'].first['name']).to eq('spring-service')
    end

    it 'does not expose other users repositories (IDOR protection)' do
      get "/api/v1/repositories/#{other_repo.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'POST /api/v1/repositories' do
    it 'creates a new multi-language repository' do
      payload = {
        repository: {
          name: 'python-worker',
          full_name: 'acme/python-worker',
          url: 'https://github.com/acme/python-worker',
          language: 'python',
          default_branch: 'main'
        }
      }

      post '/api/v1/repositories', params: payload.to_json, headers: headers.merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json['data']['name']).to eq('python-worker')
      expect(json['data']['language']).to eq('python')
    end
  end
end
