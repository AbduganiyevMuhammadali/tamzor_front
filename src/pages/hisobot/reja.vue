<template>
  <div class="hp-wrap">
    <!-- Header -->
    <div class="hp-head">
      <div>
        <h1 class="hp-title">Marshrut rejasi va Plan-Fact</h1>
        <p class="hp-sub">Agentga kunlik tashrif rejasini belgilash va bajarilishini nazorat qilish</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="hp-tabs">
      <button v-for="t in TABS" :key="t.key" :class="['hp-tab', tab===t.key && 'hp-tab--on']" @click="tab = t.key">
        {{ t.label }}
      </button>
    </div>

    <!-- ══ REJA BELGILASH ══ -->
    <div v-if="tab==='reja'" class="hp-panel">
      <div class="rj-toolbar">
        <select v-model="rAgent" class="hp-select" @change="loadReja">
          <option value="">Agentni tanlang</option>
          <option v-for="a in agentlar" :key="a.id" :value="a.id">{{ a.fullname }}</option>
        </select>
        <input v-model="rSana" type="date" class="hp-date" @change="loadReja"/>
        <button class="rj-btn rj-btn--ghost" @click="genModalOpen = true" :disabled="!rAgent">
          🔁 Haftalik avto-generatsiya
        </button>
      </div>

      <div v-if="!rAgent" class="hp-empty">Rejani ko'rish uchun agent tanlang</div>
      <template v-else>
        <div class="rj-grid">
          <!-- Bugungi reja -->
          <div class="hp-card">
            <div class="hp-card-hd">
              <div class="hp-card-title">📋 {{ rSana }} kungi reja ({{ rejaList.length }})</div>
            </div>
            <div v-if="loadingReja" class="hp-skel hp-skel--sm"/>
            <div v-else-if="!rejaList.length" class="hp-empty" style="padding:30px">Reja yo'q</div>
            <div v-else class="rj-list">
              <div v-for="(r,i) in rejaList" :key="r.id" class="rj-item">
                <span class="rj-order">{{ i+1 }}</span>
                <div class="rj-body">
                  <div class="rj-name">{{ r.mijoz_nomi || '—' }}</div>
                  <div class="rj-addr">{{ r.manzil || '—' }}</div>
                </div>
                <span class="rj-status" :class="r.bajarildi ? 'ok' : (r.checkin_vaqt ? 'progress' : 'pending')">
                  {{ r.bajarildi ? '✓ Bajarildi' : (r.checkin_vaqt ? '🕐 Jarayonda' : 'Kutilmoqda') }}
                </span>
                <button class="rj-del" @click="ochirReja(r.id)" title="O'chirish">✕</button>
              </div>
            </div>
          </div>

          <!-- Yangi mijoz qo'shish -->
          <div class="hp-card">
            <div class="hp-card-hd">
              <div class="hp-card-title">+ Mijoz qo'shish</div>
            </div>
            <input v-model="mijozQ" type="text" class="rj-search" placeholder="Mijoz nomi bo'yicha qidirish..." maxlength="100" @keydown.enter="mijozQd.darhol()"/>
            <div class="rj-mijoz-list">
              <div v-for="m in mijozNatija" :key="m.id" class="rj-mijoz-item" @click="qoshReja(m)">
                <span>{{ m.nomi }}</span>
                <span class="rj-plus">+</span>
              </div>
              <div v-if="mijozQd.amal.value && !mijozQidirilmoqda && !mijozNatija.length" class="hp-empty" style="padding:16px;font-size:12.5px">Topilmadi</div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ══ PLAN-FACT ══ -->
    <div v-if="tab==='planfact'" class="hp-panel">
      <div class="rj-toolbar">
        <input v-model="pfFrom" type="date" class="hp-date" @change="loadPlanFact"/>
        <span class="rj-dash">—</span>
        <input v-model="pfTo" type="date" class="hp-date" @change="loadPlanFact"/>
      </div>

      <div v-if="loadingPf" class="hp-skel-list"><div v-for="i in 3" :key="i" class="hp-skel hp-skel--sm"/></div>
      <div v-else-if="!planFact.length" class="hp-empty">Bu davrda reja/tashrif ma'lumoti yo'q</div>
      <div v-else class="pf-list">
        <div v-for="p in planFact" :key="p.agent_id" class="pf-card">
          <div class="pf-hd">
            <span class="pf-name">{{ p.agent_nomi }}</span>
            <span class="pf-foiz" :class="pfClass(p.bajarilish_foizi)">{{ p.bajarilish_foizi }}%</span>
          </div>
          <div class="pf-bar"><div class="pf-fill" :class="pfClass(p.bajarilish_foizi)" :style="{ width: Math.min(100, p.bajarilish_foizi) + '%' }"/></div>
          <div class="pf-nums">
            <span>📋 Reja: <b>{{ p.reja_soni }}</b></span>
            <span>✓ Bajarildi: <b>{{ p.bajarildi_soni }}</b></span>
            <span>🛒 Savdo: <b>{{ p.savdo_soni }}</b></span>
            <span>🚫 Sotilmadi: <b>{{ p.sotmaslik_soni }}</b></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Haftalik generatsiya modal -->
    <div v-if="genModalOpen" class="rj-modal-ov" @click.self="genModalOpen = false">
      <div class="rj-modal">
        <div class="rj-modal-title">Haftalik avto-generatsiya</div>
        <p class="rj-modal-txt">Mijozning "tashrif kunlari" asosida shu oraliq uchun reja avtomatik yaratiladi.</p>
        <div class="rj-modal-row">
          <label>Boshlanish</label>
          <input v-model="genFrom" type="date" class="hp-date"/>
        </div>
        <div class="rj-modal-row">
          <label>Tugash</label>
          <input v-model="genTo" type="date" class="hp-date"/>
        </div>
        <div class="rj-modal-actions">
          <button class="rj-btn rj-btn--ghost" @click="genModalOpen = false">Bekor qilish</button>
          <button class="rj-btn" :disabled="genLoading" @click="generate">{{ genLoading ? '...' : 'Generatsiya qilish' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
// @ts-ignore
import { hisobotApi, api } from '@/api/api'
// @ts-ignore
import { useToast } from '@/composables/useToast'
import { useQidiruv } from '@/composables/useQidiruv'

const toast = useToast()

const TABS = [
  { key: 'reja',     label: 'Reja belgilash' },
  { key: 'planfact', label: 'Plan-Fact' },
]
const tab = ref('reja')

const agentlar = ref<any[]>([])
const rAgent = ref<string | number>('')
const rSana = ref(new Date().toISOString().slice(0, 10))
const rejaList = ref<any[]>([])
const loadingReja = ref(false)

const mijozQ = ref('')
const mijozNatija = ref<any[]>([])

const pfFrom = ref(new Date().toISOString().slice(0, 10))
const pfTo = ref(new Date().toISOString().slice(0, 10))
const planFact = ref<any[]>([])
const loadingPf = ref(false)

const genModalOpen = ref(false)
const genFrom = ref(new Date().toISOString().slice(0, 10))
const genTo = ref(new Date().toISOString().slice(0, 10))
const genLoading = ref(false)

async function loadReja() {
  if (!rAgent.value) return
  loadingReja.value = true
  try {
    rejaList.value = await hisobotApi.marshrutReja({ agent_id: rAgent.value, sana: rSana.value })
  } catch (e: any) {
    toast.error('Yuklash xatosi', e.message || '')
  } finally {
    loadingReja.value = false
  }
}

// Mijoz tanlash (autocomplete) — bo'sh matnda ro'yxat tozalanadi
const mijozQidirilmoqda = ref(false)
const mijozQd = useQidiruv<any>({
  matn: mijozQ, yuklanmoqda: mijozQidirilmoqda,
  yukla: q => (q ? api.get(`/mijozlar?search=${encodeURIComponent(q)}&limit=8`) : Promise.resolve([])),
  qolla: data => { mijozNatija.value = data.rows || data || [] },
  xato: e => { mijozNatija.value = []; toast.error('Qidiruv xatosi', e.message || '') },
})

async function qoshReja(m: any) {
  if (!rAgent.value) return
  try {
    await hisobotApi.marshrutRejaBelgila({ agent_id: rAgent.value, sana: rSana.value, mijoz_idlar: [m.id] })
    mijozQ.value = ''
    mijozNatija.value = []
    await loadReja()
    toast.success('Qo\'shildi', `${m.nomi} rejaga qo'shildi`)
  } catch (e: any) {
    toast.error('Xatolik', e.message || '')
  }
}

async function ochirReja(id: number) {
  try {
    await hisobotApi.marshrutRejaOchir(id)
    await loadReja()
  } catch (e: any) {
    toast.error('Xatolik', e.message || '')
  }
}

async function generate() {
  genLoading.value = true
  try {
    const r = await hisobotApi.marshrutRejaGenerate({ agent_id: rAgent.value, from: genFrom.value, to: genTo.value })
    toast.success('Tayyor', `${r.yaratildi} ta reja yaratildi`)
    genModalOpen.value = false
    await loadReja()
  } catch (e: any) {
    toast.error('Xatolik', e.message || '')
  } finally {
    genLoading.value = false
  }
}

async function loadPlanFact() {
  loadingPf.value = true
  try {
    planFact.value = await hisobotApi.planFact({ date_from: pfFrom.value, date_to: pfTo.value })
  } catch (e: any) {
    toast.error('Yuklash xatosi', e.message || '')
  } finally {
    loadingPf.value = false
  }
}

function pfClass(foiz: number) {
  if (foiz >= 80) return 'good'
  if (foiz >= 50) return 'mid'
  return 'bad'
}

onMounted(async () => {
  try { agentlar.value = await hisobotApi.agentlar() } catch (e: any) { toast.error("Agentlar ro'yxatini yuklab bo'lmadi", e.message || '') }
  await loadPlanFact()
})
</script>

<style scoped>
.hp-wrap { display:flex; flex-direction:column; gap:18px; padding:2px 0 40px; }
.hp-head { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; flex-wrap:wrap; }
.hp-title { font-size:22px; font-weight:900; color:#1e293b; margin:0 0 4px; letter-spacing:-.3px; }
.hp-sub { font-size:13px; color:#94a3b8; margin:0; }

.hp-tabs { display:flex; gap:2px; background:var(--seg-track); box-shadow:inset 0 0 0 1px var(--seg-brd); border-radius:12px; padding:3px; width:fit-content; max-width:100%; overflow-x:auto; }
.hp-tab { padding:8px 16px; border:none; background:transparent; border-radius:9px; font-size:13.5px; font-weight:600; color:var(--seg-ink); cursor:pointer; white-space:nowrap; transition:.15s; }
.hp-tab:hover:not(.hp-tab--on) { color:var(--seg-ink-h); }
.hp-tab--on { background:var(--seg-on-bg); color:var(--seg-on-ink); box-shadow:var(--seg-on-sh); }

.hp-select, .hp-date { border:1.5px solid #e2e8f0; background:#fff; border-radius:10px; padding:8px 12px; font-size:13px; color:#1e293b; }
.hp-select:focus, .hp-date:focus { outline:none; border-color:#8b5cf6; }
.hp-empty { text-align:center; padding:60px 20px; color:#94a3b8; font-size:14px; background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; }
.hp-skel-list { display:flex; flex-direction:column; gap:12px; }
.hp-skel { border-radius:16px; background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:hp-shim 1.4s ease infinite; }
.hp-skel--sm { height:100px; }
@keyframes hp-shim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

.hp-card { background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; padding:16px; }
.hp-card-hd { margin-bottom:12px; }
.hp-card-title { font-size:14px; font-weight:800; color:#1e293b; }

/* Toolbar */
.rj-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:16px; }
.rj-dash { color:#cbd5e1; }
.rj-btn { padding:8px 16px; border:none; border-radius:10px; background:#8b5cf6; color:#fff; font-size:13px; font-weight:700; cursor:pointer; }
.rj-btn:hover { background:#7c3aed; }
.rj-btn:disabled { opacity:.5; cursor:not-allowed; }
.rj-btn--ghost { background:#f1f5f9; color:#475569; }
.rj-btn--ghost:hover { background:#e2e8f0; }

/* Reja grid */
.rj-grid { display:grid; grid-template-columns:1.3fr 1fr; gap:16px; align-items:start; }
.rj-list { display:flex; flex-direction:column; gap:8px; max-height:440px; overflow-y:auto; }
.rj-item { display:flex; align-items:center; gap:10px; padding:9px 11px; border-radius:11px; background:#f8fafc; }
.rj-order { width:22px; height:22px; border-radius:7px; background:#f5f3ff; color:#8b5cf6; font-size:11.5px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.rj-body { flex:1; min-width:0; }
.rj-name { font-size:13px; font-weight:700; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.rj-addr { font-size:11px; color:#94a3b8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.rj-status { font-size:10.5px; font-weight:700; padding:3px 8px; border-radius:999px; white-space:nowrap; }
.rj-status.ok { background:#f0fdf4; color:#16a34a; }
.rj-status.progress { background:#fffbeb; color:#d97706; }
.rj-status.pending { background:#f1f5f9; color:#94a3b8; }
.rj-del { border:none; background:transparent; color:#cbd5e1; cursor:pointer; font-size:14px; flex-shrink:0; padding:2px 4px; }
.rj-del:hover { color:#ef4444; }

.rj-search { width:100%; border:1.5px solid #e2e8f0; border-radius:10px; padding:9px 12px; font-size:13px; margin-bottom:10px; box-sizing:border-box; }
.rj-search:focus { outline:none; border-color:#8b5cf6; }
.rj-mijoz-list { display:flex; flex-direction:column; gap:4px; max-height:340px; overflow-y:auto; }
.rj-mijoz-item { display:flex; align-items:center; justify-content:space-between; padding:9px 11px; border-radius:9px; cursor:pointer; font-size:13px; color:#1e293b; }
.rj-mijoz-item:hover { background:#f8fafc; }
.rj-plus { color:#8b5cf6; font-weight:800; }

/* Plan-Fact */
.pf-list { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
.pf-card { background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; padding:16px; }
.pf-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:9px; }
.pf-name { font-size:14px; font-weight:800; color:#1e293b; }
.pf-foiz { font-size:16px; font-weight:900; }
.pf-foiz.good { color:#16a34a; } .pf-foiz.mid { color:#d97706; } .pf-foiz.bad { color:#dc2626; }
.pf-bar { height:8px; border-radius:999px; background:#f1f5f9; overflow:hidden; margin-bottom:11px; }
.pf-fill { height:100%; border-radius:999px; transition:width .4s; }
.pf-fill.good { background:linear-gradient(90deg,#34d399,#10b981); }
.pf-fill.mid  { background:linear-gradient(90deg,#fbbf24,#f59e0b); }
.pf-fill.bad  { background:linear-gradient(90deg,#f87171,#ef4444); }
.pf-nums { display:flex; flex-wrap:wrap; gap:10px; font-size:12px; color:#64748b; }
.pf-nums b { color:#1e293b; }

/* Modal */
.rj-modal-ov { position:fixed; inset:0; background:rgba(15,23,42,.5); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
.rj-modal { background:#fff; border-radius:18px; padding:22px; width:380px; max-width:100%; }
.rj-modal-title { font-size:16px; font-weight:800; color:#1e293b; margin-bottom:8px; }
.rj-modal-txt { font-size:12.5px; color:#94a3b8; margin:0 0 16px; line-height:1.5; }
.rj-modal-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.rj-modal-row label { font-size:13px; color:#475569; font-weight:600; }
.rj-modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }

@media(max-width:800px) { .rj-grid { grid-template-columns:1fr; } }
</style>
