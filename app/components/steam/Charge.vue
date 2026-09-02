<script setup lang="ts">
const steamLogin = ref<string>("")
const amount = ref<number>(500)
const selectedCurrency = ref<"$" | "₸" | "₽">("$")
const promoCode = ref<string>("")
const processingPayment = ref(false)
const paymentError = ref("")

type CreateOrderResponse = {
  ok: boolean
  order: {
    externalOrderId: string
    finalAmount: number
    currency: string
  }
}

const amountToSku: Record<number, string> = {
  500: "STEAM-TOPUP-500",
  1000: "STEAM-TOPUP-1000",
  2500: "STEAM-TOPUP-2500",
}

function resolveSku() {
  return amountToSku[amount.value]
}

async function handlePress() {
  if (processingPayment.value) {
    return
  }

  paymentError.value = ""

  const sku = resolveSku()
  if (!sku) {
    paymentError.value = "Для оплаты доступны суммы: 500, 1000 или 2500"
    return
  }

  processingPayment.value = true

  let orderId = ""

  try {
    const idempotencyKey = `steam_${sku}_${crypto.randomUUID()}`
    const createResult = await $fetch<CreateOrderResponse>(
      "/api/orders/create",
      {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
        body: {
          sku,
          promoCode: promoCode.value || undefined,
        },
      },
    )

    orderId = createResult.order.externalOrderId

    await $fetch("/api/payments/simulate", {
      method: "POST",
      body: {
        order_id: orderId,
        status: "paid",
        amount: createResult.order.finalAmount,
        currency: createResult.order.currency,
      },
    })

    await navigateTo(`/order/${orderId}`)
  } catch (error: any) {
    if (orderId) {
      await navigateTo(`/order/${orderId}`)
      return
    }

    paymentError.value =
      error?.statusCode === 409
        ? "Промокод исчерпан или недоступен"
        : "Не удалось запустить оплату. Проверьте API и базу данных"
  } finally {
    processingPayment.value = false
  }
}
</script>

<template>
  <div class="flex flex-col self-stretch gap-2">
    <div class="flex items-center self-stretch gap-4">
      <SteamPromo v-model="promoCode" />

      <SteamLogin v-model="steamLogin" />

      <SteamAmount
        v-model:amount="amount"
        v-model:currency="selectedCurrency"
      />

      <button
        :disabled="processingPayment"
        class="flex w-[220px] shrink-0 items-center justify-center bg-black text-left py-[18px] px-[35px] rounded-xl border-0 hover:opacity-80 transition-opacity duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        @click="handlePress"
      >
        <span class="text-white text-base font-bold whitespace-nowrap">
          {{
            processingPayment
              ? "Обработка..."
              : `Оплатить ${amount || "0"}${selectedCurrency}`
          }}
        </span>
      </button>
    </div>

    <p v-if="paymentError" class="text-sm text-red-600">{{ paymentError }}</p>
  </div>
</template>
