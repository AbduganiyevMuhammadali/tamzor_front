<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../api/api.js'

const router = useRouter()

const loading = ref(false)
const rows    = ref([])
const total   = ref(0)
const page    = ref(1)
const limit   = 50

const filter = reactive({ search: '' })
let searchTimer = null

const modalOpen = ref(false)
const modalMode = ref('create') // 'create' | 'edit'
const saving    = ref(false)
const errMsg    = ref('')
const editId    = ref(null)

const form = reactive({ ism: '', telefon: '', manzil: '', izoh: '' })

/* Tepadagi ikki ro'yxat: haqdor (biz qarzdormiz) va qarzdor (bizga qarz — avans) yetkazuvchilar */
const qoldiq = ref(null)
const hammasiOchiq = reactive({ haqdor: false, qarzdor: false })
const KORSAT = 6
async function loadQoldiq() {
  try { qoldiq.value = await api.get('/yetkazuvchilar/qoldiqlar') } catch { qoldiq.value = null }
}
function qoldiqRoyxat(tur) {
  const r = qoldiq.value?.[tur] || []
  return hammasiOchiq[tur] ? r : r.slice(0, KORSAT)
}
function kunOldin(s) {
  if (!s) return ''
  const k = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
  return k <= 0 ? 'bugun' : k === 1 ? 'kecha' : `${k} kun oldin`
}

async function loadData() {
  loading.value = true
  try {
    const p = new URLSearchParams({ page: page.value, limit })
    if (filter.search) p.set('search', filter.search)
    const d = await api.get(`/yetkazuvchilar?${p}`)
    rows.value  = d.data  ?? []
    total.value = d.total ?? 0
  } finally { loading.value = false }
}

onMounted(() => { loadData(); loadQoldiq() })

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; loadData() }, 300)
}

function openCreate() {
  modalMode.value = 'create'
  editId.value    = null
  Object.assign(form, { ism: '', telefon: '', manzil: '', izoh: '' })
  errMsg.value    = ''
  modalOpen.value = true
}

function openEdit(y) {
  modalMode.value = 'edit'
  editId.value    = y.id
  Object.assign(form, { ism: y.ism || '', telefon: y.telefon || '', manzil: y.manzil || '', izoh: y.izoh || '' })
  errMsg.value    = ''
  modalOpen.value = true
}

async function saveForm() {
  if (!form.ism.trim()) { errMsg.value = 'Ism kiritilmagan'; return }
  saving.value = true
  errMsg.value = ''
  try {
    if (modalMode.value === 'create') {
      await api.post('/yetkazuvchilar', { ism: form.ism, telefon: form.telefon || null, manzil: form.manzil || null, izoh: form.izoh || null })
    } else {
      await api.patch(`/yetkazuvchilar/${editId.value}`, { ism: form.ism, telefon: form.telefon || null, manzil: form.manzil || null, izoh: form.izoh || null })
    }
    modalOpen.value = false
    loadData(); loadQoldiq()
  } catch (e) {
    errMsg.value = e.message || 'Xatolik'
  } finally { saving.value = false }
}

async function deleteRow(y) {
  if (!confirm(`"${y.ism}" ni o'chirasizmi?`)) return
  try {
    await api.delete(`/yetkazuvchilar/${y.id}`)
    loadData()
  } catch (e) { alert(e.message) }
}

const pages = computed(() => Math.ceil(total.value / limit) || 1)

function fmtSum(n) { return Number(n || 0).toLocaleString('uz-UZ') }

/* balans < 0 — yetkazuvchi haqdor (biz unga qarzmiz); balans > 0 — yetkazuvchi qarzdor (biz oldindan/ortiqcha to'laganmiz) */
function balansInfo(b) {
  b = Number(b)
  if (b < 0) return { label: 'Haqdor · biz qarzdormiz', cls: 'yb--red',   summa: Math.abs(b) }
  if (b > 0) return { label: 'Qarzdor · bizga qarz',    cls: 'yb--green', summa: b }
  return           { label: 'Toza',                    cls: 'yb--gray',  summa: 0 }
}
</script>

<template>
  <div class="yl">

    <!-- HEADER -->
    <div class="yl-header">
      <div class="yl-header-l">
        <div class="yl-icon">
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zM9 12a5 5 0 00-10 0v1h10v-1zm8 0a5 5 0 00-10 0v1h10v-1z"/></svg>
        </div>
        <div>
          <h1 class="yl-title">Yetkazuvchilar</h1>
          <p class="yl-sub">Kontragentlar va moliyaviy hisob-kitoblar</p>
        </div>
      </div>
      <div class="yl-header-r">
        <div class="yl-srch">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
          <input v-model="filter.search" @input="onSearch" class="yl-srch-in" placeholder="Qidirish..."/>
        </div>
        <button class="yl-btn yl-btn--primary" @click="openCreate">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
          Yangi yetkazuvchi
        </button>
      </div>
    </div>

    <!-- HAQDOR / QARZDOR — hisob-kitob holati bir qarashda -->
    <div v-if="qoldiq" class="yl-qoldiq">
      <div class="yl-q yl-q--haqdor">
        <div class="yl-q-head">
          <span class="yl-q-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
          </span>
          <div class="yl-q-t">
            <b>Haqdor yetkazuvchilar</b>
            <span>Biz qarzdormiz — tovar olingan, to'lanmagan</span>
          </div>
          <div class="yl-q-sum">
            <b>{{ fmtSum(qoldiq.jami.haqdor) }}</b>
            <span>so'm · {{ qoldiq.jami.haqdorSoni }} ta</span>
          </div>
        </div>
        <div v-if="!qoldiq.haqdor.length" class="yl-q-empty">Hech kimga qarzimiz yo'q</div>
        <div v-else class="yl-q-list">
          <button v-for="r in qoldiqRoyxat('haqdor')" :key="r.id" class="yl-q-row" @click="router.push(`/yetkazuvchilar/${r.id}`)">
            <span class="yl-q-av">{{ (r.ism || '?')[0] }}</span>
            <span class="yl-q-nm"><b>{{ r.ism }}</b><small>{{ r.telefon || '—' }}<template v-if="r.oxirgi_tolov"> · oxirgi to'lov {{ kunOldin(r.oxirgi_tolov) }}</template><template v-else-if="r.oxirgi_harakat"> · {{ kunOldin(r.oxirgi_harakat) }}</template></small></span>
            <span class="yl-q-amt">{{ fmtSum(r.summa) }}</span>
          </button>
          <button v-if="qoldiq.haqdor.length > KORSAT" class="yl-q-more" @click="hammasiOchiq.haqdor = !hammasiOchiq.haqdor">
            {{ hammasiOchiq.haqdor ? 'Qisqartirish' : `Yana ${qoldiq.haqdor.length - KORSAT} ta` }}
          </button>
        </div>
      </div>

      <div class="yl-q yl-q--qarzdor">
        <div class="yl-q-head">
          <span class="yl-q-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
          </span>
          <div class="yl-q-t">
            <b>Qarzdor yetkazuvchilar</b>
            <span>Bizga qarz — oldindan yoki ortiqcha to'langan (avans)</span>
          </div>
          <div class="yl-q-sum">
            <b>{{ fmtSum(qoldiq.jami.qarzdor) }}</b>
            <span>so'm · {{ qoldiq.jami.qarzdorSoni }} ta</span>
          </div>
        </div>
        <div v-if="!qoldiq.qarzdor.length" class="yl-q-empty">Bizga qarz yetkazuvchi yo'q</div>
        <div v-else class="yl-q-list">
          <button v-for="r in qoldiqRoyxat('qarzdor')" :key="r.id" class="yl-q-row" @click="router.push(`/yetkazuvchilar/${r.id}`)">
            <span class="yl-q-av">{{ (r.ism || '?')[0] }}</span>
            <span class="yl-q-nm"><b>{{ r.ism }}</b><small>{{ r.telefon || '—' }}<template v-if="r.oxirgi_harakat"> · {{ kunOldin(r.oxirgi_harakat) }}</template></small></span>
            <span class="yl-q-amt">{{ fmtSum(r.summa) }}</span>
          </button>
          <button v-if="qoldiq.qarzdor.length > KORSAT" class="yl-q-more" @click="hammasiOchiq.qarzdor = !hammasiOchiq.qarzdor">
            {{ hammasiOchiq.qarzdor ? 'Qisqartirish' : `Yana ${qoldiq.qarzdor.length - KORSAT} ta` }}
          </button>
        </div>
      </div>
    </div>

    <!-- TABLE CARD -->
    <div class="yl-card">
      <div class="yl-card-head">
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zM9 12a5 5 0 00-10 0v1h10v-1zm8 0a5 5 0 00-10 0v1h10v-1z"/></svg>
        Yetkazuvchilar ro'yxati
        <span class="yl-chip">{{ total }} ta</span>
      </div>

      <div class="yl-tbl-wrap">
        <div v-if="loading" class="yl-loading">
          <span class="yl-spin"/> Yuklanmoqda...
        </div>
        <table v-else class="yl-tbl">
          <thead>
            <tr>
              <th class="yl-th yl-th--num">#</th>
              <th class="yl-th">Ism</th>
              <th class="yl-th">Telefon</th>
              <th class="yl-th">Manzil</th>
              <th class="yl-th yl-th--r">Balans</th>
              <th class="yl-th">Holat</th>
              <th class="yl-th yl-th--act"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="rows.length === 0">
              <td colspan="7" class="yl-td-empty">Yetkazuvchilar topilmadi</td>
            </tr>
            <tr v-for="(y, i) in rows" :key="y.id" class="yl-tr" @click="router.push(`/yetkazuvchilar/${y.id}`)" style="cursor:pointer">
              <td class="yl-td yl-td--num">{{ (page - 1) * limit + i + 1 }}</td>
              <td class="yl-td">
                <div class="yl-ism-row">
                  <div class="yl-av">{{ (y.ism || '?').charAt(0).toUpperCase() }}</div>
                  <div>
                    <div class="yl-ism">{{ y.ism }}</div>
                    <div v-if="y.izoh" class="yl-izoh">{{ y.izoh }}</div>
                  </div>
                </div>
              </td>
              <td class="yl-td yl-td--mono">{{ y.telefon || '—' }}</td>
              <td class="yl-td yl-td--muted">{{ y.manzil || '—' }}</td>
              <td class="yl-td yl-td--r yl-td--mono yl-td--balans" :class="Number(y.balans) < 0 ? 'yl-red' : Number(y.balans) > 0 ? 'yl-green' : ''">
                {{ fmtSum(Math.abs(Number(y.balans))) }}
              </td>
              <td class="yl-td">
                <span class="yl-badge" :class="balansInfo(y.balans).cls">{{ balansInfo(y.balans).label }}</span>
              </td>
              <td class="yl-td yl-td--act" @click.stop>
                <button class="yl-act-btn" @click="openEdit(y)" title="Tahrirlash">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                </button>
                <button class="yl-act-btn yl-act-btn--del" @click="deleteRow(y)" title="O'chirish">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="pages > 1" class="yl-pag">
        <button class="yl-pag-btn" :disabled="page <= 1" @click="page--; loadData()">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
        </button>
        <span class="yl-pag-info">{{ page }} / {{ pages }}</span>
        <button class="yl-pag-btn" :disabled="page >= pages" @click="page++; loadData()">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
        </button>
      </div>
    </div>

    <!-- MODAL -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="modalOpen" class="yl-overlay" @click.self="modalOpen = false">
          <div class="yl-modal">
            <div class="yl-modal-head">
              <h3 class="yl-modal-title">{{ modalMode === 'create' ? 'Yangi yetkazuvchi' : 'Tahrirlash' }}</h3>
              <button class="yl-modal-close" @click="modalOpen = false">
                <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
              </button>
            </div>
            <div class="yl-modal-body">
              <div v-if="errMsg" class="yl-err">{{ errMsg }}</div>
              <div class="yl-mfield">
                <label class="yl-mlbl">Ism / Kompaniya nomi *</label>
                <input v-model="form.ism" class="yl-min" placeholder="Yetkazuvchi nomi"/>
              </div>
              <div class="yl-mfield">
                <label class="yl-mlbl">Telefon</label>
                <input v-model="form.telefon" class="yl-min" placeholder="+998 90 000 00 00"/>
              </div>
              <div class="yl-mfield">
                <label class="yl-mlbl">Manzil</label>
                <input v-model="form.manzil" class="yl-min" placeholder="Shahar, ko'cha..."/>
              </div>
              <div class="yl-mfield">
                <label class="yl-mlbl">Izoh</label>
                <textarea v-model="form.izoh" class="yl-mta" rows="2" placeholder="Qo'shimcha ma'lumot..."/>
              </div>
            </div>
            <div class="yl-modal-foot">
              <button class="yl-btn yl-btn--ghost" @click="modalOpen = false">Bekor</button>
              <button class="yl-btn yl-btn--primary" @click="saveForm" :disabled="saving">
                <span v-if="saving" class="yl-spin yl-spin--sm"/>
                {{ modalMode === 'create' ? 'Qo\'shish' : 'Saqlash' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.yl { display:flex; flex-direction:column; gap:20px; }

.yl-header { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
/* Haqdor / qarzdor bloklari */
.yl-qoldiq { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.yl-q { background:var(--card-bg,#fff); border:1px solid var(--card-border,#e5e7eb); border-radius:16px; padding:14px 16px; display:flex; flex-direction:column; gap:10px; }
.yl-q--haqdor { border-top:3px solid #ef4444; } .yl-q--qarzdor { border-top:3px solid #10b981; }
.yl-q-head { display:flex; align-items:center; gap:12px; }
.yl-q-ic { width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.yl-q-ic svg { width:20px; height:20px; }
.yl-q--haqdor .yl-q-ic { background:#fee2e2; color:#dc2626; } .yl-q--qarzdor .yl-q-ic { background:#d1fae5; color:#059669; }
.yl-q-t { display:flex; flex-direction:column; flex:1; min-width:0; }
.yl-q-t b { font-size:14px; font-weight:800; color:var(--title,#111827); } .yl-q-t span { font-size:11.5px; color:var(--muted,#9ca3af); }
.yl-q-sum { text-align:right; display:flex; flex-direction:column; }
.yl-q-sum b { font-size:18px; font-weight:800; font-variant-numeric:tabular-nums; } .yl-q-sum span { font-size:11px; color:var(--muted,#9ca3af); }
.yl-q--haqdor .yl-q-sum b { color:#dc2626; } .yl-q--qarzdor .yl-q-sum b { color:#059669; }
.yl-q-list { display:flex; flex-direction:column; }
.yl-q-row { display:flex; align-items:center; gap:10px; padding:8px 6px; border:none; border-top:1px solid var(--card-border,#f1f5f9); background:none; cursor:pointer; text-align:left; border-radius:8px; width:100%; }
.yl-q-row:hover { background:var(--mini-bg,#f8fafc); }
.yl-q-av { width:30px; height:30px; border-radius:9px; background:#f5f3ff; color:#7c3aed; font-weight:800; font-size:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.yl-q-nm { flex:1; min-width:0; display:flex; flex-direction:column; }
.yl-q-nm b { font-size:13px; font-weight:700; color:var(--title,#111827); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.yl-q-nm small { font-size:11px; color:var(--muted,#9ca3af); }
.yl-q-amt { font-size:13.5px; font-weight:800; font-variant-numeric:tabular-nums; white-space:nowrap; }
.yl-q--haqdor .yl-q-amt { color:#dc2626; } .yl-q--qarzdor .yl-q-amt { color:#059669; }
.yl-q-more { border:none; background:none; color:#7c3aed; font-weight:700; font-size:12.5px; cursor:pointer; padding:8px 6px; text-align:left; }
.yl-q-more:hover { text-decoration:underline; }
.yl-q-empty { font-size:12.5px; color:var(--muted,#9ca3af); padding:6px 2px 2px; }
@media (max-width: 900px) { .yl-qoldiq { grid-template-columns:1fr; } }
.yl-header-l { display:flex; align-items:center; gap:14px; }
.yl-header-r { display:flex; align-items:center; gap:10px; }
.yl-icon { width:44px; height:44px; border-radius:13px; background:linear-gradient(135deg,rgba(139,92,246,.15),rgba(139,92,246,.15)); border:1.5px solid rgba(139,92,246,.2); display:flex; align-items:center; justify-content:center; color:#8b5cf6; flex-shrink:0; }
.yl-icon svg { width:20px; height:20px; }
.yl-title { font-size:22px; font-weight:800; color:var(--title,#111827); margin:0; letter-spacing:-.3px; }
.yl-sub   { font-size:12px; color:var(--muted,#9ca3af); margin:2px 0 0; }

.yl-srch { display:flex; align-items:center; gap:8px; height:38px; padding:0 12px; border:1.5px solid var(--card-border,#e5e7eb); border-radius:10px; background:var(--card-bg,#fff); transition:.12s; }
.yl-srch:focus-within { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,.1); }
.yl-srch svg { width:14px; height:14px; color:var(--muted,#9ca3af); flex-shrink:0; }
.yl-srch-in { border:none; background:transparent; outline:none; font-size:13px; color:var(--body,#374151); width:180px; font-family:inherit; }
.yl-srch-in::placeholder { color:var(--muted,#9ca3af); }

.yl-btn { display:inline-flex; align-items:center; gap:6px; height:38px; padding:0 16px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; border:none; transition:.12s; }
.yl-btn svg { width:14px; height:14px; }
.yl-btn:disabled { opacity:.45; cursor:not-allowed; }
.yl-btn--primary { background:linear-gradient(135deg,#8b5cf6,#7c3aed); color:#fff; box-shadow:0 2px 8px rgba(139,92,246,.3); }
.yl-btn--primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 4px 14px rgba(139,92,246,.4); }
.yl-btn--ghost { border:1.5px solid var(--card-border,#e5e7eb); background:transparent; color:var(--muted,#9ca3af); }
.yl-btn--ghost:hover { background:var(--mini-bg,#f8fafc); }

.yl-card { background:var(--card-bg,#fff); border:1.5px solid var(--card-border,#e5e7eb); border-radius:16px; overflow:hidden; }
.yl-card-head { display:flex; align-items:center; gap:8px; padding:14px 18px 12px; font-size:11px; font-weight:700; color:var(--muted,#9ca3af); text-transform:uppercase; letter-spacing:.05em; border-bottom:1.5px solid var(--card-border,#e5e7eb); }
.yl-card-head svg { width:14px; height:14px; }
.yl-chip { margin-left:auto; padding:2px 9px; border-radius:99px; background:rgba(139,92,246,.08); border:1px solid rgba(139,92,246,.15); color:#8b5cf6; font-size:11px; font-weight:700; }

.yl-tbl-wrap { overflow-x:auto; }
.yl-loading { display:flex; align-items:center; gap:10px; justify-content:center; padding:48px; color:var(--muted,#9ca3af); font-size:13px; }
.yl-spin { display:inline-block; width:18px; height:18px; border:2px solid var(--card-border,#e5e7eb); border-top-color:#8b5cf6; border-radius:50%; animation:spin .7s linear infinite; }
.yl-spin--sm { width:14px; height:14px; border-width:1.5px; }
@keyframes spin { to { transform:rotate(360deg); } }
.yl-tbl { width:100%; border-collapse:collapse; font-size:13px; min-width:700px; }
.yl-th { padding:10px 14px; font-size:10px; font-weight:700; color:var(--muted,#9ca3af); text-transform:uppercase; letter-spacing:.05em; background:var(--mini-bg,#f8fafc); border-bottom:1.5px solid var(--card-border,#e5e7eb); text-align:left; white-space:nowrap; }
.yl-th--num { width:44px; text-align:center; }
.yl-th--r   { text-align:right; }
.yl-th--act { width:80px; }
.yl-tr { border-bottom:1px solid var(--card-border,#e5e7eb); transition:background .1s; }
.yl-tr:hover { background:rgba(139,92,246,.03); }
.yl-td { padding:12px 14px; color:var(--body,#374151); vertical-align:middle; }
.yl-td--num   { text-align:center; color:var(--muted,#9ca3af); font-size:12px; }
.yl-td--mono  { font-variant-numeric:tabular-nums; }
.yl-td--muted { color:var(--muted,#9ca3af); font-size:12px; }
.yl-td--r     { text-align:right; }
.yl-td--balans { font-weight:700; font-size:14px; }
.yl-td--act   { width:80px; }
.yl-td-empty  { text-align:center; padding:48px; color:var(--muted,#9ca3af); font-size:13px; }
.yl-red   { color:#ef4444; }
.yl-green { color:#10b981; }

.yl-ism-row { display:flex; align-items:center; gap:10px; }
.yl-av { width:34px; height:34px; border-radius:10px; background:linear-gradient(135deg,#8b5cf6,#8b5cf6); color:#fff; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.yl-ism  { font-weight:700; font-size:13.5px; color:var(--title,#111827); }
.yl-izoh { font-size:11px; color:var(--muted,#9ca3af); margin-top:1px; }

.yl-badge { padding:3px 10px; border-radius:99px; font-size:11px; font-weight:700; }
.yb--red   { background:rgba(239,68,68,.1);   color:#ef4444; border:1px solid rgba(239,68,68,.2); }
.yb--green { background:rgba(16,185,129,.1);  color:#10b981; border:1px solid rgba(16,185,129,.2); }
.yb--gray  { background:rgba(156,163,175,.1); color:#9ca3af; border:1px solid rgba(156,163,175,.2); }

.yl-act-btn { width:30px; height:30px; border-radius:7px; border:none; background:transparent; color:var(--muted,#9ca3af); cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:.12s; }
.yl-act-btn:hover { background:rgba(139,92,246,.1); color:#8b5cf6; }
.yl-act-btn--del:hover { background:rgba(239,68,68,.1); color:#ef4444; }
.yl-act-btn svg { width:14px; height:14px; }

.yl-pag { display:flex; align-items:center; justify-content:center; gap:12px; padding:14px; border-top:1.5px solid var(--card-border,#e5e7eb); }
.yl-pag-btn { width:32px; height:32px; border-radius:8px; border:1.5px solid var(--card-border,#e5e7eb); background:var(--card-bg,#fff); color:var(--muted,#9ca3af); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.12s; }
.yl-pag-btn:hover:not(:disabled) { border-color:#8b5cf6; color:#8b5cf6; }
.yl-pag-btn:disabled { opacity:.35; cursor:not-allowed; }
.yl-pag-btn svg { width:14px; height:14px; }
.yl-pag-info { font-size:13px; font-weight:600; color:var(--muted,#9ca3af); }

/* Modal */
.yl-overlay { position:fixed; inset:0; z-index:1000; background:rgba(15,23,42,.5); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:20px; }
.yl-modal { background:var(--card-bg,#fff); border:1.5px solid var(--card-border,#e5e7eb); border-radius:20px; width:100%; max-width:440px; box-shadow:0 24px 80px rgba(0,0,0,.2); overflow:hidden; }
.yl-modal-head { display:flex; align-items:center; justify-content:space-between; padding:20px 20px 16px; border-bottom:1.5px solid var(--card-border,#e5e7eb); }
.yl-modal-title { font-size:16px; font-weight:800; color:var(--title,#111827); margin:0; }
.yl-modal-close { width:32px; height:32px; border-radius:9px; border:1.5px solid var(--card-border,#e5e7eb); background:transparent; color:var(--muted,#9ca3af); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.12s; }
.yl-modal-close:hover { background:rgba(239,68,68,.08); color:#ef4444; border-color:rgba(239,68,68,.2); }
.yl-modal-close svg { width:13px; height:13px; }
.yl-modal-body { padding:20px; display:flex; flex-direction:column; gap:14px; }
.yl-modal-foot { display:flex; align-items:center; justify-content:flex-end; gap:10px; padding:16px 20px; border-top:1.5px solid var(--card-border,#e5e7eb); background:var(--mini-bg,#f8fafc); }
.yl-mfield { display:flex; flex-direction:column; gap:5px; }
.yl-mlbl { font-size:10px; font-weight:700; color:var(--muted,#9ca3af); text-transform:uppercase; letter-spacing:.05em; }
.yl-min { height:38px; padding:0 11px; border-radius:9px; border:1.5px solid var(--card-border,#e5e7eb); background:var(--card-bg,#fff); color:var(--body,#374151); font-size:13px; outline:none; font-family:inherit; transition:.12s; }
.yl-min:focus { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,.1); }
.yl-mta { padding:9px 11px; border-radius:9px; border:1.5px solid var(--card-border,#e5e7eb); background:var(--card-bg,#fff); color:var(--body,#374151); font-size:13px; outline:none; font-family:inherit; resize:vertical; transition:.12s; }
.yl-mta:focus { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,.1); }
.yl-err { background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.2); color:#ef4444; padding:9px 13px; border-radius:9px; font-size:13px; }

.modal-enter-active, .modal-leave-active { transition:.2s ease; }
.modal-enter-from, .modal-leave-to { opacity:0; }
.modal-enter-active .yl-modal, .modal-leave-active .yl-modal { transition:.2s ease; }
.modal-enter-from .yl-modal, .modal-leave-to .yl-modal { transform:scale(.95) translateY(10px); }
</style>
