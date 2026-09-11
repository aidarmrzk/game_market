import { getStockSnapshot } from "~~/server/services/stock"

export default defineEventHandler(async () => {
  const items = await getStockSnapshot()
  return {
    ok: true,
    items,
    ts: new Date().toISOString(),
  }
})
