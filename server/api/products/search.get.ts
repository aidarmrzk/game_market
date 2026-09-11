import { sql } from "drizzle-orm"
import { db } from "~~/server/db"
import { products } from "~~/server/db/schema"
import { ensureSeedData } from "~~/server/services/bootstrap"
import { expireStaleReservations } from "~~/server/services/reservations"

export default defineEventHandler(async (event) => {
  await ensureSeedData()
  await expireStaleReservations()

  const query = getQuery(event)
  const q = String(query.q ?? "")
    .trim()
    .toLowerCase()
  const type = String(query.type ?? "")
    .trim()
    .toLowerCase()
  const limitRaw = Number(query.limit ?? 24)
  const offsetRaw = Number(query.offset ?? 0)
  const limit = Number.isFinite(limitRaw)
    ? Math.min(100, Math.max(1, Math.floor(limitRaw)))
    : 24
  const offset = Number.isFinite(offsetRaw)
    ? Math.max(0, Math.floor(offsetRaw))
    : 0
  const qLike = `%${q}%`

  const whereClause = sql`
    (${type} = '' or lower(p.type) = ${type})
    and (${q} = '' or lower(p.sku || ' ' || p.name || ' ' || p.type) like ${qLike})
  `

  const [productsRows, totalRows] = await Promise.all([
    db.execute<{
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
      where ${whereClause}
      order by p.created_at asc
      limit ${limit}
      offset ${offset}
    `),
    db.execute<{ total: number }>(sql`
      select count(*)::int as total
      from ${products} p
      where ${whereClause}
    `),
  ])

  const total = Number(totalRows.rows[0]?.total ?? 0)

  return {
    ok: true,
    products: productsRows.rows,
    total,
    limit,
    offset,
  }
})
