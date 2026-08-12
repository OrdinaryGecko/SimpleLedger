class RemoveStatusNotNullFromOrders < ActiveRecord::Migration[8.1]
  def change
    change_column_null :orders, :status, true
  end
end
