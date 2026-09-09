require 'rails_helper'

RSpec.describe 'Api::V1::Security', type: :request do
  include AuthHelpers

  let(:user)        { create(:user) }
  let(:other_user)  { create(:user) }
  let(:project)     { create(:project, user: user) }
  let(:other_project) { create(:project, user: other_user) }
  let(:headers)     { auth_headers_for(user) }

  # ─── Shared factory helpers ──────────────────────────────────────────────

  def make_scan(proj, overrides = {})
    create(:scan, { project: proj, status: 'completed', completed_at: Time.current }.merge(overrides))
  end

  def add_vulns(scan, specs)
    specs.each do |(severity, status)|
      create(:vulnerability, scan: scan, severity: severity, status: status)
    end
  end

  # ─── GET /api/v1/scans/:scan_id/security_summary ─────────────────────────

  describe 'GET /api/v1/scans/:scan_id/security_summary' do
    let(:scan) { make_scan(project) }

    before do
      # 2 critical (open), 1 high (open), 1 high (resolved), 1 medium (ignored)
      add_vulns(scan, [
        ["critical", "open"],
        ["critical", "open"],
        ["high",     "open"],
        ["high",     "resolved"],
        ["medium",   "ignored"]
      ])
    end

    it 'returns a valid security summary with score' do
      get "/api/v1/scans/#{scan.id}/security_summary", headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)

      # 2 critical open = -30, 1 high open = -5 → score = 65
      expect(json['scan_id']).to eq(scan.id)
      expect(json['security_score']).to eq(65)
      expect(json['risk_level']).to eq('high')
      expect(json['vulnerabilities']['critical']).to eq(2)
      expect(json['vulnerabilities']['high']).to eq(2)  # resolved still counted in totals
      expect(json['status']['open']).to eq(3)
      expect(json['status']['resolved']).to eq(1)
      expect(json['status']['ignored']).to eq(1)
    end

    it 'does not expose other user scan (IDOR)' do
      other_scan = make_scan(other_project)
      get "/api/v1/scans/#{other_scan.id}/security_summary", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    context 'with no open vulnerabilities' do
      let(:clean_scan) { make_scan(project) }

      it 'returns score 100 and risk low' do
        get "/api/v1/scans/#{clean_scan.id}/security_summary", headers: headers
        json = JSON.parse(response.body)
        expect(json['security_score']).to eq(100)
        expect(json['risk_level']).to eq('low')
      end
    end
  end

  # ─── GET /api/v1/projects/:project_id/security ────────────────────────────

  describe 'GET /api/v1/projects/:project_id/security' do
    let!(:old_scan)     { make_scan(project, completed_at: 2.days.ago) }
    let!(:latest_scan)  { make_scan(project, completed_at: 1.day.ago)  }

    before do
      # Old scan: 1 high open → score 90
      add_vulns(old_scan, [["high", "open"]])

      # Latest scan: 4 high open → score 60
      add_vulns(latest_scan, [
        ["high", "open"],
        ["high", "open"],
        ["high", "open"],
        ["high", "open"]
      ])
    end

    it 'returns project security overview with trend and regression' do
      get "/api/v1/projects/#{project.id}/security", headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)

      expect(json['project_id']).to eq(project.id)
      expect(json['latest_scan']['score']).to eq(60)
      expect(json['latest_scan']['risk_level']).to eq('high')
      expect(json['trend']['previous_score']).to eq(90)
      expect(json['trend']['current_score']).to eq(60)
      expect(json['trend']['change']).to eq(-30)
    end

    it 'detects regression when new vulnerabilities introduced' do
      get "/api/v1/projects/#{project.id}/security", headers: headers
      json = JSON.parse(response.body)
      expect(json['regression']['regression']).to be true
      expect(json['regression']['message']).to include('regression')
    end

    it 'returns 404 for other user project (IDOR)' do
      get "/api/v1/projects/#{other_project.id}/security", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it 'returns not_found when no completed scans' do
      empty_project = create(:project, user: user)
      get "/api/v1/projects/#{empty_project.id}/security", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
