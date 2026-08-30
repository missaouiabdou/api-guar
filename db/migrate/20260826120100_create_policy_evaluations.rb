# db/migrate/20260826120100_create_policy_evaluations.rb
class CreatePolicyEvaluations < ActiveRecord::Migration[8.1]
  def change
    create_table :policy_evaluations do |t|
      t.references :security_policy, null: false, foreign_key: true, index: true
      t.references :scan,            null: false, foreign_key: true, index: true

      t.boolean  :passed,       null: false, default: false
      t.jsonb    :violations,   null: false, default: []
      t.datetime :evaluated_at, null: false

      t.timestamps
    end

    # One evaluation per (scan, policy) pair — no duplicate evaluations
    add_index :policy_evaluations, [:scan_id, :security_policy_id],
              unique: true,
              name: "index_policy_evaluations_on_scan_and_policy"
  end
end
