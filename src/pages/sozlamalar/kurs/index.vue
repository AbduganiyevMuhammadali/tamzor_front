<script setup>
import { ref, onMounted } from 'vue'
import NumberInput from '@/components/NumberInput.vue'
import { sozlamaApi } from '@/api/api'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const loading  = ref(false)
const saving   = ref(false)
const kurs     = ref(0)
const izoh     = ref('')
const updatedAt = ref(null)
const draft    = ref('')

async function load() {
  loading.value = true
  try {
    const d = await sozlamaApi.getKurs()
    kurs.value = d.kurs
    izoh.value = d.izoh
    updatedAt.value = d.updatedAt
    draft.value = String(d.kurs)
  } catch (e) {
    toast.error('Yuklash xatosi', e.message || '')
  } finally {
    loading.value = false
  }
}

async function save() {
  const val = Number(draft.value)
  if (!val || val <= 0) {
    toast.warning("Noto'g'ri qiymat", "Kurs musbat son bo'lishi kerak")
    return
  }
  saving.value = true
  try {
    const d = await sozlamaApi.updateKurs(val)
    kurs.value = d.kurs
    updatedAt.value = d.updatedAt
    toast.success('Saqlandi', `Yangi kurs: 1$ = ${fmtSum(d.kurs)} so'm`)
  } catch (e) {
    toast.error('Xatolik', e.message || '')
  } finally {
    saving.value = false
  }
}

function fmtSum(n) { return Number(n || 0).toLocaleString('uz-UZ') }
function fmtDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  return d.toLocaleDateString('uz-UZ') + ' ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

onMounted(load)
</script>

<template>
  <div class="kr">
    <div class="kr-header">
      <div class="kr-icon">
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/></svg>
      </div>
      <div>
        <h2 class="kr-title">Valyuta kursi</h2>
        <p class="kr-sub">Prixodda $ narx kiritilganda ishlatiladigan joriy kurs</p>
      </div>
    </div>

    <div v-if="loading" class="kr-loading">
      <span class="kr-spin"/> Yuklanmoqda...
    </div>

    <template v-else>
      <div class="kr-card">
        <div class="kr-current">
          <span class="kr-current-lbl">Joriy kurs</span>
          <div class="kr-current-val">
            <span class="kr-usd">1 $</span>
            <span class="kr-eq">=</span>
            <span class="kr-som">{{ fmtSum(kurs) }}</span>
            <span class="kr-cur">so'm</span>
          </div>
          <span class="kr-updated">Oxirgi yangilanish: {{ fmtDate(updatedAt) }}</span>
        </div>

        <div class="kr-edit">
          <label class="kr-lbl">Yangi kurs (1 USD = ? so'm)</label>
          <div class="kr-input-row">
            <div class="kr-in-wrap">
              <NumberInput v-model="draft" :bosh="''" css-class="kr-in" placeholder="12 650" @keyup.enter="save"/>
              <span class="kr-suffix">UZS</span>
            </div>
            <button class="kr-save-btn" :disabled="saving || Number(draft) === kurs" @click="save">
              <span v-if="saving" class="kr-spin kr-spin--sm"/>
              <svg v-else viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </div>

        <div class="kr-note">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Kurs o'zgartirilganda faqat <b>yangi</b> prixod hujjatlariga ta'sir qiladi — mavjud hujjatlar o'zining saqlangan (tarixiy) kursini saqlab qoladi.
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.kr { display:flex; flex-direction:column; gap:20px; max-width:520px; }

.kr-header { display:flex; align-items:center; gap:14px; }
.kr-icon { width:44px; height:44px; border-radius:13px; background:linear-gradient(135deg,rgba(245,158,11,.15),rgba(251,191,36,.15)); border:1.5px solid rgba(245,158,11,.2); display:flex; align-items:center; justify-content:center; color:#f59e0b; flex-shrink:0; }
.kr-icon svg { width:20px; height:20px; }
.kr-title { font-size:19px; font-weight:800; color:var(--title,#111827); margin:0; letter-spacing:-.3px; }
.kr-sub   { font-size:12.5px; color:var(--muted,#9ca3af); margin:2px 0 0; }

.kr-loading { display:flex; align-items:center; gap:10px; padding:40px; color:var(--muted,#9ca3af); font-size:13px; }
.kr-spin { display:inline-block; width:18px; height:18px; border:2px solid var(--card-border,#e5e7eb); border-top-color:#f59e0b; border-radius:50%; animation:kr-rot .7s linear infinite; }
.kr-spin--sm { width:14px; height:14px; border-width:1.5px; }
@keyframes kr-rot { to { transform:rotate(360deg); } }

.kr-card { background:var(--card-bg,#fff); border:1.5px solid var(--card-border,#e5e7eb); border-radius:16px; overflow:hidden; }

.kr-current { padding:22px 24px; background:linear-gradient(135deg, rgba(245,158,11,.06), transparent); border-bottom:1.5px solid var(--card-border,#e5e7eb); display:flex; flex-direction:column; gap:6px; }
.kr-current-lbl { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--muted,#9ca3af); }
.kr-current-val { display:flex; align-items:baseline; gap:8px; }
.kr-usd { font-size:16px; font-weight:700; color:var(--muted,#9ca3af); }
.kr-eq  { font-size:16px; color:var(--muted,#9ca3af); }
.kr-som { font-size:32px; font-weight:800; color:#f59e0b; font-variant-numeric:tabular-nums; letter-spacing:-.5px; }
.kr-cur { font-size:14px; font-weight:600; color:var(--muted,#9ca3af); }
.kr-updated { font-size:11.5px; color:var(--muted,#9ca3af); }

.kr-edit { padding:20px 24px; display:flex; flex-direction:column; gap:8px; }
.kr-lbl { font-size:11px; font-weight:700; color:var(--muted,#9ca3af); text-transform:uppercase; letter-spacing:.05em; }
.kr-input-row { display:flex; gap:10px; }
.kr-in-wrap { position:relative; flex:1; display:flex; align-items:center; }
.kr-in { width:100%; height:42px; padding:0 50px 0 14px; border-radius:10px; border:1.5px solid var(--card-border,#e5e7eb); background:var(--input-bg,var(--card-bg,#fff)); color:var(--body,#374151); font-size:16px; font-weight:700; outline:none; transition:.12s; font-variant-numeric:tabular-nums; }
.kr-in:focus { border-color:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,.12); }
.kr-suffix { position:absolute; right:14px; font-size:12px; font-weight:600; color:var(--muted,#9ca3af); pointer-events:none; }
.kr-save-btn { display:flex; align-items:center; gap:7px; height:42px; padding:0 18px; border-radius:10px; border:none; background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; font-size:13.5px; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(245,158,11,.3); transition:.12s; white-space:nowrap; }
.kr-save-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 4px 14px rgba(245,158,11,.4); }
.kr-save-btn:disabled { opacity:.45; cursor:not-allowed; transform:none; box-shadow:none; }
.kr-save-btn svg { width:14px; height:14px; }

.kr-note { display:flex; align-items:flex-start; gap:8px; padding:14px 24px; background:var(--mini-bg,#f8fafc); border-top:1px solid var(--card-border,#e5e7eb); font-size:11.5px; color:var(--muted,#9ca3af); line-height:1.5; }
.kr-note svg { flex-shrink:0; margin-top:1px; }
.kr-note b { color:var(--body,#374151); font-weight:700; }
</style>
