You are helping me build a closed-loop banking/payment laboratory for educational and prototype purposes.
This is NOT a real banking system, NOT connected to real banks, NOT connected to NPCI/real UPI, and MUST NOT process real money.
The purpose is to simulate how banking infrastructure, UPI, payment gateways, and e-commerce systems can communicate with each other.
I want the architecture to resemble a real-world distributed financial ecosystem as much as reasonably possible while remaining simple enough to run locally on my own devices.

1. Overall Project Vision
The final ecosystem will contain:
                        TECHORA FINANCIAL LAB

                              E-COMMERCE
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ TECHORA PAYFREE │
                         │ PAYMENT GATEWAY │
                         └────────┬────────┘
                                  │
                                  ▼
                            UPI SIMULATOR
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
                BANK ALPHA    BANK BETA    BANK GAMMA

The final system will contain:
Three simulated banks
Customer banking portals
Bank admin/manager portals
Bank APIs
Simulated UPI application
Simulated UPI API
Payment gateway
E-commerce platform
Webhooks
QR payments
Realtime transaction events
Transaction ledger
Audit logs
Failure/recovery simulation
Security controls
Local multi-device networking
However, DO NOT build everything at once.
We are currently starting with:
BANKING CORE ONLY
The first milestone is to build the banking system that UPI will eventually communicate with.

2. Current Development Goal
Build one Node.js banking server that hosts three simulated banks.
The server should initially run on:
http://localhost:8080

The three banks should be accessible through:
http://localhost:8080/alpha
http://localhost:8080/beta
http://localhost:8080/gamma

Use different branding, names, HTML pages, and portals for each bank, while sharing the same underlying banking engine.
Example:
Bank Alpha
Bank Beta
Bank Gamma

These are completely fictional banks.
Do not use real bank branding.

3. Important Architecture Rule
The most important architectural rule is:
A service owns the data it is responsible for. Other services must communicate with it through APIs rather than directly modifying its database.
For the final ecosystem:
E-commerce (T-MARKET)
    owns:
    products
    carts
    orders


Payment Gateway (T-PAYFREE)
    owns:
    merchants
    API keys
    gateway orders
    payment attempts
    refunds
    webhooks


UPI (T-PAYX)
    owns:
    UPI users
    UPI IDs
    UPI routing
    UPI transactions
    UPI payment requests


Bank (RBT)
    owns:
    customers
    bank accounts
    balances
    bank ledger
    bank transactions

Therefore, eventually:
UPI → Bank API

NOT:
UPI → directly modifies bank SQLite database

The UPI system must request:
Debit account
Credit account
Check balance
Validate account

through bank APIs.
The bank server decides whether those operations are allowed.

4. Technology
Use:
Backend:
Node.js
Express.js

Frontend:
HTML
CSS
Vanilla JavaScript

Database:
SQLite

Realtime:
Socket.IO

Validation:
Zod or equivalent

Authentication:
JWT for web sessions

Password hashing:
bcrypt 

HTTP communication:
Fetch or Axios

QR:
A suitable QR-code library

Logging:
Pino/Winston or a simple structured logger

Testing:
Jest/Vitest + Supertest or equivalent

Do NOT introduce PostgreSQL, Redis, Kafka, Kubernetes, Docker, microservices, etc. unless there is a specific architectural reason later.
This is a local educational prototype.
Keep the architecture clean without unnecessary infrastructure.

5. Three Banks
The banking server must support three fictional banks:
Bank Alpha
Bank Beta
Bank Gamma

Use a configuration-driven design.
Do NOT duplicate the entire banking implementation three times.
For example:
banks/
    alpha.js
    beta.js
    gamma.js

or:
banks/
    config.js

with configuration such as:
{
    id: "alpha",
    name: "Bank Alpha",
    code: "ALPHA"
}

The banking engine should be shared.

6. URL Structure
The server should support routes similar to:
/alpha
/beta
/gamma

Customer portal:
/alpha/login
/alpha/dashboard
/alpha/accounts
/alpha/transactions
/alpha/profile

/beta/login
/beta/dashboard
...

/gamma/login
...

Admin portal:
/alpha/admin/login
/alpha/admin/dashboard
/alpha/admin/customers
/alpha/admin/accounts
/alpha/admin/transactions
/alpha/admin/audit

/beta/admin/...

/gamma/admin/...

The exact routing implementation can be improved if necessary, but the URL structure should clearly identify the bank.

7. Frontend Requirements
Each bank should have its own visual identity.
For example:
Bank Alpha
    primary color A

Bank Beta
    primary color B

Bank Gamma
    primary color C

Do not simply create three copies of the exact same HTML.
The underlying functionality can be shared, but the frontend should clearly communicate which bank the user is currently accessing.
Use responsive HTML/CSS.
The customer banking portal should work on:
Desktop
Laptop
Chromebook
Phone


8. Customer Portal
Each bank must have a customer portal.
Customer features:
Registration
Login
Logout

Dashboard
Account information
Balance
Transaction history
Transaction details
Profile
Security settings

Eventually this portal will also contain UPI-related information, but do not implement UPI yet.

9. Bank Accounts
Every customer can have one or more simulated bank accounts.
Example:
Account Number:
ALPHA-10000001

Customer:
USER-1001

Bank:
ALPHA

Account Type:
SAVINGS

Balance:
₹10,000.00

Status:
ACTIVE

Account states should include at least:
ACTIVE
BLOCKED
CLOSED

Use integer smallest currency units internally.
For INR:
₹100.50

should internally be represented as:
10050

Do NOT use floating-point values for financial calculations.

10. Database
Use SQLite.
The first version may use one SQLite database:
database/banking.db

I want the system to logically separate the three banks.
You may use bank-specific tables if appropriate:
alpha_users
alpha_accounts
alpha_transactions
alpha_ledger_entries

beta_users
beta_accounts
beta_transactions
beta_ledger_entries

gamma_users
gamma_accounts
gamma_transactions
gamma_ledger_entries

OR use shared tables with a strict:
bank_id

relationship.
Choose the approach that gives the best educational architecture.
If you choose shared tables, explain why.
Do not silently mix both approaches without a reason.

11. Required Core Tables
At minimum, model:
banks
users
bank_users
accounts
transactions
ledger_entries
admin_users
audit_logs

Additional tables may be added where necessary.
Important fields should include identifiers such as:
user_id
bank_id
account_id
transaction_id
ledger_entry_id

Use generated IDs rather than exposing predictable sequential IDs where inappropriate.

12. Ledger
The ledger is one of the most important parts of this project.
DO NOT implement money movement simply as:
balance -= amount;

without an accounting record.
Every financial operation must create ledger entries.
Example:
Transaction:
TXN-10001

DEBIT:
Account A
₹500

CREDIT:
Account B
₹500

The transaction must satisfy:
total debit = total credit

For a transfer:
Sender:
-500

Recipient:
+500

The ledger should provide an auditable history of financial changes.

13. Transaction Model
Transactions should have unique IDs.
Example:
TXN_01J...

A transaction should contain information such as:
transaction_id
source_account
destination_account
source_bank
destination_bank
amount
currency
type
status
created_at
updated_at
completed_at
failure_reason
reference

Currency should initially be:
INR

but the architecture should not make adding other currencies impossible later.

14. Transaction States
Use a controlled transaction state machine.
At minimum:
CREATED
PROCESSING
SUCCESS
FAILED
CANCELLED
REVERSED

Do not allow arbitrary status updates.
For example:
CREATED
   ↓
PROCESSING
   ↓
SUCCESS

or:
CREATED
   ↓
PROCESSING
   ↓
FAILED

or:
SUCCESS
   ↓
REVERSED

Invalid transitions must be rejected.
Do not allow something like:
FAILED → SUCCESS

unless a specific reversal/retry mechanism permits it.

15. Money Transfer
Initially support transfers between accounts inside the same bank.
Example:
Bank Alpha

Rahul:
₹10,000

Arun:
₹2,000

Rahul sends:
₹500

Result:
Rahul:
₹9,500

Arun:
₹2,500

The system must atomically perform:
validate sender
validate recipient
validate amount
check account status
check sufficient balance
create transaction
debit sender
credit recipient
create ledger entries
mark transaction SUCCESS

If any critical operation fails, the transaction must not leave the accounts in an inconsistent state.
Use SQLite transactions.

16. Prevent Double Spending
The system must prevent:
Balance = ₹500

from being used simultaneously for:
Payment A = ₹500
Payment B = ₹500

The system should use database transactions/locking mechanisms appropriate for SQLite.
Do not rely only on frontend validation.
The server must enforce balance rules.

17. Idempotency
Financial operations should eventually support idempotency.
For example:
Idempotency-Key:
PAYMENT-ABC-123

If the same request is accidentally sent twice, it must not debit the customer twice.
Implement this where appropriate for transfer/payment APIs.

18. Customer Authentication
Implement:
Registration
Login
Logout
JWT
Password hashing
Account activation status

Passwords must NEVER be stored in plaintext.
Do not return password hashes through APIs.
JWT payload should contain only the minimum required identity information.
For example:
user_id
bank_id
role

Do not place sensitive information inside JWT payloads.

19. Roles
At minimum:
CUSTOMER
ADMIN
MANAGER

Customer:
View own accounts
View own transactions
Manage profile

Admin/Manager:
View customers
View accounts
View transactions
Block accounts
Review audit logs

Do not allow customers to access admin routes.
Authorization must be enforced server-side.

20. Admin Portal
Each bank should have a separate admin portal.
Example:
Bank Alpha Admin

Dashboard

Customers
    Total customers
    Active customers
    Blocked customers

Accounts
    Active
    Blocked
    Closed

Transactions
    Successful
    Failed
    Pending

Audit Logs

System Health

Admin should be able to inspect transactions but should NOT arbitrarily modify financial balances.
Do NOT create a dangerous:
/admin/change-balance

endpoint.
If test money needs to be created, make it an explicit controlled simulation operation and record it in the audit system.

21. Test Money
This is a simulation.
Provide a controlled way to seed accounts.
Example:
npm run seed

could create:
Bank Alpha
    Rahul
    Arun
    ₹10,000 each

Bank Beta
    Akhil
    Vishnu
    ₹10,000 each

Bank Gamma
    Amal
    etc.

Clearly label this as:
TEST MONEY
SIMULATION ONLY

Never represent this as real INR.

22. Bank APIs
The bank server must expose APIs that the future UPI system can consume.
Do not implement only frontend operations.
Create APIs such as:
POST /api/banks/:bankId/accounts
GET  /api/banks/:bankId/accounts/:accountId
GET  /api/banks/:bankId/accounts/:accountId/balance

POST /api/banks/:bankId/accounts/:accountId/debit
POST /api/banks/:bankId/accounts/:accountId/credit

POST /api/banks/:bankId/transactions
GET  /api/banks/:bankId/transactions/:transactionId

POST /api/banks/:bankId/account/verify

The exact endpoint structure may be improved.
The important point is that the API must represent bank-owned operations.

23. Future UPI Integration
Do NOT implement UPI yet.
But design the bank API so the future UPI system can communicate with it.
Eventually:
UPI Server
     │
     │ API
     ▼
Bank Server

UPI should be able to request:
Verify account
Verify customer
Check account status
Check available balance
Debit account
Credit account
Get transaction status
Request reversal

The bank must remain authoritative over the account balance.

24. Future Cross-Bank Transfers
Eventually the system should support:
Bank Alpha → Bank Beta
Bank Beta → Bank Gamma
Bank Gamma → Bank Alpha

But DO NOT implement cross-bank transfers in the first milestone.
Prepare the architecture for them.
Eventually the architecture will be:
UPI
 │
 ├── Bank Alpha API
 │
 └── Bank Beta API

The UPI system will act as the routing layer.

25. Audit Logging
Every security-sensitive or financial operation should generate an audit record.
Examples:
USER_REGISTERED
LOGIN_SUCCESS
LOGIN_FAILED
ACCOUNT_CREATED
ACCOUNT_BLOCKED
TRANSACTION_CREATED
TRANSACTION_SUCCESS
TRANSACTION_FAILED
ADMIN_ACTION
BALANCE_SEEDED

Audit log fields:
audit_id
bank_id
user_id
action
resource_type
resource_id
metadata
ip_address
user_agent
created_at

Never store passwords, MPINs, API secrets, or other sensitive credentials in audit logs.

26. API Security
Implement basic security from the beginning.
Use:
Helmet
CORS configuration
Rate limiting
Input validation
Central error handling
Authentication middleware
Authorization middleware
SQL parameterization
Request size limits
Structured logging

Do not build security as an afterthought.

27. Error Handling
Every API should return predictable errors.
Example:
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient test balance"
  }
}

Do not expose stack traces in production-style API responses.
During development, log detailed errors server-side.

28. Realtime Events
Use Socket.IO where useful.
For example:
transaction.created
transaction.processing
transaction.success
transaction.failed
balance.updated
account.status_changed

A customer dashboard should be able to receive:
Payment successful
Balance updated

without manually refreshing the page.

29. System Health
Add a simple endpoint:
GET /health

Example:
{
  "status": "ok",
  "service": "bank-server",
  "database": "connected",
  "timestamp": "..."
}

Eventually the UPI system and Payfree will use service-health checks.

30. Logging
Use structured logs.
Example:
INFO TRANSACTION_CREATED TXN_123
INFO TRANSACTION_SUCCESS TXN_123
WARN TRANSACTION_FAILED TXN_456
ERROR BANK_API_ERROR ...

Do not log:
password
MPIN
JWT
API secret


31. Project Structure
Create a clean structure similar to:
banking-system/
│
├── server.js
├── package.json
├── .env
├── .gitignore
├── README.md
│
├── config/
│   └── banks.js
│
├── database/
│   ├── database.js
│   ├── schema.sql
│   ├── migrations/
│   └── banking.db
│
├── routes/
│   ├── auth.js
│   ├── accounts.js
│   ├── transactions.js
│   ├── admin.js
│   ├── bankApi.js
│   └── health.js
│
├── services/
│   ├── authService.js
│   ├── accountService.js
│   ├── transactionService.js
│   ├── ledgerService.js
│   ├── auditService.js
│   └── bankService.js
│
├── middleware/
│   ├── auth.js
│   ├── role.js
│   ├── validation.js
│   └── errorHandler.js
│
├── realtime/
│   └── socket.js
│
├── utils/
│   ├── ids.js
│   ├── money.js
│   └── logger.js
│
├── scripts/
│   ├── seed.js
│   └── reset.js
│
└── frontend/
    ├── shared/
    │
    ├── alpha/
    │   ├── customer/
    │   └── admin/
    │
    ├── beta/
    │   ├── customer/
    │   └── admin/
    │
    └── gamma/
        ├── customer/
        └── admin/

You may modify this structure if there is a strong reason.
Do not create unnecessary files.

32. Environment Variables
Use .env.
Example:
PORT=8080
JWT_SECRET=development-only-secret
DATABASE_PATH=./database/banking.db
NODE_ENV=development

Never hard-code secrets.
For this educational prototype, clearly label secrets as development-only.

33. Testing Requirements
Before declaring the Banking Core complete, test:
Authentication
Registration works
Login works
Invalid password rejected
Inactive user rejected
Customer cannot access admin
Admin cannot impersonate arbitrary users

Accounts
Create account
Get balance
Block account
Blocked account cannot transact

Transfers
Successful transfer
Insufficient balance
Invalid recipient
Blocked account
Zero amount
Negative amount
Very large amount
Duplicate request
Database failure

Ledger
For every successful transaction:
debit == credit

Security
Test:
SQL injection attempts
Unauthorized API access
Invalid JWT
Expired JWT
Role escalation
Parameter tampering


34. Do Not Build These Yet
This is extremely important.
Do NOT implement:
UPI
UPI MPIN
QR payments
Payment gateway integration
Payfree integration
E-commerce integration
Real bank integration
Real UPI
NPCI
Real money
Card networks
Real payment providers

until the Banking Core is stable.
The next AI prompt will handle UPI.

35. Development Method
Work incrementally.
Do NOT generate the entire project blindly in one response.
Follow this sequence:
STEP 1
Architecture + package setup

STEP 2
SQLite schema

STEP 3
Bank configuration

STEP 4
Authentication

STEP 5
Customer portal

STEP 6
Bank account system

STEP 7
Ledger

STEP 8
Transactions

STEP 9
Admin portal

STEP 10
Bank APIs

STEP 11
Realtime events

STEP 12
Security hardening

STEP 13
Automated tests

STEP 14
Seed/test environment

STEP 15
Final integration test

After each step:
Explain what you changed.
List the files created/modified.
Show important API endpoints.
Explain how to run it.
Provide a test procedure.
Do not move to the next step until the current step works.
If existing code is present, inspect it first.
Do not overwrite working code unnecessarily.

36. Important Existing Project
I already have a separate project called:
Techora Payfree

It is my existing Razorpay-style payment gateway prototype.
It already contains:
Merchant authentication
JWT
API keys
Orders
Payments
Refunds
Payment links
Checkout
Webhooks
Webhook signing
Webhook retries
SQLite
Express

Its architecture currently has:
Dashboard/API separation
Merchant API keys
Payment state machine
Webhook events
Webhook delivery

The gateway currently has a development-only mechanism for changing payment status.
DO NOT modify or integrate with Payfree yet.
The Banking Core should expose clean APIs so we can integrate Payfree later.

37. Final Banking Core Definition of Done
The Banking Core is complete only when I can:
Start server
        ↓
Open Bank Alpha
        ↓
Register customer
        ↓
Login
        ↓
Create/receive test bank account
        ↓
See balance
        ↓
Open another customer account
        ↓
Transfer test money
        ↓
See debit transaction
        ↓
See credit transaction
        ↓
Verify ledger
        ↓
See realtime update
        ↓
Open Bank Beta
        ↓
Perform the same operations

And the APIs must be ready for the future:
UPI
   ↓
Bank API


38. Most Important Rule
Do not optimize this project for "looks impressive."
Optimize it for:
Correct architecture
Correct transaction handling
Data integrity
Security
Clear service boundaries
Testability
Failure handling
Observability

The UI can be improved later.
The banking logic must be correct first.

39. What I expect from you
Start by analyzing this specification.
Before writing a large amount of code:
Propose the final Banking Core architecture.
Explain whether you recommend bank-specific tables or shared tables with bank_id.
Explain the database transaction strategy.
Explain the API boundary that future UPI will use.
Explain the folder structure.
Identify potential architectural problems.
Then begin STEP 1 only.
Do not jump directly to UPI, Payfree, or e-commerce.
We are building the foundation first.
