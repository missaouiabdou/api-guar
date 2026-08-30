require 'rails_helper'

RSpec.describe 'Api::V1::Security policy_results & gate', type: :request do
  include AuthHelpers

  let(:user)          { create(:user) }
  let(:other_user)    { create(:user) }
  let(:project)       { create(:project, user: user) }
  let(:other_project) { create(:project, user: other_user) }
  let(:headers)       { auth_headers_for(user) }

  def make_scan(proj, overrides = {})
    create(:scan,
           { project: proj, status: 'completed', completed_at: Time.current }.merge(overrides))
  end

  # ─── GET /api/v1/scans/:scan_id/policy_results (GR-604) ─────────────────

  describe 'GET /api/v1/scans/:scan_id/policy_results' do
    let(:scan) { make_scan(project) }

    context 'with no policy evaluations' do
      it 'returns passed=true with empty policies list' do
        get "/api/v1/scans/#{scan.id}/policy_results", headers: headers

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['scan_id']).to eq(scan.id)
        expect(json['passed']).to be(true)
        expect(json['policies']).to eq([])
      end
    end

    context 'with mixed passing and failing evaluations' do
      let!(:policy_a) { create(:security_policy, project: project, name: 'Prod A') }
      let!(:policy_b) { create(:security_policy, project: project, name: 'Prod B') }

      before do
        create(:vulnerability, scan: scan, severity: 'critical', status: 'open')
        Security::PolicyEvaluator.call(scan: scan, policy: policy_a, persist: true)
        Security::PolicyEvaluator.call(scan: scan, policy: policy_b, persist: true)
      end

      it 'reports overall passed=false when any policy fails' do
        get "/api/v1/scans/#{scan.id}/policy_results", headers: headers

        json = JSON.parse(response.body)
        expect(json['passed']).to be(false)
        expect(json['total']).to eq(2)

        names = json['policies'].map { |p| p['name'] }
        expect(names).to include('Prod A', 'Prod B')

        first = json['policies'].first
        expect(first).to have_key('violations')
        expect(first).to have_key('policy_id')
      end
    end

    it 'refuses to return results for another user scan (IDOR)' do
      other_scan = make_scan(other_project)
      get "/api/v1/scans/#{other_scan.id}/policy_results", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it 'requires authentication' do
      get "/api/v1/scans/#{scan.id}/policy_results"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  # ─── GET /api/v1/scans/:scan_id/gate (GR-901) ───────────────────────────

  describe 'GET /api/v1/scans/:scan_id/gate' do
    context 'clean scan with no policies' do
      let(:scan) { make_scan(project) }

      it 'returns passed status and score 100' do
        get "/api/v1/scans/#{scan.id}/gate", headers: headers

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['status']).to eq('passed')
        expect(json['security_score']).to eq(100)
        expect(json['risk_level']).to eq('low')
        expect(json['policy_passed']).to be(true)
        expect(json['critical']).to eq(0)
        expect(json['high']).to eq(0)
      end
    end

    context 'critical vulnerability + blocking policy' do
      let(:scan) { make_scan(project) }
      let!(:policy) do
        create(:security_policy, project: project,
                                  maximum_critical: 0,
                                  block_on_failure: true)
      end

      before do
        create(:vulnerability, scan: scan, severity: 'critical', status: 'open')
        Security::PolicyEvaluator.call(scan: scan, policy: policy, persist: true)
      end

      it 'returns status=failed and policy_passed=false' do
        get "/api/v1/scans/#{scan.id}/gate", headers: headers

        json = JSON.parse(response.body)
        expect(json['status']).to eq('failed')
        expect(json['policy_passed']).to be(false)
        expect(json['critical']).to eq(1)
      end
    end

    context 'medium severity findings only (score in warning range)' do
      let(:scan) { make_scan(project) }

      before do
        # 7 mediums = -35 → score 65 (warning range 40..69)
        7.times { create(:vulnerability, scan: scan, severity: 'medium', status: 'open') }
      end

      it 'returns status=warning' do
        get "/api/v1/scans/#{scan.id}/gate", headers: headers

        json = JSON.parse(response.body)
        expect(json['security_score']).to eq(65)
        expect(json['status']).to eq('warning')
      end
    end

    it 'refuses to return gate for another user scan (IDOR)' do
      other_scan = make_scan(other_project)
      get "/api/v1/scans/#{other_scan.id}/gate", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
