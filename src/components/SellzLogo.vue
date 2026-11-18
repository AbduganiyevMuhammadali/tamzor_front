<script setup lang="ts">
/* Sellz brend belgisi: binafsha plitka, oq pin, ichida "S".
   Asl logo rasmidan o'lchab vektorlashtirilgan (viewBox = plitka, 544 birlik).
   Rangi — brend rangi #7C3AED; ilova aksent rangi (indigo) bilan almashtirilmasin.
   Xuddi shu belgi: public/favicon.svg, favicon.ico, apple-touch-icon.png. */
withDefaults(defineProps<{ size?: number | string }>(), { size: 32 })
</script>

<template>
  <svg class="sellz-logo" :width="size" :height="size" viewBox="0 0 544 544" aria-hidden="true" focusable="false">
    <rect width="544" height="544" rx="132" fill="#7C3AED"/>
    <path fill="#fff" d="M272 477C340.3 401.2 413 318 413 242A141 141 0 0 0 131 242C131 318 203.7 401.2 272 477Z"/>
    <path fill="none" stroke="#7C3AED" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"
      d="M325 180H242A24 24 0 0 0 218 204V218.5A24 24 0 0 0 242 242.5H301A24 24 0 0 1 325 266.5V281.5A24 24 0 0 1 301 305.5H218"/>
  </svg>
</template>

<style scoped>
.sellz-logo { display: block; flex-shrink: 0; }
</style>
