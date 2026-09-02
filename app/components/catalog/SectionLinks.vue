<script setup lang="ts">
type Props = {
  title: string
  items: string[]
}

defineProps<Props>()

import chevronIcon from "~/assets/images/header/chevron.svg"
</script>

<template>
  <div class="flex flex-col self-stretch bg-[#00000000] gap-4">
    <div
      class="flex items-center self-stretch bg-[#00000000] gap-2 cursor-pointer transition-opacity duration-200 hover:opacity-90"
    >
      <span class="text-[#1A1A1A] text-base font-bold">
        {{ title }}
      </span>
      <img :src="chevronIcon" class="w-1.5 h-2.5 object-fill" />
    </div>
    <div class="flex flex-col items-start self-stretch bg-[#00000000] gap-3">
      <span
        v-for="item in items"
        :key="item"
        class="text-gray-600 text-sm cursor-pointer transition-colors duration-200 hover:text-[#1A1A1A]"
      >
        {{ item }}
      </span>
    </div>
  </div>
</template>
