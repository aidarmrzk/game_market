<script setup lang="ts">
import steamIcon from "~/assets/images/category/steam.svg"

const promoCode = defineModel<string>({ default: "" })

type PromoCodeOption = {
  code: string
  type: "percent" | "amount"
  value: number
  currency: string | null
  maxUses: number
  usedCount: number
  remainingUses: number
}

const { data } = await useFetch<{ ok: boolean; promocodes: PromoCodeOption[] }>(
  "/api/promocodes",
)

const promoOptions = computed(() => data.value?.promocodes ?? [])

function promoLabel(option: PromoCodeOption) {
  const discount =
    option.type === "percent"
      ? `${option.value}%`
      : `${option.value} ${option.currency ?? ""}`.trim()

  return `${option.code} (${discount})`
}
</script>

<template>
  <div class="flex items-center gap-3">
    <div class="flex flex-col shrink-0 items-start px-0.5 rounded-[14px]">
      <img :src="steamIcon" class="w-[72px] h-[72px] rounded-2xl object-fill" />
    </div>

    <div class="flex flex-1 flex-col items-start gap-1">
      <div class="flex items-center self-stretch gap-2">
        <div class="flex flex-1 flex-col items-start">
          <span
            class="text-[#363636] text-base font-bold whitespace-nowrap leading-[27px]"
          >
            Пополнение Steam
          </span>
        </div>
        <div
          class="flex flex-col shrink-0 items-start bg-[#6EB83F] py-1 px-2 rounded-[9999px]"
        >
          <span class="text-white text-[11px] font-bold">5%</span>
        </div>
      </div>
      <div
        class="flex items-center bg-[#268BF31A] text-left py-1.5 px-3 gap-1 rounded-lg cursor-pointer"
      >
        <select
          v-model="promoCode"
          class="w-full bg-transparent text-black text-xs font-bold border-0 outline-none pr-1 cursor-pointer"
        >
          <option value="" disabled class="bg-white text-[#8A94A6]">
            Ввести промокод
          </option>
          <option
            v-for="option in promoOptions"
            :key="option.code"
            :value="option.code"
            class="bg-white text-black"
          >
            {{ promoLabel(option) }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>
