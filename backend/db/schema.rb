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

ActiveRecord::Schema[8.1].define(version: 2026_08_12_061856) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "audit_logs", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.jsonb "details", default: {}
    t.string "event", null: false
    t.string "from_status"
    t.bigint "order_id", null: false
    t.string "to_status"
    t.datetime "updated_at", null: false
    t.index ["event"], name: "index_audit_logs_on_event"
    t.index ["order_id"], name: "index_audit_logs_on_order_id"
  end

  create_table "line_items", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "description", null: false
    t.bigint "order_id", null: false
    t.integer "quantity", default: 1, null: false
    t.decimal "unit_price", precision: 12, scale: 2, default: "0.0", null: false
    t.datetime "updated_at", null: false
    t.index ["order_id"], name: "index_line_items_on_order_id"
  end

  create_table "orders", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "customer_name", null: false
    t.date "due_date", null: false
    t.integer "status", default: 0, null: false
    t.decimal "subtotal", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "total", precision: 12, scale: 2, default: "0.0", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["due_date"], name: "index_orders_on_due_date"
    t.index ["status"], name: "index_orders_on_status"
    t.index ["user_id"], name: "index_orders_on_user_id"
  end

  create_table "payments", force: :cascade do |t|
    t.decimal "amount", precision: 12, scale: 2, null: false
    t.datetime "created_at", null: false
    t.integer "kind", default: 0, null: false
    t.string "note"
    t.bigint "order_id", null: false
    t.date "paid_date", null: false
    t.datetime "updated_at", null: false
    t.index ["kind"], name: "index_payments_on_kind"
    t.index ["order_id"], name: "index_payments_on_order_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "password_digest", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "audit_logs", "orders"
  add_foreign_key "line_items", "orders"
  add_foreign_key "orders", "users"
  add_foreign_key "payments", "orders"
end
