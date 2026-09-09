require 'rails_helper'

RSpec.describe Security::ScoreCalculator do
  let(:project) { create(:project) }
  let(:scan)    { create(:scan, project: project, status: 'completed') }

  def add_vuln(severity, status: 'open')
    create(:vulnerability, scan: scan, severity: severity, status: status)
  end

  describe '.call' do
    context 'with no vulnerabilities' do
      it 'returns score 100 and risk low' do
        result = described_class.call(scan)
        expect(result[:score]).to eq(100)
        expect(result[:risk_level]).to eq('low')
        expect(result[:penalty]).to eq(0)
      end
    end

    context 'with critical vulnerabilities' do
      before { 2.times { add_vuln('critical') } }

      it 'deducts 15 per critical' do
        result = described_class.call(scan)
        expect(result[:score]).to eq(70)
        expect(result[:risk_level]).to eq('medium')
      end
    end

    context 'with 4 high + 1 medium + 1 low (like Scan #87)' do
      before do
        4.times { add_vuln('high') }
        add_vuln('medium')
        add_vuln('low')
      end

      it 'returns score 77' do
        result = described_class.call(scan)
        # 4×5 + 2 + 1 = 23 penalty → score 77
        expect(result[:score]).to eq(77)
        expect(result[:risk_level]).to eq('medium')
      end
    end

    context 'with resolved vulnerabilities' do
      before do
        add_vuln('critical', status: 'open')
        add_vuln('critical', status: 'resolved')
        add_vuln('critical', status: 'ignored')
      end

      it 'only penalizes open vulnerabilities' do
        result = described_class.call(scan)
        # Only 1 critical open → -15 → score 85
        expect(result[:score]).to eq(85)
        expect(result[:risk_level]).to eq('medium')
      end
    end

    context 'penalty caps per severity' do
      it 'caps critical penalty at 60 (10 criticals → score 40, not a saturated 0)' do
        10.times { add_vuln('critical') }
        result = described_class.call(scan)
        expect(result[:breakdown]['critical']).to eq(count: 10, penalty: 60)
        expect(result[:score]).to eq(40)
      end

      it 'caps high penalty at 25' do
        9.times { add_vuln('high') }
        result = described_class.call(scan)
        expect(result[:breakdown]['high']).to eq(count: 9, penalty: 25)
        expect(result[:score]).to eq(75)
      end
    end

    context 'score floor' do
      before do
        10.times { add_vuln('critical') }
        10.times { add_vuln('high') }
        10.times { add_vuln('medium') }
        10.times { add_vuln('low') }
      end

      it 'never goes below 0 (all caps reached = 100 penalty)' do
        result = described_class.call(scan)
        expect(result[:penalty]).to eq(100)
        expect(result[:score]).to eq(0)
      end
    end

    context 'with stored scan counts (scan-time snapshot)' do
      let(:scan) do
        create(:scan, project: project, status: 'completed',
                      critical_count: 2, high_count: 2, medium_count: 2)
      end

      before do
        # Vuln triaged as resolved AFTER the scan — must not rewrite the score
        add_vuln('critical', status: 'resolved')
      end

      it 'scores from the stored counts, not the live triage state' do
        result = described_class.call(scan)
        # 2×15 + 2×5 + 2×2 = 44 penalty → score 56
        expect(result[:score]).to eq(56)
        expect(result[:breakdown]['critical'][:count]).to eq(2)
      end
    end
  end

  describe 'risk levels' do
    it 'maps score 100 to low'       do expect(described_class.new(scan).send(:risk_level_for, 100)).to eq('low')      end
    it 'maps score 90 to low'        do expect(described_class.new(scan).send(:risk_level_for, 90)).to eq('low')       end
    it 'maps score 70 to medium'     do expect(described_class.new(scan).send(:risk_level_for, 70)).to eq('medium')    end
    it 'maps score 40 to high'       do expect(described_class.new(scan).send(:risk_level_for, 40)).to eq('high')      end
    it 'maps score 0 to critical'    do expect(described_class.new(scan).send(:risk_level_for, 0)).to eq('critical')   end
  end
end
