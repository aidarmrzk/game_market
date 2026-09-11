import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import type { InferInsertModel, InferSelectModel } from "drizzle-orm"

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export type UserSchemaSelect = InferSelectModel<typeof users>
export type UserSchemaInsert = InferInsertModel<typeof users>

export const orderStatusEnum = pgEnum("order_status", [
  "created",
  "paid",
  "delivering",
  "delivered",
  "payment_failed",
  "out_of_stock",
  "delivery_failed",
])

export const paymentStatusEnum = pgEnum("payment_status", ["paid", "failed"])

export const providerRequestStatusEnum = pgEnum("provider_request_status", [
  "ok",
  "error",
])

export const promoTypeEnum = pgEnum("promo_type", ["percent", "amount"])

export const reservationStatusEnum = pgEnum("reservation_status", [
  "active",
  "consumed",
  "expired",
])

export const products = pgTable("products", {
  sku: text("sku").primaryKey().notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  price: integer("price").notNull(),
  currency: text("currency").notNull().default("RUB"),
  image: text("image").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    externalOrderId: text("external_order_id").notNull(),
    idempotencyKey: text("idempotency_key"),
    sku: text("sku")
      .notNull()
      .references(() => products.sku),
    status: orderStatusEnum("status").notNull().default("created"),
    baseAmount: integer("base_amount").notNull(),
    discountAmount: integer("discount_amount").notNull().default(0),
    finalAmount: integer("final_amount").notNull(),
    currency: text("currency").notNull().default("RUB"),
    promoCode: text("promo_code"),
    deliveredCode: text("delivered_code"),
    paidAt: timestamp("paid_at"),
    deliveredAt: timestamp("delivered_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_external_order_id_uniq").on(table.externalOrderId),
    uniqueIndex("orders_idempotency_key_uniq").on(table.idempotencyKey),
  ],
)

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    eventId: text("event_id").notNull(),
    orderExternalId: text("order_external_id").notNull(),
    status: paymentStatusEnum("status").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    payload: jsonb("payload").notNull(),
    isApplied: boolean("is_applied").notNull().default(false),
    appliedAt: timestamp("applied_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("payment_events_event_id_uniq").on(table.eventId)],
)

export const licenseKeys = pgTable(
  "license_keys",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    sku: text("sku").notNull(),
    code: text("code").notNull(),
    allocatedToOrderId: uuid("allocated_to_order_id").references(
      () => orders.id,
    ),
    allocatedAt: timestamp("allocated_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("license_keys_code_uniq").on(table.code),
    uniqueIndex("license_keys_allocated_order_uniq").on(
      table.allocatedToOrderId,
    ),
  ],
)

export const providerRequests = pgTable(
  "provider_requests",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    requestId: text("request_id").notNull(),
    provider: text("provider").notNull(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    sku: text("sku").notNull(),
    status: providerRequestStatusEnum("status").notNull(),
    code: text("code"),
    reason: text("reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("provider_requests_request_id_uniq").on(table.requestId),
  ],
)

export const deliveries = pgTable(
  "deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    requestId: text("request_id").notNull(),
    provider: text("provider").notNull(),
    status: text("status").notNull(),
    code: text("code"),
    reason: text("reason"),
    attempt: integer("attempt").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("deliveries_request_id_uniq").on(table.requestId),
    uniqueIndex("deliveries_order_attempt_uniq").on(
      table.orderId,
      table.attempt,
    ),
  ],
)

export const promoCodes = pgTable("promo_codes", {
  code: text("code").primaryKey().notNull(),
  type: promoTypeEnum("type").notNull(),
  value: integer("value").notNull(),
  currency: text("currency"),
  maxUses: integer("max_uses").notNull(),
  usedCount: integer("used_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const promoUses = pgTable(
  "promo_uses",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    promoCode: text("promo_code")
      .notNull()
      .references(() => promoCodes.code),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    discountAmount: integer("discount_amount").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("promo_uses_order_id_uniq").on(table.orderId),
    uniqueIndex("promo_uses_code_order_uniq").on(
      table.promoCode,
      table.orderId,
    ),
  ],
)

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    sku: text("sku").notNull(),
    licenseKeyId: uuid("license_key_id")
      .notNull()
      .references(() => licenseKeys.id),
    status: reservationStatusEnum("status").notNull().default("active"),
    reservedAt: timestamp("reserved_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    consumedAt: timestamp("consumed_at"),
    expiredAt: timestamp("expired_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("reservations_order_id_uniq").on(table.orderId),
    uniqueIndex("reservations_license_key_uniq").on(table.licenseKeyId),
  ],
)

export type ProductSchemaSelect = InferSelectModel<typeof products>
export type ProductSchemaInsert = InferInsertModel<typeof products>

export type OrderSchemaSelect = InferSelectModel<typeof orders>
export type OrderSchemaInsert = InferInsertModel<typeof orders>

export type PaymentEventSchemaSelect = InferSelectModel<typeof paymentEvents>
export type PaymentEventSchemaInsert = InferInsertModel<typeof paymentEvents>

export type LicenseKeySchemaSelect = InferSelectModel<typeof licenseKeys>
export type LicenseKeySchemaInsert = InferInsertModel<typeof licenseKeys>

export type ProviderRequestSchemaSelect = InferSelectModel<
  typeof providerRequests
>
export type ProviderRequestSchemaInsert = InferInsertModel<
  typeof providerRequests
>

export type DeliverySchemaSelect = InferSelectModel<typeof deliveries>
export type DeliverySchemaInsert = InferInsertModel<typeof deliveries>

export type PromoCodeSchemaSelect = InferSelectModel<typeof promoCodes>
export type PromoCodeSchemaInsert = InferInsertModel<typeof promoCodes>

export type PromoUseSchemaSelect = InferSelectModel<typeof promoUses>
export type PromoUseSchemaInsert = InferInsertModel<typeof promoUses>

export type ReservationSchemaSelect = InferSelectModel<typeof reservations>
export type ReservationSchemaInsert = InferInsertModel<typeof reservations>
