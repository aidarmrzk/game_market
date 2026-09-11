import { and, asc, eq, sql } from "drizzle-orm"
import { db } from "~~/server/db"
import { orders, paymentEvents, products } from "~~/server/db/schema"
import { issueOrder } from "~~/server/services/issuer"
import type { PaymentWebhookPayload } from "~~/server/services/types"

const PAYMENT_EVENT_ORDER = {
  missing: 0,
  invalid_date: 1,
} as const

function createdAtFromPayload(payload: PaymentWebhookPayload) {
  const createdAtMs = Date.parse(payload.created_at)
  if (Number.isNaN(createdAtMs)) {
    return PAYMENT_EVENT_ORDER.invalid_date
  }
  return createdAtMs
}

export async function recordPaymentEvent(payload: PaymentWebhookPayload) {
  const inserted = await db
    .insert(paymentEvents)
    .values({
      eventId: payload.event_id,
      orderExternalId: payload.order_id,
      status: payload.status,
      amount: payload.amount,
      currency: payload.currency,
      payload,
    })
    .onConflictDoNothing()
    .returning({ id: paymentEvents.id })

  if (!inserted[0]?.id) {
    return {
      inserted: false,
      eventId: payload.event_id,
    }
  }

  return {
    inserted: true,
    eventId: payload.event_id,
  }
}

export async function applyPaymentEvent(eventId: string) {
  const outcome = await db.transaction(async (tx) => {
    const eventRows = await tx.execute<{
      id: string
      status: "paid" | "failed"
      order_external_id: string
      is_applied: boolean
      amount: number
      currency: string
    }>(
      sql`select id, status, order_external_id, is_applied, amount, currency from ${paymentEvents} where event_id = ${eventId} for update`,
    )

    const event = eventRows.rows[0]
    if (!event) {
      return { shouldIssue: false, kind: "missing" as const }
    }

    if (event.is_applied) {
      return { shouldIssue: false, kind: "already_applied" as const }
    }

    const orderRows = await tx.execute<{
      id: string
      status: string
      sku: string
      discount_amount: number
      currency: string
    }>(
      sql`select id, status, sku, discount_amount, currency from ${orders} where external_order_id = ${event.order_external_id} for update`,
    )

    const order = orderRows.rows[0]
    if (!order) {
      return { shouldIssue: false, kind: "orphan" as const }
    }

    if (event.status === "failed") {
      if (order.status === "created") {
        await tx
          .update(orders)
          .set({ status: "payment_failed", updatedAt: new Date() })
          .where(eq(orders.id, order.id))
      }

      await tx
        .update(paymentEvents)
        .set({ isApplied: true, appliedAt: new Date() })
        .where(eq(paymentEvents.id, event.id))

      return {
        shouldIssue: false,
        kind: "payment_failed" as const,
        orderId: order.id,
      }
    }

    const productRows = await tx.execute<{ price: number; currency: string }>(
      sql`select price, currency from ${products} where sku = ${order.sku} for share`,
    )
    const product = productRows.rows[0]

    if (!product) {
      await tx
        .update(paymentEvents)
        .set({ isApplied: true, appliedAt: new Date() })
        .where(eq(paymentEvents.id, event.id))

      return {
        shouldIssue: false,
        kind: "ignored" as const,
        orderId: order.id,
      }
    }

    const expectedAmount = Math.max(
      0,
      Number(product.price) - Number(order.discount_amount || 0),
    )
    const expectedCurrency = product.currency || order.currency

    if (
      Number(event.amount) !== expectedAmount ||
      event.currency !== expectedCurrency
    ) {
      await tx
        .update(orders)
        .set({
          baseAmount: Number(product.price),
          finalAmount: expectedAmount,
          currency: expectedCurrency,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id))

      await tx
        .update(paymentEvents)
        .set({ isApplied: true, appliedAt: new Date() })
        .where(eq(paymentEvents.id, event.id))

      return {
        shouldIssue: false,
        kind: "price_changed" as const,
        orderId: order.id,
        expectedAmount,
        expectedCurrency,
      }
    }

    if (order.status === "created" || order.status === "payment_failed") {
      await tx
        .update(orders)
        .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
        .where(eq(orders.id, order.id))
    }

    const shouldIssue =
      order.status === "created" ||
      order.status === "paid" ||
      order.status === "payment_failed" ||
      order.status === "out_of_stock" ||
      order.status === "delivery_failed"

    await tx
      .update(paymentEvents)
      .set({ isApplied: true, appliedAt: new Date() })
      .where(eq(paymentEvents.id, event.id))

    return {
      shouldIssue,
      kind: shouldIssue ? ("paid" as const) : ("ignored" as const),
      orderId: order.id,
    }
  })

  if (outcome.shouldIssue && outcome.kind === "paid") {
    await issueOrder(outcome.orderId)
  }

  return outcome
}

export async function reconcilePaymentEvents(orderExternalId: string) {
  const rawPendingEvents = await db.query.paymentEvents.findMany({
    where: and(
      eq(paymentEvents.orderExternalId, orderExternalId),
      eq(paymentEvents.isApplied, false),
    ),
    orderBy: [asc(paymentEvents.createdAt)],
  })

  const pendingEvents = [...rawPendingEvents].sort((a, b) => {
    const aPayload = a.payload as PaymentWebhookPayload
    const bPayload = b.payload as PaymentWebhookPayload

    const aCreatedAt = aPayload?.created_at
      ? createdAtFromPayload(aPayload)
      : PAYMENT_EVENT_ORDER.missing
    const bCreatedAt = bPayload?.created_at
      ? createdAtFromPayload(bPayload)
      : PAYMENT_EVENT_ORDER.missing

    if (aCreatedAt !== bCreatedAt) {
      return aCreatedAt - bCreatedAt
    }

    return a.createdAt.getTime() - b.createdAt.getTime()
  })

  for (const paymentEvent of pendingEvents) {
    await applyPaymentEvent(paymentEvent.eventId)
  }
}
