class AddScannerToVulnerabilities < ActiveRecord::Migration[8.1]
  def change
    add_column :vulnerabilities, :scanner, :string, default: "brakeman" unless column_exists?(:vulnerabilities, :scanner)
    add_index  :vulnerabilities, :scanner, if_not_exists: true
  end
end
