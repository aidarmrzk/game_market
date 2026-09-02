import { retryIssueFromAdmin } from "~~/server/services/issuer"
import { getOrderByExternalId } from "~~/server/services/orders"

export default defineEventHandler(async (event) => {
  const body = await readBody<{ order_id?: string; maxAttempts?: number }>(
    event,
  )

  if (!body?.order_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "order_id is required",
    })
  }

  const order = await getOrderByExternalId(body.order_id)
  if (!order) {
    throw createError({ statusCode: 404, statusMessage: "Order not found" })
  }

  const result = await retryIssueFromAdmin(order.id, body.maxAttempts ?? 5)

  return {
    ok: true,
    result,
  }
})
