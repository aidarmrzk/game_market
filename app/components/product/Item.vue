<script setup lang="ts">
interface Props {
  imageUrl: string
  title: string
  price: string
  oldPrice: string
  canBuy?: boolean
  busy?: boolean
}
withDefaults(defineProps<Props>(), {
  canBuy: true,
  busy: false,
})

const emit = defineEmits<{
  buy: []
}>()
</script>

<template>
  <div
    class="group w-full bg-white rounded-2xl border border-transparent shadow-[0px_11.527974128723145px_24px_#1428501A] transition-all duration-250 ease-out hover:-translate-y-1 hover:border-[#cfd7e6] hover:shadow-[0px_18px_32px_rgba(20,40,80,0.18)] overflow-hidden"
  >
    <div class="flex flex-col items-start self-stretch">
      <img :src="imageUrl" class="w-[227px] h-[151px] object-fill" />
    </div>
    <div class="flex flex-col self-stretch p-[13px]">
      <div class="flex flex-col self-stretch mb-3">
        <span class="text-[#14181D] text-[10px] font-bold">{{ title }}</span>
      </div>
      <div class="flex items-center self-stretch mb-[11px] gap-2.5">
        <span class="text-[#4C9A2A] text-[19px] font-bold">{{ price }}</span>
        <span class="text-gray-400 text-[11px] font-bold line-through">
          {{ oldPrice }}
        </span>
      </div>

      <button
        :disabled="!canBuy || busy"
        class="flex flex-col items-center self-stretch bg-black text-left py-[13px] rounded-[11px] border-0 cursor-pointer hover:opacity-80 transition-opacity duration-250 ease-out disabled:opacity-60 disabled:cursor-not-allowed"
        @click="emit('buy')"
      >
        <span class="text-white text-xs font-bold">
          {{ busy ? "Обработка..." : "Купить" }}
        </span>
      </button>
    </div>
  </div>
</template>
