FactoryBot.define do
  factory :order do
    user
    customer_name { Faker::Name.name }
    due_date { Date.current + 30.days }
    status { :pending }

    trait :with_line_items do
      transient do
        line_items_count { 1 }
        item_price { 100.0 }
        item_quantity { 1 }
      end

      after(:build) do |order, evaluator|
        order.line_items << build(:line_item,
          order: order,
          unit_price: evaluator.item_price,
          quantity: evaluator.item_quantity
        )
      end
    end
  end
end
