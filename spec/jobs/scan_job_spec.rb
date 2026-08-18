require "rails_helper"

RSpec.describe ScanJob, type: :job do
  let!(:scan) { create(:scan) }

  it "marks scans completed when scanner succeeds" do
    allow_any_instance_of(Scans::Scanners::BrakemanScanner).to receive(:call).and_return(
      {
        raw_payload: { "warnings" => [] },
        parsed_data: { "warnings" => [] },
        severities: { "critical" => 1, "high" => 2, "medium" => 0, "low" => 0, "info" => 0 }
      }
    )

    described_class.perform_now(scan.id)
    scan.reload

    expect(scan).to be_completed
    expect(scan.critical_count).to eq(1)
    expect(scan.high_count).to eq(2)
  end
end