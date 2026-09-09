require "rails_helper"

RSpec.describe "Api::V1::WebhookEvents", type: :request do
  let!(:user) { create(:user) }
  let!(:other_user) { create(:user) }
  let(:headers) { auth_headers_for(user) }
  let!(:project) { create(:project, user: user, github_repo: "acme/api-gateway") }
  let!(:scan) { create(:scan, project: project) }

  let!(:event1) do
    WebhookEvent.create!(
      delivery_id: "del-1111-2222",
      repository: "acme/api-gateway",
      event_type: "push",
      status: "processed",
      source: "github",
      scan_id: scan.id,
      payload: { "ref" => "refs/heads/main", "commits" => [{ "id" => "c1", "message" => "test" }] }
    )
  end

  let!(:event2) do
    WebhookEvent.create!(
      delivery_id: "del-3333-4444",
      repository: "acme/api-gateway",
      event_type: "pull_request",
      status: "failed",
      source: "github",
      error_message: "Invalid HMAC",
      payload: { "pull_request" => { "head" => { "ref" => "feature/test" } } }
    )
  end

  describe "GET /api/v1/webhook_events" do
    it "requires authentication" do
      get "/api/v1/webhook_events"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns list of webhook events for current user" do
      get "/api/v1/webhook_events", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"]).to be_an(Array)
      expect(body["data"].size).to eq(2)
      expect(body["meta"]["total"]).to eq(2)
      expect(body["meta"]["success"]).to eq(1)
      expect(body["meta"]["failed"]).to eq(1)
    end

    it "filters by status=success" do
      get "/api/v1/webhook_events", params: { status: "success" }, headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"].size).to eq(1)
      expect(body["data"].first["delivery_id"]).to eq("del-1111-2222")
    end

    it "filters by status=failed" do
      get "/api/v1/webhook_events", params: { status: "failed" }, headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"].size).to eq(1)
      expect(body["data"].first["delivery_id"]).to eq("del-3333-4444")
    end

    it "filters by event_type=pull_request" do
      get "/api/v1/webhook_events", params: { event_type: "pull_request" }, headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"].size).to eq(1)
      expect(body["data"].first["event"]).to eq("pull_request")
    end

    it "searches by delivery_id query" do
      get "/api/v1/webhook_events", params: { search: "3333" }, headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"].size).to eq(1)
      expect(body["data"].first["delivery_id"]).to eq("del-3333-4444")
    end
  end

  describe "GET /api/v1/webhook_events/:id" do
    it "returns detailed event with payload" do
      get "/api/v1/webhook_events/#{event1.id}", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"]["id"]).to eq(event1.id)
      expect(body["data"]["delivery_id"]).to eq("del-1111-2222")
      expect(body["data"]["branch"]).to eq("main")
      expect(body["data"]["payload"]).to be_present
    end

    it "returns 404 for an event belonging to another user's repository" do
      other_proj = create(:project, user: other_user, github_repo: "other/private-repo")
      other_scan = create(:scan, project: other_proj)
      other_event = WebhookEvent.create!(
        delivery_id: "del-other-9999",
        repository: "other/private-repo",
        event_type: "push",
        source: "github",
        scan_id: other_scan.id
      )

      get "/api/v1/webhook_events/#{other_event.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
