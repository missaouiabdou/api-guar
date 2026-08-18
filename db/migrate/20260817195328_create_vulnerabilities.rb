class CreateVulnerabilities < ActiveRecord::Migration[7.0]
  def change
    create_table :vulnerabilities do |t|
      t.references :scan, null: false, foreign_key: true

      t.string :warning_type, null: false
      t.string :message, null: false
      t.string :confidence
      t.string :file
      t.integer :line
      t.string :check_name
      t.integer :warning_code
      t.jsonb :cwe_id, default: []
      t.text :code
      t.jsonb :location, default: {}
      t.string :user_input
      t.string :fingerprint
      t.text :link

      t.timestamps
    end
  end
end