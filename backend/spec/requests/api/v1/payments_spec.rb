require 'rails_helper'

RSpec.describe "Api::V1::Payments", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user) }

  describe "POST /api/v1/orders/:order_id/payments" do
    context "payment allocation" do
      let(:order) { create(:order, :with_line_items, user: user, item_price: 100, item_quantity: 1) }

      it "reduces amount due correctly" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 50, kind: "payment" }, headers: headers

        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        expect(json["amount"]).to eq(50.0)
      end

      it "accumulates multiple payments" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 30, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:created)

        post "/api/v1/orders/#{order.id}/payments", params: { amount: 20, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:created)

        order.reload
        expect(order.amount_paid).to eq(50)
      end

      it "amount_paid is not affected by refunds" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 100, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:created)

        post "/api/v1/orders/#{order.id}/payments", params: { amount: 20, kind: "refund" }, headers: headers
        expect(response).to have_http_status(:created)

        order.reload
        expect(order.amount_paid).to eq(100)
        expect(order.total_refunded).to eq(20)
      end
    end

    context "status transitions" do
      let(:order) { create(:order, :with_line_items, user: user, item_price: 100, item_quantity: 1) }

      it "derives pending with no payments" do
        expect(order.derive_status).to eq("pending")
      end

      it "derives partially_paid on partial payment" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 50, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:created)

        order.reload
        expect(order.derive_status).to eq("partially_paid")
      end

      it "derives paid on full payment" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 100, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:created)

        order.reload
        expect(order.derive_status).to eq("paid")
      end

      it "derives overdue when past due date and partially paid" do
        order.update!(due_date: Date.current - 1.day)

        post "/api/v1/orders/#{order.id}/payments", params: { amount: 50, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:created)

        order.reload
        expect(order.derive_status).to eq("overdue")
      end

      it "status is not changed by refund" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 100, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:created)

        order.reload
        expect(order.derive_status).to eq("paid")

        post "/api/v1/orders/#{order.id}/payments", params: { amount: 50, kind: "refund" }, headers: headers
        expect(response).to have_http_status(:created)

        order.reload
        expect(order.derive_status).to eq("paid")
      end

      it "derives paid even when past due date" do
        order.update!(due_date: Date.current - 1.day)

        post "/api/v1/orders/#{order.id}/payments", params: { amount: 100, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:created)

        order.reload
        expect(order.derive_status).to eq("paid")
      end
    end

    context "refund rules" do
      let(:order) { create(:order, :with_line_items, user: user, item_price: 100, item_quantity: 1) }

      it "rejects refund for partially paid order" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 50, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:created)

        post "/api/v1/orders/#{order.id}/payments", params: { amount: 20, kind: "refund" }, headers: headers
        expect(response).to have_http_status(:unprocessable_entity)

        json = JSON.parse(response.body)
        expect(json["error"]).to include("only allowed for fully paid orders")
      end

      it "rejects refund for unpaid order" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 20, kind: "refund" }, headers: headers
        expect(response).to have_http_status(:unprocessable_entity)

        json = JSON.parse(response.body)
        expect(json["error"]).to include("only allowed for fully paid orders")
      end

      it "allows refund for fully paid order" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 100, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:created)

        post "/api/v1/orders/#{order.id}/payments", params: { amount: 20, kind: "refund" }, headers: headers
        expect(response).to have_http_status(:created)
      end

      it "rejects refund exceeding total amount paid" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 100, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:created)

        post "/api/v1/orders/#{order.id}/payments", params: { amount: 110, kind: "refund" }, headers: headers
        expect(response).to have_http_status(:unprocessable_entity)

        json = JSON.parse(response.body)
        expect(json["error"]).to include("Refund exceeds the amount paid")
      end

      it "rejects cumulative refunds exceeding total amount paid" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 100, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:created)

        post "/api/v1/orders/#{order.id}/payments", params: { amount: 60, kind: "refund" }, headers: headers
        expect(response).to have_http_status(:created)

        post "/api/v1/orders/#{order.id}/payments", params: { amount: 50, kind: "refund" }, headers: headers
        expect(response).to have_http_status(:unprocessable_entity)

        json = JSON.parse(response.body)
        expect(json["error"]).to include("Refund exceeds the amount paid")
      end

      it "allows multiple refunds within cumulative limit" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 100, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:created)

        post "/api/v1/orders/#{order.id}/payments", params: { amount: 40, kind: "refund" }, headers: headers
        expect(response).to have_http_status(:created)

        post "/api/v1/orders/#{order.id}/payments", params: { amount: 40, kind: "refund" }, headers: headers
        expect(response).to have_http_status(:created)

        order.reload
        expect(order.total_refunded).to eq(80)
      end
    end

    context "over-payment rejection" do
      let(:order) { create(:order, :with_line_items, user: user, item_price: 100, item_quantity: 1) }

      it "rejects payment exceeding balance" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 150, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:unprocessable_entity)

        json = JSON.parse(response.body)
        expect(json["error"]).to include("Payment exceeds the amount due")
      end

      it "rejects payment on fully-paid order" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 100, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:created)

        post "/api/v1/orders/#{order.id}/payments", params: { amount: 10, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:unprocessable_entity)

        json = JSON.parse(response.body)
        expect(json["error"]).to include("already fully paid")
      end

      it "rejects amount less than 0.01" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 0, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:unprocessable_entity)

        json = JSON.parse(response.body)
        expect(json["error"]).to include("Amount must be at least 0.01")
      end

      it "rejects negative amount" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: -10, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:unprocessable_entity)
      end
    end

    context "audit logging" do
      let(:order) { create(:order, :with_line_items, user: user, item_price: 100, item_quantity: 1) }

      it "creates audit log entry on payment" do
        expect {
          post "/api/v1/orders/#{order.id}/payments", params: { amount: 50, kind: "payment" }, headers: headers
        }.to change { order.audit_logs.count }.by(1)

        audit_log = order.audit_logs.last
        expect(audit_log.event).to eq("payment_recorded")
        expect(audit_log.from_status).to eq("pending")
        expect(audit_log.to_status).to eq("partially_paid")
        expect(audit_log.details["amount"]).to eq(50)
        expect(audit_log.details["kind"]).to eq("payment")
      end

      it "creates audit log entry on refund" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 100, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:created)

        expect {
          post "/api/v1/orders/#{order.id}/payments", params: { amount: 20, kind: "refund" }, headers: headers
        }.to change { order.audit_logs.count }.by(1)

        audit_log = order.audit_logs.last
        expect(audit_log.event).to eq("refund_recorded")
        expect(audit_log.from_status).to eq("paid")
        expect(audit_log.to_status).to eq("paid")
        expect(audit_log.details["amount"]).to eq(20)
        expect(audit_log.details["kind"]).to eq("refund")
      end
    end

    context "authentication" do
      let(:order) { create(:order, :with_line_items, user: user, item_price: 100, item_quantity: 1) }

      it "rejects request without auth token" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 50, kind: "payment" }
        expect(response).to have_http_status(:unauthorized)
      end

      it "rejects request with invalid token" do
        post "/api/v1/orders/#{order.id}/payments", params: { amount: 50, kind: "payment" },
             headers: { "Authorization" => "Bearer invalid_token" }
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "order not found" do
      it "returns 404 for non-existent order" do
        post "/api/v1/orders/999999/payments", params: { amount: 50, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:not_found)
      end

      it "returns 404 for order belonging to different user" do
        other_user = create(:user)
        other_order = create(:order, :with_line_items, user: other_user, item_price: 100, item_quantity: 1)

        post "/api/v1/orders/#{other_order.id}/payments", params: { amount: 50, kind: "payment" }, headers: headers
        expect(response).to have_http_status(:not_found)
      end
    end
  end
end
