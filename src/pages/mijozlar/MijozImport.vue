<template>
  <Teleport to="body">
    <div class="im-overlay" @click.self="yop">
      <div class="im-modal">

        <!-- Sarlavha -->
        <div class="im-hd">
          <div class="im-hd-ic">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <div class="im-hd-t">
            <h3>Excel'dan mijozlar yuklash</h3>
            <p>{{ qadamIzoh }}</p>
          </div>
          <button class="im-x" @click="yop" title="Yopish">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Qadamlar -->
        <div class="im-steps">
          <div v-for="(q, i) in QADAMLAR" :key="q" class="im-step" :class="{ on: qadam === i + 1, done: qadam > i + 1 }">
            <span class="im-step-n">
              <svg v-if="qadam > i + 1" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <template v-else>{{ i + 1 }}</template>
            </span>
            <span class="im-step-t">{{ q }}</span>
            <span v-if="i < QADAMLAR.length - 1" class="im-step-l"/>
          </div>
        </div>

        <div class="im-body">

          <!-- 1. FAYL -->
          <div v-if="qadam === 1" class="im-q1">
            <label class="im-drop" :class="{ over: sudrab, band }" @dragover.prevent="sudrab = true" @dragleave="sudrab = false" @drop.prevent="tashlandi">
              <input type="file" accept=".xlsx,.xls,.csv,.txt" @change="tanlandi" hidden ref="faylInput"/>
              <div class="im-drop-ic">
                <span v-if="band" class="im-spin"/>
                <svg v-else width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
              </div>
              <div class="im-drop-t">{{ band ? "Fayl o'qilmoqda…" : 'Excel yoki CSV faylni shu yerga tashlang' }}</div>
              <div class="im-drop-s">yoki bosib tanlang · .xlsx, .csv · 5 000 qatorgacha</div>
            </label>

            <div class="im-info">
              <div class="im-info-h">Qanday ishlaydi</div>
              <ol>
                <li>Birinchi qator — ustun nomlari. Boshqa tizimdan eksport qilingan ro'yxatni o'zgartirmasdan yuklasangiz bo'ladi: ustunlar avtomatik taniladi, keyingi qadamda tekshirib o'zgartirasiz.</li>
                <li>Tizimda bor mijoz (telefoni yoki nomi bir xil) yangilanadi, yangisi qo'shiladi. Hech narsa ikki marta yozilmaydi.</li>
                <li><b>Balans / qarz</b> faqat yangi mijozga yoziladi — mavjud mijozning qarzi savdo va to'lovlardan yuradi.</li>
                <li>Saqlashdan oldin har bir qator bo'yicha tekshiruv natijasini ko'rasiz.</li>
              </ol>
              <button class="im-link" @click="shablon" :disabled="band">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Namuna shablonni yuklab olish (.xlsx)
              </button>
            </div>
          </div>

          <!-- 2. MOSLASH -->
          <div v-else-if="qadam === 2 && o" class="im-q2">
            <div class="im-fayl">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <b>{{ o.faylNomi }}</b> · {{ o.jami }} qator · {{ o.ustunlar.length }} ustun
              <span v-if="o.jami >= o.chegara" class="im-warn-t">· faqat birinchi {{ o.chegara }} qator olindi</span>
            </div>

            <div class="im-grid">
              <section class="im-sec">
                <div class="im-sec-h">Ustunlarni moslash <span class="im-sec-s">{{ moslanganSoni }} ta maydon tanlandi</span></div>
                <div class="im-map">
                  <div v-for="m in o.maydonlar" :key="m.k" class="im-map-r" :class="{ req: m.majburiy && xarita[m.k] === null }">
                    <div class="im-map-f">{{ m.nom }}<span v-if="m.majburiy" class="im-req">*</span></div>
                    <select v-model="xarita[m.k]" class="im-sel">
                      <option :value="null">— tanlanmagan —</option>
                      <option v-for="u in o.ustunlar" :key="u.i" :value="u.i">{{ u.nom }} <template v-if="u.toldirilgan">({{ u.toldirilgan }})</template></option>
                    </select>
                    <div class="im-map-n" :title="namuna(m.k)">{{ namuna(m.k) }}</div>
                  </div>
                </div>
              </section>

              <div class="im-side">
                <section v-if="o.masullar.length" class="im-sec">
                  <div class="im-sec-h">Mas'ul shaxs → agent</div>
                  <p class="im-sec-p">Fayldagi mas'ul shaxs kim bo'lib biriktiriladi. Yangi agent yaratilsa, login-parolni keyin Agentlar bo'limida berasiz.</p>
                  <div v-for="ms in o.masullar" :key="ms.nom" class="im-ag">
                    <div class="im-ag-n"><b>{{ ms.nom }}</b><span>{{ ms.soni }} mijoz</span></div>
                    <select v-model="agentXarita[ms.nom]" class="im-sel">
                      <option v-for="a in o.agentlar" :key="a.id" :value="a.id">{{ a.fullname }}<template v-if="a.avtolavka"> · Won Sell</template></option>
                      <option value="yangi">＋ Yangi agent yaratish</option>
                      <option :value="null">Biriktirmaslik</option>
                    </select>
                  </div>
                </section>

                <section class="im-sec">
                  <div class="im-sec-h">Sozlamalar</div>
                  <div class="im-opt" v-if="xarita.balans !== null">
                    <div class="im-opt-l">Balans ustunida qarz qanday yozilgan?</div>
                    <div class="im-seg">
                      <button type="button" :class="{ on: sozlama.balansIshora === 'manfiy' }" @click="sozlama.balansIshora = 'manfiy'">Manfiy son = qarz</button>
                      <button type="button" :class="{ on: sozlama.balansIshora === 'musbat' }" @click="sozlama.balansIshora = 'musbat'">Musbat son = qarz</button>
                    </div>
                    <div class="im-opt-h">Namuna: {{ balansNamuna }}</div>
                  </div>
                  <label class="im-chk">
                    <input type="checkbox" v-model="sozlama.yangilash"/>
                    <span>Tizimda bor mijozlarni fayldagi ma'lumot bilan yangilash</span>
                  </label>
                </section>
              </div>
            </div>
          </div>

          <!-- 3. TEKSHIRUV -->
          <div v-else-if="qadam === 3 && t" class="im-q3">
            <div class="im-kpi">
              <button class="im-k" :class="{ on: filtr === 'hammasi' }" @click="filtr = 'hammasi'"><b>{{ t.xulosa.jami }}</b><span>jami qator</span></button>
              <button class="im-k ok" :class="{ on: filtr === 'yangi' }" @click="filtr = 'yangi'"><b>{{ t.xulosa.yangi }}</b><span>yangi qo'shiladi</span></button>
              <button class="im-k brand" :class="{ on: filtr === 'yangilanadi' }" @click="filtr = 'yangilanadi'"><b>{{ t.xulosa.yangilanadi }}</b><span>yangilanadi</span></button>
              <button class="im-k mut" :class="{ on: filtr === 'ozgarishsiz' }" @click="filtr = 'ozgarishsiz'"><b>{{ t.xulosa.ozgarishsiz }}</b><span>o'zgarishsiz</span></button>
              <button class="im-k err" :class="{ on: filtr === 'xato' }" @click="filtr = 'xato'"><b>{{ t.xulosa.xato }}</b><span>xato (o'tkazilmaydi)</span></button>
              <button class="im-k warn" :class="{ on: filtr === 'ogoh' }" @click="filtr = 'ogoh'"><b>{{ t.xulosa.ogohlantirish }}</b><span>ogohlantirish</span></button>
            </div>

            <div class="im-notes">
              <div v-if="t.xulosa.qarzdorlar" class="im-note rose">
                <b>{{ t.xulosa.qarzdorlar }} ta yangi mijozda qarz bor — jami {{ fmt(t.xulosa.qarzJami) }} so'm.</b>
                Bu summa mijoz kartasiga boshlang'ich qoldiq bo'lib yoziladi va Mijozlar qarzi hisobotida ko'rinadi.
              </div>
              <div v-if="t.yangiHududlar.length" class="im-note">Yangi hududlar yaratiladi: <b>{{ t.yangiHududlar.join(', ') }}</b></div>
              <div v-if="t.yangiToifalar.length" class="im-note">Yangi toifalar yaratiladi: <b>{{ t.yangiToifalar.join(', ') }}</b></div>
              <div v-if="t.yangiAgentlar.length" class="im-note amber">Yangi agent yaratiladi: <b>{{ t.yangiAgentlar.join(', ') }}</b> — mobil ilovaga kirishi uchun Agentlar bo'limida login va parol bering.</div>
              <div v-if="!t.xulosa.yangi && !t.xulosa.yangilanadi" class="im-note amber">Saqlanadigan qator yo'q — hamma mijoz tizimda bor yoki xatoli.</div>
            </div>

            <div class="im-tbl-w">
              <table class="im-tbl">
                <thead><tr><th>№</th><th>Mijoz</th><th>Telefon</th><th>Hudud</th><th>Agent</th><th class="r">Balans</th><th>Natija</th></tr></thead>
                <tbody>
                  <tr v-for="q in korinadigan" :key="q.n" :class="'is-' + q.holat">
                    <td class="im-n">{{ q.n }}</td>
                    <td class="im-nm">{{ q.nomi || '—' }}</td>
                    <td class="nw">{{ q.telefon || '—' }}</td>
                    <td>{{ q.hudud || '—' }}</td>
                    <td>{{ q.agent || (q.masul ? q.masul + ' (biriktirilmaydi)' : '—') }}</td>
                    <td class="r nw" :class="{ 'im-qarz': q.balans < -0.5 }">{{ q.balans === null || q.balans === undefined ? '—' : fmt(q.balans) }}</td>
                    <td>
                      <span class="im-chip" :class="q.holat">{{ HOLAT[q.holat] }}</span>
                      <div v-if="q.sabab" class="im-sabab">{{ q.sabab }}<template v-if="q.ozgarishlar?.length">: {{ ozgarishMatn(q) }}</template></div>
                      <div v-for="(g, i) in q.ogoh" :key="i" class="im-ogoh">⚠ {{ g }}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="!korinadigan.length" class="im-empty">Bu filtrda qator yo'q</div>
              <div v-else-if="filtrlangan.length > korinadigan.length" class="im-more">… yana {{ filtrlangan.length - korinadigan.length }} qator (hammasi saqlanadi)</div>
            </div>
          </div>

          <!-- 4. NATIJA -->
          <div v-else-if="qadam === 4 && t" class="im-q4">
            <div class="im-done-ic">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h4>Import yakunlandi</h4>
            <div class="im-done-g">
              <div><b>{{ t.xulosa.yangi }}</b><span>yangi mijoz</span></div>
              <div><b>{{ t.xulosa.yangilanadi }}</b><span>yangilandi</span></div>
              <div><b>{{ t.xulosa.ozgarishsiz }}</b><span>o'zgarishsiz</span></div>
              <div><b>{{ t.xulosa.xato }}</b><span>o'tkazilmadi</span></div>
            </div>
            <p v-if="t.xulosa.qarzdorlar">{{ t.xulosa.qarzdorlar }} ta mijozga jami <b>{{ fmt(t.xulosa.qarzJami) }} so'm</b> boshlang'ich qarz yozildi.</p>
            <p v-if="t.yangiAgentlar.length">Yangi agent: <b>{{ t.yangiAgentlar.join(', ') }}</b> — Agentlar bo'limida login va parol bering.</p>
            <p v-if="t.yangiHududlar.length">Yangi hududlar: {{ t.yangiHududlar.join(', ') }}</p>
          </div>

          <p v-if="xato" class="im-err">{{ xato }}</p>
        </div>

        <!-- Pastki tugmalar -->
        <div class="im-foot">
          <button v-if="qadam === 2 || qadam === 3" class="im-btn-s" @click="qadam--; xato = ''" :disabled="band">Orqaga</button>
          <span class="im-foot-sp"/>
          <button v-if="qadam === 1" class="im-btn-s" @click="yop">Bekor qilish</button>
          <button v-if="qadam === 2" class="im-btn-p" @click="tekshir" :disabled="band || xarita.nomi === null">
            <span v-if="band" class="im-spin sm"/><span v-else>Tekshirish</span>
          </button>
          <button v-if="qadam === 3" class="im-btn-p" @click="saqla" :disabled="band || !(t.xulosa.yangi || t.xulosa.yangilanadi)">
            <span v-if="band" class="im-spin sm"/>
            <span v-else>Import qilish · {{ t.xulosa.yangi }} yangi<template v-if="t.xulosa.yangilanadi">, {{ t.xulosa.yangilanadi }} yangilanadi</template></span>
          </button>
          <button v-if="qadam === 4" class="im-btn-p" @click="yop">Yopish</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { api } from '@/api/api'

const emit = defineEmits(['yopildi'])
const QADAMLAR = ['Fayl', 'Moslash', 'Tekshiruv', 'Natija']
const HOLAT = { yangi: 'Yangi', yangilanadi: 'Yangilanadi', ozgarishsiz: "O'zgarishsiz", xato: 'Xato' }
const MAYDON_NOMI = {
  nomi: 'Nomi', telefon: 'Telefon', telefon2: "Qo'shimcha telefon", manzil: 'Manzil', mo_ljal: "Mo'ljal", yuridik_nomi: 'Yuridik nomi',
  inn: 'STIR', bank: 'Bank', hisob_raqam: 'Hisob raqami', mfo: 'MFO', tashrif_kunlari: 'Tashrif kunlari', sinf: 'Sinf', narx_turi: 'Narx turi',
  kredit_limit: 'Kredit limiti', tolov_muddati_kun: "To'lov muddati", lat: 'Kenglik', lng: 'Uzunlik',
  territoriya_id: 'Hudud', kategoriya_id: 'Toifa', agent_id: 'Agent', faol: 'Holati',
}

const qadam = ref(1)
const band = ref(false)
const xato = ref('')
const sudrab = ref(false)
const faylInput = ref(null)
const o = ref(null)                       // /import/oqish javobi
const t = ref(null)                       // /import (tekshir | saqla) javobi
const xarita = reactive({})
const agentXarita = reactive({})
const sozlama = reactive({ balansIshora: 'manfiy', yangilash: true })
const filtr = ref('hammasi')
let saqlandi = false

const qadamIzoh = computed(() => ({
  1: 'Boshqa tizimdan eksport qilingan ro\'yxat yoki namuna shablon',
  2: 'Fayl ustunlari tizim maydonlariga qanday mos kelishini tekshiring',
  3: 'Hali hech narsa saqlanmadi — natijani ko\'rib, keyin import qiling',
  4: 'Mijozlar ro\'yxati yangilandi',
}[qadam.value]))
const moslanganSoni = computed(() => Object.values(xarita).filter(v => v !== null && v !== undefined).length)
const balansNamuna = computed(() => {
  if (!o.value || xarita.balans === null) return ''
  const v = o.value.qatorlar.map(r => r[xarita.balans]).filter(x => x !== '' && x !== null && Number(String(x).replace(/[^\d.-]/g, '')) !== 0).slice(0, 3)
  return v.length ? v.join(', ') : 'hammasi 0'
})
const filtrlangan = computed(() => {
  if (!t.value) return []
  const q = t.value.qatorlar
  if (filtr.value === 'hammasi') return q
  if (filtr.value === 'ogoh') return q.filter(x => x.ogoh?.length)
  return q.filter(x => x.holat === filtr.value)
})
const korinadigan = computed(() => filtrlangan.value.slice(0, 500))

function fmt(v) { return new Intl.NumberFormat('ru-RU').format(Math.round(Number(v) || 0)) }
function namuna(k) {
  const i = xarita[k]
  if (i === null || i === undefined || !o.value) return ''
  return (o.value.ustunlar[i]?.namuna || []).join(' · ')
}
function ozgarishMatn(q) {
  return q.ozgarishlar.map(z => MAYDON_NOMI[z.maydon] || z.maydon).join(', ')
}

function tanlandi(e) { const f = e.target.files?.[0]; if (f) oqi(f); e.target.value = '' }
function tashlandi(e) { sudrab.value = false; const f = e.dataTransfer?.files?.[0]; if (f) oqi(f) }

async function oqi(f) {
  xato.value = ''; band.value = true
  try {
    const fd = new FormData(); fd.append('file', f, f.name)
    const d = await api.upload('/mijozlar/import/oqish', fd)
    o.value = d; t.value = null
    Object.keys(xarita).forEach(k => delete xarita[k])
    for (const m of d.maydonlar) xarita[m.k] = d.xarita[m.k] ?? null
    Object.keys(agentXarita).forEach(k => delete agentXarita[k])
    // Mos agent topilmasa — yangi agent taklif qilinadi (mas'ul shaxs yo'qolib qolmasin; foydalanuvchi o'zgartira oladi)
    for (const ms of d.masullar) agentXarita[ms.nom] = ms.taklif ?? 'yangi'
    qadam.value = 2
  } catch (e) { xato.value = e.message || "Fayl o'qilmadi" }
  finally { band.value = false }
}

async function yubor(rejim) {
  return api.post('/mijozlar/import', {
    rejim, qatorlar: o.value.qatorlar, xarita: { ...xarita }, agentXarita: { ...agentXarita }, sozlama: { ...sozlama },
  })
}
async function tekshir() {
  xato.value = ''; band.value = true
  try { t.value = await yubor('tekshir'); filtr.value = 'hammasi'; qadam.value = 3 }
  catch (e) { xato.value = e.message || 'Tekshirishda xato' }
  finally { band.value = false }
}
async function saqla() {
  xato.value = ''; band.value = true
  try { t.value = await yubor('saqla'); saqlandi = true; qadam.value = 4 }
  catch (e) { xato.value = e.message || 'Saqlashda xato — hech narsa yozilmadi' }
  finally { band.value = false }
}
async function shablon() {
  try { await api.yukla('/mijozlar/import/shablon', 'mijozlar-shablon.xlsx') } catch (e) { xato.value = e.message }
}
function yop() { if (band.value) return; emit('yopildi', { saqlandi }) }
</script>

<style scoped>
.im-overlay { position:fixed; inset:0; z-index:520; background:rgba(15,23,42,.5); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:16px; }
.im-modal { background:#fff; border-radius:20px; width:100%; max-width:1040px; max-height:92vh; display:flex; flex-direction:column; box-shadow:0 28px 80px rgba(0,0,0,.2); overflow:hidden; }
.im-hd { display:flex; align-items:center; gap:14px; padding:18px 24px 14px; border-bottom:1px solid #f1f5f9; }
.im-hd-ic { width:44px; height:44px; border-radius:13px; background:#8b5cf6; color:#fff; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.im-hd-t h3 { font-size:17px; font-weight:800; color:#1e293b; margin:0 0 2px; }
.im-hd-t p { font-size:12.5px; color:#94a3b8; margin:0; }
.im-x { margin-left:auto; width:34px; height:34px; border-radius:10px; border:none; background:#f1f5f9; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; }
.im-x:hover { background:#fee2e2; color:#ef4444; }

.im-steps { display:flex; align-items:center; gap:4px; padding:12px 24px; background:#f8fafc; border-bottom:1px solid #f1f5f9; }
.im-step { display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:600; color:#94a3b8; }
.im-step-n { width:22px; height:22px; border-radius:50%; background:#e2e8f0; color:#64748b; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; }
.im-step.on { color:#7c3aed; } .im-step.on .im-step-n { background:#8b5cf6; color:#fff; }
.im-step.done { color:#1e293b; } .im-step.done .im-step-n { background:#10b981; color:#fff; }
.im-step-l { width:34px; height:2px; background:#e2e8f0; margin:0 6px; }

.im-body { flex:1; overflow:auto; padding:20px 24px; }
.im-foot { display:flex; align-items:center; gap:10px; padding:14px 24px; border-top:1px solid #f1f5f9; background:#f8fafc; }
.im-foot-sp { flex:1; }
.im-btn-s { padding:9px 18px; border-radius:10px; border:1.5px solid #e2e8f0; background:#fff; font-size:13.5px; font-weight:600; color:#334155; cursor:pointer; }
.im-btn-s:hover { background:#f1f5f9; }
.im-btn-p { display:flex; align-items:center; justify-content:center; gap:7px; min-width:130px; padding:9px 22px; border-radius:10px; border:none; background:#8b5cf6; color:#fff; font-size:13.5px; font-weight:700; cursor:pointer; box-shadow:0 2px 10px rgba(139,92,246,.3); }
.im-btn-p:hover:not(:disabled) { background:#7c3aed; } .im-btn-p:disabled, .im-btn-s:disabled { opacity:.55; cursor:not-allowed; }
.im-err { margin:12px 0 0; padding:10px 14px; border-radius:10px; background:#fef2f2; color:#b91c1c; font-size:13px; font-weight:600; }
.im-spin { width:18px; height:18px; border:2.5px solid rgba(139,92,246,.25); border-top-color:#8b5cf6; border-radius:50%; animation:im-sp .7s linear infinite; display:inline-block; }
.im-spin.sm { width:15px; height:15px; border-color:rgba(255,255,255,.4); border-top-color:#fff; }
@keyframes im-sp { to { transform:rotate(360deg); } }

/* 1 */
.im-q1 { display:grid; grid-template-columns:1.1fr 1fr; gap:20px; }
.im-drop { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; min-height:260px; border:2px dashed #ddd6fe; border-radius:16px; background:#f7f5ff; cursor:pointer; text-align:center; padding:24px; transition:all .15s; }
.im-drop:hover, .im-drop.over { border-color:#8b5cf6; background:#f5f3ff; }
.im-drop.band { pointer-events:none; opacity:.8; }
.im-drop-ic { width:62px; height:62px; border-radius:18px; background:#fff; color:#8b5cf6; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 16px rgba(139,92,246,.15); }
.im-drop-t { font-size:15px; font-weight:700; color:#1e293b; }
.im-drop-s { font-size:12.5px; color:#64748b; }
.im-info { background:#f8fafc; border-radius:14px; padding:16px 18px; font-size:13px; color:#475569; }
.im-info-h { font-weight:800; color:#1e293b; margin-bottom:8px; }
.im-info ol { margin:0 0 12px; padding-left:18px; display:flex; flex-direction:column; gap:7px; line-height:1.45; }
.im-link { display:inline-flex; align-items:center; gap:6px; border:none; background:none; color:#7c3aed; font-weight:700; font-size:13px; cursor:pointer; padding:0; }
.im-link:hover { text-decoration:underline; }

/* 2 */
.im-fayl { display:flex; align-items:center; gap:8px; font-size:13px; color:#475569; margin-bottom:14px; }
.im-fayl svg { color:#8b5cf6; }
.im-warn-t { color:#b45309; font-weight:600; }
.im-grid { display:grid; grid-template-columns:1.25fr 1fr; gap:18px; align-items:start; }
.im-side { display:flex; flex-direction:column; gap:14px; }
.im-sec { border:1px solid #e2e8f0; border-radius:14px; padding:14px 16px; }
.im-sec-h { font-size:13.5px; font-weight:800; color:#1e293b; margin-bottom:10px; display:flex; align-items:baseline; gap:8px; }
.im-sec-s { font-size:12px; font-weight:600; color:#94a3b8; }
.im-sec-p { font-size:12.5px; color:#64748b; margin:-4px 0 10px; line-height:1.4; }
.im-map { display:flex; flex-direction:column; gap:6px; max-height:52vh; overflow:auto; padding-right:4px; }
.im-map-r { display:grid; grid-template-columns:150px 1fr 1fr; gap:10px; align-items:center; padding:5px 8px; border-radius:9px; }
.im-map-r:hover { background:#f8fafc; }
.im-map-r.req { background:#fff7ed; }
.im-map-f { font-size:12.5px; font-weight:600; color:#334155; }
.im-req { color:#ef4444; margin-left:2px; }
.im-sel { width:100%; padding:7px 9px; border-radius:9px; border:1.5px solid #e2e8f0; background:#fff; font-size:12.5px; color:#1e293b; outline:none; }
.im-sel:focus { border-color:#8b5cf6; }
.im-map-n { font-size:11.5px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.im-ag { display:grid; grid-template-columns:1fr 1.1fr; gap:10px; align-items:center; padding:7px 0; border-top:1px solid #f1f5f9; }
.im-ag:first-of-type { border-top:none; }
.im-ag-n { display:flex; flex-direction:column; font-size:13px; color:#1e293b; } .im-ag-n span { font-size:11.5px; color:#94a3b8; }
.im-opt { margin-bottom:12px; } .im-opt-l { font-size:12.5px; font-weight:600; color:#334155; margin-bottom:6px; }
.im-opt-h { font-size:11.5px; color:#94a3b8; margin-top:5px; }
.im-seg { display:flex; gap:2px; padding:3px; background:var(--seg-track); border:1px solid var(--seg-brd); border-radius:10px; }
.im-seg button { flex:1; padding:6px 8px; border:none; border-radius:7px; background:transparent; font-size:12.5px; font-weight:600; color:var(--seg-ink); cursor:pointer; }
.im-seg button.on { background:var(--seg-on-bg); color:var(--seg-on-ink); box-shadow:var(--seg-on-sh); }
.im-chk { display:flex; align-items:flex-start; gap:9px; font-size:12.5px; color:#334155; cursor:pointer; }
.im-chk input { margin-top:2px; accent-color:#8b5cf6; }

/* 3 */
.im-kpi { display:grid; grid-template-columns:repeat(6, 1fr); gap:8px; margin-bottom:12px; }
.im-k { display:flex; flex-direction:column; align-items:flex-start; gap:2px; padding:10px 12px; border-radius:12px; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; text-align:left; }
.im-k b { font-size:20px; font-weight:800; color:#1e293b; line-height:1.1; } .im-k span { font-size:11.5px; color:#64748b; font-weight:600; }
.im-k.on { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,.15); }
.im-k.ok b { color:#059669; } .im-k.brand b { color:#7c3aed; } .im-k.err b { color:#dc2626; } .im-k.warn b { color:#d97706; } .im-k.mut b { color:#64748b; }
.im-notes { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
.im-note { font-size:12.5px; color:#5b21b6; background:#f5f3ff; border-radius:10px; padding:8px 12px; line-height:1.4; }
.im-note.rose { background:#fff1f2; color:#9f1239; } .im-note.amber { background:#fffbeb; color:#92400e; }
.im-tbl-w { border:1px solid #e2e8f0; border-radius:12px; overflow:auto; max-height:46vh; }
.im-tbl { width:100%; border-collapse:collapse; font-size:12.5px; }
.im-tbl th { position:sticky; top:0; background:#f8fafc; text-align:left; font-size:11px; letter-spacing:.04em; text-transform:uppercase; color:#64748b; padding:9px 10px; border-bottom:1px solid #e2e8f0; z-index:1; }
.im-tbl td { padding:7px 10px; border-bottom:1px solid #f1f5f9; vertical-align:top; color:#334155; }
.im-tbl .r { text-align:right; } .im-tbl .nw { white-space:nowrap; }
.im-n { color:#94a3b8; font-variant-numeric:tabular-nums; }
.im-nm { font-weight:700; color:#1e293b; }
.im-qarz { color:#dc2626; font-weight:700; }
.im-tbl tr.is-xato td { background:#fff7f7; }
.im-chip { display:inline-block; font-size:10.5px; font-weight:800; padding:2px 8px; border-radius:999px; text-transform:uppercase; letter-spacing:.03em; }
.im-chip.yangi { background:#d1fae5; color:#065f46; } .im-chip.yangilanadi { background:#ede9fe; color:#5b21b6; }
.im-chip.ozgarishsiz { background:#f1f5f9; color:#64748b; } .im-chip.xato { background:#fee2e2; color:#991b1b; }
.im-sabab { font-size:11.5px; color:#64748b; margin-top:3px; }
.im-ogoh { font-size:11.5px; color:#b45309; margin-top:2px; }
.im-empty, .im-more { padding:14px; text-align:center; font-size:12.5px; color:#94a3b8; }

/* 4 */
.im-q4 { text-align:center; padding:26px 0 10px; color:#475569; font-size:13.5px; }
.im-done-ic { width:66px; height:66px; border-radius:50%; background:#d1fae5; color:#059669; display:flex; align-items:center; justify-content:center; margin:0 auto 14px; }
.im-q4 h4 { font-size:19px; font-weight:800; color:#1e293b; margin:0 0 16px; }
.im-done-g { display:flex; justify-content:center; gap:14px; margin-bottom:16px; }
.im-done-g div { min-width:110px; padding:12px; border-radius:12px; background:#f8fafc; display:flex; flex-direction:column; }
.im-done-g b { font-size:22px; font-weight:800; color:#1e293b; } .im-done-g span { font-size:11.5px; color:#64748b; font-weight:600; }
.im-q4 p { margin:6px 0; }

@media (max-width: 860px) {
  .im-q1, .im-grid { grid-template-columns:1fr; }
  .im-kpi { grid-template-columns:repeat(3, 1fr); }
  .im-map-r { grid-template-columns:120px 1fr; } .im-map-n { display:none; }
}
</style>
