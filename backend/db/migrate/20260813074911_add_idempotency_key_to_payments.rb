class AddIdempotencyKeyToPayments < ActiveRecord::Migration[8.1]
  def change
    add_column :payments, :idempotency_key, :string
    add_index :payments, :idempotency_key, unique: true
  end
end
