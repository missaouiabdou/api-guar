# app/services/security/score_calculator.rb
module Security
  class ScoreCalculator
    # Points déductés par vulnerability ouverte
    PENALTIES = {
      "critical" => 25,
      "high"     => 10,
      "medium"   =>  5,
      "low"      =>  1,
      "info"     =>  0
    }.freeze

    RISK_LEVELS = [
      { range: (90..100), level: "low" },
      { range: (70..89),  level: "medium" },
      { range: (40..69),  level: "high" },
      { range: (0..39),   level: "critical" }
    ].freeze

    attr_reader :scan

    def self.call(scan)
      new(scan).call
    end

    def initialize(scan)
      @scan = scan
    end

    def call
      penalty = calculate_penalty
      score   = [100 - penalty, 0].max

      {
        score:      score,
        risk_level: risk_level_for(score),
        penalty:    penalty,
        breakdown:  penalty_breakdown
      }
    end

    private

    # Only count OPEN vulnerabilities — resolved/ignored don't penalize
    def open_vulnerabilities
      @open_vulnerabilities ||= scan.vulnerabilities.open
    end

    def penalty_breakdown
      PENALTIES.keys.each_with_object({}) do |severity, h|
        count   = open_vulnerabilities.count { |v| v.severity == severity }
        h[severity] = { count: count, penalty: count * PENALTIES[severity] }
      end
    end

    def calculate_penalty
      open_vulnerabilities.sum { |v| PENALTIES[v.severity.to_s] || 0 }
    end

    def risk_level_for(score)
      RISK_LEVELS.find { |r| r[:range].include?(score) }&.fetch(:level) || "critical"
    end
  end
end
