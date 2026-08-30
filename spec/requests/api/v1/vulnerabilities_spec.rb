require 'rails_helper'

RSpec.describe 'Api::V1::Vulnerabilities', type: :request do
  include AuthHelpers

  let(:user)          { create(:user) }
  let(:other_user)    { create(:user) }
  let(:project)       { create(:project, user: user) }
  let(:other_project) { create(:project, user: other_user) }
  let(:scan)          { create(:scan, project: project) }
  let(:other_scan)    { create(:scan, project: other_project) }

  let!(:vuln_critical) { create(:vulnerability, scan: scan, severity: "critical", status: "open", warning_type: "Command Injection") }
  let!(:vuln_high)     { create(:vulnerability, scan: scan, severity: "high",     status: "open", warning_type: "SQL Injection") }
  let!(:vuln_medium)   { create(:vulnerability, scan: scan, severity: "medium",   status: "open", warning_type: "File Access") }
  let!(:other_vuln)    { create(:vulnerability, scan: other_scan, severity: "high", status: "open") }

  let(:headers) { auth_headers_for(user) }

  # ── GET /api/v1/scans/:scan_id/vulnerabilities ────────────────────────────

  describe 'GET /api/v1/scans/:scan_id/vulnerabilities' do
    it 'returns vulnerabilities ordered by severity with meta' do
      get "/api/v1/scans/#{scan.id}/vulnerabilities", headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)

      expect(json['data'].length).to eq(3)
      expect(json['data'].first['warning_type']).to eq('Command Injection') # critical first
      expect(json['meta']['total']).to eq(3)
      expect(json['meta']['open']).to eq(3)
      expect(json['meta']['by_severity']['critical']).to eq(1)
      expect(json['meta']['by_severity']['high']).to eq(1)
    end

    it 'returns 404 for other user scan (IDOR protection)' do
      get "/api/v1/scans/#{other_scan.id}/vulnerabilities", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it 'filters by severity' do
      get "/api/v1/scans/#{scan.id}/vulnerabilities?severity=high", headers: headers
      json = JSON.parse(response.body)
      expect(json['data'].length).to eq(1)
      expect(json['data'].first['severity']).to eq('high')
    end

    it 'filters by status' do
      vuln_high.update!(status: 'resolved')
      get "/api/v1/scans/#{scan.id}/vulnerabilities?status=open", headers: headers
      json = JSON.parse(response.body)
      expect(json['data'].length).to eq(2)
    end

    it 'filters by severity + status together' do
      get "/api/v1/scans/#{scan.id}/vulnerabilities?severity=critical&status=open", headers: headers
      json = JSON.parse(response.body)
      expect(json['data'].length).to eq(1)
      expect(json['data'].first['warning_type']).to eq('Command Injection')
    end
  end

  # ── GET /api/v1/vulnerabilities ───────────────────────────────────────────

  describe 'GET /api/v1/vulnerabilities' do
    it 'returns all vulnerabilities across user projects' do
      get '/api/v1/vulnerabilities', headers: headers
      json = JSON.parse(response.body)
      expect(json['data'].length).to eq(3)
    end

    it 'does not return vulnerabilities from other users' do
      get '/api/v1/vulnerabilities', headers: auth_headers_for(other_user)
      json = JSON.parse(response.body)
      expect(json['data'].length).to eq(1)
    end
  end

  # ── GET /api/v1/vulnerabilities/:id ──────────────────────────────────────

  describe 'GET /api/v1/vulnerabilities/:id' do
    it 'returns full vulnerability detail' do
      get "/api/v1/vulnerabilities/#{vuln_critical.id}", headers: headers
      json = JSON.parse(response.body)
      data = json['data']

      expect(response).to have_http_status(:ok)
      expect(data['id']).to eq(vuln_critical.id)
      expect(data['severity']).to eq('critical')
      expect(data['location']).to have_key('class')
      expect(data['location']).to have_key('method')
      expect(data['cwe']).to be_an(Array)
    end

    it 'returns 404 for vulnerability from another user (IDOR)' do
      get "/api/v1/vulnerabilities/#{other_vuln.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  # ── PATCH /api/v1/vulnerabilities/:id ────────────────────────────────────

  describe 'PATCH /api/v1/vulnerabilities/:id' do
    it 'resolves a vulnerability with a reason' do
      patch "/api/v1/vulnerabilities/#{vuln_high.id}",
            params: { vulnerability: { status: 'resolved', reason: 'Fix applied in PR #42' } }.to_json,
            headers: headers.merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['data']['status']).to eq('resolved')
      expect(json['data']['reason']).to eq('Fix applied in PR #42')
      expect(json['data']['resolved_at']).not_to be_nil
    end

    it 'ignores a vulnerability as false positive' do
      patch "/api/v1/vulnerabilities/#{vuln_medium.id}",
            params: { vulnerability: { status: 'ignored', reason: 'False positive — input validated upstream' } }.to_json,
            headers: headers.merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['data']['status']).to eq('ignored')
    end

    it 'reopens a resolved vulnerability' do
      vuln_high.update!(status: 'resolved')
      patch "/api/v1/vulnerabilities/#{vuln_high.id}",
            params: { vulnerability: { status: 'open' } }.to_json,
            headers: headers.merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)['data']['status']).to eq('open')
    end

    it 'returns 422 for invalid status' do
      patch "/api/v1/vulnerabilities/#{vuln_high.id}",
            params: { vulnerability: { status: 'invalid_status' } }.to_json,
            headers: headers.merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'returns 404 for another user vulnerability (IDOR)' do
      patch "/api/v1/vulnerabilities/#{other_vuln.id}",
            params: { vulnerability: { status: 'resolved' } }.to_json,
            headers: headers.merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:not_found)
    end
  end
end
