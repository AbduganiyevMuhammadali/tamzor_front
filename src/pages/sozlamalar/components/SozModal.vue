<script setup lang="ts">
defineProps<{
  title: string
  show: boolean
  width?: string
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="soz-modal">
      <div v-if="show" class="soz-overlay" @click.self="emit('close')">
        <div class="soz-modal" :style="width ? {maxWidth: width} : {}">
          <div class="soz-modal-hd">
            <span class="soz-modal-title">{{ title }}</span>
            <button class="soz-modal-close" @click="emit('close')">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          <div class="soz-modal-body">
            <slot/>
          </div>
          <div v-if="$slots.footer" class="soz-modal-ft">
            <slot name="footer"/>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.soz-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); backdrop-filter:blur(3px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px; }
.soz-modal { background:var(--card-bg); border:1px solid var(--card-border); border-radius:18px; width:100%; max-width:560px; box-shadow:0 20px 60px rgba(0,0,0,.18); display:flex; flex-direction:column; max-height:90vh; }
.soz-modal-hd { display:flex; align-items:center; justify-content:space-between; padding:20px 24px 0; flex-shrink:0; }
.soz-modal-title { font-size:16px; font-weight:700; color:var(--title); }
.soz-modal-close { width:32px; height:32px; border-radius:8px; border:1px solid var(--card-border); background:var(--mini-bg); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:.12s; color:var(--muted); }
.soz-modal-close:hover { background:rgba(239,68,68,.1); color:#ef4444; border-color:rgba(239,68,68,.25); }
.soz-modal-close svg { width:14px; height:14px; }
.soz-modal-body { padding:20px 24px; overflow-y:auto; flex:1; }
.soz-modal-ft { padding:16px 24px 20px; border-top:1px solid var(--card-border); display:flex; justify-content:flex-end; gap:8px; flex-shrink:0; }

/* Transitions */
.soz-modal-enter-active, .soz-modal-leave-active { transition:.2s ease; }
.soz-modal-enter-active .soz-modal, .soz-modal-leave-active .soz-modal { transition:.2s ease; }
.soz-modal-enter-from, .soz-modal-leave-to { opacity:0; }
.soz-modal-enter-from .soz-modal, .soz-modal-leave-to .soz-modal { transform:scale(.95) translateY(10px); }
</style>
