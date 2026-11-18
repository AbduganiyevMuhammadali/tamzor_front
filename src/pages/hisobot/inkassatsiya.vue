<template>
  <div class="hp-wrap">
    <!-- Header -->
    <div class="hp-head">
      <div>
        <h1 class="hp-title">Inkassatsiya</h1>
        <p class="hp-sub">Agent va dostavchik naqd yig'gan pulni kassaga topshirish solishtiruvi — dostavchik yetkazishda olgan naqd ham shu yerda</p>
      </div>
      <div class="hp-tabs">
        <button class="hp-tab" :class="tab === 'kunlik' && 'is-on'" @click="tab = 'kunlik'">Kunlik</button>
        <button class="hp-tab" :class="tab === 'hisobot' && 'is-on'" @click="tab = 'hisobot'; loadHisobot()">Hisobot</button>
      </div>
    </div>

    <!-- ══ KUNLIK TAB ══ -->
    <template v-if="tab === 'kunlik'">
      <div class="hp-filters">
        <input v-model="sana" type="date" class="hp-date" @change="load"/>
        <button class="ik-refresh" @click="load" :disabled="loading">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" :class="loading && 'ik-spin'"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.07-8.33"/></svg>
        </button>
      </div>

      <!-- Umumiy summary -->
      <div class="ik-summary" v-if="!loading && rows.length">
        <div class="ik-sum-item">
          <span class="ik-sum-lbl">Jami yig'ilgan</span>
          <span class="ik-sum-val">{{ fmtSum(totalYigilgan) }} so'm</span>
        </div>
        <div class="ik-sum-item">
          <span class="ik-sum-lbl">Jami topshirilgan</span>
          <span class="ik-sum-val" style="color:#10b981">{{ fmtSum(totalTopshirilgan) }} so'm</span>
        </div>
        <div class="ik-sum-item" v-if="totalFarq > 0">
          <span class="ik-sum-lbl">Jami kamomad</span>
          <span class="ik-sum-val" style="color:#ef4444">{{ fmtSum(totalFarq) }} so'm</span>
        </div>
      </div>

      <div v-if="loading" class="hp-skel-list"><div v-for="i in 3" :key="i" class="hp-skel hp-skel--sm"/></div>
      <div v-else-if="!rows.length" class="hp-empty">Bu kunda naqd yig'ilmagan yoki inkassatsiya yozuvi yo'q</div>

      <div v-else class="ik-list">
        <div v-for="r in rows" :key="kalit(r)" class="ik-card" :class="'ik-card--' + r.holat">
          <div class="ik-card-hd">
            <div class="ik-agent">
              <div class="ik-avatar" :class="r.tur === 'dostavchi' && 'ik-avatar--d'">{{ (r.agent_nomi || '?')[0] }}</div>
              <div>
                <div class="ik-agent-name">{{ r.agent_nomi }}<span v-if="r.tur === 'dostavchi'" class="ik-tur">Dostavchik</span></div>
                <div class="ik-agent-date">{{ r.sana }}<template v-if="r.tur === 'dostavchi'"> · yetkazish va qarz undirish naqdi</template></div>
              </div>
            </div>
            <span class="ik-badge" :class="'ik-badge--' + r.holat">
              {{ r.holat === 'yopiq' ? "✓ Yopiq" : r.holat === 'kamomad' ? '⚠ Kamomad' : 'Ochiq' }}
            </span>
          </div>

          <div class="ik-nums">
            <div class="ik-num">
              <span class="ik-num-lbl">Yig'ilgan (naqd)</span>
              <span class="ik-num-val">{{ fmtSum(r.yigilgan_summa) }}</span>
            </div>
            <div class="ik-num">
              <span class="ik-num-lbl">Topshirilgan</span>
              <span class="ik-num-val" style="color:#10b981">{{ fmtSum(r.topshirilgan_summa) }}</span>
            </div>
            <div class="ik-num" v-if="r.farq !== 0">
              <span class="ik-num-lbl">Farq</span>
              <span class="ik-num-val" :style="{ color: r.farq > 0 ? '#ef4444' : '#4f46e5' }">
                {{ r.farq > 0 ? '−' : '+' }}{{ fmtSum(Math.abs(r.farq)) }}
              </span>
            </div>
          </div>

          <!-- Won Sell yangi reys: kun bo'yicha bitta yozuv — summa JAMI (oldingi + yangi) yoziladi -->
          <div v-if="r.topshirilgan_summa > 0 && r.farq > 0.5 && r.holat !== 'kamomad'" class="ik-hint">
            Avval {{ fmtSum(r.topshirilgan_summa) }} topshirilgan, keyin yana {{ fmtSum(r.farq) }} yig'ildi — jami summani yozing: {{ fmtSum(r.yigilgan_summa) }}
          </div>
          <!-- Topshirish formasi -->
          <div class="ik-form">
            <NumberInput v-model="editSumma[kalit(r)]" :bosh="null" css-class="ik-input"
              :placeholder="`Topshirilgan summa (${fmtSum(r.yigilgan_summa)})`" @keydown.enter="topshir(r)"/>
            <button class="ik-btn" :disabled="submitting === kalit(r)" @click="topshir(r)">
              {{ submitting === kalit(r) ? '...' : (r.topshirilgan_summa > 0 ? 'Yangilash' : 'Qabul qilish') }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ HISOBOT (davr) TAB ══ -->
    <template v-else>
      <div class="hp-filters">
        <input v-model="hFrom" type="date" class="hp-date" @change="loadHisobot"/>
        <span class="hp-dash">—</span>
        <input v-model="hTo" type="date" class="hp-date" @change="loadHisobot"/>
        <button class="ik-refresh" @click="loadHisobot" :disabled="hLoading">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" :class="hLoading && 'ik-spin'"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.07-8.33"/></svg>
        </button>
      </div>

      <div class="ik-summary" v-if="!hLoading && hData">
        <div class="ik-sum-item">
          <span class="ik-sum-lbl">Jami yig'ilgan</span>
          <span class="ik-sum-val">{{ fmtSum(hData.jami.yigilgan_summa) }} so'm</span>
        </div>
        <div class="ik-sum-item">
          <span class="ik-sum-lbl">Jami topshirilgan</span>
          <span class="ik-sum-val" style="color:#10b981">{{ fmtSum(hData.jami.topshirilgan_summa) }} so'm</span>
        </div>
        <div class="ik-sum-item" v-if="hData.jami.farq > 0">
          <span class="ik-sum-lbl">Jami kamomad</span>
          <span class="ik-sum-val" style="color:#ef4444">{{ fmtSum(hData.jami.farq) }} so'm</span>
        </div>
      </div>

      <div v-if="hLoading" class="hp-skel-list"><div v-for="i in 3" :key="i" class="hp-skel hp-skel--sm"/></div>
      <div v-else-if="!hData || !hData.kunlar.length" class="hp-empty">Bu davrda inkassatsiya ma'lumoti yo'q</div>

      <template v-else>
        <!-- Agent bo'yicha jamlanma kartalari — kamomadi borini bosish jadvalni shu xodimning kamomadlariga suzadi -->
        <div class="ik-agent-summary">
          <div v-for="a in hData.agentlar" :key="kalit(a)" class="ik-as-card"
            :class="{ 'ik-as-card--btn': a.farq > 0.5, 'ik-as-card--on': xodimFiltr === kalit(a) }"
            @click="xodimTanla(a)">
            <div class="ik-as-name">{{ a.agent_nomi }}<span v-if="a.tur === 'dostavchi'" class="ik-tur">Dostavchik</span></div>
            <div class="ik-as-nums">
              <span>{{ fmtSum(a.yigilgan_summa) }} yig'ilgan</span>
              <span style="color:#10b981">{{ fmtSum(a.topshirilgan_summa) }} topshirilgan</span>
              <span v-if="a.farq > 0" style="color:#ef4444">{{ fmtSum(a.farq) }} kamomad</span>
            </div>
          </div>
        </div>

        <div v-if="kamomadSoni" class="ik-filtr">
          <button class="ik-chip" :class="!faqatKamomad && 'is-on'" @click="faqatKamomad = false; xodimFiltr = null">Hammasi · {{ hData.kunlar.length }}</button>
          <button class="ik-chip ik-chip--red" :class="faqatKamomad && 'is-on'" @click="faqatKamomad = true">⚠ Faqat kamomad · {{ kamomadSoni }}</button>
          <span v-if="xodimFiltr" class="ik-filtr-xodim">
            {{ hData.agentlar.find(a => kalit(a) === xodimFiltr)?.agent_nomi }}
            <button class="ik-filtr-x" @click="xodimFiltr = null">✕</button>
          </span>
        </div>

        <!-- Kunlik jadval -->
        <div class="ik-table-wrap">
          <table class="ik-table">
            <thead>
              <tr>
                <th>Sana</th>
                <th>Xodim</th>
                <th>Yig'ilgan</th>
                <th>Topshirilgan</th>
                <th>Farq</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(k,i) in korinadiganKunlar" :key="i" :class="k.farq > 0.5 && 'ik-tr--kam'">
                <td>{{ k.sana }}</td>
                <td>{{ k.agent_nomi }}<span v-if="k.tur === 'dostavchi'" class="ik-tur">Dostavchik</span></td>
                <td>{{ fmtSum(k.yigilgan_summa) }}</td>
                <td style="color:#10b981">{{ fmtSum(k.topshirilgan_summa) }}</td>
                <td :style="{ color: k.farq > 0 ? '#ef4444' : '#64748b' }">
                  <div class="ik-farq">
                    <span>{{ k.farq > 0 ? fmtSum(k.farq) : '—' }}</span>
                    <button v-if="k.farq > 0.5" class="ik-qabul" @click="kamomadOch(k)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Qabul qilish
                    </button>
                  </div>
                </td>
                <td>
                  <!-- Topshirilmagan naqd qolgan kun — saqlangan holat "yopiq" bo'lsa ham kamomad ko'rinadi -->
                  <span class="ik-badge" :class="'ik-badge--' + (k.farq > 0.5 ? 'kamomad' : k.holat)">
                    {{ k.farq > 0.5 ? '⚠ Kamomad' : k.holat === 'yopiq' ? "✓ Yopiq" : k.holat === 'kamomad' ? '⚠ Kamomad' : 'Ochiq' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- ═══ Kamomadni qabul qilish ═══ -->
      <Teleport to="body">
        <div v-if="kam" class="ik-m-ov" @click.self="kam = null">
          <div class="ik-m-box">
            <div class="ik-m-hd">
              <div>
                <div class="ik-m-title">Kamomadni qabul qilish</div>
                <div class="ik-m-sub">{{ kam.agent_nomi }}<template v-if="kam.tur === 'dostavchi'"> · dostavchik</template> · {{ sanaMatn(kam.sana) }}</div>
              </div>
              <button class="ik-m-x" @click="kam = null" aria-label="Yopish">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="ik-m-nums">
              <div><span>Yig'ilgan</span><b>{{ fmtSum(kam.yigilgan_summa) }}</b></div>
              <div><span>Topshirilgan</span><b style="color:#10b981">{{ fmtSum(kam.topshirilgan_summa) }}</b></div>
              <div><span>Kamomad</span><b style="color:#dc2626">{{ fmtSum(kam.farq) }}</b></div>
            </div>
            <label class="ik-m-lbl">Hozir olib kelgan summasi</label>
            <NumberInput ref="kamInput" v-model="kamSumma" :bosh="null" css-class="ik-m-input" placeholder="0" @keydown.enter="kamomadSaqla"/>
            <div class="ik-m-tez">
              <button class="ik-chip" :class="kamSumma === kam.farq && 'is-on'" @click="kamSumma = kam.farq">To'liq · {{ fmtSum(kam.farq) }}</button>
              <span v-if="kamSumma && kamSumma < kam.farq" class="ik-m-qoldi">qoladi: {{ fmtSum(kam.farq - kamSumma) }}</span>
              <span v-else-if="kamSumma && kamSumma > kam.farq + 0.5" class="ik-m-qoldi" style="color:#dc2626">kamomaddan ko'p</span>
            </div>
            <label class="ik-m-lbl">Izoh (ixtiyoriy)</label>
            <input v-model="kamIzoh" class="ik-m-input" maxlength="200" placeholder="Masalan: ertasi kuni olib keldi"/>
            <p class="ik-m-note">Bu pul kassa qoldig'ida allaqachon bor — mijozdan olinganda yozilgan. Bu yerda xodim uni kassirga topshirgani qayd qilinadi va o'sha kunning izohiga yoziladi. Qisman olsangiz, qolgani kamomad bo'lib turadi.</p>
            <div class="ik-m-ft">
              <button class="ik-m-btn ik-m-btn--2" @click="kam = null">Bekor</button>
              <button class="ik-m-btn" :disabled="kamBand || !kamSumma || kamSumma > kam.farq + 0.5" @click="kamomadSaqla">
                {{ kamBand ? 'Saqlanmoqda…' : 'Qabul qilish' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import NumberInput from '@/components/NumberInput.vue'
// @ts-ignore
import { hisobotApi } from '@/api/api'
// @ts-ignore
import { useToast } from '@/composables/useToast'

const toast = useToast()

/* Xodim — agent (agent_id) yoki dostavchik (dostavchi_id); tur + xodim_id bilan ajratiladi */
interface Xodim { tur?: 'agent' | 'dostavchi'; xodim_id?: number; agent_id: number | null; dostavchi_id?: number | null; agent_nomi: string }
interface InkasRow extends Xodim {
  id: number | null; sana: string
  yigilgan_summa: number; topshirilgan_summa: number; farq: number; holat: string
}
interface HisobotKun extends Xodim {
  sana: string
  yigilgan_summa: number; topshirilgan_summa: number; farq: number; holat: string
}
interface HisobotAgent extends Xodim {
  yigilgan_summa: number; topshirilgan_summa: number; farq: number; kun_soni: number
}
const kalit = (x: Xodim) => `${x.tur || 'agent'}-${x.xodim_id ?? x.agent_id}`
interface HisobotData {
  date_from: string; date_to: string
  kunlar: HisobotKun[]; agentlar: HisobotAgent[]
  jami: { yigilgan_summa: number; topshirilgan_summa: number; farq: number }
}

const tab = ref<'kunlik' | 'hisobot'>('kunlik')

const sana = ref(new Date().toISOString().slice(0, 10))
const loading = ref(false)
const submitting = ref<string | null>(null)
const rows = ref<InkasRow[]>([])
const editSumma = ref<Record<string, number | null>>({})

const totalYigilgan = computed(() => rows.value.reduce((s, r) => s + Number(r.yigilgan_summa || 0), 0))
const totalTopshirilgan = computed(() => rows.value.reduce((s, r) => s + Number(r.topshirilgan_summa || 0), 0))
const totalFarq = computed(() => rows.value.reduce((s, r) => s + Math.max(0, Number(r.farq || 0)), 0))

async function load() {
  loading.value = true
  try {
    rows.value = await hisobotApi.inkassatsiya({ sana: sana.value })
  } catch (e: any) {
    toast.error('Yuklash xatosi', e.message || 'Server bilan aloqa yo\'q')
  } finally {
    loading.value = false
  }
}

// ── Davr bo'yicha hisobot (Hisobot tab) ──
const hFrom = ref((() => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10) })())
const hTo = ref(new Date().toISOString().slice(0, 10))
const hLoading = ref(false)
const hData = ref<HisobotData | null>(null)

async function loadHisobot() {
  hLoading.value = true
  try {
    hData.value = await hisobotApi.inkassatsiyaHisobot({ date_from: hFrom.value, date_to: hTo.value })
  } catch (e: any) {
    toast.error('Yuklash xatosi', e.message || 'Server bilan aloqa yo\'q')
  } finally {
    hLoading.value = false
  }
}

// ── Kamomadni keyin qabul qilish (Hisobot jadvalidan) ──
const faqatKamomad = ref(false)
const xodimFiltr = ref<string | null>(null)
const kamomadSoni = computed(() => (hData.value?.kunlar || []).filter(k => k.farq > 0.5).length)
const korinadiganKunlar = computed(() => (hData.value?.kunlar || [])
  .filter(k => !faqatKamomad.value || k.farq > 0.5)
  .filter(k => !xodimFiltr.value || kalit(k) === xodimFiltr.value))

function xodimTanla(a: HisobotAgent) {
  if (!(a.farq > 0.5)) return
  xodimFiltr.value = xodimFiltr.value === kalit(a) ? null : kalit(a)
  if (xodimFiltr.value) faqatKamomad.value = true
}

const kam = ref<HisobotKun | null>(null)
const kamSumma = ref<number | null>(null)
const kamIzoh = ref('')
const kamBand = ref(false)
const kamInput = ref<{ focus: () => void; select: () => void } | null>(null)

function kamomadOch(k: HisobotKun) {
  kam.value = k
  kamSumma.value = k.farq
  kamIzoh.value = ''
  setTimeout(() => { kamInput.value?.focus(); kamInput.value?.select() }, 60)
}

async function kamomadSaqla() {
  const k = kam.value
  const summa = Number(kamSumma.value || 0)
  if (!k || !(summa > 0)) return
  if (summa > k.farq + 0.5) { toast.error('Xatolik', `Kamomad ${fmtSum(k.farq)} so'm — undan ko'p qabul qilib bo'lmaydi`); return }
  kamBand.value = true
  try {
    const kimi = k.tur === 'dostavchi' ? { dostavchi_id: k.xodim_id ?? k.dostavchi_id } : { agent_id: k.xodim_id ?? k.agent_id }
    await hisobotApi.inkassatsiyaKamomad({ ...kimi, sana: k.sana, summa, izoh: kamIzoh.value.trim() || undefined })
    toast.success('Qabul qilindi', `${k.agent_nomi} — ${fmtSum(summa)} so'm (${sanaMatn(k.sana)})${summa < k.farq ? `, qoldi ${fmtSum(k.farq - summa)}` : ''}`)
    kam.value = null
    await loadHisobot()
    if (sana.value === k.sana) load()
  } catch (e: any) {
    toast.error('Xatolik', e.message || 'Saqlab bo\'lmadi')
  } finally {
    kamBand.value = false
  }
}

const OY = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
function sanaMatn(s: string) {
  const [y = 0, m = 1, d = 0] = s.split('-').map(Number)
  return `${d}-${OY[m - 1] ?? ''} ${y}`
}

async function topshir(r: InkasRow) {
  const summa = editSumma.value[kalit(r)]
  if (summa == null || summa < 0) { toast.error('Xatolik', 'Summani kiriting'); return }
  submitting.value = kalit(r)
  try {
    const kim = r.tur === 'dostavchi' ? { dostavchi_id: r.xodim_id ?? r.dostavchi_id } : { agent_id: r.xodim_id ?? r.agent_id }
    await hisobotApi.inkassatsiyaTopshir({ ...kim, sana: sana.value, topshirilgan_summa: summa })
    toast.success('Saqlandi', `${r.agent_nomi} — inkassatsiya qayd qilindi`)
    await load()
  } catch (e: any) {
    toast.error('Xatolik', e.message || 'Saqlab bo\'lmadi')
  } finally {
    submitting.value = null
  }
}

function fmtSum(v: number) {
  if (!v) return '0'
  return Number(v).toLocaleString('uz-UZ')
}

onMounted(load)
</script>

<style scoped>
.hp-wrap { display:flex; flex-direction:column; gap:18px; padding:2px 0 40px; }
.hp-head { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; flex-wrap:wrap; }
.hp-title { font-size:22px; font-weight:900; color:#1e293b; margin:0 0 4px; letter-spacing:-.3px; }
.hp-sub { font-size:13px; color:#94a3b8; margin:0; }
.hp-filters { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.hp-date { border:1.5px solid #e2e8f0; background:#fff; border-radius:10px; padding:8px 12px; font-size:13px; color:#1e293b; }
.hp-date:focus { outline:none; border-color:#6366f1; }
.hp-dash { color:#94a3b8; }
.ik-refresh { width:36px; height:36px; border-radius:10px; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; }
.ik-refresh:hover { border-color:#6366f1; color:#6366f1; }
.ik-spin { animation:ik-rot .7s linear infinite; }
@keyframes ik-rot { to{transform:rotate(360deg)} }

.hp-tabs { display:flex; background:#f1f5f9; border-radius:11px; padding:3px; gap:2px; }
.hp-tab { padding:7px 16px; border:none; background:transparent; border-radius:8px; font-size:13px; font-weight:600; color:#64748b; cursor:pointer; transition:.15s; }
.hp-tab.is-on { background:#fff; color:#1e293b; font-weight:700; box-shadow:0 2px 6px rgba(0,0,0,.08); }

.ik-agent-summary { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:10px; }
.ik-as-card { background:#fff; border:1.5px solid #e8ecf8; border-radius:12px; padding:12px 14px; }
.ik-as-name { font-size:13px; font-weight:700; color:#1e293b; margin-bottom:6px; }
.ik-as-nums { display:flex; flex-direction:column; gap:2px; font-size:12px; color:#1e293b; }

.ik-table-wrap { background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; overflow:auto; }
.ik-table { width:100%; border-collapse:collapse; font-size:13px; }
.ik-table th { text-align:left; padding:10px 14px; font-size:11.5px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.3px; border-bottom:1.5px solid #f1f5f9; white-space:nowrap; }
.ik-table td { padding:10px 14px; border-bottom:1px solid #f8fafc; color:#1e293b; white-space:nowrap; }
.ik-table tr:last-child td { border-bottom:none; }

.hp-empty { text-align:center; padding:60px 20px; color:#94a3b8; font-size:14px; background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; }
.hp-skel-list { display:flex; flex-direction:column; gap:12px; }
.hp-skel { border-radius:16px; background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:hp-shim 1.4s ease infinite; }
.hp-skel--sm { height:120px; }
@keyframes hp-shim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* Summary */
.ik-summary { display:flex; gap:14px; flex-wrap:wrap; background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; padding:16px 20px; }
.ik-sum-item { display:flex; flex-direction:column; gap:2px; }
.ik-sum-lbl { font-size:11.5px; color:#94a3b8; }
.ik-sum-val { font-size:17px; font-weight:800; color:#1e293b; }

/* Agent kartalari */
.ik-list { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:14px; }
.ik-card { background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:12px; }
.ik-card--kamomad { border-color:#fecaca; background:#fffbfb; }
.ik-card--yopiq { border-color:#bbf7d0; }

.ik-card-hd { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.ik-agent { display:flex; align-items:center; gap:10px; }
.ik-avatar { width:34px; height:34px; border-radius:10px; background:#eef2ff; color:#6366f1; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ik-agent-name { font-size:14px; font-weight:700; color:#1e293b; }
.ik-agent-date { font-size:11.5px; color:#94a3b8; }
.ik-avatar--d { background:#e0e7ff; color:#4338ca; }
.ik-tur { display:inline-block; margin-left:7px; padding:2px 8px; border-radius:999px; background:#eef2ff; color:#4f46e5; font-size:10.5px; font-weight:700; letter-spacing:.2px; vertical-align:middle; }
.ik-badge { font-size:11px; font-weight:700; padding:4px 10px; border-radius:999px; white-space:nowrap; }
.ik-badge--ochiq { background:#f1f5f9; color:#64748b; }
.ik-badge--yopiq { background:#f0fdf4; color:#16a34a; }
.ik-badge--kamomad { background:#fef2f2; color:#dc2626; }

.ik-nums { display:flex; gap:16px; flex-wrap:wrap; border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9; padding:11px 0; }
.ik-num { display:flex; flex-direction:column; gap:2px; }
.ik-num-lbl { font-size:11px; color:#94a3b8; }
.ik-num-val { font-size:14px; font-weight:800; color:#1e293b; }

.ik-form { display:flex; gap:8px; }
.ik-hint { margin:8px 0 0; padding:7px 10px; border-radius:8px; background:color-mix(in srgb, #d97706 10%, transparent); color:#92400e; font-size:12.5px; line-height:1.4; }
.shell.dark .ik-hint { color:#fcd34d; }
.ik-input { flex:1; min-width:0; border:1.5px solid #e2e8f0; border-radius:10px; padding:8px 11px; font-size:13px; }
.ik-input:focus { outline:none; border-color:#6366f1; }
.ik-btn { flex-shrink:0; padding:8px 16px; border:none; border-radius:10px; background:#6366f1; color:#fff; font-size:13px; font-weight:700; cursor:pointer; transition:.15s; }
.ik-btn:hover { background:#4f46e5; }
.ik-btn:disabled { opacity:.6; cursor:not-allowed; }

/* Kamomad: filtr, jadval tugmasi */
.ik-as-card--btn { cursor:pointer; transition:.15s; }
.ik-as-card--btn:hover { border-color:#fecaca; }
.ik-as-card--on { border-color:#ef4444; box-shadow:0 0 0 3px rgba(239,68,68,.12); }
.ik-filtr { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.ik-chip { padding:7px 13px; border-radius:999px; border:1.5px solid #e2e8f0; background:#fff; font-size:12.5px; font-weight:700; color:#475569; cursor:pointer; }
.ik-chip.is-on { background:#4f46e5; border-color:#4f46e5; color:#fff; }
.ik-chip--red.is-on { background:#dc2626; border-color:#dc2626; }
.ik-filtr-xodim { display:inline-flex; align-items:center; gap:6px; padding:5px 6px 5px 12px; border-radius:999px; background:#eef2ff; color:#4338ca; font-size:12.5px; font-weight:700; }
.ik-filtr-x { border:none; background:#c7d2fe; color:#3730a3; width:20px; height:20px; border-radius:50%; cursor:pointer; font-size:10px; }
.ik-tr--kam td { background:#fffbfb; }
.ik-farq { display:flex; align-items:center; gap:10px; }
.ik-qabul { display:inline-flex; align-items:center; gap:5px; padding:5px 10px; border-radius:8px; border:none; background:#4f46e5; color:#fff; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; }
.ik-qabul:hover { background:#4338ca; }

/* Modal */
.ik-m-ov { position:fixed; inset:0; z-index:1000; background:rgba(30,27,75,.5); display:flex; align-items:center; justify-content:center; padding:16px; }
.ik-m-box { width:100%; max-width:440px; background:#fff; border-radius:20px; padding:20px; display:flex; flex-direction:column; gap:10px; box-shadow:0 24px 60px rgba(30,27,75,.3); }
.ik-m-hd { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
.ik-m-title { font-size:17px; font-weight:800; color:#1e293b; }
.ik-m-sub { font-size:12.5px; color:#64748b; margin-top:2px; }
.ik-m-x { width:34px; height:34px; border-radius:10px; border:1.5px solid #e2e8f0; background:#fff; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ik-m-nums { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:4px 0 2px; }
.ik-m-nums div { background:#f8fafc; border-radius:12px; padding:9px 10px; display:flex; flex-direction:column; gap:2px; }
.ik-m-nums span { font-size:11px; color:#94a3b8; }
.ik-m-nums b { font-size:14px; color:#1e293b; }
.ik-m-lbl { font-size:11.5px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.4px; margin-top:4px; }
.ik-m-input { width:100%; box-sizing:border-box; border:1.5px solid #e2e8f0; border-radius:12px; padding:10px 12px; font-size:15px; font-weight:600; color:#1e293b; background:#fff; }
.ik-m-input:focus { outline:none; border-color:#6366f1; }
.ik-m-tez { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.ik-m-qoldi { font-size:12.5px; font-weight:700; color:#d97706; }
.ik-m-note { margin:4px 0 0; padding:9px 11px; border-radius:10px; background:#eef2ff; color:#3730a3; font-size:12px; line-height:1.45; }
.ik-m-ft { display:flex; gap:8px; justify-content:flex-end; margin-top:6px; }
.ik-m-btn { padding:10px 18px; border:none; border-radius:11px; background:#4f46e5; color:#fff; font-size:13.5px; font-weight:700; cursor:pointer; }
.ik-m-btn:disabled { opacity:.5; cursor:not-allowed; }
.ik-m-btn--2 { background:#f1f5f9; color:#475569; }

@media(max-width:640px) { .ik-list { grid-template-columns:1fr; } }
</style>
