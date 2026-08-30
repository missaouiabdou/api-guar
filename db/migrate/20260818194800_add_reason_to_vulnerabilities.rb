class AddReasonToVulnerabilities < ActiveRecord::Migration[8.1]
  def change
    add_column :vulnerabilities, :reason, :text unless column_exists?(:vulnerabilities, :reason)
    add_column :vulnerabilities, :resolved_at, :datetime unless column_exists?(:vulnerabilities, :resolved_at)
  end
end
