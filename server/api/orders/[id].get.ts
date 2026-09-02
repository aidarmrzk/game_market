import { getOrderByExternalId } from "~~/server/services/orders"

export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, "id")

  if (!orderId) {
    throw createError({
      statusCode: 400,
      statusMessage: "order id is required",
    })
  }

  const order = await getOrderByExternalId(orderId)

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: "Order not found" })
  }

  return {
    ok: true,
    order,
  }
})
