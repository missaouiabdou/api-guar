class CreateProjects < ActiveRecord::Migration[8.0]
  def change
    create_table :projects do |t|
      t.string :name, null: false
      t.text :description
      t.string :repository_url, null: false
      t.integer :status, default: 0, null: false

      t.timestamps
    end
  end
end# frozen_string_literal: true

