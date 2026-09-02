import { createOrder } from "~~/server/services/orders"

export default defineEventHandler(async (event) => {
  const idempotencyHeader = getHeader(event, "idempotency-key")

  const body = await readBody<{
    sku?: string
    promoCode?: string
    externalOrderId?: string
    idempotencyKey?: string
  }>(event)

  if (!body?.sku) {
    throw createError({ statusCode: 400, statusMessage: "sku is required" })
  }

  const order = await createOrder({
    sku: body.sku,
    promoCode: body.promoCode,
    externalOrderId: body.externalOrderId,
    idempotencyKey: idempotencyHeader || body.idempotencyKey,
  })

  return {
    ok: true,
    order,
  }
})
