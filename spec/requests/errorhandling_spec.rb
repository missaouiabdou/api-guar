require 'rails_helper'

RSpec.describe "Error Handling", type: :request do
  let!(:user) { create(:user) }
  let(:headers) { auth_headers_for(user) }

  it "returns 404 for non-existent resource" do
    get "/api/v1/projects/99999", headers: headers
    expect(response).to have_http_status(:not_found)
    expect(JSON.parse(response.body)).to include("error" => "Not Found")
  end

  it "returns 401 for missing token" do
    get "/api/v1/projects"
    expect(response).to have_http_status(:unauthorized)
    expect(JSON.parse(response.body)).to include("error" => "Unauthorized")
  end

  it "returns 422 for validation errors" do
    post "/api/v1/projects", params: { project: { name: "" } }, headers: headers
    expect(response).to have_http_status(:unprocessable_entity)
  end
end