# app/services/github/webhook_processor.rb
module Github
  class WebhookProcessor
    SUPPORTED_EVENT_TYPES = %w[push pull_request workflow_run workflow_job].freeze

    def initialize(
      verifier: SignatureVerifier.new,
      duplicate_checker: DuplicateChecker.new,
      recorder: EventRecorder.new,
      scan_creator: ScanCreator.new,
      project_resolver: ProjectResolver.new
    )
      @verifier = verifier
      @duplicate_checker = duplicate_checker
      @recorder = recorder
      @scan_creator = scan_creator
      @project_resolver = project_resolver
    end

    def call(request)
      @verifier.verify!(request.raw_body, request.signature)
      @duplicate_checker.call(request.delivery_id)

      raise InvalidPayloadError, "Repository not found in payload" if request.repository.blank?

      project = @project_resolver.call(request.repository)

      unless supported_event?(request.event_type)
        @recorder.call(
          event_type: request.event_type,
          delivery_id: request.delivery_id,
          repository: request.repository,
          payload: request.payload,
          signature: request.signature,
          headers: request.headers,
          status: "processed"
        )

        return :ignored
      end

      webhook_event = @recorder.call(
        event_type: request.event_type,
        delivery_id: request.delivery_id,
        repository: request.repository,
        payload: request.payload,
        signature: request.signature,
        headers: request.headers,
        status: "pending"
      )

      scan = @scan_creator.call(project: project, request: request)
      webhook_event.mark_processed!(scan)
      ScanJob.perform_later(scan.id)

      scan
    rescue ActiveRecord::RecordInvalid => e
      webhook_event&.mark_failed!(e)
      raise
    rescue StandardError => e
      webhook_event&.mark_failed!(e)
      raise
    end

    private

    def supported_event?(event_type)
      SUPPORTED_EVENT_TYPES.include?(event_type)
    end
  end
end