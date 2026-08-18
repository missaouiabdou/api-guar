# app/controllers/api/v1/webhooks/github_controller.rb
module Api
  module V1
    module Webhooks
      class GithubController < ApplicationController
        skip_before_action :authenticate_user!, only: [:create]
        skip_before_action :verify_authenticity_token, raise: false

        def create
          processor.call(webhook_request)

          head :accepted
        rescue Github::InvalidSignatureError => e
          render json: { error: e.message }, status: :unauthorized
        rescue Github::DuplicateEventError => e
          render json: { error: e.message }, status: :ok
        rescue Github::InvalidPayloadError, ActiveRecord::RecordInvalid => e
          render json: { error: e.message }, status: :unprocessable_entity
        end

        private

        def processor
          @processor ||= Github::WebhookProcessor.new
        end

        def webhook_request
          raw_body = raw_post_body

          Github::WebhookRequest.new(
            raw_body:    raw_body,
            signature:   request.headers["X-Hub-Signature-256"],
            event_type:  request.headers["X-GitHub-Event"],
            delivery_id: request.headers["X-GitHub-Delivery"],
            payload:     Github::PayloadExtractor.call(raw_body),
            headers:     github_headers
          )
        end

        def raw_post_body
          request.body.rewind
          request.body.read
        end

        def github_headers
          {
            "X-GitHub-Event" => request.headers["X-GitHub-Event"],
            "X-Hub-Signature-256" => request.headers["X-Hub-Signature-256"],
            "X-GitHub-Delivery" => request.headers["X-GitHub-Delivery"]
          }
        end
      end
    end
  end
end