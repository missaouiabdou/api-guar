class ScanJob < ApplicationJob
  queue_as :default

  def perform(scan_id)
    scan = Scan.find(scan_id)        # ← line 5-6
    Scans::Runner.new(scan).call    # ← line 7 khass tkoun bhal hadi
  end
end