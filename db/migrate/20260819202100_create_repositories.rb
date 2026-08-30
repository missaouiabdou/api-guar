class CreateRepositories < ActiveRecord::Migration[8.1]
  def change
    create_table :repositories do |t|
      t.references :user, null: false, foreign_key: true
      t.references :project, null: true, foreign_key: true
      t.string :provider, default: "github", null: false
      t.string :external_id
      t.string :name, null: false
      t.string :full_name, null: false
      t.string :url, null: false
      t.string :default_branch, default: "main"
      t.string :language
      t.boolean :active, default: true, null: false
      t.jsonb :metadata, default: {}

      t.timestamps
    end

    add_index :repositories, [:user_id, :full_name], unique: true
    add_index :repositories, :language
    add_index :repositories, :active
    add_index :repositories, :provider

    # Optional foreign key on scans if scan relates directly to a repository
    add_reference :scans, :repository, null: true, foreign_key: true unless column_exists?(:scans, :repository_id)
  end
end
