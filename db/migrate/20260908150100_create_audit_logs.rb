class CreateAuditLogs < ActiveRecord::Migration[8.1]
  def change
    create_table :audit_logs do |t|
      t.bigint   :actor_id
      t.string   :actor_email
      t.string   :action,        null: false
      t.string   :resource_type, null: false
      t.string   :resource_id
      t.jsonb    :metadata,      default: {}, null: false
      t.datetime :created_at,    null: false
    end

    add_index :audit_logs, :actor_id
    add_index :audit_logs, :action
    add_index :audit_logs, :resource_type
    add_index :audit_logs, :created_at
  end
end
