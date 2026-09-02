<script setup lang="ts">
import ruIcon from "~/assets/images/charge/ru.svg"

const amount = defineModel<number>("amount", { default: 500 })
const selectedCurrency = defineModel<"$" | "₸" | "₽">("currency", {
  default: "$",
})
const currencies: Array<"$" | "₸" | "₽"> = ["$", "₸", "₽"]

function setCurrency(currency: "$" | "₸" | "₽") {
  selectedCurrency.value = currency
}

function onAmountInput(event: Event) {
  const target = event.target as HTMLInputElement
  amount.value = Number(target.value.replace(/\D+/g, ""))
}
</script>

<template>
  <div
    class="flex flex-1 justify-between items-center bg-[#F4F5F7] py-[13px] px-4 rounded-xl"
  >
    <div class="flex items-center w-[75px]">
      <div class="flex flex-col shrink-0 items-start pr-[11px]">
        <img :src="ruIcon" />
      </div>
      <div class="flex-1">
        <div class="flex flex-col items-start self-stretch">
          <span class="text-[#8A94A6] text-xs font-bold">Сумма</span>
        </div>
        <div class="flex flex-col items-start self-stretch pt-0.5">
          <input
            v-model="amount"
            type="text"
            inputmode="numeric"
            @input="onAmountInput"
            placeholder="0"
            class="w-full max-w-[90px] bg-transparent text-[#363636] text-lg font-bold outline-none"
          />
        </div>
      </div>
    </div>

    <div class="flex shrink-0 items-center pl-3 gap-1.5">
      <button
        v-for="currency in currencies"
        :key="currency"
        :class="[
          'flex flex-col shrink-0 items-start text-left py-1.5 rounded-lg border-0 cursor-pointer',
          currency === '₽' ? 'px-[11px]' : 'px-3',
          selectedCurrency === currency ? 'bg-black' : 'bg-[#E8EAED]',
        ]"
        @click="setCurrency(currency)"
      >
        <span
          :class="[
            'text-base font-bold',
            selectedCurrency === currency ? 'text-white' : 'text-[#8A94A6]',
          ]"
        >
          {{ currency }}
        </span>
      </button>
    </div>
  </div>
</template>
