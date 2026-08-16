# Payment Gateway, Merchant, and Customer Architecture

I plan to structure the payment system around three different parties: **A, B, and C**. Each party represents a different role and should have its own bank account and financial identity.

## 1. Parties

### A — Gateway Provider

**Example:** Alpha / PayFree

A is the payment gateway provider. A provides APIs, webhooks, payment processing, transaction tracking, and a dashboard for merchants.

A's responsibilities include:

* Providing APIs and SDKs to B.
* Providing webhook functionality.
* Creating and managing payment orders.
* Processing payments from C.
* Maintaining transaction records.
* Providing a merchant dashboard.
* Calculating gateway commissions/fees.
* Managing settlements.
* Handling technical payment failures and stuck transactions.
* Processing eligible payment refunds.

---

### B — Gateway Merchant / Business

**Example:** Alpha 1

B is a business that integrates A's payment gateway into its own website, application, or platform.

B receives:

* API credentials from A.
* API access for creating payment orders.
* Webhooks for payment status updates.
* A PayFree merchant dashboard.
* Transaction history.
* Payment and settlement information.
* Refund functionality where permitted.
* Settlement/balance information.

B uses A's gateway to allow its customers to make payments.

---

### C — Customer / Payer

**Example:** Beta

C is the person who purchases something from B's website or application.

C may pay using:

* UPI
* Bank account
* Card
* Other supported payment methods

C does not directly interact with A's merchant dashboard. C interacts with B's website/application and the payment interface provided by A.

---

# 2. Bank Account Structure

Each party should have a separate banking identity.

```text
A = Alpha
    Gateway Provider Bank Account

B = Alpha 1
    Merchant Bank Account

C = Beta
    Customer Bank Account
```

The accounts are completely separate.

```text
┌──────────────┐
│ C - Beta     │
│ Customer     │
└──────┬───────┘
       │
       │ ₹500 Payment
       ▼
┌──────────────┐
│ A - Alpha    │
│ Gateway      │
└──────┬───────┘
       │
       │ Settlement
       │ after fee
       ▼
┌──────────────┐
│ B - Alpha 1  │
│ Merchant     │
└──────────────┘
```

---

# 3. Payment Flow

Suppose B sells a product for **₹500**.

C visits B's website and places an order.

### Step 1 — B Creates Payment Order

B's backend calls A's API:

```text
B Website
    │
    │ Create Payment Order ₹500
    ▼
A / PayFree API
```

A creates a payment order with information such as:

```text
orderId
merchantId
amount = ₹500
currency = INR
customer information
callback/webhook information
```

A returns a payment session/order ID to B.

---

### Step 2 — C Pays

C is redirected to or shown A's payment interface.

```text
C
│
│ Pay ₹500
▼
Payment Gateway
│
├── UPI
├── Card
├── Net Banking
└── Other Methods
```

C authorizes the payment using their bank/payment application.

For example:

```text
C's Bank: Beta
Amount: ₹500
```

---

# 4. Money Movement

After a successful payment, the actual financial movement should be represented separately from the application-level transaction state.

Conceptually:

```text
C / Beta Bank
      │
      │ ₹500
      ▼
A / Alpha Bank
      │
      │ Gateway fee / commission
      ▼
Settlement Amount
      │
      │
      ▼
B / Alpha 1 Bank
```

For example, if A charges a **2% gateway commission**:

```text
Original Payment     = ₹500
Gateway Commission   = ₹10
Merchant Settlement  = ₹490
```

Therefore:

```text
C pays                 ₹500
        ↓
A receives             ₹500
        ↓
2% commission          ₹10
        ↓
B receives             ₹490
```

The exact implementation should calculate the fee dynamically rather than assuming it is always 2%.

For example:

```text
feeRate = 2%

fee = amount × feeRate / 100

netAmount = amount - fee
```

For ₹500:

```text
fee = ₹500 × 2 / 100
    = ₹10

netAmount = ₹500 - ₹10
          = ₹490
```

If the configured fee is 1%, 1.5%, 2%, 2.5%, 3%, etc., the system should calculate the corresponding amount automatically.

---

# 5. Merchant Dashboard

B should have access to an A/PayFree merchant dashboard.

The dashboard should show information such as:

```text
Merchant: Alpha 1

Available Balance: ₹490

Transactions
────────────────────────────────────
Order ID       Amount      Status
ORD-1001       ₹500        SUCCESS
ORD-1002       ₹250        SUCCESS
ORD-1003       ₹800        FAILED
```

The dashboard should distinguish between:

```text
Gross Amount
Gateway Fee
Net Amount
Settlement Amount
Refund Amount
Available Balance
Pending Amount
```

For example:

```text
Payment

Gross Amount:       ₹500
Gateway Fee:        ₹10
Net Settlement:     ₹490
Status:             SUCCESS
```

---

# 6. Merchant Bank Balance

If B has a UPI application or banking application connected to B's bank account, the settled amount should eventually appear in B's actual bank balance.

For example:

```text
A / Alpha
Gateway Account
      │
      │ ₹490 Settlement
      ▼
B / Alpha 1
Bank Account
      │
      ▼
B's UPI / Banking App

Balance: ₹490
```

The PayFree dashboard and B's actual bank account should therefore be treated as two different systems:

```text
PayFree Dashboard
       │
       │ displays
       ▼
Payment / Settlement Records

Bank
       │
       │ contains
       ▼
Actual Money
```

The dashboard balance should not automatically be treated as the same thing as an actual bank balance unless the settlement has actually occurred.

---

# 7. Payment Transaction Structure

Every payment should have a unique transaction record.

A transaction can contain information such as:

```text
transactionId
orderId
merchantId
customerId
amount
currency
gatewayFee
feeRate
netAmount
paymentMethod
paymentStatus
settlementStatus
refundStatus
createdAt
completedAt
```

Example:

```text
Transaction
────────────────────────────
Transaction ID: TXN-10001
Order ID:       ORD-50001

Merchant:       Alpha 1
Customer:       Beta

Amount:         ₹500
Fee Rate:       2%
Gateway Fee:    ₹10
Net Amount:     ₹490

Payment Status: SUCCESS
Settlement:     COMPLETED
Refund:         NONE
```

---

# 8. Payment Status Structure

Payment status should be independent and clearly defined.

For example:

```text
CREATED
   ↓
PENDING
   ↓
PROCESSING
   ↓
SUCCESS
```

Possible failure paths:

```text
PENDING
   ↓
FAILED
```

or:

```text
PENDING
   ↓
EXPIRED
```

or:

```text
SUCCESS
   ↓
REVERSED
```

Recommended payment statuses:

```text
CREATED
PENDING
PROCESSING
SUCCESS
FAILED
EXPIRED
CANCELLED
REVERSED
```

The system should not mark an order as successfully paid simply because a payment page was opened.

The payment should only become `SUCCESS` after receiving a trusted payment confirmation.

---

# 9. Webhook Flow

After the payment status changes, A should notify B through a webhook.

Example:

```text
C
 │
 │ ₹500
 ▼
A / PayFree
 │
 │ Payment SUCCESS
 ▼
B Webhook
```

Example webhook:

```json
{
  "event": "payment.success",
  "transactionId": "TXN-10001",
  "orderId": "ORD-50001",
  "amount": 500,
  "currency": "INR",
  "status": "SUCCESS"
}
```

B's server should verify the webhook signature before accepting it.

This prevents unauthorized systems from falsely telling B that an order has been paid.

---

# 10. Settlement Structure

Payment success and settlement should be treated as different events.

For example:

```text
Payment
₹500
 │
 ▼
SUCCESS
 │
 ▼
A receives/records funds
 │
 ▼
Fee calculation
 │
 ├── Gross: ₹500
 ├── Fee:   ₹10
 └── Net:   ₹490
 │
 ▼
Settlement
 │
 ▼
B receives ₹490
```

Therefore:

```text
Payment Status
      ≠
Settlement Status
```

A payment can be successful while its settlement is still pending.

Example:

```text
Payment Status:    SUCCESS
Settlement Status: PENDING
```

Later:

```text
Payment Status:    SUCCESS
Settlement Status: COMPLETED
```

---

# 11. Commission / Fee Calculation

The gateway fee should be configurable.

Example:

```text
Amount = ₹500

Fee Rate = 2%

Fee = ₹10

Merchant Amount = ₹490
```

Another transaction:

```text
Amount = ₹1,000

Fee Rate = 1.5%

Fee = ₹15

Merchant Amount = ₹985
```

The system should support different fee configurations depending on the merchant, payment method, transaction type, or other business rules.

The calculation should always be performed by the backend rather than relying on values supplied by B.

---

# 12. Refund Structure

Refunds should be treated as a separate financial operation.

A refund should not simply change the original transaction amount.

Instead:

```text
Original Transaction
        │
        │ ₹500
        ▼
Payment SUCCESS
        │
        ▼
Refund Requested
        │
        ▼
Refund Processing
        │
        ▼
Refund Completed
```

A refund record should contain information such as:

```text
refundId
transactionId
merchantId
refundAmount
refundReason
refundStatus
createdAt
completedAt
```

Example:

```text
Original Payment: ₹500

Refund: ₹500

Original Transaction:
SUCCESS

Refund:
COMPLETED
```

---

# 13. Refund Responsibility

Normal business/order cancellation should generally remain the responsibility of B.

For example:

```text
Customer orders product
        │
        ▼
B accepts order
        │
        ▼
Customer changes mind
        │
        ▼
Order cancellation
```

This is primarily a merchant/order-management matter rather than a gateway error.

However, A should support refunds for payment-related problems such as:

* Payment stuck.
* Payment incorrectly marked successful.
* Duplicate payment.
* Payment processing error.
* Technical payment failure where money was debited.
* Gateway/system error.
* Payment reversed by the payment network.
* Other eligible payment-processing problems.

The exact refund policy should be explicitly defined.

---

# 14. Refund and Gateway Fee

The treatment of the gateway fee during refunds must be defined as part of the business rules.

For example, if:

```text
Customer paid:       ₹500
Gateway fee:         ₹10
Merchant settlement: ₹490
```

and a full refund occurs, the system needs to determine whether:

```text
Customer receives: ₹500
```

and whether the ₹10 gateway fee is:

```text
absorbed by A
```

or:

```text
deducted from B
```

or:

```text
returned/reversed according to the applicable fee policy
```

This should not be hardcoded into the payment logic without a defined business rule.

---

# 15. Complete Payment Architecture

The overall architecture can therefore be represented as:

```text
                    ┌──────────────────────┐
                    │      A - Alpha       │
                    │   PayFree Gateway    │
                    │                      │
                    │ API / Webhooks       │
                    │ Payments             │
                    │ Transactions         │
                    │ Fees                 │
                    │ Settlements           │
                    │ Dashboard             │
                    └──────────┬───────────┘
                               │
                    API / Webhooks
                               │
                               ▼
                    ┌──────────────────────┐
                    │     B - Alpha 1      │
                    │      Merchant        │
                    │                      │
                    │ Website / App        │
                    │ Orders               │
                    │ Products             │
                    │ Customer Management  │
                    └──────────┬───────────┘
                               │
                         Payment Request
                               │
                               ▼
                    ┌──────────────────────┐
                    │      C - Beta        │
                    │      Customer        │
                    │                      │
                    │ UPI / Card / Bank    │
                    └──────────────────────┘
```

And the financial flow:

```text
C / Beta
Customer Bank
      │
      │ ₹500
      ▼
A / Alpha
Gateway Bank
      │
      │ Fee Calculation
      │
      ├── ₹10 Gateway Fee
      │
      └── ₹490 Merchant Settlement
                 │
                 ▼
          B / Alpha 1
          Merchant Bank
```

## Core Principle

The system should maintain a strict separation between **payment processing, order management, transaction status, fees, refunds, and settlement**.

In simple terms:

```text
C pays B
   ↓
A processes the payment
   ↓
A confirms payment to B
   ↓
A calculates applicable fees
   ↓
A settles the merchant's net amount
   ↓
B receives the settlement
```

This structure allows A to operate as the gateway provider, B to operate as the merchant/business using the gateway, and C to operate as the customer making the payment, while keeping their identities, accounts, transactions, and responsibilities clearly separated.
