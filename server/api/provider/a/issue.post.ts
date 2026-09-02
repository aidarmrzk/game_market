import { issueFromProviderA } from "~~/server/services/providers/providerA"

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    request_id?: string
    sku?: string
    order_id?: string
  }>(event)

  if (!body?.request_id || !body?.sku || !body?.order_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "request_id, sku, order_id are required",
    })
  }

  const result = await issueFromProviderA({
    requestId: body.request_id,
    sku: body.sku,
    orderId: body.order_id,
  })

  return {
    status: "ok",
    request_id: result.requestId,
    code: result.code,
  }
})
