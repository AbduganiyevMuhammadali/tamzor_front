<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import NumberInput from '@/components/NumberInput.vue'
import { api } from '@/api/api'
import { useToast } from '@/composables/useToast'

/* Narx ro'yxatlari: har bir ro'yxat — tovarlar bo'yicha narx. Mijoz toifasiga biriktiriladi
   (Mijoz kategoriyasi sahifasi). Ro'yxatda yo'q tovar uchun mijoz turining standart ro'yxati,
   u ham yo'q bo'lsa eski tovar narxi ishlatiladi. */

const toast = useToast()

interface Ruyxat { id: number; nomi: string; tur: 'optom' | 'chakana' | 'maxsus'; standart: boolean; faol: boolean; izoh: string | null; tovar_soni: number; kategoriya_soni: number }
interface Tovar { tovar_id: number; tovar_nomi: string; turkum: string; narx: number; eski_chakana: number; eski_optom: number }

const TUR_NOMI: Record<string, string> = { optom: 'Optom', chakana: 'Chakana', maxsus: 'Maxsus' }
const TUR_RANG: Record<string, string> = { optom: '#4f46e5', chakana: '#059669', maxsus: '#d97706' }

const ruyxatlar = ref<Ruyxat[]>([])
const yuklanmoqda = ref(false)
const tanlangan = ref<Ruyxat | null>(null)
const tovarlar = ref<Tovar[]>([])
const draft = reactive<Record<number, string>>({})
const asl = reactive<Record<number, number>>({})
const detalYuklanmoqda = ref(false)
const saqlanmoqda = ref(false)
const qidiruv = ref('')
const tovarQidiruv = ref('')

type Rejim = 'add' | 'edit' | null
const rejim = ref<Rejim>(null)
const forma = reactive({ id: 0, nomi: '', tur: 'chakana' as Ruyxat['tur'], izoh: '', standart: false, faol: true })
const formaXato = ref('')

const ozgargan = computed(() => tovarlar.value.filter(t => Number(draft[t.tovar_id] || 0) !== asl[t.tovar_id]).length)
const filtrlangan = computed(() => {
  const q = qidiruv.value.trim().toLowerCase()
  return q ? ruyxatlar.value.filter(r => r.nomi.toLowerCase().includes(q)) : ruyxatlar.value
})
const tovarFiltr = computed(() => {
  const q = tovarQidiruv.value.trim().toLowerCase()
  return q ? tovarlar.value.filter(t => t.tovar_nomi.toLowerCase().includes(q) || t.turkum.toLowerCase().includes(q)) : tovarlar.value
})
const toldirilgan = computed(() => tovarlar.value.filter(t => Number(draft[t.tovar_id] || 0) > 0).length)

async function yukla() {
  yuklanmoqda.value = true
  try {
    ruyxatlar.value = await api.get('/narx-ruyxatlar')
    if (tanlangan.value) {
      const yangi = ruyxatlar.value.find(r => r.id === tanlangan.value!.id)
      if (yangi) tanlangan.value = yangi
    } else {
      const boshlang = ruyxatlar.value.find(r => r.standart) || ruyxatlar.value[0]
      if (boshlang) await tanla(boshlang)
    }
  } catch (e: any) {
    toast.error('Yuklash xatosi', e.message)
  } finally {
    yuklanmoqda.value = false
  }
}

async function tanla(r: Ruyxat) {
  if (ozgargan.value && !confirm('Saqlanmagan o\'zgarishlar bor. Baribir boshqa ro\'yxatga o\'tasizmi?')) return
  tanlangan.value = r
  detalYuklanmoqda.value = true
  try {
    const d = await api.get(`/narx-ruyxatlar/${r.id}`)
    tovarlar.value = d.tovarlar
    for (const t of d.tovarlar as Tovar[]) {
      asl[t.tovar_id] = t.narx
      draft[t.tovar_id] = t.narx ? String(t.narx) : ''
    }
  } catch (e: any) {
    toast.error('Yuklash xatosi', e.message)
  } finally {
    detalYuklanmoqda.value = false
  }
}

/* Bo'sh narxlarni eski narxdan to'ldirish (ro'yxat turiga mos) — faqat bo'sh qatorlarga */
function eskidanToldir() {
  const tur = tanlangan.value?.tur
  let n = 0
  for (const t of tovarlar.value) {
    if (Number(draft[t.tovar_id] || 0) > 0) continue
    const v = tur === 'optom' ? t.eski_optom : t.eski_chakana
    if (v > 0) { draft[t.tovar_id] = String(v); n++ }
  }
  toast.success('To\'ldirildi', `${n} ta tovarga eski narx qo'yildi. Tekshirib saqlang.`)
}

function asliga() {
  for (const t of tovarlar.value) draft[t.tovar_id] = asl[t.tovar_id] ? String(asl[t.tovar_id]) : ''
}

async function saqla() {
  if (!tanlangan.value) return
  saqlanmoqda.value = true
  try {
    const qatorlar = tovarlar.value.map(t => ({ tovar_id: t.tovar_id, narx: Number(draft[t.tovar_id]) || 0 }))
    await api.put(`/narx-ruyxatlar/${tanlangan.value.id}/narxlar`, { qatorlar })
    toast.success('Saqlandi', `"${tanlangan.value.nomi}" narxlari yangilandi`)
    await tanla(tanlangan.value)
    await yukla()
  } catch (e: any) {
    toast.error('Saqlash xatosi', e.message)
  } finally {
    saqlanmoqda.value = false
  }
}

function ochQosh() {
  Object.assign(forma, { id: 0, nomi: '', tur: 'chakana', izoh: '', standart: false, faol: true })
  formaXato.value = ''
  rejim.value = 'add'
}
function ochTahrir(r: Ruyxat) {
  Object.assign(forma, { id: r.id, nomi: r.nomi, tur: r.tur, izoh: r.izoh ?? '', standart: r.standart, faol: r.faol })
  formaXato.value = ''
  rejim.value = 'edit'
}

async function formaSaqla() {
  if (!forma.nomi.trim()) { formaXato.value = 'Nomi majburiy'; return }
  const body = { nomi: forma.nomi.trim(), tur: forma.tur, izoh: forma.izoh || null, standart: forma.standart, faol: forma.faol }
  try {
    const tahrir = rejim.value === 'edit'
    const saqlangan: Ruyxat = tahrir
      ? await api.patch(`/narx-ruyxatlar/${forma.id}`, body)
      : await api.post('/narx-ruyxatlar', body)
    rejim.value = null
    toast.success(tahrir ? 'Yangilandi' : 'Qo\'shildi', `"${forma.nomi}"`)
    await yukla()
    const yangi = ruyxatlar.value.find(r => r.id === saqlangan.id)
    if (yangi) await tanla(yangi)
  } catch (e: any) {
    formaXato.value = e.message
  }
}

async function standartQil(r: Ruyxat) {
  try {
    await api.patch(`/narx-ruyxatlar/${r.id}`, { standart: true })
    toast.success('Standart qilindi', `"${r.nomi}" — ${TUR_NOMI[r.tur]} mijozlari uchun asosiy`)
    await yukla()
  } catch (e: any) { toast.error('Xato', e.message) }
}

async function ochir(r: Ruyxat) {
  if (!confirm(`"${r.nomi}" narx ro'yxatini o'chirasizmi? Narxlar ham o'chadi.`)) return
  try {
    const d = await api.delete(`/narx-ruyxatlar/${r.id}`)
    toast.success('O\'chirildi', d.toifalardan_uzildi ? `${d.toifalardan_uzildi} ta toifa standart narxga qaytdi` : '')
    if (tanlangan.value?.id === r.id) { tanlangan.value = null; tovarlar.value = [] }
    await yukla()
  } catch (e: any) { toast.error('O\'chirish mumkin emas', e.message) }
}

watch(tanlangan, () => { tovarQidiruv.value = '' })
onMounted(yukla)
</script>

<template>
  <div class="np">
    <div class="np-hd">
      <div>
        <h2 class="np-title">Narx ro'yxatlari</h2>
        <p class="np-sub">Har bir ro'yxat — tovarlar bo'yicha narx. Mijoz toifasiga biriktiriladi.</p>
      </div>
      <button class="np-btn np-btn--primary" @click="ochQosh">+ Ro'yxat qo'shish</button>
    </div>

    <div class="np-grid">
      <!-- Chap: ro'yxatlar -->
      <aside class="np-side">
        <div class="np-search">
          <input v-model="qidiruv" placeholder="Ro'yxat qidirish..." class="np-in"/>
        </div>
        <div v-if="yuklanmoqda && !ruyxatlar.length" class="np-empty">Yuklanmoqda...</div>
        <div v-else-if="!filtrlangan.length" class="np-empty">Ro'yxat yo'q</div>
        <button v-for="r in filtrlangan" :key="r.id" class="np-card"
          :class="{ 'np-card--on': tanlangan?.id === r.id, 'np-card--off': !r.faol }" @click="tanla(r)">
          <div class="np-card-top">
            <span class="np-name">{{ r.nomi }}</span>
            <span v-if="r.standart" class="np-badge np-badge--std">Standart</span>
          </div>
          <div class="np-card-meta">
            <span class="np-tur" :style="{ color: TUR_RANG[r.tur], background: TUR_RANG[r.tur] + '15' }">{{ TUR_NOMI[r.tur] }}</span>
            <span>{{ r.tovar_soni }} tovar</span>
            <span>· {{ r.kategoriya_soni }} toifa</span>
            <span v-if="!r.faol" class="np-off">nofaol</span>
          </div>
        </button>
      </aside>

      <!-- O'ng: tanlangan ro'yxat -->
      <section class="np-main">
        <div v-if="!tanlangan" class="np-empty np-empty--big">Chapdan ro'yxat tanlang yoki yangisini yarating</div>
        <template v-else>
          <div class="np-detal-hd">
            <div>
              <div class="np-detal-title">{{ tanlangan.nomi }}
                <span class="np-tur" :style="{ color: TUR_RANG[tanlangan.tur], background: TUR_RANG[tanlangan.tur] + '15' }">{{ TUR_NOMI[tanlangan.tur] }}</span>
                <span v-if="tanlangan.standart" class="np-badge np-badge--std">Standart</span>
              </div>
              <div class="np-sub">{{ tanlangan.tovar_soni }} tovarda narx · {{ tanlangan.kategoriya_soni }} ta toifa shu ro'yxatda
                <template v-if="tanlangan.izoh"> · {{ tanlangan.izoh }}</template></div>
            </div>
            <div class="np-acts">
              <button v-if="!tanlangan.standart" class="np-btn" @click="standartQil(tanlangan)">Standart qilish</button>
              <button class="np-btn" @click="ochTahrir(tanlangan)">Tahrirlash</button>
              <button class="np-btn np-btn--danger" @click="ochir(tanlangan)">O'chirish</button>
            </div>
          </div>

          <div class="np-tool">
            <input v-model="tovarQidiruv" placeholder="Tovar yoki turkum..." class="np-in np-in--grow"/>
            <span class="np-count">{{ toldirilgan }}/{{ tovarlar.length }} narx kiritilgan</span>
            <button class="np-btn" :disabled="detalYuklanmoqda" @click="eskidanToldir">Bo'shlarni eski narxdan</button>
            <button class="np-btn" :disabled="!ozgargan" @click="asliga">Bekor qilish</button>
            <button class="np-btn np-btn--primary" :disabled="!ozgargan || saqlanmoqda" @click="saqla">
              {{ saqlanmoqda ? 'Saqlanmoqda...' : (ozgargan ? `Saqlash (${ozgargan})` : 'Saqlandi') }}
            </button>
          </div>

          <div class="np-tbl-wrap">
            <table class="np-tbl">
              <thead>
                <tr>
                  <th>Tovar</th>
                  <th>Turkum</th>
                  <th class="np-r">Ro'yxat narxi</th>
                  <th class="np-r">Eski chakana</th>
                  <th class="np-r">Eski optom</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="detalYuklanmoqda"><td colspan="5" class="np-empty">Yuklanmoqda...</td></tr>
                <tr v-for="t in tovarFiltr" :key="t.tovar_id" :class="{ 'np-changed': Number(draft[t.tovar_id] || 0) !== asl[t.tovar_id] }">
                  <td class="np-strong">{{ t.tovar_nomi }}</td>
                  <td class="np-mut">{{ t.turkum || '—' }}</td>
                  <td class="np-r">
                    <NumberInput v-model="draft[t.tovar_id]" :bosh="''" css-class="np-in np-in--num" placeholder="standart"/>
                  </td>
                  <td class="np-r np-mut">{{ t.eski_chakana ? t.eski_chakana.toLocaleString() : '—' }}</td>
                  <td class="np-r np-mut">{{ t.eski_optom ? t.eski_optom.toLocaleString() : '—' }}</td>
                </tr>
              </tbody>
            </table>
            <div class="np-hint">Bo'sh qoldirilgan tovar shu ro'yxatda yo'q hisoblanadi — mijozga standart yoki eski narx ko'rsatiladi.</div>
          </div>
        </template>
      </section>
    </div>

    <!-- Qo'shish / tahrirlash -->
    <div v-if="rejim" class="np-ov" @click.self="rejim = null">
      <div class="np-modal">
        <h3 class="np-modal-title">{{ rejim === 'edit' ? 'Ro\'yxatni tahrirlash' : 'Yangi narx ro\'yxati' }}</h3>
        <div v-if="formaXato" class="np-err">{{ formaXato }}</div>
        <label class="np-lbl">Nomi *</label>
        <input v-model="forma.nomi" class="np-in" placeholder="Masalan: Supermarket VIP"/>
        <label class="np-lbl">Tur</label>
        <select v-model="forma.tur" class="np-in">
          <option value="chakana">Chakana</option>
          <option value="optom">Optom</option>
          <option value="maxsus">Maxsus</option>
        </select>
        <label class="np-lbl">Izoh</label>
        <input v-model="forma.izoh" class="np-in" placeholder="ixtiyoriy"/>
        <label class="np-chk"><input type="checkbox" v-model="forma.standart"/> Shu turdagi mijozlar uchun standart ro'yxat</label>
        <label class="np-chk"><input type="checkbox" v-model="forma.faol"/> Faol</label>
        <div class="np-modal-ft">
          <button class="np-btn" @click="rejim = null">Bekor qilish</button>
          <button class="np-btn np-btn--primary" @click="formaSaqla">Saqlash</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.np { display:flex; flex-direction:column; gap:16px; color:#0f172a; }
.np-hd { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.np-title { font-size:20px; font-weight:800; margin:0; }
.np-sub { font-size:13px; color:#64748b; margin:4px 0 0; }
.np-grid { display:grid; grid-template-columns: 300px 1fr; gap:16px; align-items:start; }
@media (max-width: 900px) { .np-grid { grid-template-columns: 1fr; } }
.np-side, .np-main { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:14px; }
.np-search { margin-bottom:10px; }
.np-card { width:100%; text-align:left; display:flex; flex-direction:column; gap:6px; padding:12px; margin-bottom:8px; border:1.5px solid #e2e8f0; border-radius:12px; background:#fff; cursor:pointer; transition:border-color .15s, background .15s; }
.np-card:hover { border-color:#c7d2fe; }
.np-card--on { border-color:#6366f1; background:#eef2ff; }
.np-card--off { opacity:.55; }
.np-card-top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.np-name { font-weight:700; font-size:14px; }
.np-card-meta { display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-size:12px; color:#64748b; }
.np-tur { display:inline-block; padding:2px 9px; border-radius:999px; font-size:11.5px; font-weight:700; }
.np-badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700; }
.np-badge--std { background:#eef2ff; color:#4f46e5; }
.np-off { color:#dc2626; font-weight:600; }
.np-detal-hd { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
.np-detal-title { font-size:17px; font-weight:800; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.np-acts { display:flex; gap:8px; flex-wrap:wrap; }
.np-tool { display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:10px 0; border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9; margin-bottom:8px; }
.np-count { font-size:12.5px; color:#64748b; margin-right:auto; }
.np-in { height:36px; padding:0 10px; border:1.5px solid #e2e8f0; border-radius:9px; font-size:13.5px; background:#fff; color:#0f172a; min-width:0; }
.np-in:focus { outline:none; border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.15); }
.np-in--grow { flex:1; min-width:180px; }
.np-in--num { width:130px; text-align:right; font-variant-numeric:tabular-nums; }
.np-btn { height:36px; padding:0 14px; border-radius:9px; border:1.5px solid #e2e8f0; background:#fff; color:#334155; font-size:13px; font-weight:600; cursor:pointer; }
.np-btn:hover:not(:disabled) { border-color:#c7d2fe; color:#4338ca; }
.np-btn:disabled { opacity:.45; cursor:default; }
.np-btn--primary { background:#4f46e5; border-color:#4f46e5; color:#fff; }
.np-btn--primary:hover:not(:disabled) { background:#4338ca; color:#fff; }
.np-btn--danger { color:#dc2626; }
.np-tbl-wrap { overflow-x:auto; }
.np-tbl { width:100%; border-collapse:collapse; font-size:13.5px; }
.np-tbl th { text-align:left; font-size:11.5px; text-transform:uppercase; letter-spacing:.04em; color:#64748b; font-weight:700; padding:8px 10px; border-bottom:1px solid #e2e8f0; }
.np-tbl td { padding:7px 10px; border-bottom:1px solid #f1f5f9; }
.np-tbl tr.np-changed td { background:#fffbeb; }
.np-r { text-align:right; }
.np-strong { font-weight:600; }
.np-mut { color:#64748b; font-variant-numeric:tabular-nums; }
.np-empty { padding:24px; text-align:center; color:#64748b; font-size:13.5px; }
.np-empty--big { padding:60px 16px; }
.np-hint { font-size:12px; color:#64748b; padding:10px 4px 0; }
.np-ov { position:fixed; inset:0; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; padding:16px; z-index:50; }
.np-modal { background:#fff; border-radius:16px; padding:20px; width:100%; max-width:420px; display:flex; flex-direction:column; gap:8px; }
.np-modal-title { font-size:17px; font-weight:800; margin:0 0 4px; }
.np-modal-ft { display:flex; justify-content:flex-end; gap:8px; margin-top:10px; }
.np-lbl { font-size:12px; font-weight:700; color:#475569; margin-top:4px; }
.np-chk { font-size:13.5px; display:flex; align-items:center; gap:8px; margin-top:4px; }
.np-err { background:#fef2f2; color:#b91c1c; border-radius:9px; padding:8px 10px; font-size:13px; }
</style>
