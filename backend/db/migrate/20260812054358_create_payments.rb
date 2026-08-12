class CreatePayments < ActiveRecord::Migration[8.1]
  def change
    create_table :payments do |t|
      t.references :order, null: false, foreign_key: true
      t.integer :kind, null: false, default: 0
      t.decimal :amount, precision: 12, scale: 2, null: false
      t.date :paid_date, null: false
      t.string :note

      t.timestamps
    end
    add_index :payments, :kind
  end
end
