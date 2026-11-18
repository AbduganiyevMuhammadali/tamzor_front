<script setup lang="ts">
/* Sozlamalar → Turkumlar: tovar turkumlari (turkum jadvali) va ularga tovar biriktirish.
   Nom o'zgartirilsa backend tovar kartalari va hujjat qatorlaridagi nomni ham yangilaydi —
   hisobotlar shu nom bilan guruhlaydi. Tovarlari bor turkum faqat boshqasiga ko'chirib o'chiriladi. */
import { ref, computed, reactive, onMounted } from 'vue'
import { turkumApi } from '@/api/api'
import { useToast } from '@/composables/useToast'

const toast = useToast()

interface Turkum { id: number; nomi: string; kod: string | null; izoh: string | null; tartib: number; faol: boolean; tovar_soni: number }
interface Tovar  { id: number; nomi: string; shtrix_kod: string | null; olchov_birligi: string; faol: boolean; turi: string; turkum: string | null; turkum_id: number | null }

const rows     = ref<Turkum[]>([])
const loading  = ref(false)
const saving   = ref(false)
const search   = ref('')
const yashirinlar = ref(false)

/* ── Qo'shish / tahrirlash ── */
type Mode = 'add' | 'edit' | null
const mode    = ref<Mode>(null)
const editId  = ref<number | null>(null)
const form    = reactive({ nomi: '', kod: '', izoh: '' })
const formErr = ref('')

/* ── Tovarlar paneli ── */
const panel       = ref<Turkum | null>(null)
const panelTovar  = ref<Tovar[]>([])
const panelYukl   = ref(false)
const tanlashOchiq = ref(false)
const tanlashRoyxat = ref<Tovar[]>([])
const tanlashQidir  = ref('')
const tanlangan     = ref<Set<number>>(new Set())

/* ── O'chirish (tovarlari bo'lsa ko'chirish) ── */
const ochirish = ref<Turkum | null>(null)
const kochirId = ref<number | ''>('')

const RANGLAR = ['#7c3aed', '#8b5cf6', '#6d28d9', '#5b21b6', '#a78bfa', '#4c1d95']
const rang = (id: number) => RANGLAR[id % RANGLAR.length]

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter(r => (yashirinlar.value || r.faol) && (!q || r.nomi.toLowerCase().includes(q) || (r.kod || '').toLowerCase().includes(q)))
})
const jamiTovar = computed(() => rows.value.reduce((s, r) => s + (r.tovar_soni || 0), 0))
const yashirinSoni = computed(() => rows.value.filter(r => !r.faol).length)

async function load() {
  loading.value = true
  try { rows.value = await turkumApi.getAll() }
  catch (e: any) { toast.error('Yuklash xatosi', e.message) }
  finally { loading.value = false }
}

function openAdd() { Object.assign(form, { nomi: '', kod: '', izoh: '' }); editId.value = null; formErr.value = ''; mode.value = 'add' }
function openEdit(r: Turkum) { Object.assign(form, { nomi: r.nomi, kod: r.kod ?? '', izoh: r.izoh ?? '' }); editId.value = r.id; formErr.value = ''; mode.value = 'edit' }

async function save() {
  if (!form.nomi.trim()) { formErr.value = 'Turkum nomi majburiy'; return }
  formErr.value = ''; saving.value = true
  try {
    const body = { nomi: form.nomi.trim(), kod: form.kod.trim() || null, izoh: form.izoh.trim() || null }
    if (editId.value) {
      const eski = rows.value.find(r => r.id === editId.value)
      const r = await turkumApi.update(editId.value, body)
      toast.success('Yangilandi', eski && eski.nomi !== r.nomi && r.tovar_soni
        ? `"${eski.nomi}" → "${r.nomi}" — ${r.tovar_soni} ta tovar va hujjatlarda ham yangilandi` : `"${r.nomi}" saqlandi`)
    } else {
      const r = await turkumApi.create(body)
      toast.success("Qo'shildi", `"${r.nomi}" turkumi ochildi — endi tovarlarni biriktiring`)
    }
    mode.value = null
    await load()
  } catch (e: any) { formErr.value = e.message; toast.error('Saqlash xatosi', e.message) }
  finally { saving.value = false }
}

async function toggleFaol(r: Turkum) {
  try {
    await turkumApi.toggleFaol(r.id)
    toast.success(r.faol ? 'Yashirildi' : "Ko'rsatildi", r.faol ? `"${r.nomi}" endi tovar formasida tanlanmaydi (mavjud tovarlar o'z turkumida qoladi)` : `"${r.nomi}" yana tanlanadi`)
    await load()
  } catch (e: any) { toast.error('Xato', e.message) }
}

async function siljit(r: Turkum, yon: -1 | 1) {
  const list = rows.value.filter(x => yashirinlar.value || x.faol)
  const i = list.findIndex(x => x.id === r.id); const j = i + yon
  if (i < 0 || j < 0 || j >= list.length) return
  const A = list[i], B = list[j]
  if (!A || !B) return
  const idlar = rows.value.map(x => x.id)
  const a = idlar.indexOf(A.id), b = idlar.indexOf(B.id)
  const tmp = idlar[a]!; idlar[a] = idlar[b]!; idlar[b] = tmp
  try { await turkumApi.tartib(idlar); await load() }
  catch (e: any) { toast.error('Tartib saqlanmadi', e.message) }
}

/* O'chirish */
function openOchirish(r: Turkum) { ochirish.value = r; kochirId.value = '' }
async function ochir() {
  const r = ochirish.value; if (!r) return
  if (r.tovar_soni > 0 && !kochirId.value) { toast.error('Turkum tanlang', 'Tovarlar qaysi turkumga o\'tishini tanlang'); return }
  saving.value = true
  try {
    const res = await turkumApi.delete(r.id, kochirId.value || undefined)
    toast.success("O'chirildi", res.kochirildi ? `"${r.nomi}" o'chirildi, ${res.kochirildi} ta tovar ko'chirildi` : `"${r.nomi}" o'chirildi`)
    ochirish.value = null
    if (panel.value?.id === r.id) panel.value = null
    await load()
  } catch (e: any) { toast.error("O'chirish xatosi", e.message) }
  finally { saving.value = false }
}

/* Tovarlar paneli */
async function openPanel(r: Turkum) {
  panel.value = r; tanlashOchiq.value = false; tanlangan.value = new Set(); tanlashQidir.value = ''
  panelYukl.value = true
  try { const d = await turkumApi.getById(r.id); panelTovar.value = d.tovarlar || [] }
  catch (e: any) { toast.error('Yuklash xatosi', e.message) }
  finally { panelYukl.value = false }
}
async function tanlashniOch() {
  tanlashOchiq.value = true; tanlangan.value = new Set()
  await tanlashYukla()
}
let qidirT: ReturnType<typeof setTimeout>
function tanlashQidirDeb() { clearTimeout(qidirT); qidirT = setTimeout(tanlashYukla, 300) }
async function tanlashYukla() {
  if (!panel.value) return
  try { tanlashRoyxat.value = await turkumApi.tanlash(panel.value.id, tanlashQidir.value.trim()) }
  catch (e: any) { toast.error('Yuklash xatosi', e.message) }
}
function belgila(id: number) { const s = new Set(tanlangan.value); s.has(id) ? s.delete(id) : s.add(id); tanlangan.value = s }
async function biriktir() {
  if (!panel.value || !tanlangan.value.size) return
  saving.value = true
  try {
    const d = await turkumApi.tovarlar(panel.value.id, { qoshish: [...tanlangan.value] })
    panelTovar.value = d.tovarlar || []
    toast.success('Biriktirildi', `${tanlangan.value.size} ta tovar "${panel.value.nomi}" turkumiga o'tdi`)
    tanlashOchiq.value = false; tanlangan.value = new Set()
    await load()
    panel.value = rows.value.find(r => r.id === panel.value!.id) || panel.value
  } catch (e: any) { toast.error('Xato', e.message) }
  finally { saving.value = false }
}
async function ajrat(t: Tovar) {
  if (!panel.value) return
  try {
    const d = await turkumApi.tovarlar(panel.value.id, { olib_tashlash: [t.id] })
    panelTovar.value = d.tovarlar || []
    toast.success('Ajratildi', `"${t.nomi}" turkumsiz qoldi`)
    await load()
    panel.value = rows.value.find(r => r.id === panel.value!.id) || panel.value
  } catch (e: any) { toast.error('Xato', e.message) }
}

onMounted(load)
</script>

<template>
  <div class="tk-page">

    <!-- Sarlavha -->
    <div class="tk-hd">
      <div class="tk-hd-left">
        <div class="tk-hd-ic">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div>
          <h2 class="tk-title">Turkumlar</h2>
          <p class="tk-sub">Tovarlarni guruhlash — tovar kartasi, kirim, hisobot va mobil ilova shu nomlar bilan ishlaydi</p>
        </div>
      </div>
      <button class="tk-add-btn" @click="openAdd">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Turkum qo'shish
      </button>
    </div>

    <!-- Toolbar -->
    <div class="tk-toolbar">
      <div class="tk-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="search" class="tk-search-in" placeholder="Turkum yoki kod..."/>
      </div>
      <label class="tk-chk" v-if="yashirinSoni">
        <input type="checkbox" v-model="yashirinlar"/> Yashirilganlar ({{ yashirinSoni }})
      </label>
      <div class="tk-count"><b>{{ filtered.length }}</b> ta turkum · <b>{{ jamiTovar }}</b> ta tovar</div>
    </div>

    <div class="tk-body" :class="{ 'tk-body--panel': panel }">
      <!-- Jadval -->
      <div class="tk-main">
        <div v-if="loading" class="tk-skels"><div class="tk-skel" v-for="i in 4" :key="i"/></div>

        <div v-else-if="!filtered.length" class="tk-empty">
          <div class="tk-empty-title">{{ search ? 'Turkum topilmadi' : "Turkumlar yo'q" }}</div>
          <div class="tk-empty-sub">{{ search ? 'Qidiruvni o\'zgartiring' : "Birinchi turkumni qo'shing — masalan: Tovuq, Mol go'shti, Yarim tayyor" }}</div>
          <button v-if="!search" class="tk-add-btn tk-add-btn--sm" @click="openAdd">+ Turkum qo'shish</button>
        </div>

        <div v-else class="tk-table-wrap">
          <table class="tk-table">
            <thead>
              <tr>
                <th style="width:44px">#</th>
                <th>Turkum</th>
                <th style="width:110px">Kod</th>
                <th style="width:120px">Tovarlar</th>
                <th style="width:100px">Holat</th>
                <th style="width:170px;text-align:center">Amallar</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in filtered" :key="r.id" class="tk-row" :class="{ 'tk-row--off': !r.faol, 'tk-row--on': panel?.id === r.id }">
                <td class="tk-td-idx">{{ i + 1 }}</td>
                <td>
                  <div class="tk-name-cell">
                    <span class="tk-badge" :style="{ background: rang(r.id) + '15', color: rang(r.id), borderColor: rang(r.id) + '35' }">{{ r.nomi }}</span>
                    <span v-if="r.izoh" class="tk-izoh">{{ r.izoh }}</span>
                  </div>
                </td>
                <td class="tk-td-mono">{{ r.kod || '—' }}</td>
                <td>
                  <button class="tk-tovar-btn" :class="{ 'tk-tovar-btn--bosh': !r.tovar_soni }" @click="openPanel(r)" :title="r.tovar_soni ? 'Tovarlarni ko\'rish va biriktirish' : 'Tovar biriktirish'">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                    {{ r.tovar_soni ? r.tovar_soni + ' ta' : 'biriktirish' }}
                  </button>
                </td>
                <td><span class="tk-holat" :class="r.faol ? 'tk-holat--on' : 'tk-holat--off'">{{ r.faol ? 'Faol' : 'Yashirin' }}</span></td>
                <td>
                  <div class="tk-acts">
                    <button class="tk-act" :disabled="i === 0" @click="siljit(r, -1)" title="Yuqoriga"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="18 15 12 9 6 15"/></svg></button>
                    <button class="tk-act" :disabled="i === filtered.length - 1" @click="siljit(r, 1)" title="Pastga"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"/></svg></button>
                    <button class="tk-act tk-act--edit" @click="openEdit(r)" title="Tahrirlash"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="tk-act" @click="toggleFaol(r)" :title="r.faol ? 'Yashirish' : 'Ko\'rsatish'">
                      <svg v-if="r.faol" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="tk-act tk-act--del" @click="openOchirish(r)" title="O'chirish"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tovarlar paneli -->
      <aside v-if="panel" class="tk-panel">
        <div class="tk-panel-hd">
          <div>
            <span class="tk-badge" :style="{ background: rang(panel.id) + '15', color: rang(panel.id), borderColor: rang(panel.id) + '35' }">{{ panel.nomi }}</span>
            <span class="tk-panel-sub">{{ panelTovar.length }} ta tovar</span>
          </div>
          <button class="tk-x" @click="panel = null"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        <template v-if="!tanlashOchiq">
          <div v-if="panelYukl" class="tk-skels"><div class="tk-skel" v-for="i in 3" :key="i"/></div>
          <div v-else-if="!panelTovar.length" class="tk-panel-empty">Bu turkumda tovar yo'q</div>
          <ul v-else class="tk-list">
            <li v-for="t in panelTovar" :key="t.id" class="tk-li">
              <div class="tk-li-main">
                <span class="tk-li-nomi">{{ t.nomi }}</span>
                <span class="tk-li-sub">{{ t.shtrix_kod || '—' }} · {{ t.olchov_birligi }}<template v-if="!t.faol"> · nofaol</template></span>
              </div>
              <button class="tk-li-btn" @click="ajrat(t)" title="Turkumdan ajratish">ajratish</button>
            </li>
          </ul>
          <button class="tk-add-btn tk-add-btn--full" @click="tanlashniOch">+ Tovar biriktirish</button>
        </template>

        <template v-else>
          <div class="tk-search tk-search--full">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="tanlashQidir" class="tk-search-in" placeholder="Tovar nomi..." @input="tanlashQidirDeb" autofocus/>
          </div>
          <div v-if="!tanlashRoyxat.length" class="tk-panel-empty">Biriktiriladigan tovar yo'q</div>
          <ul v-else class="tk-list tk-list--pick">
            <li v-for="t in tanlashRoyxat" :key="t.id" class="tk-li tk-li--pick" :class="{ on: tanlangan.has(t.id) }" @click="belgila(t.id)">
              <span class="tk-chkbox" :class="{ on: tanlangan.has(t.id) }"><svg v-if="tanlangan.has(t.id)" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg></span>
              <div class="tk-li-main">
                <span class="tk-li-nomi">{{ t.nomi }}</span>
                <span class="tk-li-sub">{{ t.turkum ? 'hozir: ' + t.turkum : 'turkumsiz' }}</span>
              </div>
            </li>
          </ul>
          <div class="tk-panel-ft">
            <button class="tk-btn-cancel" @click="tanlashOchiq = false">Bekor</button>
            <button class="tk-btn-save" :disabled="saving || !tanlangan.size" @click="biriktir">{{ tanlangan.size ? `${tanlangan.size} ta tovarni biriktirish` : 'Tovar tanlang' }}</button>
          </div>
        </template>
      </aside>
    </div>

    <!-- Qo'shish / tahrirlash -->
    <Teleport to="body">
      <Transition name="tk-modal">
        <div v-if="mode" class="tk-overlay" @click.self="mode = null">
          <div class="tk-modal">
            <div class="tk-modal-hd">
              <div class="tk-modal-title">{{ mode === 'add' ? "Turkum qo'shish" : 'Turkumni tahrirlash' }}</div>
              <button class="tk-x" @click="mode = null"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div v-if="formErr" class="tk-form-err">{{ formErr }}</div>
            <div class="tk-modal-body">
              <div class="tk-field">
                <label class="tk-lbl">Nomi <span class="tk-req">*</span></label>
                <input v-model="form.nomi" class="tk-input" placeholder="Masalan: Tovuq go'shti" @keyup.enter="save" autofocus/>
                <div v-if="mode === 'edit'" class="tk-hint">Nom o'zgarsa — shu turkumdagi tovarlar, eski kirim/sotuv hujjatlari va hisobotlarda ham yangi nom bo'ladi.</div>
              </div>
              <div class="tk-field">
                <label class="tk-lbl">Kod (ixtiyoriy)</label>
                <input v-model="form.kod" class="tk-input" placeholder="Masalan: TQ"/>
              </div>
              <div class="tk-field">
                <label class="tk-lbl">Izoh (ixtiyoriy)</label>
                <textarea v-model="form.izoh" class="tk-input tk-textarea" rows="2" placeholder="Turkum haqida..."/>
              </div>
            </div>
            <div class="tk-modal-ft">
              <button class="tk-btn-cancel" @click="mode = null">Bekor qilish</button>
              <button class="tk-btn-save" :disabled="saving" @click="save">{{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- O'chirish -->
    <Teleport to="body">
      <Transition name="tk-modal">
        <div v-if="ochirish" class="tk-overlay" @click.self="ochirish = null">
          <div class="tk-modal">
            <div class="tk-modal-hd">
              <div class="tk-modal-title">"{{ ochirish.nomi }}" turkumini o'chirish</div>
              <button class="tk-x" @click="ochirish = null"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div class="tk-modal-body">
              <template v-if="ochirish.tovar_soni > 0">
                <div class="tk-warn">Bu turkumda <b>{{ ochirish.tovar_soni }} ta tovar</b> bor. O'chirishdan oldin ular boshqa turkumga o'tkaziladi:</div>
                <div class="tk-field">
                  <label class="tk-lbl">Tovarlar qaysi turkumga o'tadi</label>
                  <select v-model="kochirId" class="tk-input">
                    <option value="">— tanlang —</option>
                    <option v-for="r in rows.filter(x => x.id !== ochirish!.id)" :key="r.id" :value="r.id">{{ r.nomi }}{{ r.faol ? '' : ' (yashirin)' }}</option>
                  </select>
                  <div class="tk-hint">Tovarlarni saqlab qolib, faqat formada ko'rinmasin desangiz — o'chirish o'rniga "Yashirish" ni bosing.</div>
                </div>
              </template>
              <div v-else class="tk-hint">Turkumda tovar yo'q — o'chirish xavfsiz.</div>
            </div>
            <div class="tk-modal-ft">
              <button class="tk-btn-cancel" @click="ochirish = null">Bekor qilish</button>
              <button class="tk-btn-save tk-btn-save--del" :disabled="saving" @click="ochir">{{ ochirish.tovar_soni > 0 ? "Ko'chirib o'chirish" : "O'chirish" }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.tk-page { display:flex; flex-direction:column; gap:14px; }
.tk-hd { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.tk-hd-left { display:flex; align-items:center; gap:12px; }
.tk-hd-ic { width:40px; height:40px; border-radius:11px; background:rgba(139,92,246,.12); color:#8b5cf6; display:flex; align-items:center; justify-content:center; }
.tk-title { margin:0; font-size:17px; font-weight:700; color:var(--ink,#0f172a); }
.tk-sub { margin:2px 0 0; font-size:12px; color:var(--mut,#64748b); }
.tk-add-btn { display:inline-flex; align-items:center; gap:6px; padding:9px 14px; border:none; border-radius:10px; background:#7c3aed; color:#fff; font-size:13px; font-weight:600; cursor:pointer; }
.tk-add-btn:hover { background:#6d28d9; }
.tk-add-btn--sm { padding:7px 12px; font-size:12.5px; margin-top:10px; }
.tk-add-btn--full { width:100%; justify-content:center; margin-top:10px; }

.tk-toolbar { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.tk-search { display:flex; align-items:center; gap:7px; padding:0 10px; height:36px; border:1px solid var(--line,#e2e8f0); border-radius:10px; background:var(--surface,#fff); color:var(--mut,#94a3b8); min-width:240px; }
.tk-search--full { width:100%; margin-bottom:8px; }
.tk-search-in { flex:1; border:none; background:transparent; outline:none; font-size:13px; color:var(--ink,#0f172a); }
.tk-chk { display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--mut,#64748b); cursor:pointer; }
.tk-count { margin-left:auto; font-size:12.5px; color:var(--mut,#64748b); }
.tk-count b { color:#7c3aed; }

.tk-body { display:grid; grid-template-columns:1fr; gap:14px; align-items:start; }
.tk-body--panel { grid-template-columns:1fr 340px; }
@media (max-width: 900px) { .tk-body--panel { grid-template-columns:1fr; } }

.tk-table-wrap { border:1px solid var(--line,#e2e8f0); border-radius:12px; overflow:hidden; background:var(--surface,#fff); }
.tk-table { width:100%; border-collapse:collapse; font-size:13px; }
.tk-table th { text-align:left; padding:10px 12px; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--mut,#94a3b8); background:var(--hov,#f8fafc); border-bottom:1px solid var(--line,#e2e8f0); }
.tk-table td { padding:9px 12px; border-bottom:1px solid var(--line,#f1f5f9); color:var(--ink,#0f172a); vertical-align:middle; }
.tk-row:last-child td { border-bottom:none; }
.tk-row--off td { opacity:.55; }
.tk-row--on td { background:rgba(139,92,246,.06); }
.tk-td-idx { color:var(--mut,#94a3b8); font-variant-numeric:tabular-nums; }
.tk-td-mono { font-family:ui-monospace, monospace; font-size:12px; color:var(--mut,#64748b); }
.tk-name-cell { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.tk-badge { display:inline-flex; padding:3px 10px; border-radius:999px; border:1px solid; font-size:12.5px; font-weight:600; }
.tk-izoh { font-size:11.5px; color:var(--mut,#94a3b8); }
.tk-tovar-btn { display:inline-flex; align-items:center; gap:5px; padding:4px 9px; border-radius:8px; border:1px solid rgba(139,92,246,.3); background:rgba(139,92,246,.08); color:#7c3aed; font-size:12px; font-weight:600; cursor:pointer; }
.tk-tovar-btn:hover { background:rgba(139,92,246,.16); }
.tk-tovar-btn--bosh { border-style:dashed; background:transparent; color:var(--mut,#94a3b8); }
.tk-holat { font-size:11px; font-weight:700; padding:2px 8px; border-radius:6px; }
.tk-holat--on { color:#047857; background:rgba(16,185,129,.12); }
.tk-holat--off { color:#64748b; background:rgba(100,116,139,.12); }
.tk-acts { display:flex; justify-content:center; gap:4px; }
.tk-act { width:28px; height:28px; border-radius:7px; border:1px solid var(--line,#e2e8f0); background:var(--surface,#fff); color:var(--mut,#64748b); display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
.tk-act:hover:not(:disabled) { background:var(--hov,#f1f5f9); color:var(--ink,#0f172a); }
.tk-act:disabled { opacity:.35; cursor:default; }
.tk-act--edit:hover { color:#7c3aed; border-color:#ddd6fe; }
.tk-act--del:hover { color:#dc2626; border-color:#fecaca; background:rgba(220,38,38,.06); }

.tk-panel { border:1px solid var(--line,#e2e8f0); border-radius:12px; background:var(--surface,#fff); padding:14px; }
.tk-panel-hd { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px; }
.tk-panel-sub { margin-left:8px; font-size:12px; color:var(--mut,#64748b); }
.tk-panel-empty { padding:18px; text-align:center; font-size:12.5px; color:var(--mut,#94a3b8); }
.tk-list { list-style:none; margin:0; padding:0; }
.tk-li { display:flex; align-items:center; gap:10px; padding:8px 6px; border-bottom:1px solid var(--line,#f1f5f9); }
.tk-li:last-child { border-bottom:none; }
.tk-li-main { flex:1; min-width:0; display:flex; flex-direction:column; }
.tk-li-nomi { font-size:13px; font-weight:600; color:var(--ink,#0f172a); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tk-li-sub { font-size:11px; color:var(--mut,#94a3b8); }
.tk-li-btn { border:none; background:transparent; color:#dc2626; font-size:11.5px; font-weight:600; cursor:pointer; padding:4px 6px; border-radius:6px; }
.tk-li-btn:hover { background:rgba(220,38,38,.08); }
.tk-li--pick { cursor:pointer; border-radius:8px; }
.tk-li--pick:hover, .tk-li--pick.on { background:rgba(139,92,246,.07); }
.tk-chkbox { width:18px; height:18px; border-radius:5px; border:1.5px solid var(--line,#cbd5e1); display:inline-flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0; }
.tk-chkbox.on { background:#7c3aed; border-color:#7c3aed; }
.tk-panel-ft { display:flex; justify-content:flex-end; gap:8px; margin-top:10px; }
.tk-x { width:28px; height:28px; border:none; border-radius:7px; background:transparent; color:var(--mut,#94a3b8); cursor:pointer; display:inline-flex; align-items:center; justify-content:center; }
.tk-x:hover { background:var(--hov,#f1f5f9); color:var(--ink,#0f172a); }

.tk-skels { display:flex; flex-direction:column; gap:8px; }
.tk-skel { height:44px; border-radius:10px; background:linear-gradient(90deg, var(--hov,#f1f5f9) 25%, var(--line,#e2e8f0) 50%, var(--hov,#f1f5f9) 75%); background-size:200% 100%; animation:tk-sh 1.2s infinite; }
@keyframes tk-sh { 0% { background-position:200% 0 } 100% { background-position:-200% 0 } }
.tk-empty { padding:40px 20px; text-align:center; border:1px dashed var(--line,#e2e8f0); border-radius:12px; }
.tk-empty-title { font-size:14px; font-weight:700; color:var(--ink,#0f172a); }
.tk-empty-sub { font-size:12.5px; color:var(--mut,#64748b); margin-top:4px; }

.tk-overlay { position:fixed; inset:0; background:rgba(15,23,42,.45); backdrop-filter:blur(3px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
.tk-modal { width:100%; max-width:440px; background:var(--surface,#fff); border-radius:16px; box-shadow:0 24px 64px rgba(0,0,0,.22); overflow:hidden; }
.tk-modal-hd { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid var(--line,#e2e8f0); }
.tk-modal-title { font-size:14.5px; font-weight:700; color:var(--ink,#0f172a); }
.tk-modal-body { padding:14px 16px; display:flex; flex-direction:column; gap:12px; }
.tk-modal-ft { display:flex; justify-content:flex-end; gap:8px; padding:12px 16px; border-top:1px solid var(--line,#e2e8f0); }
.tk-form-err { margin:12px 16px 0; padding:8px 10px; border-radius:8px; background:rgba(220,38,38,.08); color:#dc2626; font-size:12.5px; }
.tk-warn { padding:9px 11px; border-radius:9px; background:rgba(217,119,6,.1); color:#b45309; font-size:12.5px; }
.tk-field { display:flex; flex-direction:column; gap:5px; }
.tk-lbl { font-size:12px; font-weight:600; color:var(--mut,#475569); }
.tk-req { color:#dc2626; }
.tk-input { height:38px; padding:0 11px; border:1px solid var(--line,#e2e8f0); border-radius:9px; font-size:13px; background:var(--surface,#fff); color:var(--ink,#0f172a); outline:none; }
.tk-input:focus { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,.15); }
.tk-textarea { height:auto; padding:8px 11px; resize:vertical; font-family:inherit; }
.tk-hint { font-size:11.5px; color:var(--mut,#94a3b8); line-height:1.4; }
.tk-btn-cancel { padding:8px 14px; border-radius:9px; border:1px solid var(--line,#e2e8f0); background:transparent; color:var(--mut,#64748b); font-size:13px; font-weight:600; cursor:pointer; }
.tk-btn-save { padding:8px 16px; border-radius:9px; border:none; background:#7c3aed; color:#fff; font-size:13px; font-weight:600; cursor:pointer; }
.tk-btn-save:hover:not(:disabled) { background:#6d28d9; }
.tk-btn-save:disabled { opacity:.55; cursor:default; }
.tk-btn-save--del { background:#dc2626; }
.tk-btn-save--del:hover:not(:disabled) { background:#b91c1c; }
.tk-modal-enter-active, .tk-modal-leave-active { transition:opacity .18s; }
.tk-modal-enter-from, .tk-modal-leave-to { opacity:0; }
</style>
