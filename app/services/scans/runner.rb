module Scans
  class Runner
    def initialize(scan)
      @scan = scan
    end

    def call
      scan.start_processing!

      result = Scans::Executor.new(scan).call

      scan.update!(
        critical_count: result[:critical],
        high_count: result[:high],
        medium_count: result[:medium],
        low_count: result[:low],
        info_count: result[:info],
        parsed_data: result[:raw_report],
        completed_at: Time.current
      )

      scan.complete!

      Rails.logger.info(
        "✅ Scan #{scan.id} completed " \
          "(c=#{result[:critical]}, h=#{result[:high]}, " \
          "m=#{result[:medium]}, l=#{result[:low]}, i=#{result[:info]})"
      )
    rescue StandardError => e
      scan.fail!(e.message)
      Rails.logger.error "❌ Scan #{scan.id} failed: #{e.class} - #{e.message}"
      raise
    end

    private

    attr_reader :scan
  end
end