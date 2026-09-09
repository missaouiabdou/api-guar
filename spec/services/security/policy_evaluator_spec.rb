require 'rails_helper'

RSpec.describe Security::PolicyEvaluator do
  let(:user)    { create(:user) }
  let(:project) { create(:project, user: user) }
  let(:scan)    { create(:scan, project: project, status: 'completed', completed_at: Time.current) }
  let(:policy) do
    create(:security_policy,
           project: project,
           minimum_security_score: 70,
           maximum_critical: 0,
           maximum_high: 2)
  end

  describe '.call' do
    context 'when scan is clean (no vulnerabilities)' do
      it 'passes with no violations' do
        result = described_class.call(scan: scan, policy: policy)

        expect(result[:passed]).to be(true)
        expect(result[:violations]).to be_empty
        expect(result[:policy_id]).to eq(policy.id)
        expect(result[:policy_name]).to eq(policy.name)
      end
    end

    context 'when maximum_critical is exceeded' do
      before do
        create(:vulnerability, scan: scan, severity: 'critical', status: 'open')
      end

      it 'reports a maximum_critical violation' do
        result = described_class.call(scan: scan, policy: policy)
        expect(result[:passed]).to be(false)

        violation = result[:violations].find { |v| v[:rule] == 'maximum_critical' }
        expect(violation).not_to be_nil
        expect(violation[:actual]).to eq(1)
        expect(violation[:expected]).to eq(0)
      end
    end

    context 'when maximum_high is exceeded' do
      before do
        3.times { create(:vulnerability, scan: scan, severity: 'high', status: 'open') }
      end

      it 'reports a maximum_high violation with actual/expected' do
        result = described_class.call(scan: scan, policy: policy)
        expect(result[:passed]).to be(false)

        violation = result[:violations].find { |v| v[:rule] == 'maximum_high' }
        expect(violation).not_to be_nil
        expect(violation[:actual]).to eq(3)
        expect(violation[:expected]).to eq(2)
      end
    end

    context 'when security score falls below minimum' do
      before do
        # 3 criticals = -75 → score 25, way below 70
        3.times { create(:vulnerability, scan: scan, severity: 'critical', status: 'open') }
      end

      it 'reports minimum_security_score and maximum_critical violations' do
        result = described_class.call(scan: scan, policy: policy)
        rules  = result[:violations].map { |v| v[:rule] }
        expect(rules).to include('minimum_security_score', 'maximum_critical')
      end
    end

    context 'resolved/ignored vulnerabilities' do
      before do
        create(:vulnerability, scan: scan, severity: 'critical', status: 'resolved')
        create(:vulnerability, scan: scan, severity: 'critical', status: 'ignored')
      end

      it 'does not count non-open vulnerabilities against the policy' do
        result = described_class.call(scan: scan, policy: policy)
        expect(result[:passed]).to be(true)
      end
    end

    context 'when persist: true' do
      before do
        create(:vulnerability, scan: scan, severity: 'critical', status: 'open')
      end

      it 'creates a PolicyEvaluation record' do
        expect {
          described_class.call(scan: scan, policy: policy, persist: true)
        }.to change { PolicyEvaluation.count }.by(1)

        ev = PolicyEvaluation.last
        expect(ev.scan_id).to eq(scan.id)
        expect(ev.security_policy_id).to eq(policy.id)
        expect(ev.passed).to be(false)
        expect(ev.violations).to be_a(Array)
        expect(ev.violations).not_to be_empty
      end

      it 'is idempotent — upserts on rerun rather than creating duplicates' do
        described_class.call(scan: scan, policy: policy, persist: true)
        expect {
          described_class.call(scan: scan, policy: policy, persist: true)
        }.not_to change { PolicyEvaluation.count }
      end
    end

    context 'when fail_on_secrets is enabled' do
      let(:secret_policy) { create(:security_policy, project: project, fail_on_secrets: true) }

      it 'reports a violation when active secrets are detected' do
        create(:vulnerability, scan: scan, scan_type: 'secret', status: 'open')
        result = described_class.call(scan: scan, policy: secret_policy)
        expect(result[:passed]).to be(false)
        expect(result[:violations].map { |v| v[:rule] }).to include('fail_on_secrets')
      end

      it 'passes when no active secrets exist' do
        result = described_class.call(scan: scan, policy: secret_policy)
        expect(result[:violations].map { |v| v[:rule] }).not_to include('fail_on_secrets')
      end
    end

    context 'when fail_on_regressions is enabled' do
      let(:regression_policy) { create(:security_policy, project: project, fail_on_regressions: true) }

      it 'reports a violation when a security regression occurs' do
        prev_scan = create(:scan, project: project, status: 'completed', completed_at: 2.hours.ago)
        create(:vulnerability, scan: scan, severity: 'critical', status: 'open')

        result = described_class.call(scan: scan, policy: regression_policy)
        expect(result[:passed]).to be(false)
        expect(result[:violations].map { |v| v[:rule] }).to include('fail_on_regressions')
      end
    end
  end
end
