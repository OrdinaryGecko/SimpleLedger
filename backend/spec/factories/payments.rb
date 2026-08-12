FactoryBot.define do
  factory :payment do
    order
    kind { :payment }
    amount { 50.0 }
    paid_date { Date.current }
  end
end
