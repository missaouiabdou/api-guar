require 'rails_helper'

# GR-501 — Dashboard KPIs
# GR-502 — Vulnerability Analytics
# GR-505 — Regression Alerts
#
# Endpoint under test: GET /api/v1/projects/:project_id/dashboard
# (routes to Api::V1::SecurityController#dashboard → Security::DashboardBuilder)
#
# Covers: authentication, authorization / project isolation (IDOR),
# success payload shape + values, and the no-scan edge case.
RSpec.describe 'Api::V1::Projects Dashboard', type: :request do
  include AuthHelpers

  let(:user)          { create(:user) }
  let(:other_user)    { create(:user) }
  let(:project)       { create(:project, user: user) }
  let(:other_project) { create(:project, user: other_user) }
  let(:headers)       { auth_headers_for(user) }

  def make_scan(proj, overrides = {})
    create(:scan, { project: proj, status: 'completed', completed_at: Time.current }.merge(overrides))
  end

  describe 'GET /api/v1/projects/:project_id/dashboard' do
    # Older completed scan (scanned 2 days ago): 1 high open           → score 90
    # Latest completed scan (scanned 1 day ago): 2 critical + 1 high   → score 40
    let!(:old_scan) do
      make_scan(project, scanned_at: 2.days.ago, completed_at: 2.days.ago).tap do |s|
        create(:vulnerability, scan: s, severity: 'high', status: 'open',
                               scanner: 'semgrep', scan_type: 'sast')
      end
    end

    let!(:latest_scan) do
      make_scan(project, scanned_at: 1.day.ago, completed_at: 1.day.ago).tap do |s|
        create(:vulnerability, scan: s, severity: 'critical', status: 'open',
                               scanner: 'brakeman', scan_type: 'sast')
        create(:vulnerability, scan: s, severity: 'critical', status: 'open',
                               scanner: 'brakeman', scan_type: 'sast')
        create(:vulnerability, scan: s, severity: 'high', status: 'open',
                               scanner: 'semgrep', scan_type: 'sast')
      end
    end

    context 'when authenticated as the project owner' do
      before { get "/api/v1/projects/#{project.id}/dashboard", headers: headers }

      it 'returns 200 OK' do
        expect(response).to have_http_status(:ok)
      end

      it 'returns the project identity (GR-501)' do
        json = JSON.parse(response.body)
        expect(json['project']['id']).to eq(project.id)
        expect(json['project']['name']).to eq(project.name)
      end

      it 'returns overview KPIs scoped to the project (GR-501)' do
        overview = JSON.parse(response.body)['overview']

        expect(overview['total_scans']).to eq(2)
        expect(overview['open_vulnerabilities']).to eq(4)
        expect(overview['critical_vulnerabilities']).to eq(2)
        # security_score / risk_level derive from the LATEST scan:
        #   100 - (2 * 25 + 1 * 10) = 40  → risk "high"
        expect(overview['security_score']).to eq(40)
        expect(overview['risk_level']).to eq('high')
        expect(overview['last_scan_at']).to be_present
      end

      it 'returns analytics grouped by severity / scanner / scan_type (GR-502)' do
        json = JSON.parse(response.body)

        expect(json['vulnerabilities_by_severity']).to eq(
          'critical' => 2, 'high' => 2, 'medium' => 0, 'low' => 0, 'info' => 0
        )
        expect(json['vulnerabilities_by_scanner']).to eq(
          'brakeman' => 2, 'semgrep' => 2
        )
        expect(json['vulnerabilities_by_scan_type']).to include(
          'sast' => 4, 'dependency' => 0, 'secret' => 0
        )
      end

      it 'returns regression alerts in the GR-505 shape' do
        regression = JSON.parse(response.body)['regression']

        expect(regression).to include(
          'detected'            => true,
          'previous_score'      => 90,
          'current_score'       => 40,
          'score_change'        => -50,
          'new_vulnerabilities' => 3
        )
      end
    end

    it 'requires authentication (401 without a token)' do
      get "/api/v1/projects/#{project.id}/dashboard"
      expect(response).to have_http_status(:unauthorized)
    end

    it "does not expose another user's project (IDOR → 404)" do
      get "/api/v1/projects/#{other_project.id}/dashboard", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it 'only aggregates data from the requested project (isolation)' do
      # Noise in another user's project must never affect this project's KPIs.
      noisy = make_scan(other_project, scanned_at: 1.hour.ago, completed_at: 1.hour.ago)
      create(:vulnerability, scan: noisy, severity: 'critical', status: 'open')

      get "/api/v1/projects/#{project.id}/dashboard", headers: headers

      overview = JSON.parse(response.body)['overview']
      expect(overview['total_scans']).to eq(2)          # unchanged
      expect(overview['critical_vulnerabilities']).to eq(2) # unchanged
    end
  end

  describe 'GET /api/v1/projects/:project_id/dashboard when the project has no scans' do
    it 'returns 200 with an empty overview and null regression' do
      empty_project = create(:project, user: user)

      get "/api/v1/projects/#{empty_project.id}/dashboard", headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)

      expect(json['overview']['total_scans']).to eq(0)
      expect(json['overview']['open_vulnerabilities']).to eq(0)
      expect(json['overview']['security_score']).to be_nil
      expect(json['regression']).to be_nil
    end
  end
end
