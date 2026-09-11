import { eq, sql } from "drizzle-orm"
import { db } from "~~/server/db"
import { orders, products, promoUses } from "~~/server/db/schema"
import { ensureSeedData } from "~~/server/services/bootstrap"
import { reservePromoAndCalculateDiscount } from "~~/server/services/pricing"
import { reconcilePaymentEvents } from "~~/server/services/payments"
import {
  expireStaleReservations,
  getReservationForOrder,
  reserveKeyForOrder,
} from "~~/server/services/reservations"

export async function createOrder(input: {
  sku: string
  promoCode?: string
  externalOrderId?: string
  idempotencyKey?: string
}) {
  await ensureSeedData()

  const idempotencyKey = input.idempotencyKey?.trim() || undefined

  const created = await db.transaction(async (tx) => {
    if (idempotencyKey) {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${idempotencyKey}))`,
      )

      const existingByIdempotency = await tx.query.orders.findFirst({
        where: eq(orders.idempotencyKey, idempotencyKey),
      })

      if (existingByIdempotency) {
        return existingByIdempotency
      }
    }

    const product = await tx.query.products.findFirst({
      where: eq(products.sku, input.sku),
    })

    if (!product) {
      throw createError({ statusCode: 404, statusMessage: "Product not found" })
    }

    const promoResult = await reservePromoAndCalculateDiscount(
      tx,
      input.promoCode?.trim() || undefined,
      product.price,
      product.currency,
    )

    const finalAmount = product.price - promoResult.discountAmount

    const [order] = await tx
      .insert(orders)
      .values({
        externalOrderId:
          input.externalOrderId?.trim() ||
          `ord_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        idempotencyKey,
        sku: product.sku,
        status: "created",
        baseAmount: product.price,
        discountAmount: promoResult.discountAmount,
        finalAmount,
        currency: product.currency,
        promoCode: promoResult.promoCode,
      })
      .returning()

    if (!order) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create order",
      })
    }

    if (promoResult.promoCode) {
      await tx.insert(promoUses).values({
        promoCode: promoResult.promoCode,
        orderId: order.id,
        discountAmount: promoResult.discountAmount,
      })
    }

    await reserveKeyForOrder(order.id, order.sku, tx)

    return order
  })

  await reconcilePaymentEvents(created.externalOrderId)

  return created
}

export async function getOrderByExternalId(orderExternalId: string) {
  await ensureSeedData()

  return db.query.orders.findFirst({
    where: eq(orders.externalOrderId, orderExternalId),
  })
}

export async function getOrderSnapshotByExternalId(orderExternalId: string) {
  await ensureSeedData()
  await expireStaleReservations()

  const order = await db.query.orders.findFirst({
    where: eq(orders.externalOrderId, orderExternalId),
  })

  if (!order) {
    return null
  }

  const reservation = await getReservationForOrder(order.id)

  return {
    order,
    reservation,
  }
}

export async function listProducts() {
  await ensureSeedData()
  await expireStaleReservations()

  const rows = await db.execute<{
    sku: string
    name: string
    type: string
    price: number
    currency: string
    image: string
    available: number
  }>(sql`
    select
      p.sku,
      p.name,
      p.type,
      p.price,
      p.currency,
      p.image,
      greatest(0, coalesce(free.total, 0) - coalesce(resv.total, 0))::int as available
    from ${products} p
    left join (
      select sku, count(*)::int as total
      from license_keys
      where allocated_to_order_id is null
      group by sku
    ) free on free.sku = p.sku
    left join (
      select sku, count(*)::int as total
      from reservations
      where status = 'active' and expires_at > now()
      group by sku
    ) resv on resv.sku = p.sku
    order by p.created_at asc
  `)

  return rows.rows
}
