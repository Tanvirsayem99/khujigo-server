# KhujiGo API contract

Base URL: **`/api/v1`** (e.g. `http://localhost:4000/api/v1`)
Interactive docs: **`/docs`**

## Conventions

**Naming.** Request and response bodies are **camelCase** (`nameEn`, `thumbnailUrl`, `productId`).
The old client types in `types/index.ts` were snake_case — wiring the frontend to this API needs a
mapping layer or an update to those types. `specifications` entries use `keyEn/keyBn/valueEn/valueBn`.

**Money.** Every amount is an **integer number of whole Bangladeshi Taka** (no paisa). Field names
ending in `price`, `amount`, `charge`, `discount` or `total` are integers.

**Dates.** ISO-8601 UTC strings.

**Auth.** Send `Authorization: Bearer <accessToken>`. Customer and admin tokens are not
interchangeable: using the wrong one returns **403** (the token is valid, just for another
audience). A missing or malformed token returns **401**.

**Pagination.** `?page=1&limit=12` (1–100). Paginated endpoints return:

```json
{ "items": [], "total": 42, "page": 1, "limit": 12, "totalPages": 4 }
```

`products` and `orders` listings are paginated; `categories`, `coupons`, `reviews` and `banners`
return plain arrays. Unknown query parameters are rejected with **400**.

**Errors.**

```json
{ "statusCode": 400, "message": "…", "error": "Bad Request" }
```

`statusCode` is the machine-readable field; `message` may be a string or a validation-message array.

**Enums.** `AdminRole` = `SUPER_ADMIN|ADMIN|STAFF` · `ProductStatus` =
`ACTIVE|DRAFT|OUT_OF_STOCK|ARCHIVED` · `OrderStatus` =
`PENDING|CONFIRMED|PROCESSING|SHIPPED|DELIVERED|CANCELLED|RETURNED` · `PaymentMethod` =
`COD|BKASH|NAGAD|ONLINE` · `PaymentStatus` = `UNPAID|PAID|REFUNDED` · `ReviewStatus` =
`APPROVED|PENDING|REJECTED` · `DiscountType` = `PERCENTAGE|FIXED`

---

## Health

| Method | Path | Access |
|---|---|---|
| GET | `/health` | Public |

```json
{ "status": "ok", "database": "up", "uptime": 12, "timestamp": "2026-03-21T08:00:00.000Z" }
```

---

## Auth — customer

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/auth/customer/register` | Public | Returns a token pair. `201` |
| POST | `/auth/customer/login` | Public | `identifier` = email **or** phone. `200` |
| POST | `/auth/customer/refresh` | Public | Rotates the refresh token. `200` |
| POST | `/auth/customer/logout` | Public | Revokes a refresh token. Idempotent. `200` |
| GET | `/auth/customer/me` | Customer | Profile + default address |
| PATCH | `/auth/customer/me` | Customer | Partial profile/address update |

`POST /auth/customer/register`

```json
{
  "name": "Zubair Hossain",
  "email": "zubair@example.com",
  "phone": "01712345678",
  "password": "customer123",
  "division": "dhaka",
  "district": "dhaka-city",
  "area": "Dhanmondi",
  "address": "House #45, Road #7/A, Dhanmondi R/A, Dhaka"
}
```

`phone` must match `/^01[3-9]\d{8}$/` (11-digit Bangladeshi mobile). `password` ≥ 6 chars.
Duplicate email or phone → **409**.

`POST /auth/customer/login`

```json
{ "identifier": "customer@khujigo.com", "password": "customer123" }
```

Wrong credentials → **401** with a deliberately non-specific message.

Token pair response (`tokenType` is `CUSTOMER` or `ADMIN`):

```json
{
  "accessToken": "eyJ…",
  "refreshToken": "eyJ…",
  "expiresIn": "15m",
  "tokenType": "CUSTOMER",
  "user": { "id": "cust-1", "name": "Zubair Hossain", "email": "customer@khujigo.com", "phone": "01712345678" }
}
```

Password hashes are never returned.

---

## Auth — admin

| Method | Path | Access |
|---|---|---|
| POST | `/auth/admin/login` | Public |
| POST | `/auth/admin/refresh` | Public |
| POST | `/auth/admin/logout` | Public |
| GET | `/auth/admin/me` | Admin |

`POST /auth/admin/login` → `{ "email": "admin@khujigo.com", "password": "<your super admin password>" }`

---

## Products

| Method | Path | Access |
|---|---|---|
| GET | `/products` | Public |
| GET | `/products/admin/all` | Admin |
| GET | `/products/:id/related` | Public |
| GET | `/products/:idOrSlug` | Public |
| POST | `/products` | Admin (SUPER_ADMIN, ADMIN) |
| PATCH | `/products/:id` | Admin (SUPER_ADMIN, ADMIN) |
| PATCH | `/products/:id/stock` | Admin (SUPER_ADMIN, ADMIN) |
| DELETE | `/products/:id` | Admin (SUPER_ADMIN, ADMIN) |

`GET /products` query parameters:

| Param | Type | Notes |
|---|---|---|
| `search` | string | Case-insensitive match on `nameEn`, `nameBn`, `brand`, `sku`; exact match on `tags` |
| `categorySlug` / `categoryId` | string | Filter by category |
| `minPrice` / `maxPrice` | int | Inclusive price range |
| `trending` `bestSeller` `newArrival` `featured` | bool | `true`/`false`/`1`/`0` |
| `inStock` | bool | `stockQuantity > 0` |
| `onSale` | bool | `discountPercent > 0` |
| `sort` | enum | `newest` (default) · `price_asc` · `price_desc` · `rating` · `trending` · `discount` |
| `page` / `limit` | int | Pagination |

The public listing **always** excludes non-`ACTIVE` products. `GET /products/admin/all` accepts an
extra `status` filter and returns every lifecycle state.

`GET /products/:idOrSlug` accepts either the cuid or the slug, and `404`s otherwise.

`GET /products/:id/related?limit=4` returns up to 24 `ACTIVE` products from the same category,
excluding the product itself.

A product embeds its category summary:

```json
{
  "id": "prod-1",
  "nameEn": "T900 Ultra 2 Smartwatch with Bangla Font & Bluetooth Calling",
  "nameBn": "T900 আল্ট্রা ২ স্মার্টওয়াচ …",
  "slug": "t900-ultra-2-smartwatch-bangla-support",
  "sku": "KG-WAT-001",
  "categoryId": "cat-gadgets",
  "brand": "KhujiGo Select",
  "price": 1450,
  "comparePrice": 2200,
  "discountPercent": 34,
  "stockQuantity": 48,
  "lowStockThreshold": 10,
  "thumbnailUrl": "https://picsum.photos/seed/t900watch/600/600",
  "galleryUrls": ["…"],
  "status": "ACTIVE",
  "isFeatured": true, "isTrending": true, "isBestSeller": true, "isNewArrival": false,
  "rating": 4.8,
  "reviewsCount": 128,
  "specifications": [
    { "keyEn": "Display", "keyBn": "ডিসপ্লে", "valueEn": "2.09\" IPS Full Touch HD", "valueBn": "২.০৯ ইঞ্চি আইপিএস ফুল টাচ" }
  ],
  "tags": ["smartwatch", "t900", "trending"],
  "seoTitle": "…", "seoDescription": "…",
  "createdAt": "2026-01-10T12:00:00.000Z",
  "updatedAt": "2026-01-10T12:00:00.000Z",
  "category": { "id": "cat-gadgets", "nameEn": "Gadgets & Tech", "nameBn": "গ্যাজেট ও টেকনোলজি", "slug": "gadgets" }
}
```

`PATCH /products/:id/stock` sets an **absolute** level: `{ "stockQuantity": 25 }`.

---

## Categories

| Method | Path | Access |
|---|---|---|
| GET | `/categories` | Public — active only, ordered by `displayOrder` |
| GET | `/categories/admin/all` | Admin — includes inactive |
| GET | `/categories/:slug` | Public |
| POST | `/categories` | Admin (SUPER_ADMIN, ADMIN) |
| PATCH | `/categories/:id` | Admin (SUPER_ADMIN, ADMIN) |
| DELETE | `/categories/:id` | Admin (SUPER_ADMIN **only**) |

Responses include a computed `productCount`. The public endpoints count only `ACTIVE` products; the
admin endpoints count every product. Deleting a category that still has products → **400**.

---

## Orders

| Method | Path | Access |
|---|---|---|
| POST | `/orders` | Public (optional customer token) |
| GET | `/orders` | Admin |
| GET | `/orders/mine` | Customer |
| GET | `/orders/:id` | Public (receipt) |
| PATCH | `/orders/:id/status` | Admin (SUPER_ADMIN, ADMIN, STAFF) |
| PATCH | `/orders/:id/payment-status` | Admin (SUPER_ADMIN, ADMIN, STAFF) |

`GET /orders` filters: `status`, `paymentStatus`, `search` (matches order id, customer name, phone
or email), `page`, `limit`.

`POST /orders` — checkout. **No amount is accepted from the client.**

```json
{
  "customerName": "Zubair Hossain",
  "customerPhone": "01712345678",
  "customerEmail": "customer@khujigo.com",
  "division": "dhaka",
  "district": "dhaka-city",
  "area": "Dhanmondi",
  "fullAddress": "House #45, Road #7/A, Dhanmondi R/A, Dhaka",
  "deliveryNotes": "Please call before delivery",
  "paymentMethod": "COD",
  "couponCode": "KHUJIGO100",
  "items": [{ "productId": "prod-1", "quantity": 1 }]
}
```

The server then:

1. Collapses duplicate `productId`s and re-prices every line from the **database** price.
2. Rejects non-`ACTIVE` products (**400**) and insufficient stock (**409**), and unknown products (**404**).
3. Validates `couponCode` if present — an invalid coupon is a **400**, never silently ignored.
4. Computes `deliveryCharge`: **0** when `subtotal >= freeDeliveryThreshold`, otherwise
   `insideDhaka` when `division === "dhaka"` (case-insensitive), else `outsideDhaka`.
5. Computes `totalAmount = subtotal + deliveryCharge - discount` (never below 0).
6. In one transaction: atomically decrements stock (`stockQuantity >= quantity` guard), creates the
   order and its line items, and increments the coupon's `usedCount`.
7. Links the order to a customer account — the authenticated caller if a customer token was sent,
   otherwise an account whose email or phone matches.

The order id is `KG-<year>-<4 digits>` (e.g. `KG-2026-8941`), unique, retried on collision.

Line items are **snapshots** (`nameEn`, `nameBn`, `thumbnailUrl`, `price`), so editing a product later
never rewrites past orders.

`GET /orders/mine` returns orders where `customerId` matches, or the email/phone matches the signed-in
account — so guest checkouts appear too.

---

## Coupons

| Method | Path | Access |
|---|---|---|
| POST | `/coupons/validate` | Public |
| GET | `/coupons` | Admin |
| POST | `/coupons` | Admin (SUPER_ADMIN, ADMIN) |
| PATCH | `/coupons/:id/toggle` | Admin (SUPER_ADMIN, ADMIN) |
| DELETE | `/coupons/:id` | Admin (SUPER_ADMIN **only**) |

`POST /coupons/validate` → `{ "code": "KHUJIGO100", "subtotal": 2300 }`

```json
{ "valid": true, "discount": 100, "message": "Coupon applied successfully",
  "coupon": { "id": "coup-1", "code": "KHUJIGO100", "discountType": "FIXED", "discountValue": 100, "…": "…" } }
```

Invalid cases return **200** with `valid: false`, a machine-readable `reason`, and a
human-readable `message`:

| `reason` | Meaning |
|---|---|
| `INVALID` | Unknown or deactivated code |
| `NOT_STARTED` | Before `startDate` |
| `EXPIRED` | After `expiryDate` |
| `USAGE_LIMIT` | `usedCount` reached `usageLimit` |
| `MIN_ORDER` | Subtotal below `minOrderAmount` |

```json
{ "valid": false, "reason": "EXPIRED", "message": "This coupon has expired" }
```

Use `reason` to localise the message; do not string-match `message`. A `PERCENTAGE` discount is
capped by `maxDiscountAmount` and never exceeds the subtotal.

`POST /coupons` body: `code`, `discountType`, `discountValue`, `minOrderAmount`, `maxDiscountAmount`,
`usageLimit` (`0` = unlimited), `startDate`, `expiryDate` (ISO date strings), `isActive`.
Codes are upper-cased. Duplicate code → **409**.

---

## Reviews

| Method | Path | Access |
|---|---|---|
| GET | `/reviews?productId=&limit=` | Public — `APPROVED` only |
| GET | `/reviews/admin/all` | Admin — all statuses, `status` + `productId` filters, paginated |
| POST | `/reviews` | Public (optional customer token) |
| PATCH | `/reviews/:id/status` | Admin (SUPER_ADMIN, ADMIN, STAFF) |
| DELETE | `/reviews/:id` | Admin (SUPER_ADMIN, ADMIN) |

`POST /reviews` → `{ "productId": "prod-1", "customerName": "…", "rating": 5, "comment": "…" }`

`rating` is 1–5. New reviews are created **`PENDING`** and are invisible on the storefront until an
admin approves them. `productName` is filled from the product. Unknown product → **404**.

---

## Banners

| Method | Path | Access |
|---|---|---|
| GET | `/banners` | Public — active only, ordered by `displayOrder` |
| GET | `/banners/admin/all` | Admin — includes inactive |
| POST | `/banners` | Admin (SUPER_ADMIN, ADMIN) |
| PATCH | `/banners/:id` | Admin (SUPER_ADMIN, ADMIN) |
| DELETE | `/banners/:id` | Admin (SUPER_ADMIN, ADMIN) |

---

## Delivery settings

| Method | Path | Access |
|---|---|---|
| GET | `/delivery-settings` | Public |
| PATCH | `/delivery-settings` | Admin (SUPER_ADMIN, ADMIN) |

Singleton row, auto-created with defaults on first read:

```json
{
  "id": "default",
  "insideDhaka": 60,
  "outsideDhaka": 120,
  "freeDeliveryThreshold": 2500,
  "estimatedDaysInsideDhaka": "১-২ দিন (ঢাকা)",
  "estimatedDaysOutsideDhaka": "২-৪ দিন (সারাদেশ)"
}
```

---

## Analytics

| Method | Path | Access |
|---|---|---|
| GET | `/analytics` | Admin |

```json
{
  "totalSales": 8400, "totalOrders": 4, "totalProducts": 8, "totalCustomers": 3,
  "pendingOrders": 1, "deliveredOrders": 1, "lowStockCount": 0, "averageOrderValue": 2100
}
```

`totalSales` excludes `CANCELLED` orders. `lowStockCount` counts products where
`stockQuantity <= lowStockThreshold`.

---

## Mapping from the old `lib/mock-db.ts`

| Old method | New endpoint |
|---|---|
| `getProducts(filter)` | `GET /products` |
| `getProductById` / `getProductBySlug` | `GET /products/:idOrSlug` |
| `createProduct` / `updateProduct` / `deleteProduct` | `POST` / `PATCH` / `DELETE /products/:id` |
| (inline stock adjust) | `PATCH /products/:id/stock` |
| `getCategories` / `getCategoryBySlug` | `GET /categories` / `GET /categories/:slug` |
| `createCategory` / `updateCategory` / `deleteCategory` | `POST` / `PATCH` / `DELETE /categories/:id` |
| `getOrders` | `GET /orders` (admin) · `GET /orders/mine` (customer) |
| `getOrderById` | `GET /orders/:id` |
| `createOrder` | `POST /orders` |
| `updateOrderStatus` / `updateOrderPaymentStatus` | `PATCH /orders/:id/status` · `/payment-status` |
| `getCoupons` / `createCoupon` / `deleteCoupon` / `toggleCouponStatus` | `GET` / `POST` / `DELETE /coupons/:id` / `PATCH /coupons/:id/toggle` |
| `validateCoupon` | `POST /coupons/validate` |
| `getReviews` / `addReview` / `updateReviewStatus` / `deleteReview` | `GET /reviews` / `POST /reviews` / `PATCH /reviews/:id/status` / `DELETE /reviews/:id` |
| `getBanners` | `GET /banners` |
| `getDeliverySettings` / `updateDeliverySettings` | `GET` / `PATCH /delivery-settings` |
| `getAnalytics` | `GET /analytics` |
| `SEED_ADMINS` / `SEED_CUSTOMERS` plaintext check | `POST /auth/*/login` with scrypt-hashed passwords |
