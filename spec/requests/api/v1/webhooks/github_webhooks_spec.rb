require "rails_helper"

RSpec.describe "Api::V1::Webhooks::Github", type: :request do
  include ActiveJob::TestHelper

  let!(:project) { create(:project, github_repo: "acme/guardrail") }
  let(:secret) { Rails.application.config.github_webhook_secret }
  let(:payload_hash) do
    {
      "ref" => "refs/heads/main",
      "after" => "abc123",
      "repository" => { "full_name" => "acme/guardrail" }
    }
  end
  let(:payload) { payload_hash.to_json }
  let(:signature) { "sha256=" + OpenSSL::HMAC.hexdigest("SHA256", secret, payload) }

  around do |example|
    perform_enqueued_jobs { example.run }
  end

  before do
    allow_any_instance_of(Scans::Executor).to receive(:call).and_return(
      {
        critical: 0, high: 0, medium: 0, low: 0, info: 0,
        languages: ["ruby"], scanner: "brakeman", raw_report: {},
        scan_results: []
      }
    )
  end

  it "creates webhook event and scans for supported event" do
    expect do
      post "/api/v1/webhooks/github",
           params: payload,
           headers: {
             "CONTENT_TYPE" => "application/json",
             "X-Hub-Signature-256" => signature,
             "X-GitHub-Event" => "push",
             "X-GitHub-Delivery" => "delivery-1"
           }
    end.to change(WebhookEvent, :count).by(1)
      .and change(Scan, :count).by(1)

    expect(response).to have_http_status(:accepted)
    event = WebhookEvent.last
    expect(event.status).to eq("processed")
    expect(event.scan).to be_present
  end

  it "returns ok for duplicate webhook" do
    post "/api/v1/webhooks/github",
         params: payload,
         headers: {
           "CONTENT_TYPE" => "application/json",
           "X-Hub-Signature-256" => signature,
           "X-GitHub-Event" => "push",
           "X-GitHub-Delivery" => "delivery-2"
         }

    post "/api/v1/webhooks/github",
         params: payload,
         headers: {
           "CONTENT_TYPE" => "application/json",
           "X-Hub-Signature-256" => signature,
           "X-GitHub-Event" => "push",
           "X-GitHub-Delivery" => "delivery-2"
         }

    expect(response).to have_http_status(:ok)
  end

  it "records unsupported events without creating scans" do
    expect do
      post "/api/v1/webhooks/github",
           params: payload,
           headers: {
             "CONTENT_TYPE" => "application/json",
             "X-Hub-Signature-256" => signature,
             "X-GitHub-Event" => "issues",
             "X-GitHub-Delivery" => "delivery-3"
           }
    end.to change(WebhookEvent, :count).by(1)
      .and change(Scan, :count).by(0)

    expect(response).to have_http_status(:accepted)
    expect(WebhookEvent.last.status).to eq("processed")
  end
end