class EnhanceVulnerabilities < ActiveRecord::Migration[8.1]
  def change
    # Add status column (open / resolved / ignored)
    add_column :vulnerabilities, :status, :string, default: "open", null: false unless column_exists?(:vulnerabilities, :status)

    # Add severity column (critical / high / medium / low / info)
    add_column :vulnerabilities, :severity, :string, default: "info" unless column_exists?(:vulnerabilities, :severity)

    # Separate location into class + method for easier querying
    add_column :vulnerabilities, :location_class,  :string unless column_exists?(:vulnerabilities, :location_class)
    add_column :vulnerabilities, :location_method, :string unless column_exists?(:vulnerabilities, :location_method)

    # Indexes for filtering / dashboard queries
    add_index :vulnerabilities, :status,       if_not_exists: true
    add_index :vulnerabilities, :severity,     if_not_exists: true
    add_index :vulnerabilities, :warning_type, if_not_exists: true
    add_index :vulnerabilities, :confidence,   if_not_exists: true
    add_index :vulnerabilities, :fingerprint,  if_not_exists: true
  end
end
