<template>
  <div class="ks">

    <!-- ═══ HEADER ═══ -->
    <div class="ks-hd">
      <div>
        <h1 class="ks-title">Kassa hisoboti</h1>
        <p class="ks-sub">Pul oqimi — qayerdan keldi, qayerga ketdi</p>
      </div>
      <div class="ks-hd-actions">
        <div class="ks-period">
          <button v-for="p in PERIODS" :key="p.key"
            class="ks-pbtn" :class="{ on: period === p.key }"
            @click="period = p.key; load()">{{ p.label }}</button>
        </div>
        <button class="ks-add-btn" @click="openAdd('kirim')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Amal
        </button>
      </div>
    </div>

    <!-- ═══ KPI ═══ -->
    <div class="ks-kpi" v-if="!loading">
      <div class="ks-kpi-card ks-kpi-card--in">
        <div class="ks-kpi-ic" style="background:rgba(16,185,129,.15)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
        </div>
        <div>
          <div class="ks-kpi-val" style="color:#10b981">{{ fmtSum(data.jami.kirim) }}</div>
          <div class="ks-kpi-lbl">Kirim (so'm)</div>
        </div>
      </div>
      <div class="ks-kpi-card ks-kpi-card--out">
        <div class="ks-kpi-ic" style="background:rgba(239,68,68,.12)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
        </div>
        <div>
          <div class="ks-kpi-val" style="color:#ef4444">{{ fmtSum(data.jami.chiqim) }}</div>
          <div class="ks-kpi-lbl">Chiqim (so'm)</div>
        </div>
      </div>
      <div class="ks-kpi-card ks-kpi-card--bal">
        <div class="ks-kpi-ic" style="background:rgba(255,255,255,.2)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
        </div>
        <div>
          <div class="ks-kpi-val" style="color:#fff">{{ fmtSum(data.jami.qoldiq) }}</div>
          <div class="ks-kpi-lbl" style="color:rgba(255,255,255,.8)">Sof qoldiq</div>
        </div>
      </div>
      <div class="ks-kpi-card">
        <div class="ks-kpi-ic" style="background:rgba(99,102,241,.1)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.2"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 0 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        </div>
        <div>
          <div class="ks-kpi-val">{{ data.jami.soni }}</div>
          <div class="ks-kpi-lbl">Harakatlar</div>
        </div>
      </div>
    </div>

    <!-- ═══ LAYOUT ═══ -->
    <div class="ks-body">

      <!-- Kategoriyalar -->
      <div class="ks-cats" v-if="!loading && data.kategoriyalar.length">
        <div class="ks-cats-hd">Kategoriyalar bo'yicha</div>
        <div class="ks-cat" v-for="c in data.kategoriyalar" :key="c.kategoriya"
          :class="{ on: filterKat === c.kategoriya }"
          @click="toggleKatFilter(c.kategoriya)">
          <span class="ks-cat-dot" :class="c.tur"/>
          <span class="ks-cat-name">{{ c.label }}</span>
          <span class="ks-cat-soni">{{ c.soni }}</span>
          <span class="ks-cat-sum" :class="c.tur">{{ c.tur === 'chiqim' ? '−' : '+' }}{{ fmtShort(c.summa) }}</span>
        </div>
      </div>

      <!-- Harakatlar -->
      <div class="ks-list-wrap">
        <div class="ks-list-toolbar">
          <div class="ks-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="search" @input="debouncedLoad" placeholder="Mijoz yoki izoh..." class="ks-si"/>
          </div>
          <div class="ks-tur-filter">
            <button class="ks-tf" :class="{ on: filterTur === '' }" @click="filterTur = ''; load()">Barchasi</button>
            <button class="ks-tf ks-tf--in" :class="{ on: filterTur === 'kirim' }" @click="filterTur = 'kirim'; load()">Kirim</button>
            <button class="ks-tf ks-tf--out" :class="{ on: filterTur === 'chiqim' }" @click="filterTur = 'chiqim'; load()">Chiqim</button>
          </div>
        </div>

        <div v-if="loading" class="ks-loading"><div class="ks-spinner"/></div>
        <div v-else-if="!data.harakatlar.length" class="ks-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          <p>Harakat yo'q</p>
        </div>
        <div v-else class="ks-list">
          <div v-for="h in data.harakatlar" :key="h.id"
            class="ks-row" :class="{ link: !!docLink(h) }"
            @click="goDoc(h)">
            <div class="ks-row-ic" :class="h.tur">
              <svg v-if="h.tur === 'kirim'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
            </div>
            <div class="ks-row-body">
              <div class="ks-row-top">
                <span class="ks-row-kat">{{ h.kategoriya_label }}</span>
                <span class="ks-row-usul">{{ usulLabel(h.tolov_usul) }}</span>
              </div>
              <div class="ks-row-sub">
                <span v-if="h.mijoz_nomi">{{ h.mijoz_nomi }}</span>
                <span v-if="h.izoh">{{ h.mijoz_nomi ? ' · ' : '' }}{{ h.izoh }}</span>
                <span class="ks-row-date">· {{ fmtDateTime(h.sana) }}</span>
              </div>
            </div>
            <img v-if="h.chek_rasm" :src="h.chek_rasm" class="ks-row-chek" loading="lazy"
              title="To'lov cheki" alt="chek" @click.stop="lightbox = h.chek_rasm"/>
            <div class="ks-row-right">
              <span class="ks-row-sum" :class="h.tur">{{ h.tur === 'chiqim' ? '−' : '+' }}{{ fmtSum(h.summa) }}</span>
              <span v-if="docLink(h)" class="ks-row-link">
                {{ docLabel(h) }}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
              <button v-if="canDelete(h)" class="ks-row-del" @click.stop="del(h.id)" title="O'chirish">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Chek rasm lightbox -->
    <Teleport to="body">
      <div v-if="lightbox" class="ks-lightbox" @click="lightbox = null">
        <img :src="lightbox" alt="chek rasm"/>
        <button class="ks-lightbox-close" @click="lightbox = null">✕</button>
      </div>
    </Teleport>

    <!-- ═══ QO'SHISH MODAL ═══ -->
    <Teleport to="body">
      <Transition name="km-fade">
        <div v-if="addModal" class="km-ov" @click.self="addModal = false">
          <div class="km-box">
            <div class="km-hd">
              <span class="km-title">Kassa amali</span>
              <button class="km-close" @click="addModal = false">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="km-body">
              <div class="km-tur">
                <button class="km-tur-btn km-tur-btn--in" :class="{ on: addForm.tur === 'kirim' }" @click="setTur('kirim')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                  Kirim
                </button>
                <button class="km-tur-btn km-tur-btn--out" :class="{ on: addForm.tur === 'chiqim' }" @click="setTur('chiqim')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                  Chiqim
                </button>
              </div>

              <div class="km-field">
                <label>Kategoriya</label>
                <select v-model="addForm.kategoriya" class="km-in">
                  <option v-for="k in katOptions" :key="k.key" :value="k.key">{{ k.label }}</option>
                </select>
              </div>

              <div class="km-field" v-if="addForm.kategoriya === 'mijoz_tolov'">
                <label>Mijoz</label>
                <select v-model="addForm.mijoz_id" class="km-in">
                  <option value="">Tanlang...</option>
                  <option v-for="m in mijozlar" :key="m.id" :value="m.id">{{ m.nomi }} ({{ fmtShort(m.balans) }})</option>
                </select>
              </div>

              <div class="km-row2">
                <div class="km-field">
                  <label>Summa</label>
                  <NumberInput v-model="addForm.summa" css-class="km-in" placeholder="0"/>
                </div>
                <div class="km-field">
                  <label>To'lov usuli</label>
                  <select v-model="addForm.tolov_usul" class="km-in">
                    <option value="naqt">Naqt</option>
                    <option value="karta">Karta</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>
              </div>

              <div class="km-field">
                <label>Izoh</label>
                <input v-model="addForm.izoh" class="km-in" placeholder="Ixtiyoriy..."/>
              </div>
              <div class="km-err" v-if="addErr">{{ addErr }}</div>
            </div>
            <div class="km-ft">
              <button class="km-cancel" @click="addModal = false">Bekor qilish</button>
              <button class="km-save" :class="addForm.tur" :disabled="saving || !addForm.summa" @click="saveAmal">
                <span v-if="saving" class="ks-spin-sm"/>
                {{ saving ? 'Saqlanmoqda...' : (addForm.tur === 'kirim' ? 'Kirim qo\'shish' : 'Chiqim qo\'shish') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toastShow" class="ks-toast" :class="toastType">{{ toastMsg }}</div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import NumberInput from '@/components/NumberInput.vue'
import { useRouter } from 'vue-router'
// @ts-ignore
import { kassaApi, arizaApi } from '@/api/api'

const router = useRouter()

const PERIODS = [
  { key: 'today', label: 'Bugun' },
  { key: 'week',  label: 'Hafta' },
  { key: 'month', label: 'Oy' },
  { key: 'year',  label: 'Yil' },
]
const KAT_ALL = [
  { key: 'mijoz_tolov',       label: "Mijoz to'lovi",       tur: 'kirim' },
  { key: 'boshqa_daromad',    label: 'Boshqa daromad',       tur: 'kirim' },
  { key: 'boshlangich_kapital', label: "Boshlang'ich qoldiq (kapital)", tur: 'kirim' },   // tizimga o'tishdagi pul / egadan kiritilgan — daromad emas
  { key: 'xarajat',           label: 'Xarajat',              tur: 'chiqim' },
  { key: 'ish_haqi',          label: 'Ish haqi',             tur: 'chiqim' },
  { key: 'ijara',             label: 'Ijara',                tur: 'chiqim' },
  { key: 'yetkazuvchi_tolov', label: "Yetkazuvchiga to'lov", tur: 'chiqim' },
  { key: 'boshqa_chiqim',     label: 'Boshqa chiqim',        tur: 'chiqim' },
]

const loading   = ref(false)
const period    = ref('month')
const search    = ref('')
const filterTur = ref('')
const filterKat = ref('')
const data      = ref<any>({ jami: { kirim:0, chiqim:0, qoldiq:0, soni:0 }, kategoriyalar: [], harakatlar: [] })
const mijozlar  = ref<any[]>([])

const addModal = ref(false)
const saving   = ref(false)
const addErr   = ref('')
const addForm  = reactive({ tur: 'kirim', kategoriya: 'mijoz_tolov', summa: null as number|null, tolov_usul: 'naqt', mijoz_id: '', izoh: '' })

const lightbox = ref<string | null>(null)

const toastShow = ref(false)
const toastMsg  = ref('')
const toastType = ref('ok')
let toastTimer: ReturnType<typeof setTimeout>
function showToast(msg: string, type = 'ok') {
  clearTimeout(toastTimer)
  toastMsg.value = msg; toastType.value = type; toastShow.value = true
  toastTimer = setTimeout(() => { toastShow.value = false }, 2600)
}

const katOptions = computed(() => KAT_ALL.filter(k => k.tur === addForm.tur))

let debT: ReturnType<typeof setTimeout>
function debouncedLoad() { clearTimeout(debT); debT = setTimeout(load, 350) }

async function load() {
  loading.value = true
  try {
    const params: any = { period: period.value }
    if (filterTur.value) params.tur = filterTur.value
    if (filterKat.value) params.kategoriya = filterKat.value
    if (search.value) params.search = search.value
    data.value = await kassaApi.hisobot(params)
  } catch (e: any) {
    showToast(e.message || 'Yuklash xatosi', 'err')
  } finally {
    loading.value = false
  }
}

function toggleKatFilter(k: string) {
  filterKat.value = filterKat.value === k ? '' : k
  load()
}

function setTur(tur: string) {
  addForm.tur = tur
  addForm.kategoriya = KAT_ALL.find(k => k.tur === tur)?.key || ''
}
function openAdd(tur: string) {
  Object.assign(addForm, { tur, kategoriya: '', summa: null, tolov_usul: 'naqt', mijoz_id: '', izoh: '' })
  setTur(tur)
  addErr.value = ''
  addModal.value = true
}
async function saveAmal() {
  if (!addForm.summa || addForm.summa <= 0) { addErr.value = 'Summa kiriting'; return }
  if (addForm.kategoriya === 'mijoz_tolov' && !addForm.mijoz_id) { addErr.value = 'Mijoz tanlang'; return }
  saving.value = true; addErr.value = ''
  try {
    await kassaApi.create({
      tur: addForm.tur,
      kategoriya: addForm.kategoriya,
      summa: addForm.summa,
      tolov_usul: addForm.tolov_usul,
      mijoz_id: addForm.mijoz_id || null,
      izoh: addForm.izoh || null,
    })
    addModal.value = false
    showToast(addForm.tur === 'kirim' ? 'Kirim qo\'shildi' : 'Chiqim qo\'shildi')
    await load()
  } catch (e: any) {
    addErr.value = e.message || 'Xatolik'
  } finally {
    saving.value = false
  }
}

async function del(id: number) {
  if (!confirm('Bu kassa amalini o\'chirmoqchimisiz?')) return
  try {
    await kassaApi.delete(id)
    showToast('O\'chirildi')
    await load()
  } catch (e: any) {
    showToast(e.message || 'Xatolik', 'err')
  }
}
function canDelete(h: any) { return h.manba_tur === 'qol' || h.manba_tur === 'mijoz' }

// Hujjatga havola
function docLink(h: any) {
  if (h.manba_tur === 'ariza' && h.manba_id) return `/sotuvlar/buyurtmalar`
  if (h.manba_tur === 'prixod' && h.manba_id) return `/ombor/prixod/${h.manba_id}`
  if (h.manba_tur === 'yetkazuvchi' && h.manba_id) return `/yetkazuvchilar/${h.manba_id}`
  if (h.manba_tur === 'mijoz' && h.mijoz_id) return `/mijozlar`
  return null
}
function docLabel(h: any) {
  if (h.manba_tur === 'ariza') return 'Buyurtma'
  if (h.manba_tur === 'prixod') return 'Prixod'
  if (h.manba_tur === 'yetkazuvchi') return 'Yetkazuvchi'
  if (h.manba_tur === 'mijoz') return 'Mijoz'
  return ''
}
function goDoc(h: any) {
  const link = docLink(h)
  if (link) router.push(link)
}

function fmtSum(v: number) { return v ? Math.round(v).toLocaleString('uz-UZ') : '0' }
function fmtShort(v: number|string) {
  const n = parseFloat(String(v||0))
  if (!n) return '0'
  if (Math.abs(n) >= 1e9) return (n/1e9).toFixed(1)+' mlrd'
  if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(1)+' mln'
  if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(0)+' ming'
  return String(Math.round(n))
}
function usulLabel(u: string) { return ({ naqt:'Naqt', karta:'Karta', bank:'Bank' } as any)[u] || u }
function fmtDateTime(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return d.toLocaleDateString('uz-UZ', { day:'2-digit', month:'2-digit' }) + ' ' + d.toLocaleTimeString('uz-UZ', { hour:'2-digit', minute:'2-digit' })
}

async function loadMijozlar() {
  try { const sp = await arizaApi.spravochnik(); mijozlar.value = sp.mijozlar || [] } catch {}
}

onMounted(() => { load(); loadMijozlar() })
</script>

<style scoped>
.ks { display:flex; flex-direction:column; gap:16px; height:100%; min-height:0; }

.ks-hd { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.ks-title { font-size:20px; font-weight:900; color:#1e293b; margin:0 0 3px; }
.ks-sub { font-size:12.5px; color:#94a3b8; margin:0; }
.ks-hd-actions { display:flex; align-items:center; gap:10px; }
.ks-period { display:flex; background:#f1f5f9; border-radius:10px; padding:3px; gap:2px; }
.ks-pbtn { padding:6px 13px; border:none; background:transparent; border-radius:8px; font-size:12.5px; font-weight:600; color:#64748b; cursor:pointer; transition:.13s; }
.ks-pbtn.on { background:#fff; color:#1e293b; box-shadow:0 2px 6px rgba(0,0,0,.08); }
.ks-add-btn { display:inline-flex; align-items:center; gap:6px; height:36px; padding:0 16px; border-radius:10px; border:none; background:linear-gradient(135deg,#6366f1,#6366f1); color:#fff; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 3px 12px rgba(99,102,241,.28); transition:.13s; }
.ks-add-btn:hover { transform:translateY(-1px); }

.ks-kpi { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
.ks-kpi-card { background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; padding:16px; display:flex; align-items:center; gap:12px; }
.ks-kpi-card--bal { background:linear-gradient(135deg,#6366f1,#6366f1); border-color:transparent; }
.ks-kpi-ic { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ks-kpi-val { font-size:19px; font-weight:900; color:#1e293b; line-height:1; }
.ks-kpi-lbl { font-size:11.5px; color:#94a3b8; margin-top:4px; }

.ks-body { display:grid; grid-template-columns:280px 1fr; gap:14px; flex:1; min-height:0; overflow:hidden; }

.ks-cats { background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; padding:12px; display:flex; flex-direction:column; gap:3px; overflow-y:auto; }
.ks-cats-hd { font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:.05em; padding:4px 8px 8px; }
.ks-cat { display:flex; align-items:center; gap:8px; padding:9px 10px; border-radius:10px; cursor:pointer; border:1.5px solid transparent; transition:.12s; }
.ks-cat:hover { background:#f8fafc; }
.ks-cat.on { background:#eef2ff; border-color:#c7d2fe; }
.ks-cat-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.ks-cat-dot.kirim { background:#10b981; }
.ks-cat-dot.chiqim { background:#ef4444; }
.ks-cat-name { flex:1; font-size:12.5px; font-weight:600; color:#1e293b; }
.ks-cat-soni { font-size:10.5px; color:#94a3b8; background:#f1f5f9; padding:1px 6px; border-radius:8px; }
.ks-cat-sum { font-size:12.5px; font-weight:800; }
.ks-cat-sum.kirim { color:#10b981; }
.ks-cat-sum.chiqim { color:#ef4444; }

.ks-list-wrap { display:flex; flex-direction:column; gap:10px; overflow:hidden; }
.ks-list-toolbar { display:flex; align-items:center; gap:10px; flex-shrink:0; }
.ks-search { display:flex; align-items:center; gap:7px; background:#fff; border:1.5px solid #e2e8f0; border-radius:10px; padding:0 11px; height:36px; flex:1; transition:.12s; }
.ks-search:focus-within { border-color:#6366f1; }
.ks-search svg { color:#94a3b8; }
.ks-si { flex:1; border:none; outline:none; font-size:13px; color:#1e293b; background:transparent; }
.ks-tur-filter { display:flex; gap:4px; }
.ks-tf { padding:7px 13px; border:1.5px solid #e2e8f0; background:#fff; border-radius:9px; font-size:12px; font-weight:600; color:#64748b; cursor:pointer; transition:.12s; }
.ks-tf.on { border-color:#6366f1; background:#eef2ff; color:#6366f1; }
.ks-tf--in.on { border-color:#10b981; background:rgba(16,185,129,.08); color:#10b981; }
.ks-tf--out.on { border-color:#ef4444; background:rgba(239,68,68,.07); color:#ef4444; }

.ks-loading { display:flex; justify-content:center; padding:50px; }
.ks-spinner { width:32px; height:32px; border:3px solid #e2e8f0; border-top-color:#6366f1; border-radius:50%; animation:ks-rot .7s linear infinite; }
@keyframes ks-rot { to { transform:rotate(360deg) } }
.ks-empty { display:flex; flex-direction:column; align-items:center; gap:9px; padding:50px; color:#94a3b8; }
.ks-empty svg { opacity:.25; }
.ks-empty p { font-size:14px; font-weight:700; color:#64748b; margin:0; }

.ks-list { display:flex; flex-direction:column; gap:5px; overflow-y:auto; flex:1; }
.ks-list::-webkit-scrollbar { width:4px; }
.ks-list::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }

.ks-row { display:flex; align-items:center; gap:11px; background:#fff; border:1.5px solid #e8ecf8; border-radius:13px; padding:11px 14px; transition:.13s; }
.ks-row.link { cursor:pointer; }
.ks-row.link:hover { border-color:#c7d2fe; box-shadow:0 2px 10px rgba(99,102,241,.07); }
.ks-row-ic { width:36px; height:36px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.ks-row-ic.kirim { background:rgba(16,185,129,.1); color:#10b981; }
.ks-row-ic.chiqim { background:rgba(239,68,68,.1); color:#ef4444; }
.ks-row-body { flex:1; min-width:0; }
.ks-row-top { display:flex; align-items:center; gap:8px; }
.ks-row-kat { font-size:13px; font-weight:700; color:#1e293b; }
.ks-row-usul { font-size:10px; font-weight:600; color:#94a3b8; background:#f1f5f9; padding:1px 7px; border-radius:6px; }
.ks-row-sub { font-size:11.5px; color:#94a3b8; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ks-row-date { color:#cbd5e1; }
.ks-row-chek { width:34px; height:34px; border-radius:8px; object-fit:cover; flex-shrink:0; cursor:zoom-in; border:1.5px solid #e8ecf8; transition:.12s; }
.ks-row-chek:hover { border-color:#6366f1; transform:scale(1.05); }
.ks-lightbox { position:fixed; inset:0; background:rgba(15,23,42,.85); z-index:1000; display:flex; align-items:center; justify-content:center; padding:24px; cursor:zoom-out; }
.ks-lightbox img { max-width:92vw; max-height:88vh; border-radius:14px; box-shadow:0 20px 60px rgba(0,0,0,.5); }
.ks-lightbox-close { position:absolute; top:18px; right:22px; width:38px; height:38px; border:none; border-radius:50%; background:rgba(255,255,255,.15); color:#fff; font-size:16px; cursor:pointer; }
.ks-lightbox-close:hover { background:rgba(255,255,255,.3); }
.ks-row-right { display:flex; flex-direction:column; align-items:flex-end; gap:3px; flex-shrink:0; }
.ks-row-sum { font-size:14px; font-weight:800; }
.ks-row-sum.kirim { color:#10b981; }
.ks-row-sum.chiqim { color:#ef4444; }
.ks-row-link { display:flex; align-items:center; gap:2px; font-size:10.5px; font-weight:600; color:#6366f1; }
.ks-row-del { width:24px; height:24px; border-radius:6px; border:none; background:transparent; color:#cbd5e1; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.12s; }
.ks-row-del:hover { background:#fee2e2; color:#ef4444; }

.km-ov { position:fixed; inset:0; background:rgba(15,23,42,.5); backdrop-filter:blur(5px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px; }
.km-box { background:#fff; border-radius:18px; width:100%; max-width:440px; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 28px 80px rgba(0,0,0,.22); overflow:hidden; }
.km-fade-enter-active, .km-fade-leave-active { transition:opacity .18s, transform .18s; }
.km-fade-enter-from, .km-fade-leave-to { opacity:0; transform:scale(.97) translateY(8px); }
.km-hd { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid #f1f5f9; }
.km-title { font-size:15px; font-weight:800; color:#1e293b; }
.km-close { width:28px; height:28px; border-radius:7px; border:none; background:#f1f5f9; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; }
.km-close:hover { background:#fee2e2; color:#ef4444; }
.km-body { padding:16px 18px; display:flex; flex-direction:column; gap:12px; }
.km-tur { display:flex; gap:8px; }
.km-tur-btn { flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:11px; border-radius:10px; border:1.5px solid #e2e8f0; background:#fff; font-size:13px; font-weight:700; color:#64748b; cursor:pointer; transition:.12s; }
.km-tur-btn--in.on { border-color:#10b981; background:rgba(16,185,129,.08); color:#10b981; }
.km-tur-btn--out.on { border-color:#ef4444; background:rgba(239,68,68,.07); color:#ef4444; }
.km-field { display:flex; flex-direction:column; gap:5px; }
.km-field label { font-size:11.5px; font-weight:700; color:#374151; }
.km-in { height:38px; padding:0 11px; border:1.5px solid #e2e8f0; border-radius:9px; font-size:13.5px; color:#1e293b; outline:none; transition:.13s; box-sizing:border-box; }
.km-in:focus { border-color:#6366f1; }
.km-row2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.km-err { font-size:12px; color:#dc2626; background:#fef2f2; padding:8px 11px; border-radius:8px; }
.km-ft { display:flex; align-items:center; justify-content:space-between; padding:13px 18px; border-top:1px solid #f1f5f9; background:#f8fafc; }
.km-cancel { padding:8px 16px; border-radius:9px; border:1.5px solid #e2e8f0; background:#fff; font-size:13px; font-weight:600; color:#334155; cursor:pointer; }
.km-cancel:hover { background:#f1f5f9; }
.km-save { display:inline-flex; align-items:center; gap:7px; padding:8px 20px; border-radius:9px; border:none; color:#fff; font-size:13px; font-weight:700; cursor:pointer; transition:.13s; }
.km-save.kirim { background:linear-gradient(135deg,#10b981,#059669); box-shadow:0 3px 12px rgba(16,185,129,.3); }
.km-save.chiqim { background:linear-gradient(135deg,#ef4444,#dc2626); box-shadow:0 3px 12px rgba(239,68,68,.3); }
.km-save:hover:not(:disabled) { transform:translateY(-1px); }
.km-save:disabled { opacity:.45; cursor:not-allowed; box-shadow:none; transform:none; }
.ks-spin-sm { width:13px; height:13px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:ks-rot .6s linear infinite; }

.ks-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); padding:11px 20px; border-radius:12px; z-index:1100; font-size:13.5px; font-weight:600; color:#fff; box-shadow:0 8px 32px rgba(0,0,0,.15); }
.ks-toast.ok { background:linear-gradient(135deg,#10b981,#059669); }
.ks-toast.err { background:linear-gradient(135deg,#ef4444,#dc2626); }
.toast-enter-active, .toast-leave-active { transition:opacity .22s, transform .22s; }
.toast-enter-from { opacity:0; transform:translateX(-50%) translateY(14px); }
.toast-leave-to   { opacity:0; transform:translateX(-50%) translateY(14px); }

@media(max-width:1000px) { .ks-kpi { grid-template-columns:1fr 1fr; } .ks-body { grid-template-columns:1fr; } .ks-cats { max-height:none; } }
</style>
