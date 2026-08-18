class AddMissingColumnsToWebhookEvents < ActiveRecord::Migration[7.0]
  def change
    # Ila ma kaynch
    unless column_exists?(:webhook_events, :source)
      add_column :webhook_events, :source, :string, null: false, default: 'github'
    end

    unless column_exists?(:webhook_events, :event_type)
      add_column :webhook_events, :event_type, :string
    end

    unless column_exists?(:webhook_events, :headers)
      add_column :webhook_events, :headers, :text
    end

    unless column_exists?(:webhook_events, :payload)
      add_column :webhook_events, :payload, :jsonb
    end

    unless column_exists?(:webhook_events, :signature)
      add_column :webhook_events, :signature, :string
    end

    unless column_exists?(:webhook_events, :status)
      add_column :webhook_events, :status, :string, default: 'received'
    end

    unless column_exists?(:webhook_events, :error_message)
      add_column :webhook_events, :error_message, :text
    end

    unless column_exists?(:webhook_events, :scan_id)
      add_column :webhook_events, :scan_id, :bigint
      add_index :webhook_events, :scan_id
    end

    unless column_exists?(:webhook_events, :response_status)
      add_column :webhook_events, :response_status, :integer
    end

    unless column_exists?(:webhook_events, :response_body)
      add_column :webhook_events, :response_body, :text
    end

    # Indexes
    unless index_exists?(:webhook_events, :event_type)
      add_index :webhook_events, :event_type
    end

    unless index_exists?(:webhook_events, :source)
      add_index :webhook_events, :source
    end

    unless index_exists?(:webhook_events, :status)
      add_index :webhook_events, :status
    end

    unless index_exists?(:webhook_events, :created_at)
      add_index :webhook_events, :created_at
    end
  end
end