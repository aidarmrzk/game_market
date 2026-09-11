import { and, eq, isNull, lte, sql } from "drizzle-orm"
import { db } from "~~/server/db"
import { licenseKeys, orders, reservations } from "~~/server/db/schema"

const DEFAULT_RESERVATION_TTL_MS = 5 * 60 * 1000

function reservationTtlMs() {
  const raw = Number(
    process.env.ORDER_RESERVATION_TTL_MS ?? DEFAULT_RESERVATION_TTL_MS,
  )
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_RESERVATION_TTL_MS
  }
  return raw
}

export function calculateReservationExpiry(from = new Date()) {
  return new Date(from.getTime() + reservationTtlMs())
}

export async function reserveKeyForOrder(
  orderId: string,
  sku: string,
  tx?: any,
) {
  const executor = tx ?? db

  const existing = await executor.query.reservations.findFirst({
    where: eq(reservations.orderId, orderId),
  })

  if (
    existing &&
    existing.status === "active" &&
    existing.expiresAt.getTime() > Date.now()
  ) {
    return existing
  }

  if (existing && existing.status === "consumed") {
    return existing
  }

  if (existing && existing.status === "expired") {
    throw createError({
      statusCode: 409,
      statusMessage: "Reservation expired",
      data: {
        code: "RESERVATION_EXPIRED",
      },
    })
  }

  const expiresAt = calculateReservationExpiry()

  const picked = await executor.execute<{ id: string }>(sql`
    with picked as (
      select lk.id
      from ${licenseKeys} lk
      where lk.sku = ${sku}
        and lk.allocated_to_order_id is null
        and not exists (
          select 1
          from ${reservations} r
          where r.license_key_id = lk.id
            and r.status = 'active'
            and r.expires_at > now()
        )
      order by lk.created_at
      limit 1
      for update skip locked
    )
    insert into ${reservations} (order_id, sku, license_key_id, status, expires_at, updated_at)
    select ${orderId}, ${sku}, picked.id, 'active', ${expiresAt}, now()
    from picked
    returning id
  `)

  const reservationId = picked.rows[0]?.id
  if (!reservationId) {
    throw createError({
      statusCode: 409,
      statusMessage: "Item just sold out",
      data: {
        code: "SOLD_OUT_RACE",
        message:
          "Товар только что раскупили. Выберите другого продавца или вернитесь к товару.",
      },
    })
  }

  await executor
    .update(orders)
    .set({ updatedAt: new Date() })
    .where(eq(orders.id, orderId))

  const created = await executor.query.reservations.findFirst({
    where: eq(reservations.id, reservationId),
  })

  if (!created) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load reservation",
    })
  }

  return created
}

export async function consumeReservationForOrder(orderId: string, tx?: any) {
  const executor = tx ?? db

  const rows = await executor.execute<{
    id: string
    license_key_id: string
    status: string
    expires_at: Date | string
  }>(
    sql`select id, license_key_id, status, expires_at from ${reservations} where order_id = ${orderId} for update`,
  )

  const reservation = rows.rows[0]
  if (!reservation) {
    throw createError({ statusCode: 409, statusMessage: "Missing reservation" })
  }

  const expiresAt =
    reservation.expires_at instanceof Date
      ? reservation.expires_at
      : new Date(reservation.expires_at)

  if (reservation.status === "expired" || expiresAt.getTime() <= Date.now()) {
    await executor
      .update(reservations)
      .set({ status: "expired", expiredAt: new Date(), updatedAt: new Date() })
      .where(eq(reservations.id, reservation.id))

    throw createError({
      statusCode: 409,
      statusMessage: "Reservation expired",
      data: {
        code: "RESERVATION_EXPIRED",
      },
    })
  }

  if (reservation.status === "consumed") {
    return
  }

  await executor.execute(sql`
    update ${licenseKeys}
    set allocated_to_order_id = ${orderId}, allocated_at = now()
    where id = ${reservation.license_key_id}
      and allocated_to_order_id is null
  `)

  await executor
    .update(reservations)
    .set({ status: "consumed", consumedAt: new Date(), updatedAt: new Date() })
    .where(eq(reservations.id, reservation.id))
}

export async function getReservationForOrder(orderId: string) {
  return db.query.reservations.findFirst({
    where: eq(reservations.orderId, orderId),
  })
}

export async function expireStaleReservations(now = new Date()) {
  const expired = await db
    .update(reservations)
    .set({ status: "expired", expiredAt: now, updatedAt: now })
    .where(
      and(eq(reservations.status, "active"), lte(reservations.expiresAt, now)),
    )
    .returning({ id: reservations.id })

  return {
    expired: expired.length,
  }
}

export async function getAvailableStockBySku(sku: string) {
  const [availableRows, reservedRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(licenseKeys)
      .where(
        and(eq(licenseKeys.sku, sku), isNull(licenseKeys.allocatedToOrderId)),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservations)
      .where(
        and(
          eq(reservations.sku, sku),
          eq(reservations.status, "active"),
          sql`${reservations.expiresAt} > now()`,
        ),
      ),
  ])

  const totalFree = Number(availableRows[0]?.count ?? 0)
  const reserved = Number(reservedRows[0]?.count ?? 0)
  return Math.max(0, totalFree - reserved)
}
