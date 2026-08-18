require "rails_helper"

RSpec.describe "Api::V1::Scans", type: :request do
  let!(:user) { create(:user) }
  let!(:other_user) { create(:user) }
  let(:headers) { auth_headers_for(user) }
  let!(:project) { create(:project, user: user) }
  let!(:scan) { create(:scan, project: project) }

  describe "GET /api/v1/scans" do
    it "returns scans for current user" do
      get "/api/v1/scans", headers: headers

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).size).to eq(1)
    end
  end

  describe "GET /api/v1/scans/:id" do
    it "returns scans for owner" do
      get "/api/v1/scans/#{scan.id}", headers: headers

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["id"]).to eq(scan.id)
    end

    it "returns 404 for non-owner" do
      other_project = create(:project, user: other_user)
      other_scan = create(:scan, project: other_project)

      get "/api/v1/scans/#{other_scan.id}", headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end
end