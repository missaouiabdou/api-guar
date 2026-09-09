class AddProfileFieldsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :first_name, :string, default: "Sarah"
    add_column :users, :last_name, :string, default: "Chen"
    add_column :users, :job_title, :string, default: "Platform Engineering Lead"
    add_column :users, :timezone, :string, default: "America/New_York (UTC-5)"
  end
end
