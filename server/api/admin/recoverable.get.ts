import { listRecoverableOrders } from "~~/server/services/issuer"

export default defineEventHandler(async () => {
  const orders = await listRecoverableOrders()

  return {
    ok: true,
    orders,
  }
})
