# db/migrate/xxxxxx_create_scans.rb
class CreateScans < ActiveRecord::Migration[7.0]
  def change
    create_table :scans do |t|
      # Relations
      t.references :project, null: false, foreign_key: true

      # Identification
      t.string :scan_id, null: false           # External ID (GitHub run ID, etc.)
      t.string :source_type, null: false       # 'sonarqube', 'trivy', 'github_push'

      # Git info
      t.string :commit_sha, null: false
      t.string :branch, null: false
      t.string :commit_message
      t.string :author_name
      t.string :author_email

      # Status tracking
      t.string :status, default: 'pending'     # pending, processing, completed, failed
      t.text :error_message                     # If failed

      # Payload storage
      t.jsonb :raw_payload                      # Original webhook data
      t.jsonb :parsed_data                      # Normalized data

      # Metrics
      t.integer :critical_count, default: 0
      t.integer :high_count, default: 0
      t.integer :medium_count, default: 0
      t.integer :low_count, default: 0
      t.integer :info_count, default: 0

      # Timestamps
      t.datetime :scanned_at
      t.datetime :completed_at

      t.timestamps
    end

    # Indexes
    add_index :scans, [:project_id, :scan_id], unique: true  # Idempotence
    add_index :scans, :source_type
    add_index :scans, :commit_sha
    add_index :scans, :status
    add_index :scans, :scanned_at
  end
end