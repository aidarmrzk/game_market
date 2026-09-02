<script setup lang="ts">
import favoriteIcon from "~/assets/images/header/favorite.svg"
import searchIcon from "~/assets/images/header/search.svg"

const modelValue = defineModel<string>({ default: "" })
</script>

<template>
  <div
    class="flex shrink-0 items-center bg-black p-0.5 mr-20 gap-3 rounded-[10px] pr-3"
  >
    <div
      class="flex shrink-0 items-center bg-white py-1 pl-[13px] pr-1 rounded-lg"
    >
      <input
        v-model="modelValue"
        type="text"
        placeholder="Игра, приложение или услуга..."
        class="w-[403px] text-[#75829B] text-xs font-bold placeholder:text-[#75829B] bg-transparent border-0 p-0 focus:outline-none"
      />
      <div
        class="flex justify-center shrink-0 items-center bg-[#EFF1F5] w-8 h-8 rounded-m d cursor-pointer"
      >
        <img :src="favoriteIcon" />
      </div>
    </div>

    <img :src="searchIcon" class="w-5 h-5 cursor-pointer" />
  </div>
</template>
