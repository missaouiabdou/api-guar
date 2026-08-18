class EnhanceProjects < ActiveRecord::Migration[7.0]
  def change
    unless column_exists?(:projects, :repository_url)
      add_column :projects, :repository_url, :string
    end

    unless column_exists?(:projects, :default_branch)
      add_column :projects, :default_branch, :string, default: 'main'
    end

    unless column_exists?(:projects, :github_repo)
      add_column :projects, :github_repo, :string
    end

    unless column_exists?(:projects, :webhook_secret)
      add_column :projects, :webhook_secret, :string
    end

    unless column_exists?(:projects, :active)
      add_column :projects, :active, :boolean, default: true
    end

    # Indexes
    unless index_exists?(:projects, :github_repo)
      add_index :projects, :github_repo, unique: true
    end

    unless index_exists?(:projects, :repository_url)
      add_index :projects, :repository_url
    end
  end
end