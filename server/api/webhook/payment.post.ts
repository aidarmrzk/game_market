import {
  applyPaymentEvent,
  recordPaymentEvent,
} from "~~/server/services/payments"
import type { PaymentWebhookPayload } from "~~/server/services/types"

export default defineEventHandler(async (event) => {
  const body = await readBody<PaymentWebhookPayload>(event)

  if (!body?.event_id || !body?.order_id || !body?.status) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid webhook payload",
    })
  }

  if (body.status !== "paid" && body.status !== "failed") {
    throw createError({ statusCode: 400, statusMessage: "Unsupported status" })
  }

  const recording = await recordPaymentEvent(body)

  if (!recording.inserted) {
    return {
      ok: true,
      deduplicated: true,
      event_id: body.event_id,
    }
  }

  const outcome = await applyPaymentEvent(body.event_id)

  return {
    ok: true,
    event_id: body.event_id,
    outcome: outcome.kind,
    deferred: outcome.kind === "orphan",
    expected_amount:
      "expectedAmount" in outcome ? outcome.expectedAmount : undefined,
    expected_currency:
      "expectedCurrency" in outcome ? outcome.expectedCurrency : undefined,
  }
})
