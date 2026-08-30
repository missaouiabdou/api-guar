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

      it 'deducts 25 per critical' do
        result = described_class.call(scan)
        expect(result[:score]).to eq(50)
        expect(result[:risk_level]).to eq('medium')
      end
    end

    context 'with 4 high + 1 medium + 1 low (like Scan #87)' do
      before do
        4.times { add_vuln('high') }
        add_vuln('medium')
        add_vuln('low')
      end

      it 'returns score 54' do
        result = described_class.call(scan)
        # 4×10 + 5 + 1 = 46 penalty → score 54
        expect(result[:score]).to eq(54)
        expect(result[:risk_level]).to eq('high')
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
        # Only 1 critical open → -25 → score 75
        expect(result[:score]).to eq(75)
        expect(result[:risk_level]).to eq('medium')
      end
    end

    context 'score floor' do
      before { 10.times { add_vuln('critical') } }

      it 'never goes below 0' do
        result = described_class.call(scan)
        expect(result[:score]).to eq(0)
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
