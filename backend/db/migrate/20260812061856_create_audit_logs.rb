class CreateAuditLogs < ActiveRecord::Migration[8.1]
  def change
    create_table :audit_logs do |t|
      t.references :order, null: false, foreign_key: true
      t.string :event, null: false
      t.string :from_status
      t.string :to_status
      t.jsonb :details, default: {}

      t.timestamps
    end
    add_index :audit_logs, :event
  end
end
