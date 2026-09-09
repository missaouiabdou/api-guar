require "rails_helper"

RSpec.describe ScanJob, type: :job do
  let!(:scan) { create(:scan) }

  it "marks scans completed when scanner succeeds" do
    vuln_critical = Scanners::ScanResult::Vulnerability.new(
      warning_type: "Command Injection", message: "command injection", severity: "critical",
      confidence: "high", file: "a.rb", line: 1, fingerprint: "crit_1", scanner: "brakeman", scan_type: "sast"
    )
    vuln_high1 = Scanners::ScanResult::Vulnerability.new(
      warning_type: "SQL Injection", message: "sqli", severity: "high",
      confidence: "high", file: "b.rb", line: 2, fingerprint: "high_1", scanner: "brakeman", scan_type: "sast"
    )
    vuln_high2 = Scanners::ScanResult::Vulnerability.new(
      warning_type: "SQL Injection", message: "sqli", severity: "high",
      confidence: "high", file: "c.rb", line: 3, fingerprint: "high_2", scanner: "brakeman", scan_type: "sast"
    )
    scan_result = Scanners::ScanResult.new(
      scanner: "brakeman", scan_type: "sast", languages: ["ruby"],
      vulnerabilities: [vuln_critical, vuln_high1, vuln_high2]
    )

    allow_any_instance_of(Scans::Executor).to receive(:call).and_return(
      {
        critical: 1, high: 2, medium: 0, low: 0, info: 0,
        languages: ["ruby"], scanner: "brakeman", raw_report: {},
        scan_results: [scan_result]
      }
    )

    described_class.perform_now(scan.id)
    scan.reload

    expect(scan).to be_completed
    expect(scan.critical_count).to eq(1)
    expect(scan.high_count).to eq(2)
  end
end