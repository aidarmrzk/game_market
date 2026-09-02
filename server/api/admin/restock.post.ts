import { licenseKeys } from "~~/server/db/schema"
import { db } from "~~/server/db"

export default defineEventHandler(async (event) => {
  const body = await readBody<{ sku?: string; keys?: string[] }>(event)

  if (!body?.sku || !Array.isArray(body.keys) || body.keys.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "sku and non-empty keys[] are required",
    })
  }

  const inserted = await db
    .insert(licenseKeys)
    .values(body.keys.map((code) => ({ sku: body.sku!, code })))
    .onConflictDoNothing()
    .returning({ code: licenseKeys.code })

  return {
    ok: true,
    inserted: inserted.length,
  }
})
