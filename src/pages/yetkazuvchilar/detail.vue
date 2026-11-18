<template>
  <div class="yd-page">
    <!-- Header -->
    <div class="yd-header">
      <button class="yd-back" @click="router.push('/yetkazuvchilar')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Orqaga
      </button>
      <div class="yd-header-actions">
        <button class="yd-btn yd-btn--pay" @click="openTolov" v-if="yetkazuvchi">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          To'lov qilish
        </button>
        <button class="yd-btn yd-btn--edit" @click="openEdit" v-if="yetkazuvchi">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Tahrirlash
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div class="yd-loading" v-if="loading">
      <div class="yd-spinner"></div>
    </div>

    <template v-else-if="yetkazuvchi">
      <!-- Info Card -->
      <div class="yd-card">
        <div class="yd-card-left">
          <div class="yd-avatar">{{ yetkazuvchi.ism?.charAt(0)?.toUpperCase() }}</div>
          <div class="yd-info">
            <h2 class="yd-name">{{ yetkazuvchi.ism }}</h2>
            <div class="yd-meta" v-if="yetkazuvchi.telefon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.22 6.22l.91-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16.92z"/>
              </svg>
              {{ yetkazuvchi.telefon }}
            </div>
            <div class="yd-meta" v-if="yetkazuvchi.manzil">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {{ yetkazuvchi.manzil }}
            </div>
            <div class="yd-meta yd-meta--note" v-if="yetkazuvchi.izoh">
              {{ yetkazuvchi.izoh }}
            </div>
          </div>
        </div>

        <div class="yd-balans-block">
          <div class="yd-balans-label">Balans holati</div>
          <div class="yd-balans-val" :class="balansInfo.cls">
            {{ balansInfo.sign }}{{ formatSum(Math.abs(parseFloat(yetkazuvchi.balans || 0))) }}
            <span>so'm</span>
          </div>
          <div class="yd-balans-badge" :class="balansInfo.badgeCls">{{ balansInfo.label }}</div>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="yd-stats">
        <div class="yd-stat">
          <div class="yd-stat-val">{{ formatSum(stats.jami_qarz) }}</div>
          <div class="yd-stat-lbl">Jami qarz (so'm)</div>
        </div>
        <div class="yd-stat">
          <div class="yd-stat-val yd-stat-val--green">{{ formatSum(stats.jami_tolov) }}</div>
          <div class="yd-stat-lbl">Jami to'lov (so'm)</div>
        </div>
        <div class="yd-stat">
          <div class="yd-stat-val">{{ stats.prixodlar }}</div>
          <div class="yd-stat-lbl">Prixodlar soni</div>
        </div>
        <div class="yd-stat">
          <div class="yd-stat-val">{{ stats.tolovlar }}</div>
          <div class="yd-stat-lbl">To'lovlar soni</div>
        </div>
      </div>

      <!-- Harakatlar Table -->
      <div class="yd-section">
        <div class="yd-section-head">
          <h3 class="yd-section-title">Harakatlar tarixi</h3>
          <span class="yd-count">{{ total }} ta</span>
        </div>

        <div class="yd-table-wrap">
          <table class="yd-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Sana</th>
                <th>Tur</th>
                <th>Summa</th>
                <th>To'lov turi</th>
                <th>Izoh</th>
                <th>Prixod</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingH">
                <td colspan="7" class="yd-empty">
                  <div class="yd-spinner yd-spinner--sm"></div>
                </td>
              </tr>
              <tr v-else-if="harakatlar.length === 0">
                <td colspan="7" class="yd-empty">Harakatlar yo'q</td>
              </tr>
              <tr v-for="(h, i) in harakatlar" :key="h.id" class="yd-tr">
                <td class="yd-td-num">{{ (page - 1) * limit + i + 1 }}</td>
                <td>{{ formatDate(h.sana || h.createdAt) }}</td>
                <td>
                  <span class="yd-chip" :class="h.tur === 'qarz' ? 'yd-chip--red' : 'yd-chip--green'">
                    {{ h.tur === 'qarz' ? 'Qarz' : "To'lov" }}
                  </span>
                </td>
                <td class="yd-td-sum" :class="h.tur === 'qarz' ? 'yd-sum--red' : 'yd-sum--green'">
                  {{ h.tur === 'qarz' ? '−' : '+' }}{{ formatSum(h.summa) }}
                </td>
                <td>
                  <span class="yd-ttur" v-if="h.tolov_turi">{{ tolovTurLabel(h.tolov_turi) }}</span>
                  <span class="yd-dash" v-else>—</span>
                </td>
                <td class="yd-td-izoh">{{ h.izoh || '—' }}</td>
                <td>
                  <a v-if="h.prixod_id" class="yd-prixod-link" @click="router.push(`/ombor/prixod/${h.prixod_id}`)">
                    #{{ h.prixod_id }}
                  </a>
                  <span class="yd-dash" v-else>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="yd-pagination" v-if="totalPages > 1">
          <button class="yd-pag-btn" :disabled="page === 1" @click="changePage(page - 1)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="yd-pag-info">{{ page }} / {{ totalPages }}</span>
          <button class="yd-pag-btn" :disabled="page === totalPages" @click="changePage(page + 1)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </template>

    <!-- Not found -->
    <div class="yd-not-found" v-else>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>Yetkazuvchi topilmadi</p>
    </div>

    <!-- To'lov Modal -->
    <Teleport to="body">
      <div class="yd-overlay" v-if="tolovModal" @click.self="closeTolov">
        <div class="yd-modal">
          <div class="yd-modal-head">
            <h3>To'lov qilish</h3>
            <button class="yd-modal-close" @click="closeTolov">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="yd-modal-body">
            <div class="yd-current-debt" v-if="yetkazuvchi">
              <div class="yd-debt-row">
                <span>Joriy balans:</span>
                <strong :class="balansInfo.cls">
                  {{ balansInfo.sign }}{{ formatSum(Math.abs(parseFloat(yetkazuvchi.balans || 0))) }} so'm
                </strong>
              </div>
            </div>

            <div class="yd-form-group">
              <label>Summa (so'm) <span class="yd-req">*</span></label>
              <NumberInput
                css-class="yd-input"
                v-model="tolovForm.summa"
                :bosh="''"
                placeholder="0"
                ref="summaInput"
              />
              <div class="yd-hint" v-if="remainingDebt !== null">
                Qarz: {{ formatSum(Math.abs(remainingDebt)) }} so'm
              </div>
            </div>

            <div class="yd-form-group">
              <label>To'lov turi <span class="yd-req">*</span></label>
              <div class="yd-radio-group">
                <label class="yd-radio" :class="{ 'yd-radio--active': tolovForm.tolov_turi === 'naqt' }">
                  <input type="radio" v-model="tolovForm.tolov_turi" value="naqt" />
                  <span>Naqt</span>
                </label>
                <label class="yd-radio" :class="{ 'yd-radio--active': tolovForm.tolov_turi === 'optom' }">
                  <input type="radio" v-model="tolovForm.tolov_turi" value="optom" />
                  <span>Optom</span>
                </label>
                <label class="yd-radio" :class="{ 'yd-radio--active': tolovForm.tolov_turi === 'chaka' }">
                  <input type="radio" v-model="tolovForm.tolov_turi" value="chaka" />
                  <span>Chaka</span>
                </label>
              </div>
            </div>

            <div class="yd-form-group">
              <label>Sana</label>
              <input type="date" class="yd-input" v-model="tolovForm.sana" />
            </div>

            <div class="yd-form-group">
              <label>Izoh</label>
              <textarea class="yd-input yd-textarea" v-model="tolovForm.izoh" placeholder="Ixtiyoriy..." rows="2"></textarea>
            </div>
          </div>

          <div class="yd-modal-foot">
            <button class="yd-btn yd-btn--cancel" @click="closeTolov">Bekor qilish</button>
            <button class="yd-btn yd-btn--save" @click="submitTolov" :disabled="savingTolov">
              <span class="yd-spinner yd-spinner--sm" v-if="savingTolov"></span>
              <span v-else>Saqlash</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div class="yd-overlay" v-if="editModal" @click.self="closeEdit">
        <div class="yd-modal">
          <div class="yd-modal-head">
            <h3>Tahrirlash</h3>
            <button class="yd-modal-close" @click="closeEdit">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="yd-modal-body">
            <div class="yd-form-group">
              <label>Ism <span class="yd-req">*</span></label>
              <input type="text" class="yd-input" v-model="editForm.ism" placeholder="To'liq ism" />
            </div>
            <div class="yd-form-group">
              <label>Telefon</label>
              <input type="text" class="yd-input" v-model="editForm.telefon" placeholder="+998 __ ___ __ __" />
            </div>
            <div class="yd-form-group">
              <label>Manzil</label>
              <input type="text" class="yd-input" v-model="editForm.manzil" placeholder="Shahar, ko'cha..." />
            </div>
            <div class="yd-form-group">
              <label>Izoh</label>
              <textarea class="yd-input yd-textarea" v-model="editForm.izoh" placeholder="Ixtiyoriy..." rows="2"></textarea>
            </div>
          </div>

          <div class="yd-modal-foot">
            <button class="yd-btn yd-btn--cancel" @click="closeEdit">Bekor qilish</button>
            <button class="yd-btn yd-btn--save" @click="submitEdit" :disabled="savingEdit">
              <span class="yd-spinner yd-spinner--sm" v-if="savingEdit"></span>
              <span v-else>Saqlash</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import NumberInput from '@/components/NumberInput.vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/api'

const route = useRoute()
const router = useRouter()
const id = route.params.id

const yetkazuvchi = ref(null)
const loading = ref(true)
const harakatlar = ref([])
const loadingH = ref(false)
const total = ref(0)
const page = ref(1)
const limit = 15

const stats = ref({ jami_qarz: 0, jami_tolov: 0, prixodlar: 0, tolovlar: 0 })

const tolovModal = ref(false)
const savingTolov = ref(false)
const summaInput = ref(null)
const tolovForm = ref({ summa: '', tolov_turi: 'naqt', izoh: '', sana: today() })

const editModal = ref(false)
const savingEdit = ref(false)
const editForm = ref({ ism: '', telefon: '', manzil: '', izoh: '' })

const totalPages = computed(() => Math.ceil(total.value / limit) || 1)

const balansInfo = computed(() => {
  const b = parseFloat(yetkazuvchi.value?.balans || 0)
  if (b < 0) return { cls: 'yd-bal--red', badgeCls: 'yd-badge--red', label: 'Qarzdor', sign: '−' }
  if (b > 0) return { cls: 'yd-bal--green', badgeCls: 'yd-badge--green', label: 'Ortiqcha', sign: '+' }
  return { cls: 'yd-bal--gray', badgeCls: 'yd-badge--gray', label: 'Toza', sign: '' }
})

const remainingDebt = computed(() => {
  const b = parseFloat(yetkazuvchi.value?.balans || 0)
  if (b < 0) return b
  return null
})

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatSum(val) {
  if (val === null || val === undefined || val === '') return '0'
  return Number(val).toLocaleString('uz-UZ')
}

function formatDate(str) {
  if (!str) return '—'
  const d = new Date(str)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function tolovTurLabel(t) {
  if (t === 'naqt') return 'Naqt'
  if (t === 'optom') return 'Optom'
  if (t === 'chaka') return 'Chaka'
  return t
}

async function loadYetkazuvchi() {
  loading.value = true
  try {
    const res = await api.get(`/yetkazuvchilar/${id}`)
    yetkazuvchi.value = res
  } catch {
    yetkazuvchi.value = null
  } finally {
    loading.value = false
  }
}

async function loadHarakatlar() {
  loadingH.value = true
  try {
    const res = await api.get(`/yetkazuvchilar/${id}/harakatlar?page=${page.value}&limit=${limit}`)
    harakatlar.value = res.data || []
    total.value = res.total || 0
    computeStats(res.data || [])
  } catch {
    harakatlar.value = []
  } finally {
    loadingH.value = false
  }
}

function computeStats(rows) {
  let jami_qarz = 0, jami_tolov = 0, prixodlar = 0, tolovlar = 0
  for (const h of rows) {
    if (h.tur === 'qarz') { jami_qarz += parseFloat(h.summa || 0); prixodlar++ }
    else { jami_tolov += parseFloat(h.summa || 0); tolovlar++ }
  }
  if (page.value === 1) {
    stats.value = { jami_qarz, jami_tolov, prixodlar, tolovlar }
  }
}

async function loadAllStats() {
  try {
    const res = await api.get(`/yetkazuvchilar/${id}/harakatlar?page=1&limit=9999`)
    const rows = res.data || []
    let jami_qarz = 0, jami_tolov = 0, prixodlar = 0, tolovlar = 0
    for (const h of rows) {
      if (h.tur === 'qarz') { jami_qarz += parseFloat(h.summa || 0); prixodlar++ }
      else { jami_tolov += parseFloat(h.summa || 0); tolovlar++ }
    }
    stats.value = { jami_qarz, jami_tolov, prixodlar, tolovlar }
  } catch {}
}

function changePage(p) {
  page.value = p
  loadHarakatlar()
}

function openTolov() {
  tolovForm.value = { summa: '', tolov_turi: 'naqt', izoh: '', sana: today() }
  tolovModal.value = true
  nextTick(() => summaInput.value?.focus())
}

function closeTolov() {
  tolovModal.value = false
}

async function submitTolov() {
  if (!tolovForm.value.summa || !tolovForm.value.tolov_turi) return
  savingTolov.value = true
  try {
    await api.post(`/yetkazuvchilar/${id}/tolov`, {
      summa: parseFloat(tolovForm.value.summa),
      tolov_turi: tolovForm.value.tolov_turi,
      izoh: tolovForm.value.izoh || null,
      sana: tolovForm.value.sana || null,
    })
    closeTolov()
    await loadYetkazuvchi()
    page.value = 1
    await loadHarakatlar()
    loadAllStats()
  } catch {
  } finally {
    savingTolov.value = false
  }
}

function openEdit() {
  editForm.value = {
    ism: yetkazuvchi.value.ism || '',
    telefon: yetkazuvchi.value.telefon || '',
    manzil: yetkazuvchi.value.manzil || '',
    izoh: yetkazuvchi.value.izoh || '',
  }
  editModal.value = true
}

function closeEdit() {
  editModal.value = false
}

async function submitEdit() {
  if (!editForm.value.ism?.trim()) return
  savingEdit.value = true
  try {
    await api.patch(`/yetkazuvchilar/${id}`, editForm.value)
    closeEdit()
    await loadYetkazuvchi()
  } catch {
  } finally {
    savingEdit.value = false
  }
}

onMounted(async () => {
  await loadYetkazuvchi()
  await loadHarakatlar()
  loadAllStats()
})
</script>

<style scoped>
.yd-page { padding: 24px; max-width: 1100px; margin: 0 auto; }

/* Header */
.yd-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.yd-back { display: flex; align-items: center; gap: 6px; background: none; border: none; color: var(--color-text-secondary, #64748b); font-size: 14px; cursor: pointer; padding: 6px 0; transition: color .15s; }
.yd-back:hover { color: var(--color-text, #1e293b); }
.yd-header-actions { display: flex; gap: 10px; }

/* Buttons */
.yd-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; border: none; font-size: 13.5px; font-weight: 500; cursor: pointer; transition: all .15s; }
.yd-btn--pay { background: #6d28d9; color: #fff; }
.yd-btn--pay:hover { background: #5b21b6; }
.yd-btn--edit { background: #f1f5f9; color: #334155; }
.yd-btn--edit:hover { background: #e2e8f0; }
.yd-btn--cancel { background: #f1f5f9; color: #334155; }
.yd-btn--cancel:hover { background: #e2e8f0; }
.yd-btn--save { background: #6d28d9; color: #fff; min-width: 80px; justify-content: center; }
.yd-btn--save:hover:not(:disabled) { background: #5b21b6; }
.yd-btn--save:disabled { opacity: .6; cursor: not-allowed; }

/* Loading */
.yd-loading { display: flex; justify-content: center; padding: 60px; }
.yd-spinner { width: 28px; height: 28px; border: 3px solid #e2e8f0; border-top-color: #6d28d9; border-radius: 50%; animation: yd-spin .7s linear infinite; }
.yd-spinner--sm { width: 16px; height: 16px; border-width: 2px; }
@keyframes yd-spin { to { transform: rotate(360deg); } }

/* Info Card */
.yd-card { display: flex; align-items: flex-start; justify-content: space-between; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px 28px; margin-bottom: 16px; gap: 24px; }
.yd-card-left { display: flex; align-items: flex-start; gap: 16px; }
.yd-avatar { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #6d28d9, #7c3aed); color: #fff; font-size: 22px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.yd-info { display: flex; flex-direction: column; gap: 6px; }
.yd-name { font-size: 20px; font-weight: 700; color: #1e293b; margin: 0; }
.yd-meta { display: flex; align-items: center; gap: 6px; font-size: 13.5px; color: #64748b; }
.yd-meta--note { font-style: italic; color: #94a3b8; }

/* Balans Block */
.yd-balans-block { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
.yd-balans-label { font-size: 12px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: .05em; }
.yd-balans-val { font-size: 26px; font-weight: 800; display: flex; align-items: baseline; gap: 4px; }
.yd-balans-val span { font-size: 13px; font-weight: 500; color: #94a3b8; }
.yd-bal--red { color: #ef4444; }
.yd-bal--green { color: #22c55e; }
.yd-bal--gray { color: #94a3b8; }
.yd-balans-badge { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
.yd-badge--red { background: #fef2f2; color: #ef4444; }
.yd-badge--green { background: #f0fdf4; color: #22c55e; }
.yd-badge--gray { background: #f8fafc; color: #94a3b8; }

/* Stats */
.yd-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.yd-stat { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; }
.yd-stat-val { font-size: 20px; font-weight: 700; color: #1e293b; }
.yd-stat-val--green { color: #22c55e; }
.yd-stat-lbl { font-size: 12px; color: #94a3b8; margin-top: 4px; }

/* Section */
.yd-section { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
.yd-section-head { display: flex; align-items: center; gap: 10px; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; }
.yd-section-title { font-size: 15px; font-weight: 600; color: #1e293b; margin: 0; }
.yd-count { font-size: 12px; background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 20px; }

/* Table */
.yd-table-wrap { overflow-x: auto; }
.yd-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.yd-table thead tr { background: #f8fafc; }
.yd-table th { padding: 11px 14px; text-align: left; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.yd-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
.yd-tr:last-child td { border-bottom: none; }
.yd-tr:hover td { background: #f8fafc; }
.yd-td-num { color: #94a3b8; font-size: 12px; }
.yd-td-sum { font-weight: 600; }
.yd-sum--red { color: #ef4444; }
.yd-sum--green { color: #22c55e; }
.yd-td-izoh { color: #64748b; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.yd-empty { text-align: center; padding: 40px; color: #94a3b8; font-size: 14px; }

/* Chips */
.yd-chip { font-size: 11.5px; font-weight: 600; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
.yd-chip--red { background: #fef2f2; color: #ef4444; }
.yd-chip--green { background: #f0fdf4; color: #22c55e; }
.yd-ttur { font-size: 12px; background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 6px; }
.yd-dash { color: #cbd5e1; }
.yd-prixod-link { color: #6d28d9; cursor: pointer; font-weight: 500; text-decoration: underline; font-size: 13px; }
.yd-prixod-link:hover { color: #5b21b6; }

/* Pagination */
.yd-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 14px; border-top: 1px solid #f1f5f9; }
.yd-pag-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; color: #334155; transition: all .15s; }
.yd-pag-btn:hover:not(:disabled) { background: #f1f5f9; }
.yd-pag-btn:disabled { opacity: .4; cursor: not-allowed; }
.yd-pag-info { font-size: 13px; color: #64748b; }

/* Not found */
.yd-not-found { text-align: center; padding: 80px 20px; color: #94a3b8; }
.yd-not-found svg { margin-bottom: 12px; }
.yd-not-found p { font-size: 15px; }

/* Overlay / Modal */
.yd-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.45); backdrop-filter: blur(2px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
.yd-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 480px; box-shadow: 0 20px 60px rgba(0,0,0,.18); overflow: hidden; }
.yd-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; }
.yd-modal-head h3 { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0; }
.yd-modal-close { background: none; border: none; cursor: pointer; color: #94a3b8; padding: 4px; border-radius: 6px; display: flex; transition: color .15s; }
.yd-modal-close:hover { color: #ef4444; }
.yd-modal-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 14px; }
.yd-modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 22px; border-top: 1px solid #f1f5f9; }

/* Current debt banner */
.yd-current-debt { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; }
.yd-debt-row { display: flex; align-items: center; justify-content: space-between; font-size: 14px; color: #334155; }
.yd-debt-row strong { font-size: 15px; }

/* Form */
.yd-form-group { display: flex; flex-direction: column; gap: 6px; }
.yd-form-group label { font-size: 13px; font-weight: 500; color: #334155; }
.yd-req { color: #ef4444; }
.yd-input { padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; color: #1e293b; background: #fff; outline: none; transition: border-color .15s; width: 100%; box-sizing: border-box; }
.yd-input:focus { border-color: #6d28d9; }
.yd-textarea { resize: vertical; min-height: 60px; }
.yd-hint { font-size: 12px; color: #f59e0b; }

/* Radio Group */
.yd-radio-group { display: flex; gap: 8px; }
.yd-radio { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1.5px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-size: 13.5px; color: #334155; transition: all .15s; user-select: none; }
.yd-radio input { display: none; }
.yd-radio--active { border-color: #6d28d9; background: #f5f3ff; color: #6d28d9; font-weight: 600; }
.yd-radio:hover:not(.yd-radio--active) { border-color: #c4b5fd; }

@media (max-width: 640px) {
  .yd-card { flex-direction: column; }
  .yd-balans-block { align-items: flex-start; }
  .yd-stats { grid-template-columns: repeat(2, 1fr); }
  .yd-page { padding: 16px; }
}
</style>
