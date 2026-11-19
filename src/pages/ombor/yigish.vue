<template>
  <div class="yg-wrap">

    <!-- ═══ HEADER ═══ -->
    <div class="yg-hd">
      <div>
        <h1 class="yg-title">Buyurtmalarni yig'ish</h1>
        <p class="yg-sub">Skladchi uchun — buyurtmani jarayonga oling va yig'ib bo'lgach tayyor deb belgilang</p>
      </div>
      <button class="yg-ref" @click="load" :disabled="loading" title="Yangilash">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" :class="loading && 'yg-spin'"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.07-8.33"/></svg>
      </button>
    </div>

    <!-- ═══ TABS ═══ -->
    <div class="yg-tabs">
      <button class="yg-tab" :class="{ on: tab === 'tasdiqlangan' }" @click="tab = 'tasdiqlangan'">
        <span class="yg-tab-dot" style="background:#7c3aed"/>
        Navbatda
        <span class="yg-tab-cnt">{{ rows.filter(r => r.holat === 'tasdiqlangan').length }}</span>
      </button>
      <button class="yg-tab" :class="{ on: tab === 'yigilmoqda' }" @click="tab = 'yigilmoqda'">
        <span class="yg-tab-dot" style="background:#f59e0b"/>
        Jarayonda
        <span class="yg-tab-cnt">{{ rows.filter(r => r.holat === 'yigilmoqda').length }}</span>
      </button>
    </div>

    <div class="yg-search">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input v-model="search" maxlength="100" @keydown.enter="qd.darhol()" placeholder="Mijoz yoki raqam qidirish..." class="yg-si"/>
    </div>

    <!-- ═══ LIST ═══ -->
    <div class="yg-list">
      <div v-if="loading && !filtered.length" class="yg-empty">
        <svg class="yg-spin" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.07-8.33"/></svg>
        <span>Yuklanmoqda...</span>
      </div>
      <div v-else-if="!filtered.length" class="yg-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>{{ tab === 'tasdiqlangan' ? "Navbatda buyurtma yo'q" : "Jarayonda buyurtma yo'q" }}</span>
      </div>

      <div v-else class="yg-grid">
        <div v-for="row in filtered" :key="row.id" class="yg-card">
          <div class="yg-card-hd">
            <div class="yg-av" :style="{ background: avatarColor(row.id) }">{{ (row.mijoz_nomi||'?').charAt(0).toUpperCase() }}</div>
            <div class="yg-card-info">
              <div class="yg-card-name">{{ row.mijoz_nomi || '—' }}</div>
              <div class="yg-card-sub">#{{ row.raqam }} · {{ row.agent_nomi || '—' }}</div>
            </div>
            <span class="yg-chip" :class="row.holat">{{ row.holat === 'tasdiqlangan' ? 'Navbatda' : "Jarayonda" }}</span>
          </div>

          <div class="yg-card-tovlist" v-if="row.qatorlar?.length">
            <div class="yg-tov-row" v-for="t in row.qatorlar" :key="t.id">
              <span class="yg-tov-name">{{ t.tovar_nomi }}</span>
              <span class="yg-tov-qty">
                <span v-if="t.blok" class="yg-pill">{{ t.blok }} blok</span>
                <span v-if="t.dona" class="yg-pill yg-pill--g">{{ t.dona }} kg</span>
              </span>
            </div>
          </div>

          <div class="yg-card-ft">
            <span class="yg-card-date">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {{ fmtDate(row.jonatish_sana) }}
            </span>
            <button
              v-if="row.holat === 'tasdiqlangan'"
              class="yg-act-btn yg-act-btn--start"
              :disabled="changing === row.id"
              @click="doChange(row, 'yigilmoqda')"
            >
              <span v-if="changing === row.id" class="yg-spin yg-spin--sm"/>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Jarayonga olish
            </button>
            <button
              v-else
              class="yg-act-btn yg-act-btn--done"
              :disabled="changing === row.id"
              @click="openDostavchiModal(row)"
            >
              <span v-if="changing === row.id" class="yg-spin yg-spin--sm"/>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Tayyor
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TOAST -->
    <Teleport to="body">
      <Transition name="yg-toast-slide">
        <div v-if="toast.show" class="yg-toast" :class="`yg-toast--${toast.type}`">
          <div class="yg-toast-ic">
            <svg v-if="toast.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <span>{{ toast.msg }}</span>
        </div>
      </Transition>
    </Teleport>

    <!-- ═══ DOSTAVCHI TAYINLASH MODAL ═══ -->
    <DostavchiTayinlashModal
      v-model:open="dmOpen"
      :ariza-id="dmArizaId"
      @assigned="onAssigned"
      @error="(msg) => showToast(msg, 'error')"
    />

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
// @ts-ignore
import { arizaApi } from '@/api/api'
import { useQidiruv } from '@/composables/useQidiruv'
import DostavchiTayinlashModal from '@/components/DostavchiTayinlashModal.vue'

const COLORS = ['#7c3aed','#8b5cf6','#6d28d9','#5b21b6']
const avatarColor = (id) => COLORS[id % COLORS.length]

const rows     = ref([])
const loading  = ref(false)
const search   = ref('')
const tab      = ref('tasdiqlangan')
const changing = ref(null)

const toast = reactive({ show: false, msg: '', type: 'success' })
let toastTimer
function showToast(msg, type = 'success') {
  clearTimeout(toastTimer)
  Object.assign(toast, { show: true, msg, type })
  toastTimer = setTimeout(() => { toast.show = false }, 2600)
}

const filtered = computed(() => rows.value.filter(r => r.holat === tab.value))

const qd = useQidiruv({
  matn: search, yuklanmoqda: loading,
  yukla: q => {
    const params = { holat: 'tasdiqlangan,yigilmoqda', all: 'true' }
    if (q) params.search = q
    return arizaApi.getAll(params)
  },
  qolla: data => { rows.value = Array.isArray(data) ? data : (data.rows || []) },
  xato: e => showToast(e.message || 'Yuklash xatosi', 'error'),
})
const load = () => qd.qayta()

async function doChange(row, next) {
  changing.value = row.id
  try {
    const result = await arizaApi.changeHolat(row.id, { holat: next })
    const idx = rows.value.findIndex(r => r.id === row.id)
    if (idx !== -1) rows.value[idx] = result
    showToast(`#${row.raqam} jarayonga olindi`)
    tab.value = 'yigilmoqda'
  } catch (e) {
    showToast(e.message || 'Xatolik', 'error')
  } finally {
    changing.value = null
  }
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('uz-UZ', { day:'2-digit', month:'2-digit', year:'2-digit' })
}

// ─── Dostavchi tayinlash modal ──────────────────────────────
const dmOpen    = ref(false)
const dmArizaId = ref(null)

function openDostavchiModal(row) {
  dmArizaId.value = row.id
  dmOpen.value = true
}

function onAssigned({ ariza, dostavchiNomi }) {
  rows.value = rows.value.filter(r => r.id !== ariza.id)
  showToast(`#${ariza.raqam} tayyor — yo'lga chiqarildi${dostavchiNomi ? ' (' + dostavchiNomi + ')' : ''}`)
}

onMounted(load)
</script>

<style scoped>
.yg-wrap { display:flex; flex-direction:column; gap:16px; height:100%; min-height:0; }

.yg-hd { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.yg-title { font-size:20px; font-weight:900; color:#1e293b; margin:0 0 3px; }
.yg-sub { font-size:12.5px; color:#94a3b8; margin:0; }
.yg-ref { width:36px; height:36px; border-radius:10px; border:1.5px solid #e2e8f0; background:#fff; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.13s; flex-shrink:0; }
.yg-ref:hover:not(:disabled) { border-color:#8b5cf6; color:#8b5cf6; }

.yg-tabs { display:flex; gap:8px; }
.yg-tab { display:flex; align-items:center; gap:7px; padding:9px 16px; border-radius:12px; border:1.5px solid var(--line, #e6e3ef); background:var(--surface, #fff); font-size:13.5px; font-weight:600; color:var(--seg-ink); cursor:pointer; transition:.13s; }
.yg-tab:hover:not(.on) { border-color:var(--chip-on-brd); color:var(--seg-ink-h); }
.yg-tab.on { border-color:var(--chip-on-brd); background:var(--chip-on-bg); color:var(--chip-on-ink); }
.yg-tab-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.yg-tab-cnt { font-size:11px; font-weight:700; padding:1px 8px; border-radius:20px; background:rgba(0,0,0,.06); }
.yg-tab.on .yg-tab-cnt { background:var(--cnt-on-bg); color:var(--chip-on-ink); }

.yg-search { display:flex; align-items:center; gap:8px; background:#fff; border:1.5px solid #e2e8f0; border-radius:12px; padding:0 14px; height:42px; max-width:420px; transition:.12s; }
.yg-search:focus-within { border-color:#8b5cf6; }
.yg-search svg { color:#94a3b8; flex-shrink:0; }
.yg-si { flex:1; border:none; outline:none; font-size:14px; color:#1e293b; background:transparent; }

.yg-list { flex:1; overflow-y:auto; }
.yg-empty { display:flex; flex-direction:column; align-items:center; gap:10px; padding:60px; color:#94a3b8; }
.yg-empty svg { opacity:.3; }
.yg-empty span { font-size:14px; font-weight:600; color:#64748b; }

.yg-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:14px; padding-bottom:16px; }

.yg-card { background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:12px; transition:.13s; }
.yg-card:hover { box-shadow:0 4px 16px rgba(139,92,246,.08); }

.yg-card-hd { display:flex; align-items:center; gap:11px; }
.yg-av { width:40px; height:40px; border-radius:11px; color:#fff; font-size:15px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.yg-card-info { flex:1; min-width:0; }
.yg-card-name { font-size:14.5px; font-weight:800; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.yg-card-sub { font-size:11.5px; color:#94a3b8; margin-top:2px; }
.yg-chip { font-size:10.5px; font-weight:700; padding:4px 10px; border-radius:20px; white-space:nowrap; flex-shrink:0; }
.yg-chip.tasdiqlangan { background:rgba(91,33,182,.1); color:#5b21b6; }
.yg-chip.yigilmoqda { background:rgba(245,158,11,.1); color:#f59e0b; }

.yg-card-tovlist { display:flex; flex-direction:column; gap:5px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:11px; padding:9px 12px; max-height:150px; overflow-y:auto; }
.yg-tov-row { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:12.5px; }
.yg-tov-name { color:#334155; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.yg-tov-qty { display:flex; gap:5px; flex-shrink:0; }
.yg-pill { display:inline-flex; padding:1px 7px; background:rgba(139,92,246,.09); color:#8b5cf6; border-radius:6px; font-size:11px; font-weight:700; white-space:nowrap; }
.yg-pill--g { background:rgba(16,185,129,.09); color:#10b981; }

.yg-card-dostavchi { display:flex; align-items:center; gap:8px; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:10px; padding:0 11px; height:38px; color:#8b5cf6; transition:.12s; }
.yg-card-dostavchi:focus-within { border-color:#8b5cf6; }
.yg-dostavchi-sel { flex:1; border:none; outline:none; background:transparent; font-size:12.5px; color:#334155; font-weight:600; }

.yg-card-ft { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.yg-card-date { display:flex; align-items:center; gap:5px; font-size:11px; color:#94a3b8; }

.yg-act-btn { display:flex; align-items:center; gap:6px; padding:9px 16px; border-radius:10px; border:none; font-size:13px; font-weight:700; cursor:pointer; transition:.13s; }
.yg-act-btn--start { background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; box-shadow:0 2px 10px rgba(245,158,11,.3); }
.yg-act-btn--start:hover:not(:disabled) { transform:translateY(-1px); }
.yg-act-btn--done { background:linear-gradient(135deg,#10b981,#059669); color:#fff; box-shadow:0 2px 10px rgba(16,185,129,.3); }
.yg-act-btn--done:hover:not(:disabled) { transform:translateY(-1px); }
.yg-act-btn:disabled { opacity:.55; cursor:not-allowed; transform:none; }

.yg-spin { animation:yg-rot .7s linear infinite; }
.yg-spin--sm { width:13px; height:13px; }
@keyframes yg-rot { to { transform:rotate(360deg) } }

.yg-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:10px; padding:12px 20px; border-radius:12px; z-index:1100; font-size:13.5px; font-weight:600; color:#fff; box-shadow:0 8px 32px rgba(0,0,0,.15); }
.yg-toast--success { background:linear-gradient(135deg,#10b981,#059669); }
.yg-toast--error { background:linear-gradient(135deg,#ef4444,#dc2626); }
.yg-toast-ic { width:24px; height:24px; border-radius:50%; background:rgba(255,255,255,.2); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.yg-toast-slide-enter-active, .yg-toast-slide-leave-active { transition:opacity .22s, transform .22s; }
.yg-toast-slide-enter-from { opacity:0; transform:translateX(-50%) translateY(14px); }
.yg-toast-slide-leave-to { opacity:0; transform:translateX(-50%) translateY(14px); }

@media(max-width:600px) { .yg-grid { grid-template-columns:1fr; } }

</style>
