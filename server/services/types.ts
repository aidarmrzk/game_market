export type PaymentWebhookPayload = {
  event_id: string
  order_id: string
  status: "paid" | "failed"
  amount: number
  currency: string
  created_at: string
}

export type ProviderIssueRequest = {
  requestId: string
  sku: string
  orderId: string
}

export type ProviderIssueResult = {
  status: "ok"
  requestId: string
  code: string
}
