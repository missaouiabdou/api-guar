# app/services/security/score_calculator.rb
module Security
  class ScoreCalculator
    # Points déductés par vulnerability ouverte
    PENALTIES = {
      "critical" => 15,
      "high"     =>  5,
      "medium"   =>  2,
      "low"      =>  1,
      "info"     =>  0
    }.freeze

    # Plafond de pénalité par criticité : au-delà, des findings supplémentaires
    # de la même sévérité n'aggravent plus le score. Évite qu'un dépôt de test
    # volontairement vulnérable sature indéfiniment à 0 et masque toute évolution.
    PENALTY_CAPS = {
      "critical" => 60,
      "high"     => 25,
      "medium"   => 10,
      "low"      =>  5,
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
      counts  = severity_counts
      penalty = counts.sum { |severity, count| penalty_for(severity, count) }
      score   = [ 100 - penalty, 0 ].max

      {
        score:      score,
        risk_level: risk_level_for(score),
        penalty:    penalty,
        breakdown:  counts.to_h { |sev, count| [sev, { count: count, penalty: penalty_for(sev, count) }] }
      }
    end

    private

    def penalty_for(severity, count)
      [ count * PENALTIES[severity], PENALTY_CAPS[severity] ].min
    end

    # Source de vérité : les counts stockés au moment du scan (colonnes
    # *_count, remplies par VulnerabilitySync à la complétion). Le score d'un
    # scan reste figé sur ce que le scan a réellement trouvé — trier des
    # vulnérabilités plus tard (resolved/ignored) ne réécrit jamais l'historique.
    # Fallback live pour les scans sans counts stockés.
    def severity_counts
      stored = PENALTIES.keys.to_h { |sev| [sev, scan.public_send("#{sev}_count").to_i] }
      return stored if stored.values.any?(&:positive?)

      live = Hash.new(0)
      scan.vulnerabilities.active.find_each { |v| live[v.severity.to_s] += 1 }
      PENALTIES.keys.to_h { |sev| [sev, live[sev]] }
    end

    def risk_level_for(score)
      RISK_LEVELS.find { |r| r[:range].include?(score) }&.fetch(:level) || "critical"
    end
  end
end
