# app/services/scans/executor.rb
module Scans
  class Executor
    def initialize(scan)
      @scan = scan
    end

    def call
      # ✅ FIX: ::Scanners (b '::' f l'bdaya) bach Ruby yt3refo 3la top-level
      result = ::Scanners::BrakemanScanner.new(scan).call

      {
        critical:   result[:critical],
        high:       result[:high],
        medium:     result[:medium],
        low:        result[:low],
        info:       result[:info],
        raw_report: result[:raw_report]
      }
    end

    private

    attr_reader :scan
  end
end