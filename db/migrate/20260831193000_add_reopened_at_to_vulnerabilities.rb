# GR-203 — track reopenings: a vulnerability marked resolved that is
# detected again by a later scan is re-created as open with reopened_at set.
class AddReopenedAtToVulnerabilities < ActiveRecord::Migration[8.1]
  def change
    add_column :vulnerabilities, :reopened_at, :datetime
  end
end
