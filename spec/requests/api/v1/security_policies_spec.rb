require 'rails_helper'

RSpec.describe 'Api::V1::SecurityPolicies', type: :request do
  include AuthHelpers

  let(:user)          { create(:user) }
  let(:other_user)    { create(:user) }
  let(:project)       { create(:project, user: user) }
  let(:other_project) { create(:project, user: other_user) }
  let(:headers)       { auth_headers_for(user) }

  # ─── GET /api/v1/projects/:project_id/security_policies ─────────────────

  describe 'GET /api/v1/projects/:project_id/security_policies' do
    let!(:policy_a) { create(:security_policy, project: project, name: 'Prod A') }
    let!(:policy_b) { create(:security_policy, project: project, name: 'Prod B') }
    let!(:foreign)  { create(:security_policy, project: other_project) }

    it 'lists policies scoped to the project only' do
      get "/api/v1/projects/#{project.id}/security_policies", headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['total']).to eq(2)
      returned_ids = json['policies'].map { |p| p['id'] }
      expect(returned_ids).to match_array([policy_a.id, policy_b.id])
      expect(returned_ids).not_to include(foreign.id)
    end

    it 'requires authentication' do
      get "/api/v1/projects/#{project.id}/security_policies"
      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns 404 when accessing another user project (IDOR)' do
      get "/api/v1/projects/#{other_project.id}/security_policies", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  # ─── POST /api/v1/projects/:project_id/security_policies ────────────────

  describe 'POST /api/v1/projects/:project_id/security_policies' do
    let(:valid_attrs) do
      {
        security_policy: {
          name: 'Production Gate',
          minimum_security_score: 80,
          maximum_critical: 0,
          maximum_high: 2,
          enabled: true,
          block_on_failure: true
        }
      }
    end

    it 'creates a policy under the current user project' do
      expect {
        post "/api/v1/projects/#{project.id}/security_policies",
             params: valid_attrs, headers: headers, as: :json
      }.to change { project.security_policies.count }.by(1)

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json['data']['name']).to eq('Production Gate')
      expect(json['data']['project_id']).to eq(project.id)
      expect(json['data']['minimum_security_score']).to eq(80)
    end

    it 'validates required fields' do
      post "/api/v1/projects/#{project.id}/security_policies",
           params: { security_policy: { name: '' } }, headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'rejects invalid minimum_security_score (out of range)' do
      post "/api/v1/projects/#{project.id}/security_policies",
           params: { security_policy: { name: 'X', minimum_security_score: 150 } },
           headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'forbids creating a policy on another user project (IDOR)' do
      expect {
        post "/api/v1/projects/#{other_project.id}/security_policies",
             params: valid_attrs, headers: headers, as: :json
      }.not_to change { other_project.security_policies.count }

      expect(response).to have_http_status(:not_found)
    end
  end

  # ─── GET /api/v1/security_policies/:id ──────────────────────────────────

  describe 'GET /api/v1/security_policies/:id' do
    let!(:policy)  { create(:security_policy, project: project) }
    let!(:foreign) { create(:security_policy, project: other_project) }

    it 'returns the policy owned by the current user' do
      get "/api/v1/security_policies/#{policy.id}", headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['data']['id']).to eq(policy.id)
    end

    it 'returns 404 for a policy owned by another user (IDOR)' do
      get "/api/v1/security_policies/#{foreign.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  # ─── PATCH /api/v1/security_policies/:id ────────────────────────────────

  describe 'PATCH /api/v1/security_policies/:id' do
    let!(:policy)  { create(:security_policy, project: project, maximum_high: 5) }
    let!(:foreign) { create(:security_policy, project: other_project) }

    it 'updates allowed attributes' do
      patch "/api/v1/security_policies/#{policy.id}",
            params: { security_policy: { maximum_high: 1, enabled: false } },
            headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(policy.reload.maximum_high).to eq(1)
      expect(policy.reload.enabled).to be(false)
    end

    it 'refuses to update a foreign policy' do
      patch "/api/v1/security_policies/#{foreign.id}",
            params: { security_policy: { maximum_high: 99 } },
            headers: headers, as: :json

      expect(response).to have_http_status(:not_found)
      expect(foreign.reload.maximum_high).not_to eq(99)
    end
  end

  # ─── DELETE /api/v1/security_policies/:id ───────────────────────────────

  describe 'DELETE /api/v1/security_policies/:id' do
    let!(:policy)  { create(:security_policy, project: project) }
    let!(:foreign) { create(:security_policy, project: other_project) }

    it 'destroys own policy' do
      expect {
        delete "/api/v1/security_policies/#{policy.id}", headers: headers
      }.to change { SecurityPolicy.count }.by(-1)
      expect(response).to have_http_status(:no_content)
    end

    it 'cannot destroy a foreign policy' do
      expect {
        delete "/api/v1/security_policies/#{foreign.id}", headers: headers
      }.not_to change { SecurityPolicy.count }
      expect(response).to have_http_status(:not_found)
    end
  end
end
