class AddAdvancedRulesToSecurityPolicies < ActiveRecord::Migration[8.1]
  def change
    add_column :security_policies, :fail_on_secrets, :boolean, default: false, null: false
    add_column :security_policies, :fail_on_regressions, :boolean, default: false, null: false
  end
end
