# db/migrate/20260821190000_add_scan_type_to_vulnerabilities.rb
#
# GR-405 — Add scan_type to vulnerabilities.
# Allows filtering vulnerabilities by their category:
#   sast        — static analysis (Brakeman, Semgrep)
#   dependency  — dependency CVEs (BundlerAudit, npm audit)
#   secret      — leaked credentials (Gitleaks)
#   container   — image/container CVEs (Trivy)
#
class AddScanTypeToVulnerabilities < ActiveRecord::Migration[8.1]
  def change
    add_column :vulnerabilities, :scan_type, :string, default: 'sast', null: false
    add_index  :vulnerabilities, :scan_type
  end
end
