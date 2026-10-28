# Orders Management API --- High-Specification Contract

**Version:** 1.0.0\
**Runtime:** Node.js LTS\
**Suggested stack:** TypeScript, Express, Zod, Vitest, Supertest\
**API style:** REST/JSON\
**Base path:** `/api/v1`\
**Persistence:** In-memory collections seeded from a JSON fixture. No
database is required for this phase.

## 1. Executive summary

This document defines a Node.js REST contract for an order-management
application. It specifies exactly 12 business endpoints covering order
creation, search, retrieval, updates, cancellation, fulfillment,
tracking, returns, refunds, and reporting.

The first release is a prototype: seed data is loaded from JSON into
memory at startup; API mutations update memory only and are lost when
the process restarts. Payment, shipment, and refund operations are
simulations, not real financial or carrier transactions.

## 2. Business importance

  ----------------------------------------------------------------------------------
  Capability              Business importance     Endpoint
  ----------------------- ----------------------- ----------------------------------
  Create orders           Converts checkout       `POST /orders`
                          intent into a trackable 
                          transaction and         
                          prevents duplicate      
                          submissions.            

  Search orders           Helps support and       `GET /orders`
                          operations find records 
                          by customer, status, or 
                          date.                   

  View order details      Gives customer support  `GET /orders/{orderId}`
                          and the storefront a    
                          single source for order 
                          status and totals.      

  Update eligible details Allows corrections      `PATCH /orders/{orderId}`
                          before fulfillment      
                          without permitting      
                          arbitrary financial     
                          changes.                

  Cancel orders           Stops avoidable         `POST /orders/{orderId}/cancel`
                          fulfillment work and    
                          records cancellation    
                          reasons.                

  Fulfill items           Makes the warehouse     `POST /orders/{orderId}/fulfill`
                          hand-off explicit and   
                          generates mock shipment 
                          data.                   

  Track shipments         Reduces "where is my    `GET /orders/{orderId}/tracking`
                          order?" contacts and    
                          improves delivery       
                          transparency.           

  Request returns         Standardizes return     `POST /orders/{orderId}/returns`
                          reasons and item        
                          quantities.             

  Review returns          Shows return history to `GET /orders/{orderId}/returns`
                          support and operations. 

  Request refunds         Controls refund intent  `POST /orders/{orderId}/refunds`
                          and helps prevent       
                          excessive refund        
                          requests.               

  Review refunds          Gives support and       `GET /orders/{orderId}/refunds`
                          finance a refund        
                          status/amount view.     

  Monitor operations      Summarizes volume,      `GET /orders/summary`
                          status distribution,    
                          and order value for     
                          dashboards.             
  ----------------------------------------------------------------------------------

## 3. Scope and assumptions

### In scope

-   Twelve REST endpoints with request/response contracts.
-   JSON fixture data loaded into in-memory collections.
-   Validation, filtering, pagination, consistent errors,
    state-transition rules, and tests.
-   Architecture that allows the in-memory repository to be replaced
    later.

### Out of scope

-   Database, migrations, durable storage, multi-instance consistency.
-   Real payment processing, card data, carrier integrations, tax-engine
    integration.
-   Production authentication/authorization provider and inventory
    reservation.
-   Queues, webhooks, accounting reconciliation, and regulatory
    workflows.

**Prototype limitation:** changes are lost on restart. Each Node.js
process has its own memory. Keep the API local or in a controlled
development environment until authentication and durable persistence
exist.

## 4. Suggested project structure

``` text
orders-api/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── routes/orders.routes.ts
│   ├── controllers/orders.controller.ts
│   ├── services/orders.service.ts
│   ├── services/returns.service.ts
│   ├── services/refunds.service.ts
│   ├── repositories/memory.repository.ts
│   ├── schemas/orders.schemas.ts
│   ├── middleware/error-handler.ts
│   ├── middleware/request-id.ts
│   ├── types/orders.types.ts
│   └── data/mock-data.json
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

Routes handle HTTP mapping; controllers translate requests and
responses; services enforce business rules; schemas validate input; the
repository owns mutable in-memory collections. Do not put business rules
directly in route handlers or expose internal arrays by reference.

## 5. Shared API conventions

-   Local base URL: `http://localhost:3000/api/v1`
-   Request/response format: JSON; body requests use
    `Content-Type: application/json`.
-   IDs: server-generated UUIDs recommended. Fixture IDs may be readable
    strings.
-   Timestamps: ISO 8601 UTC, e.g. `2026-10-28T10:15:30.000Z`.
-   Money: integer minor units. `amountMinor: 129900` represents
    ₹1,299.00 for INR. Do not use floating-point values for money.
-   Initial supported currency: `INR`; do not aggregate different
    currencies.
-   Pagination: `page` default 1, `pageSize` default 20, maximum 100.
-   Sorting: endpoint-approved `sortBy`; `sortOrder=asc|desc`, default
    `desc`.
-   Accept `X-Request-Id` or generate one; return it in response headers
    and errors.
-   Unknown query parameters and unsupported body fields should fail
    validation rather than be silently ignored.

### HTTP status codes

  Code    Meaning
  ------- --------------------------------------------
  `200`   Successful read/update/action
  `201`   Resource created
  `400`   Malformed request or invalid query
  `404`   Resource not found
  `409`   State or idempotency conflict
  `422`   Valid JSON but invalid field/domain values
  `429`   Rate limit exceeded, if configured
  `500`   Unexpected server error

## 6. Domain model

### Order

``` json
{
  "id": "ord_10001",
  "orderNumber": "ORD-2026-10001",
  "customer": {
    "customerId": "cus_1001",
    "name": "Aarav Sen",
    "email": "aarav@example.com",
    "phone": "+91-9000000001"
  },
  "items": [
    {
      "itemId": "itm_10001",
      "sku": "KB-001",
      "name": "Mechanical Keyboard",
      "quantity": 1,
      "unitPriceMinor": 499900,
      "lineTotalMinor": 499900
    }
  ],
  "currency": "INR",
  "subtotalMinor": 499900,
  "discountMinor": 0,
  "taxMinor": 89982,
  "shippingMinor": 0,
  "totalMinor": 589882,
  "payment": {
    "status": "authorized",
    "method": "mock_card",
    "transactionReference": "mock_txn_10001"
  },
  "status": "confirmed",
  "fulfillmentStatus": "unfulfilled",
  "shippingAddress": {
    "line1": "12 Park Street",
    "line2": "Apartment 4B",
    "city": "Kolkata",
    "region": "West Bengal",
    "postalCode": "700016",
    "countryCode": "IN"
  },
  "notes": "Deliver after 10 AM if possible",
  "createdAt": "2026-10-28T10:00:00.000Z",
  "updatedAt": "2026-10-28T10:00:00.000Z",
  "cancelledAt": null
}
```

### Enumerations

-   Order status: `pending`, `confirmed`, `processing`, `fulfilled`,
    `shipped`, `delivered`, `cancelled`, `returned`.
-   Fulfillment status: `unfulfilled`, `partially_fulfilled`,
    `fulfilled`.
-   Mock payment status: `pending`, `authorized`, `captured`,
    `partially_refunded`, `refunded`, `failed`, `voided`.
-   Shipment status: `label_created`, `in_transit`, `out_for_delivery`,
    `delivered`, `exception`, `cancelled`.
-   Return status: `requested`, `approved`, `rejected`, `received`,
    `completed`.
-   Return reason: `damaged`, `wrong_item`, `not_as_described`,
    `no_longer_needed`, `other`.
-   Refund status: `pending`, `succeeded`, `failed`, `cancelled`.

## 7. The 12 endpoint contract

All paths below are relative to `/api/v1`.

  --------------------------------------------------------------------------------------------------
                     \# Method + path                      Purpose                  Success
  --------------------- ---------------------------------- ------------------------ ----------------
                      1 `POST /orders`                     Create order             `201`

                      2 `GET /orders`                      Filter/search/paginate   `200`
                                                           orders                   

                      3 `GET /orders/{orderId}`            Retrieve one order       `200`

                      4 `PATCH /orders/{orderId}`          Update eligible fields   `200`

                      5 `POST /orders/{orderId}/cancel`    Cancel eligible order    `200`

                      6 `POST /orders/{orderId}/fulfill`   Fulfill quantities and   `201`
                                                           create mock shipment     

                      7 `GET /orders/{orderId}/tracking`   List tracking            `200`
                                                           information              

                      8 `POST /orders/{orderId}/returns`   Request return           `201`

                      9 `GET /orders/{orderId}/returns`    List returns             `200`

                     10 `POST /orders/{orderId}/refunds`   Create simulated refund  `201`
                                                           request                  

                     11 `GET /orders/{orderId}/refunds`    List refunds             `200`

                     12 `GET /orders/summary`              Dashboard metrics        `200`
  --------------------------------------------------------------------------------------------------

### 1. Create an order

`POST /api/v1/orders`

Headers:

``` http
Content-Type: application/json
Idempotency-Key: checkout-session-abc123
```

Request:

``` json
{
  "customer": {
    "customerId": "cus_1001",
    "name": "Aarav Sen",
    "email": "aarav@example.com",
    "phone": "+91-9000000001"
  },
  "items": [
    {
      "sku": "KB-001",
      "name": "Mechanical Keyboard",
      "quantity": 1,
      "unitPriceMinor": 499900
    }
  ],
  "currency": "INR",
  "discountMinor": 0,
  "shippingMinor": 0,
  "shippingAddress": {
    "line1": "12 Park Street",
    "city": "Kolkata",
    "region": "West Bengal",
    "postalCode": "700016",
    "countryCode": "IN"
  },
  "notes": "Deliver after 10 AM if possible"
}
```

Rules: - Require customer name/email, at least one item, currency, and
shipping address. - Quantity must be an integer from 1 to 1000; unit
price must be a non-negative integer. - Server calculates line totals,
subtotal, tax, and order total. Reject client-supplied authoritative
totals/tax. - Tax is a configurable mock calculation and must not be
represented as legally accurate. - Server creates IDs, order number,
timestamps, initial status, and mock payment state. - Same idempotency
key + equivalent payload returns the original result; same key +
different payload returns `409 IDEMPOTENCY_CONFLICT`. In-memory
idempotency expires on restart. - Never accept raw card details.

Response:

``` json
{
  "data": {
    "id": "ord_10004",
    "orderNumber": "ORD-2026-10004",
    "status": "confirmed",
    "fulfillmentStatus": "unfulfilled",
    "currency": "INR",
    "subtotalMinor": 499900,
    "discountMinor": 0,
    "taxMinor": 89982,
    "shippingMinor": 0,
    "totalMinor": 589882,
    "createdAt": "2026-10-28T13:00:00.000Z"
  }
}
```

### 2. List/search orders

`GET /api/v1/orders`

Query parameters: `status`, `fulfillmentStatus`, `email`
(case-insensitive exact match), `customerId`, `orderNumber`,
`createdFrom`, `createdTo`, `page`, `pageSize`, `sortBy`, `sortOrder`.

Example:

``` http
GET /api/v1/orders?status=confirmed&email=aarav%40example.com&page=1&pageSize=20&sortBy=createdAt&sortOrder=desc
```

Response:

``` json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

Return `400` for invalid filters. Business value: support and operations
can find orders without retrieving the entire collection.

### 3. Get order details

`GET /api/v1/orders/{orderId}`

Return `200` with the complete order representation: customer summary,
items, totals, mock payment status, address, statuses, and timestamps.
Return `404 ORDER_NOT_FOUND` if absent. Business value: provides the
order-detail view for support and storefronts.

### 4. Update an order

`PATCH /api/v1/orders/{orderId}`

Request:

``` json
{
  "notes": "Please call on arrival",
  "shippingAddress": {
    "line1": "14 Park Street",
    "city": "Kolkata",
    "region": "West Bengal",
    "postalCode": "700016",
    "countryCode": "IN"
  }
}
```

Only `notes`, `customer.phone`, and `shippingAddress` are patchable.
Reject `status`, `items`, `totalMinor`, `payment`, IDs, timestamps, and
unknown fields. Address changes are allowed only before fulfillment
starts and for non-cancelled orders. Update `updatedAt`. Business value:
supports controlled corrections without allowing financial tampering.

### 5. Cancel an order

`POST /api/v1/orders/{orderId}/cancel`

Request:

``` json
{ "reason": "customer_requested" }
```

Allowed reasons: `customer_requested`, `duplicate_order`,
`fraud_suspected`, `inventory_unavailable`, `other`.

Reject already-cancelled, shipped, or delivered orders. Set
`status=cancelled`, `cancelledAt`, and `updatedAt`. An authorized mock
payment may be marked `voided`; a captured payment must not silently
become refunded. Return `409 INVALID_STATE_TRANSITION` when ineligible.
Business value: prevents avoidable fulfillment work and records the
reason.

### 6. Fulfill an order

`POST /api/v1/orders/{orderId}/fulfill`

Request:

``` json
{
  "items": [{ "itemId": "itm_10002", "quantity": 1 }],
  "carrier": "MockExpress"
}
```

Verify the order is eligible and not cancelled; every item belongs to
the order; quantities are positive and within remaining unfulfilled
quantities; and duplicate item entries are rejected. Create a mock
shipment with tracking number, `label_created` status, and event
timestamp. Update fulfillment status to `partially_fulfilled` or
`fulfilled`. Do not mark the order shipped until the shipment state
advances. Return `201` with shipment and updated fulfillment state.
Business value: models the warehouse hand-off and enables operations
reporting.

### 7. Get tracking

`GET /api/v1/orders/{orderId}/tracking`

Return `200` with a `data` array of shipment summaries, tracking
numbers, statuses, estimated delivery timestamps, and events. If the
order exists without shipments, return an empty array. If the order is
missing, return `404`. All tracking data is mock data. Business value:
enables an order-tracking UI and reduces support contacts.

### 8. Request a return

`POST /api/v1/orders/{orderId}/returns`

Request:

``` json
{
  "reason": "damaged",
  "items": [{ "itemId": "itm_10003", "quantity": 1 }],
  "customerComment": "The package arrived damaged."
}
```

Normally require a delivered order. Validate item ownership and
quantities not already returned or held by another active return. New
return status is `requested`. The return window is a configurable mock
policy, not a legal promise. Return `201`. Business value: standardizes
return intake and captures reasons for analysis.

### 9. List returns

`GET /api/v1/orders/{orderId}/returns?page=1&pageSize=20`

Verify the parent order exists; return only its returns, sorted by
`createdAt` descending and paginated. Response shape:

``` json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

Business value: provides a return history for support and operations.

### 10. Create a refund request

`POST /api/v1/orders/{orderId}/refunds`

Request:

``` json
{
  "returnId": "ret_10003",
  "amountMinor": 129900,
  "reason": "approved_return"
}
```

Require positive integer `amountMinor`, existing order, and optional
return belonging to that order and satisfying the configured mock
policy. Sum successful and pending refunds when checking the remaining
refundable amount. New refund status is `pending`; only a test-only mock
adapter may mark it succeeded/failed. Never claim that money moved.
Return `409 REFUND_LIMIT_EXCEEDED` for excessive requests. Business
value: represents controlled refund intent and reduces
duplicate/excessive requests.

### 11. List refunds

`GET /api/v1/orders/{orderId}/refunds?page=1&pageSize=20`

Verify parent order, return only associated refunds, sort newest first,
paginate, and never expose payment-card data or secrets. Use the same
pagination envelope as the returns endpoint. Business value: gives
support and finance a refund status/amount view.

### 12. Order summary

`GET /api/v1/orders/summary?createdFrom=2026-10-01T00:00:00.000Z&createdTo=2026-10-31T23:59:59.999Z&currency=INR`

Response:

``` json
{
  "data": {
    "period": {
      "createdFrom": "2026-10-01T00:00:00.000Z",
      "createdTo": "2026-10-31T23:59:59.999Z"
    },
    "currency": "INR",
    "totalOrders": 120,
    "ordersByStatus": {
      "pending": 5,
      "confirmed": 35,
      "processing": 10,
      "fulfilled": 15,
      "shipped": 25,
      "delivered": 20,
      "cancelled": 8,
      "returned": 2
    },
    "grossOrderValueMinor": 125000000,
    "cancelledOrders": 8,
    "averageOrderValueMinor": 1041667
  }
}
```

Counts and totals are computed from in-memory orders in the selected
period. For this contract, gross order value means the sum of
`totalMinor` for non-cancelled orders. Do not mix currencies; return
zeros for an empty period and avoid division by zero. Business value:
supports an operational dashboard and basic volume/value reporting.

## 8. Common error contract

Every error uses:

``` json
{
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "The requested order was not found.",
    "details": [],
    "requestId": "req_01J9EXAMPLE"
  }
}
```

Suggested codes: `INVALID_REQUEST`, `VALIDATION_ERROR`,
`ORDER_NOT_FOUND`, `RESOURCE_NOT_FOUND`, `IDEMPOTENCY_CONFLICT`,
`INVALID_STATE_TRANSITION`, `REFUND_LIMIT_EXCEEDED`, `INTERNAL_ERROR`.

Validation detail example:

``` json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "items[0].quantity",
        "issue": "Must be an integer greater than zero."
      }
    ],
    "requestId": "req_01J9EXAMPLE"
  }
}
```

Never return stack traces or internal exception details to clients.

## 9. State transitions and invariants

Suggested order flow:

``` text
pending -> confirmed -> processing -> fulfilled -> shipped -> delivered
   |            |             |
   +------------+-------------+----> cancelled (before shipment only)
delivered -> returned (after eligible return workflow completes)
```

Rules: 1. Totals are server-calculated. 2. Quantities are positive
integers; money uses integer minor units. 3. Orders cannot be cancelled
twice or cancelled after shipment/delivery. 4. Fulfillment cannot exceed
remaining quantities. 5. Returns cannot exceed eligible quantities after
active/completed returns. 6. Successful plus pending refunds cannot
exceed refundable amount. 7. Clients cannot patch server-controlled
fields. 8. Validate all conditions before mutating state; failed
requests must not leave partial changes. 9. Update `updatedAt` on
resource mutation. 10. State transitions must be implemented in service
functions, not arbitrary status assignment.

In-memory checks are not equivalent to database transactions or
distributed locks. Multiple processes will not share state.

## 10. JSON fixtures and in-memory store

Create `src/data/mock-data.json`:

``` json
{
  "orders": [
    {
      "id": "ord_10001",
      "orderNumber": "ORD-2026-10001",
      "customer": {
        "customerId": "cus_1001",
        "name": "Aarav Sen",
        "email": "aarav@example.com",
        "phone": "+91-9000000001"
      },
      "items": [
        {
          "itemId": "itm_10001",
          "sku": "KB-001",
          "name": "Mechanical Keyboard",
          "quantity": 1,
          "unitPriceMinor": 499900,
          "lineTotalMinor": 499900
        }
      ],
      "currency": "INR",
      "subtotalMinor": 499900,
      "discountMinor": 0,
      "taxMinor": 89982,
      "shippingMinor": 0,
      "totalMinor": 589882,
      "payment": {
        "status": "authorized",
        "method": "mock_card",
        "transactionReference": "mock_txn_10001"
      },
      "status": "confirmed",
      "fulfillmentStatus": "unfulfilled",
      "shippingAddress": {
        "line1": "12 Park Street",
        "line2": "Apartment 4B",
        "city": "Kolkata",
        "region": "West Bengal",
        "postalCode": "700016",
        "countryCode": "IN"
      },
      "notes": "Deliver after 10 AM if possible",
      "createdAt": "2026-10-28T10:00:00.000Z",
      "updatedAt": "2026-10-28T10:00:00.000Z",
      "cancelledAt": null
    }
  ],
  "shipments": [],
  "returns": [],
  "refunds": []
}
```

Load fixture data once at startup:

``` ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const fixturePath = resolve(currentDir, "../data/mock-data.json");
const seed = JSON.parse(readFileSync(fixturePath, "utf8"));

export const memoryStore = {
  orders: structuredClone(seed.orders),
  shipments: structuredClone(seed.shipments),
  returns: structuredClone(seed.returns),
  refunds: structuredClone(seed.refunds),
  idempotencyRecords: new Map<string, { requestHash: string; response: unknown }>()
};
```

Adjust the relative path for your compiled output layout. Validate
fixture data on startup. Runtime mutations update these in-memory
structures, not the JSON file. Restarting resets them to fixture state.
Use deterministic fixtures and reset the store between tests. No
database URL, ORM, migration, or database server is needed.

## 11. Validation requirements

Validate: - JSON content type and maximum body size (e.g. 1 MB). - Email
syntax and maximum string lengths. - Currency and enum values. - ISO
timestamps and valid date ranges. - Integer money amounts; reject
decimals, `NaN`, and infinity. - Positive quantities and configured
limits. - Duplicate item IDs in fulfillment/return requests. - Unknown
body fields and server-owned fields. - Pagination bounds and allowed
sort fields. - Parent-child consistency for shipment, return, and refund
records.

## 12. Security and privacy

-   Use synthetic customer data in fixtures.
-   Never store raw card numbers, CVVs, or bank credentials.
-   Do not log full addresses, emails, or request bodies by default.
-   Configure CORS to explicit frontend origins.
-   Use security headers, request size limits, and basic rate limiting
    if exposed beyond localhost.
-   Validate and normalize input; never execute user input as a shell
    command.
-   Add authentication and role-based authorization before real
    customer/order data is exposed.
-   Return generic internal errors and log diagnostic details only
    server-side.

## 13. Observability

Log request timestamp, request ID, method/route, response status,
duration, and error code. Avoid sensitive payload logging. Optional
health endpoints may be added separately; they are not counted among the
12 business endpoints.

## 14. Testing and acceptance criteria

### Required tests

1.  Create order returns `201`.
2.  Same idempotency key and same payload does not duplicate the order.
3.  Same key with different payload returns `409`.
4.  Existing order returns `200`; missing order returns `404`.
5.  Status/email filtering and pagination work.
6.  Client-supplied totals/status fields are rejected.
7.  Eligible patch succeeds; post-fulfillment address update fails.
8.  Eligible cancellation succeeds; shipped order cancellation fails.
9.  Fulfillment rejects foreign item IDs and excessive quantities.
10. Tracking returns shipments or an empty array.
11. Return request validates order state and item quantities.
12. Return/refund lists verify the parent order.
13. Refund amount above remaining balance fails.
14. Summary counts and totals match fixture data.
15. Malformed JSON and invalid query values return the common error
    envelope.
16. Restarting/reseeding restores fixture data.

### Definition of done

-   Exactly 12 documented business endpoints are implemented.
-   Controllers, services, schemas, and repository are separated.
-   All mutable data comes from the in-memory store seeded from JSON.
-   No database is required.
-   Monetary calculations use integer minor units.
-   Errors use the shared envelope.
-   Tests cover success, validation, not-found, and conflict cases.
-   `npx tsc --noEmit` passes.
-   README documents setup, startup, tests, curl examples, and
    reset-on-restart behavior.

## 15. Suggested scripts

``` json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Install TypeScript, `tsx`, Vitest, Supertest, Express, and a runtime
validation library such as Zod as appropriate for the implementation.

## 16. Example requests

Create:

``` bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-checkout-001' \
  -d '{
    "customer":{"customerId":"cus_1001","name":"Aarav Sen","email":"aarav@example.com"},
    "items":[{"sku":"KB-001","name":"Mechanical Keyboard","quantity":1,"unitPriceMinor":499900}],
    "currency":"INR",
    "discountMinor":0,
    "shippingMinor":0,
    "shippingAddress":{"line1":"12 Park Street","city":"Kolkata","region":"West Bengal","postalCode":"700016","countryCode":"IN"}
  }'
```

List:

``` bash
curl 'http://localhost:3000/api/v1/orders?status=confirmed&page=1&pageSize=20'
```

Retrieve:

``` bash
curl http://localhost:3000/api/v1/orders/ord_10001
```

Summary:

``` bash
curl 'http://localhost:3000/api/v1/orders/summary?currency=INR'
```

## 17. Future evolution

When the prototype is validated: 1. Replace the memory repository with a
database adapter without changing the API contract. 2. Make idempotency
durable and enforce uniqueness. 3. Add authentication, authorization,
audit logs, and retention policies. 4. Integrate payment providers with
provider-side idempotency and verified webhooks. 5. Integrate carriers
and asynchronous shipment events. 6. Add inventory reservation and
concurrency-safe updates. 7. Confirm tax, return-window, and refund
policies with business owners. 8. Add OpenAPI contract checks and
consumer-driven tests. 9. Monitor checkout conversion, cancellation
rate, return rate, fulfillment latency, and refund latency.

## 18. Final summary

This contract defines 12 Node.js REST endpoints for order lifecycle
management. The first version uses JSON fixtures and in-memory mutable
collections, so it can be developed and tested without a database. The
API is organized around clear domain rules, validation, consistent
errors, and a replaceable repository boundary. Payment, shipment, and
refund behavior remains simulated until real integrations are
introduced.
