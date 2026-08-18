# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_08_17_195328) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "projects", force: :cascade do |t|
    t.boolean "active", default: true
    t.datetime "created_at", null: false
    t.string "default_branch", default: "main"
    t.text "description"
    t.string "github_repo"
    t.string "name", null: false
    t.string "repository_url", null: false
    t.integer "status", default: 0, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.string "webhook_secret"
    t.index ["github_repo"], name: "index_projects_on_github_repo", unique: true
    t.index ["repository_url"], name: "index_projects_on_repository_url"
    t.index ["user_id"], name: "index_projects_on_user_id"
  end

  create_table "scans", force: :cascade do |t|
    t.string "author_email"
    t.string "author_name"
    t.string "branch", null: false
    t.string "commit_message"
    t.string "commit_sha", null: false
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.integer "critical_count", default: 0
    t.text "error_message"
    t.integer "high_count", default: 0
    t.integer "info_count", default: 0
    t.integer "low_count", default: 0
    t.integer "medium_count", default: 0
    t.jsonb "parsed_data"
    t.bigint "project_id", null: false
    t.jsonb "raw_payload"
    t.string "scan_id", null: false
    t.datetime "scanned_at"
    t.string "source_type", null: false
    t.string "status", default: "pending"
    t.datetime "updated_at", null: false
    t.index ["commit_sha"], name: "index_scans_on_commit_sha"
    t.index ["project_id", "scan_id"], name: "index_scans_on_project_id_and_scan_id", unique: true
    t.index ["project_id"], name: "index_scans_on_project_id"
    t.index ["scanned_at"], name: "index_scans_on_scanned_at"
    t.index ["source_type"], name: "index_scans_on_source_type"
    t.index ["status"], name: "index_scans_on_status"
  end

  create_table "users", force: :cascade do |t|
    t.string "api_token"
    t.datetime "created_at", null: false
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "jti"
    t.string "password_digest"
    t.datetime "remember_created_at"
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token"
    t.datetime "updated_at", null: false
    t.index ["api_token"], name: "index_users_on_api_token", unique: true
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  create_table "vulnerabilities", force: :cascade do |t|
    t.string "check_name"
    t.text "code"
    t.string "confidence"
    t.datetime "created_at", null: false
    t.jsonb "cwe_id", default: []
    t.string "file"
    t.string "fingerprint"
    t.integer "line"
    t.text "link"
    t.jsonb "location", default: {}
    t.string "message", null: false
    t.bigint "scan_id", null: false
    t.datetime "updated_at", null: false
    t.string "user_input"
    t.integer "warning_code"
    t.string "warning_type", null: false
    t.index ["scan_id"], name: "index_vulnerabilities_on_scan_id"
  end

  create_table "webhook_events", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "delivery_id", null: false
    t.text "error_message"
    t.string "event_type", null: false
    t.text "headers"
    t.jsonb "payload", default: {}, null: false
    t.datetime "processed_at"
    t.string "repository", null: false
    t.text "response_body"
    t.integer "response_status"
    t.bigint "scan_id"
    t.string "signature"
    t.string "source", default: "github", null: false
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_webhook_events_on_created_at"
    t.index ["delivery_id"], name: "index_webhook_events_on_delivery_id", unique: true
    t.index ["event_type"], name: "index_webhook_events_on_event_type"
    t.index ["scan_id"], name: "index_webhook_events_on_scan_id"
    t.index ["source"], name: "index_webhook_events_on_source"
    t.index ["status"], name: "index_webhook_events_on_status"
  end

  add_foreign_key "projects", "users"
  add_foreign_key "scans", "projects"
  add_foreign_key "vulnerabilities", "scans"
end
