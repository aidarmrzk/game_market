export const testPromocodes = [
  {
    code: "WELCOME10",
    type: "percent",
    value: 10,
    maxUses: 100,
    currency: null,
  },
  { code: "GG500", type: "amount", value: 500, maxUses: 20, currency: "RUB" },
  { code: "LIMIT3", type: "percent", value: 25, maxUses: 3, currency: null },
  { code: "ONCEONLY", type: "percent", value: 50, maxUses: 1, currency: null },
] as const
