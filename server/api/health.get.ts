export default defineEventHandler(() => {
  return {
    ok: true,
    service: "nuxt-template",
    timestamp: new Date().toISOString(),
  }
})
