# db/migrate/20260826120000_create_security_policies.rb
class CreateSecurityPolicies < ActiveRecord::Migration[8.1]
  def change
    create_table :security_policies do |t|
      t.references :project, null: false, foreign_key: true, index: true

      t.string  :name,                    null: false
      t.text    :description
      t.integer :minimum_security_score,  null: false, default: 70
      t.integer :maximum_critical,        null: false, default: 0
      t.integer :maximum_high,            null: false, default: 5
      t.boolean :enabled,                 null: false, default: true
      t.boolean :block_on_failure,        null: false, default: false

      t.timestamps
    end

    add_index :security_policies, :enabled
  end
end
