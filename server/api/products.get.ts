import { listProducts } from "~~/server/services/orders"

export default defineEventHandler(async () => {
  const products = await listProducts()

  return {
    ok: true,
    products,
  }
})
