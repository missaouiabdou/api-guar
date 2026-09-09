require 'rails_helper'

RSpec.describe "Api::V1::Projects", type: :request do
  let!(:user) { create(:user) }
  let!(:other_user) { create(:user) }
  let(:headers) { auth_headers_for(user) }
  let!(:project) { create(:project, user: user) }

  describe "GET /api/v1/projects" do
    it "returns 200 with user's projects" do
      get "/api/v1/projects", headers: headers
      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["data"].size).to eq(1)
      expect(json["pagination"]).to include("page" => 1, "per_page" => 25, "total" => 1, "total_pages" => 1)
    end

    it "returns 401 without token" do
      get "/api/v1/projects"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/projects/:id" do
    it "returns 200 for own project" do
      get "/api/v1/projects/#{project.id}", headers: headers
      expect(response).to have_http_status(:ok)
    end

    it "returns 404 for other user's project" do
      other_project = create(:project, user: other_user)
      get "/api/v1/projects/#{other_project.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/projects" do
    let(:valid_params) do
      { project: { name: "New Project", repository_url: "https://github.com/test/new" } }
    end

    it "returns 201 with valid params" do
      post "/api/v1/projects", params: valid_params, headers: headers
      expect(response).to have_http_status(:created)
      expect(JSON.parse(response.body)["name"]).to eq("New Project")
    end

    it "returns 422 with invalid params" do
      post "/api/v1/projects", params: { project: { name: "" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/projects/:id" do
    it "returns 200 on valid update" do
      patch "/api/v1/projects/#{project.id}", params: { project: { name: "Updated" } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["name"]).to eq("Updated")
    end
  end

  describe "DELETE /api/v1/projects/:id" do
    it "returns 204 on delete" do
      delete "/api/v1/projects/#{project.id}", headers: headers
      expect(response).to have_http_status(:no_content)
    end
  end
end