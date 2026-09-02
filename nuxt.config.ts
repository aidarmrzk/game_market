import tailwindcss from "@tailwindcss/vite"

export default defineNuxtConfig({
  compatibilityDate: "2025-09-15",
  devtools: { enabled: true },
  vite: {
    plugins: [tailwindcss()],
  },
  css: ["~/assets/css/main.css"],
  modules: ["@nuxt/fonts", "@nuxt/image", "@nuxt/icon"],
  fonts: {
    families: [{ name: "Montserrat", provider: "google" }],
  },
  app: {
    head: {
      htmlAttrs: { lang: "ru" },
      title: "GG Store Test - Fullstack",
      meta: [
        {
          name: "description",
          content:
            "Тестовый fullstack-магазин цифровых товаров с идемпотентной выдачей.",
        },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
    },
  },
  runtimeConfig: {
    postgresUrl: process.env.POSTGRES_URL,
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || "http://localhost:3000",
    },
  },
})
