import { and, asc, eq, sql } from "drizzle-orm"
import { db } from "~~/server/db"
import { deliveries, orders } from "~~/server/db/schema"
import { issueFromProviderA } from "~~/server/services/providers/providerA"
import { issueFromProviderB } from "~~/server/services/providers/providerB"
import { consumeReservationForOrder } from "~~/server/services/reservations"
import {
  ProviderFailureError,
  ProviderOutOfStockError,
  ProviderTimeoutError,
} from "~~/server/services/providers/errors"

type IssueResult = {
  status:
    | "delivered"
    | "already_delivered"
    | "not_ready"
    | "out_of_stock"
    | "delivery_failed"
  code?: string
}

export type AdminRetryResult = {
  status: IssueResult["status"]
  code?: string
  attemptsUsed: number
}

export async function issueOrder(orderId: string): Promise<IssueResult> {
  return db.transaction(async (tx) => {
    const rows = await tx.execute<{
      id: string
      external_order_id: string
      sku: string
      status: string
      delivered_code: string | null
    }>(
      sql`select id, external_order_id, sku, status, delivered_code from ${orders} where id = ${orderId} for update`,
    )

    const orderRow = rows.rows[0]
    if (!orderRow) {
      throw createError({ statusCode: 404, statusMessage: "Order not found" })
    }

    if (orderRow.status === "delivered" && orderRow.delivered_code) {
      return {
        status: "already_delivered",
        code: orderRow.delivered_code,
      } satisfies IssueResult
    }

    const allowed = ["paid", "delivering", "out_of_stock", "delivery_failed"]
    if (!allowed.includes(orderRow.status)) {
      return { status: "not_ready" } satisfies IssueResult
    }

    const attemptsResult = await tx
      .select({ id: deliveries.id })
      .from(deliveries)
      .where(eq(deliveries.orderId, orderId))

    const attempt = attemptsResult.length + 1

    await tx
      .update(orders)
      .set({
        status: "delivering",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))

    try {
      await consumeReservationForOrder(orderId, tx)
    } catch {
      await tx
        .update(orders)
        .set({
          status: "out_of_stock",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))

      await tx.insert(deliveries).values({
        orderId,
        requestId: `req_${orderRow.external_order_id}-${attempt}-reservation`,
        provider: "reservation",
        status: "out_of_stock",
        reason: "reservation_expired",
        attempt,
      })

      return { status: "out_of_stock" } satisfies IssueResult
    }

    const requestA = `req_${orderRow.external_order_id}-${attempt}-a`
    const requestB = `req_${orderRow.external_order_id}-${attempt}-b`

    let issuedCode: string | null = null
    let providerUsed = "providerA"
    let failureReason = "provider_error"

    try {
      const first = await issueFromProviderA(
        {
          requestId: requestA,
          sku: orderRow.sku,
          orderId,
        },
        tx,
      )
      issuedCode = first.code
    } catch (error) {
      if (error instanceof ProviderTimeoutError) {
        try {
          const retry = await issueFromProviderA(
            {
              requestId: requestA,
              sku: orderRow.sku,
              orderId,
            },
            tx,
          )
          issuedCode = retry.code
        } catch (retryError) {
          error = retryError
        }
      }

      if (
        !issuedCode &&
        (error instanceof ProviderFailureError ||
          error instanceof ProviderOutOfStockError)
      ) {
        providerUsed = "providerB"
        failureReason =
          error instanceof ProviderOutOfStockError
            ? "out_of_stock"
            : "provider_error"
        try {
          const fallback = await issueFromProviderB(
            {
              requestId: requestB,
              sku: orderRow.sku,
              orderId,
            },
            tx,
          )
          issuedCode = fallback.code
        } catch (fallbackError) {
          if (fallbackError instanceof ProviderTimeoutError) {
            try {
              const retry = await issueFromProviderB(
                {
                  requestId: requestB,
                  sku: orderRow.sku,
                  orderId,
                },
                tx,
              )
              issuedCode = retry.code
            } catch (retryFallbackError) {
              failureReason =
                retryFallbackError instanceof ProviderOutOfStockError
                  ? "out_of_stock"
                  : "provider_error"
            }
          } else {
            failureReason =
              fallbackError instanceof ProviderOutOfStockError
                ? "out_of_stock"
                : "provider_error"
          }
        }
      } else if (!issuedCode) {
        failureReason =
          error instanceof ProviderOutOfStockError
            ? "out_of_stock"
            : "provider_error"
      }
    }

    if (issuedCode) {
      await tx
        .update(orders)
        .set({
          status: "delivered",
          deliveredCode: issuedCode,
          deliveredAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))

      await tx.insert(deliveries).values({
        orderId,
        requestId: providerUsed === "providerA" ? requestA : requestB,
        provider: providerUsed,
        status: "delivered",
        code: issuedCode,
        attempt,
      })

      return { status: "delivered", code: issuedCode } satisfies IssueResult
    }

    const isOutOfStock = failureReason === "out_of_stock"

    await tx
      .update(orders)
      .set({
        status: isOutOfStock ? "out_of_stock" : "delivery_failed",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))

    await tx.insert(deliveries).values({
      orderId,
      requestId: providerUsed === "providerA" ? requestA : requestB,
      provider: providerUsed,
      status: isOutOfStock ? "out_of_stock" : "delivery_failed",
      reason: failureReason,
      attempt,
    })

    return {
      status: isOutOfStock ? "out_of_stock" : "delivery_failed",
    } satisfies IssueResult
  })
}

export async function listRecoverableOrders() {
  return db.query.orders.findMany({
    where: and(
      sql`${orders.status} in ('out_of_stock', 'delivery_failed', 'paid', 'delivering')`,
      sql`${orders.status} <> 'delivered'`,
    ),
    orderBy: [asc(orders.createdAt)],
  })
}

export async function retryIssueFromAdmin(
  orderId: string,
  maxAttempts = 5,
): Promise<AdminRetryResult> {
  const totalAttempts = Math.max(1, maxAttempts)
  let attemptsUsed = 0
  let lastResult: IssueResult = { status: "delivery_failed" }

  for (let attempt = 0; attempt < totalAttempts; attempt += 1) {
    attemptsUsed += 1
    lastResult = await issueOrder(orderId)

    if (
      lastResult.status === "delivered" ||
      lastResult.status === "already_delivered" ||
      lastResult.status === "out_of_stock" ||
      lastResult.status === "not_ready"
    ) {
      return {
        status: lastResult.status,
        code: lastResult.code,
        attemptsUsed,
      }
    }
  }

  return {
    status: lastResult.status,
    code: lastResult.code,
    attemptsUsed,
  }
}
