class CreateOrders < ActiveRecord::Migration[8.1]
  def change
    create_table :orders do |t|
      t.references :user, null: false, foreign_key: true
      t.string :customer_name, null: false
      t.date :due_date, null: false
      t.integer :status, default: 0, null: false
      t.decimal :subtotal, precision: 12, scale: 2, default: 0, null: false
      t.decimal :total, precision: 12, scale: 2, default: 0, null: false

      t.timestamps
    end
    add_index :orders, :status
    add_index :orders, :due_date
  end
end
