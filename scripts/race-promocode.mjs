import { Client } from "pg"

const baseUrl = process.env.BASE_URL || "http://localhost:3000"
const promoCode = process.env.PROMO || "LIMIT3"
const parallel = Number(process.env.PARALLEL || 20)
const sku = process.env.SKU || "KEY-CS2-PRIME"
const pgUrl = process.env.POSTGRES_URL

async function readPromoMetrics(code) {
  if (!pgUrl) {
    return null
  }

  const client = new Client({ connectionString: pgUrl })

  try {
    await client.connect()

    const promoRes = await client.query(
      `
        select code, max_uses::int as max_uses, used_count::int as used_count
        from promo_codes
        where code = $1
      `,
      [code],
    )

    const usesRes = await client.query(
      `
        select count(*)::int as promo_uses_count
        from promo_uses
        where promo_code = $1
      `,
      [code],
    )

    const promo = promoRes.rows[0]
    if (!promo) {
      return null
    }

    return {
      code: promo.code,
      max_uses: promo.max_uses,
      used_count: promo.used_count,
      promo_uses_count: usesRes.rows[0]?.promo_uses_count ?? 0,
      applied_not_more_than_limit:
        (usesRes.rows[0]?.promo_uses_count ?? 0) <= promo.max_uses,
    }
  } finally {
    await client.end()
  }
}

async function main() {
  const tasks = Array.from({ length: parallel }, async (_, index) => {
    try {
      const response = await fetch(`${baseUrl}/api/orders/create`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sku, promoCode }),
      })

      return {
        idx: index,
        ok: response.ok,
        status: response.status,
      }
    } catch {
      return {
        idx: index,
        ok: false,
        status: 0,
      }
    }
  })

  const results = await Promise.all(tasks)
  const applied = results.filter((item) => item.ok).length
  const statusBreakdown = results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {})
  const metrics = await readPromoMetrics(promoCode)

  console.log(
    JSON.stringify(
      {
        promoCode,
        attempted: parallel,
        applied,
        failed: parallel - applied,
        status_breakdown: statusBreakdown,
        metrics,
        details: results,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
