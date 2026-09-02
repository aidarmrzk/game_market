module.exports = {
  apps: [
    {
      name: "nuxt-db-template",
      script: "./.output/server/index.mjs",

      // exec_mode: "cluster",
      // instances: "max",

      exec_mode: "fork",
      instances: 1,

      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
}
