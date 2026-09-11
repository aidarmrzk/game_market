export default defineEventHandler(async (event) => {
  const body = await readBody<{
    order_id?: string
    status?: "paid" | "failed"
    amount?: number
    currency?: string
    event_id?: string
  }>(event)

  if (!body?.order_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "order_id is required",
    })
  }

  const payload = {
    event_id:
      body.event_id ||
      `evt_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    order_id: body.order_id,
    status: body.status || "paid",
    amount: body.amount ?? 0,
    currency: body.currency ?? "RUB",
    created_at: new Date().toISOString(),
  }

  const baseURL = getRequestURL(event).origin
  const response = await $fetch<{
    ok: boolean
    outcome?: string
    expected_amount?: number
    expected_currency?: string
  }>(`${baseURL}/api/webhook/payment`, {
    method: "POST",
    body: payload,
  })

  if (response.outcome === "price_changed") {
    throw createError({
      statusCode: 409,
      statusMessage: "Price changed",
      data: {
        code: "PRICE_CHANGED",
        message: "Цена изменилась. Подтвердите оплату по новой сумме.",
        expectedAmount: response.expected_amount,
        expectedCurrency: response.expected_currency,
      },
    })
  }

  return {
    ok: true,
    webhook_response: response,
    payload,
  }
})
