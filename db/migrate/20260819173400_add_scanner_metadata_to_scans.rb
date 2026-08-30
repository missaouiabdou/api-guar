class AddScannerMetadataToScans < ActiveRecord::Migration[8.1]
  def change
    add_column :scans, :scanner,   :string unless column_exists?(:scans, :scanner)
    add_column :scans, :languages, :jsonb, default: [] unless column_exists?(:scans, :languages)
    add_index  :scans, :scanner,   if_not_exists: true
  end
end
