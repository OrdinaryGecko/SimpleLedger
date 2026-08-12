FactoryBot.define do
  factory :line_item do
    order
    description { Faker::Commerce.product_name }
    quantity { 1 }
    unit_price { 100.0 }
  end
end
