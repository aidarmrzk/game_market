<script setup lang="ts">
import profileIcon from "~/assets/images/charge/profile.svg"
import infoIcon from "~/assets/images/charge/info.svg"

const steamLogin = defineModel<string>({ default: "" })
</script>

<template>
  <div
    class="flex flex-1 items-center bg-[#F4F5F7] py-[19px] px-5 gap-[1px] rounded-xl"
  >
    <div class="flex flex-1 items-center">
      <div class="flex flex-col shrink-0 items-start pr-[11px]">
        <img :src="profileIcon" class="w-5 h-5 object-fill" />
      </div>
      <div class="flex flex-1 flex-col items-start py-[3px]">
        <input
          v-model="steamLogin"
          type="text"
          placeholder="Логин Steam"
          class="w-full bg-transparent text-[#363636] text-[15px] font-bold placeholder:text-[#8A94A6] outline-none"
        />
      </div>
    </div>
    <div class="flex flex-col shrink-0 items-start px-2">
      <img :src="infoIcon" />
    </div>
  </div>
</template>
