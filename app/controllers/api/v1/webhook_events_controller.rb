# app/controllers/api/v1/webhook_events_controller.rb
module Api
  module V1
    class WebhookEventsController < BaseController
      before_action :set_webhook_event, only: [:show]

      # GET /api/v1/webhook_events
      def index
        events = scoped_webhook_events.recent
        events = apply_filters(events)

        records, pagination = paginate(events)

        render json: {
          data:       records.map { |e| serialize_event(e) },
          pagination: pagination,
          meta:       build_meta(scoped_webhook_events)
        }
      end

      # GET /api/v1/webhook_events/:id
      def show
        render json: { data: serialize_event_detail(@webhook_event) }
      end

      private

      # Scope events to repositories or scans belonging to current_user
      def scoped_webhook_events
        user_repo_names = (current_user.projects.pluck(:github_repo) +
                           current_user.repositories.pluck(:full_name)).compact.reject(&:blank?).uniq

        user_scan_ids = current_user.projects.joins(:scans).pluck("scans.id")

        if user_repo_names.empty? && user_scan_ids.empty?
          WebhookEvent.none
        else
          WebhookEvent.where("repository IN (?) OR scan_id IN (?)", user_repo_names, user_scan_ids)
        end
      end

      def set_webhook_event
        @webhook_event = scoped_webhook_events.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Webhook event not found" }, status: :not_found
      end

      def apply_filters(scope)
        # Filter by status: all, success (processed), failed, pending
        if params[:status].present? && params[:status] != "all"
          db_status = case params[:status].to_s.downcase
                      when "success" then "processed"
                      when "failed"  then "failed"
                      when "pending" then "pending"
                      else params[:status]
                      end
          scope = scope.where(status: db_status)
        end

        # Filter by event_type (e.g. push, pull_request, workflow_run)
        if params[:event_type].present? && params[:event_type] != "all"
          scope = scope.where(event_type: params[:event_type])
        end

        # Search query by repo, delivery_id or event
        if params[:search].present?
          term = "%#{params[:search].strip}%"
          scope = scope.where("repository ILIKE ? OR delivery_id ILIKE ? OR event_type ILIKE ?", term, term, term)
        end

        scope
      end

      def serialize_event(event)
        {
          id:          event.id,
          delivery_id: event.delivery_id,
          repository:  event.repository,
          event:       event.event_type,
          branch:      extract_branch(event),
          status:      normalize_status(event.status),
          raw_status:  event.status,
          created_at:  event.created_at,
          scan_id:     event.scan_id,
          payload:     event.payload
        }
      end

      def serialize_event_detail(event)
        serialize_event(event).merge(
          response_status: event.response_status,
          response_body:   event.response_body,
          error_message:   event.error_message,
          headers:         event.parsed_headers
        )
      end

      def normalize_status(raw)
        case raw.to_s.downcase
        when "processed" then "success"
        when "failed"    then "failed"
        when "pending"   then "pending"
        else "success"
        end
      end

      def extract_branch(event)
        payload = event.payload || {}
        ref = payload["ref"].to_s
        return ref.sub(%r{\Arefs/heads/}, "") if ref.present?

        pr_branch = payload.dig("pull_request", "head", "ref")
        return pr_branch if pr_branch.present?

        event.scan&.branch || "main"
      end

      def build_meta(base_scope)
        counts = base_scope.group(:status).count
        {
          total:   base_scope.count,
          success: counts["processed"].to_i,
          failed:  counts["failed"].to_i,
          pending: counts["pending"].to_i
        }
      end
    end
  end
end
