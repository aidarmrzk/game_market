<script setup lang="ts">
interface Props {
  label: string
  icon: string
  isSelected?: boolean
  isDefault?: boolean
}

defineProps<Props>()
</script>

<template>
  <div
    class="group flex flex-1 flex-col gap-2 items-center w-[76px] cursor-pointer"
  >
    <button
      class="flex flex-col items-center justify-center self-stretch text-left rounded-2xl w-[76px] h-[76px] transition-all duration-300 ease-out cursor-pointer"
      :class="[
        isDefault
          ? 'bg-[#F2F4F7] border-2 border-solid border-[#DEE5EE] group-hover:-translate-y-0.5 group-hover:shadow-[0px_8px_20px_rgba(17,18,21,0.1)] group-hover:border-[#C9D2E0]'
          : 'border-0',
        !isDefault &&
          !isSelected &&
          'group-hover:-translate-y-0.5 group-hover:shadow-[0px_8px_20px_rgba(17,18,21,0.16)] group-hover:ring-2 group-hover:ring-[#1112151A]',
        isSelected && 'bg-black shadow-[0px_4px_8px_#D1D8E4]',
      ]"
    >
      <img
        :src="icon"
        class="rounded-2xl object-fill transition-transform duration-300 ease-out"
        :class="[
          !isDefault && 'w-[72px] h-[72px]',
          !isSelected && 'group-hover:scale-[1.03]',
        ]"
      />
    </button>

    <div class="relative h-[24px] w-full">
      <span
        class="absolute text-base font-bold whitespace-nowrap text-center left-1/2 -translate-x-1/2 transition-colors duration-300"
        :class="[
          isDefault ? 'text-[#8A94A6]' : 'text-[#363636]',
          !isDefault && !isSelected && 'group-hover:text-black',
          !isDefault && isSelected && 'text-black',
        ]"
      >
        {{ label }}
      </span>
    </div>
  </div>
</template>
