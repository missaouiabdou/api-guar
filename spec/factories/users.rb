FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    password { "password123" }
    password_confirmation { "password123" }

    trait :admin do
      role { :admin }
    end

    trait :developer do
      role { :developer }
    end

    trait :viewer do
      role { :viewer }
    end
  end
end