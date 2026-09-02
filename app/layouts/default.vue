<template>
  <div class="min-h-screen bg-[#F4F5F7] text-foreground overflow-x-hidden">
    <div
      class="mx-auto w-full max-w-[1280px] bg-white border-b border-solid border-b-[#F2F4F7]"
    >
      <AppHeader />

      <main class="w-full pb-[60px]">
        <slot />
      </main>
    </div>
  </div>
</template>
