# db/migrate/20260821190100_add_unique_fingerprint_to_vulnerabilities.rb
#
# GR-408 — Prevent duplicate vulnerabilities within the same scan.
# When Brakeman and Semgrep both detect the same issue, they'll generate
# the same fingerprint. The unique index on (scan_id, fingerprint) ensures
# only one record is kept per scan.
#
# The runner uses `rescue ActiveRecord::RecordInvalid` to silently skip
# duplicates, so no application code changes are needed.
#
class AddUniqueFingerprintToVulnerabilities < ActiveRecord::Migration[8.1]
  def change
    # Remove the simple non-unique index on fingerprint (if it exists)
    remove_index :vulnerabilities, :fingerprint, if_exists: true

    # Add composite unique index: one vulnerability per (scan, fingerprint)
    add_index :vulnerabilities, %i[scan_id fingerprint],
              unique: true,
              name: "index_vulnerabilities_on_scan_id_and_fingerprint"
  end
end
