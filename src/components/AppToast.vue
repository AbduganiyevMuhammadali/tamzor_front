<template>
  <teleport to="body">
    <div class="toast-container">
      <transition-group name="toast-anim" tag="div" class="toast-list">
        <div
          v-for="t in toasts"
          :key="t.id"
          :class="['toast', `toast--${t.type}`]"
          @click="remove(t.id)"
        >
          <!-- Icon -->
          <div class="toast-icon">
            <!-- success -->
            <svg v-if="t.type==='success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <!-- error -->
            <svg v-else-if="t.type==='error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <!-- warning -->
            <svg v-else-if="t.type==='warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <!-- info -->
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>

          <!-- Body -->
          <div class="toast-body">
            <div class="toast-title">{{ t.title }}</div>
            <div v-if="t.message" class="toast-msg">{{ t.message }}</div>
          </div>

          <!-- Close -->
          <button class="toast-close" @click.stop="remove(t.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <!-- Progress bar -->
          <div class="toast-progress">
            <div class="toast-progress-fill" :style="{ animationDuration: t.duration + 'ms' }"/>
          </div>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup>
import { useToast } from '@/composables/useToast'
const { toasts, remove } = useToast()
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 99999;
  pointer-events: none;
  width: 360px;
}
.toast-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px 18px;
  border-radius: 16px;
  border: 1px solid;
  background: #fff;
  box-shadow: 0 8px 32px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06);
  cursor: pointer;
  pointer-events: all;
  overflow: hidden;
  transition: box-shadow .15s;
}
.toast:hover { box-shadow: 0 12px 40px rgba(0,0,0,.16); }

/* Types */
.toast--success { border-color: #bbf7d0; background: #f0fdf4; }
.toast--error   { border-color: #fecaca; background: #fef2f2; }
.toast--warning { border-color: #fde68a; background: #fffbeb; }
.toast--info    { border-color: #ddd6fe; background: #f5f3ff; }

/* Icon */
.toast-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.toast-icon svg { width: 18px; height: 18px; }
.toast--success .toast-icon { background: rgba(16,185,129,.15); color: #10b981; }
.toast--error   .toast-icon { background: rgba(239,68,68,.12);  color: #ef4444; }
.toast--warning .toast-icon { background: rgba(245,158,11,.15); color: #f59e0b; }
.toast--info    .toast-icon { background: rgba(124,58,237,.12); color: #7c3aed; }

/* Body */
.toast-body { flex: 1; min-width: 0; }
.toast-title {
  font-size: 13.5px;
  font-weight: 800;
  line-height: 1.3;
}
.toast--success .toast-title { color: #15803d; }
.toast--error   .toast-title { color: #dc2626; }
.toast--warning .toast-title { color: #92400e; }
.toast--info    .toast-title { color: #5b21b6; }

.toast-msg {
  font-size: 12.5px;
  margin-top: 3px;
  line-height: 1.5;
  opacity: .85;
}
.toast--success .toast-msg { color: #166534; }
.toast--error   .toast-msg { color: #991b1b; }
.toast--warning .toast-msg { color: #78350f; }
.toast--info    .toast-msg { color: #4c1d95; }

/* Close */
.toast-close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: .5;
  transition: opacity .13s, background .13s;
  flex-shrink: 0;
  padding: 0;
}
.toast-close svg { width: 13px; height: 13px; }
.toast-close:hover { opacity: 1; background: rgba(0,0,0,.07); }
.toast--error .toast-close { color: #dc2626; }

/* Progress bar */
.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(0,0,0,.06);
  border-radius: 0 0 16px 16px;
  overflow: hidden;
}
.toast-progress-fill {
  height: 100%;
  border-radius: 99px;
  animation: toast-progress linear forwards;
}
.toast--success .toast-progress-fill { background: #10b981; }
.toast--error   .toast-progress-fill { background: #ef4444; }
.toast--warning .toast-progress-fill { background: #f59e0b; }
.toast--info    .toast-progress-fill { background: #7c3aed; }

@keyframes toast-progress {
  from { width: 100%; }
  to   { width: 0%; }
}

/* Animations */
.toast-anim-enter-active { transition: all .28s cubic-bezier(.34,1.56,.64,1); }
.toast-anim-leave-active { transition: all .22s ease; }
.toast-anim-enter-from  { opacity: 0; transform: translateX(60px) scale(.95); }
.toast-anim-leave-to    { opacity: 0; transform: translateX(60px) scale(.95); }
.toast-anim-move        { transition: transform .28s ease; }
</style>
