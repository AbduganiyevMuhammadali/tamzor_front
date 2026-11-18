<script setup lang="ts">
/* Bosh sahifa → "Mijozlar reytingi" bloki: o'rtacha reyting halqasi, asosiy sonlar, darajalar taqsimoti,
   dinamika chizig'i va "Diqqat talab" kartasi (xavfli mijozlar · to'lov va'dalari · rad sabablari).
   Ma'lumot: GET /tahlil/reyting (davr — bosh sahifadagi Bugun / Hafta / Oy / Yil). Batafsil: /hisobot/reyting. */
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
// @ts-ignore
import { tahlilApi } from '@/api/api'
import ReytingChiziq from '@/components/ReytingChiziq.vue'
import { darajaOl, darajaKod, REYTING_MAX } from '@/utils/reyting'

const props = defineProps<{ period: 'today' | 'week' | 'month' | 'year' }>()
const router = useRouter()
const d = ref<any>(null)
const xato = ref(false)
const tab = ref<'xavfli' | 'vada' | 'sabab'>('xavfli')

const pad = (n: number) => String(n).padStart(2, '0')
const kunKey = (x: Date) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
function davr() {
  const b = new Date(), g = kunKey(b)
  if (props.period === 'today') { const x = new Date(b); x.setDate(x.getDate() - 6); return { dan: kunKey(x), gacha: g } }   // bitta kunlik chiziq ma'nosiz — so'nggi hafta
  if (props.period === 'week') { const x = new Date(b); x.setDate(x.getDate() - 6); return { dan: kunKey(x), gacha: g } }
  if (props.period === 'year') { const x = new Date(b); x.setFullYear(x.getFullYear() - 1); x.setDate(x.getDate() + 1); return { dan: kunKey(x), gacha: g } }
  return { dan: `${b.getFullYear()}-${pad(b.getMonth() + 1)}-01`, gacha: g }
}
async function load() {
  try { d.value = await tahlilApi.reyting(davr()); xato.value = false } catch { xato.value = true }
}
watch(() => props.period, load, { immediate: true })

const dr = computed(() => darajaOl(d.value?.holat?.ortacha))
const R = 46, AYLANA = 2 * Math.PI * R
const dash = computed(() => `${(Math.min(REYTING_MAX, d.value?.holat?.ortacha || 0) / REYTING_MAX) * AYLANA} ${AYLANA}`)
const farq = computed(() => d.value ? +(d.value.holat.ortacha - d.value.holat.davr_boshi).toFixed(1) : 0)
const ishora = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '±') + String(Math.abs(v)).replace('.', ',')
const h = (t: string) => d.value?.hodisalar?.[t] || { soni: 0, ball: 0, mijoz: 0 }
const jamiTaqsimot = computed(() => (d.value?.darajalar || []).reduce((s: number, x: any) => s + x.soni, 0))
const qisqa = (n: number) => { const v = Math.abs(Number(n) || 0); return v >= 1e6 ? (v / 1e6).toFixed(1).replace('.0', '') + ' mln' : v >= 1e3 ? Math.round(v / 1e3) + ' ming' : String(Math.round(v)) }
const OY = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek']
const kun = (s: string) => { const x = new Date(s + 'T00:00:00'); return `${x.getDate()}-${OY[x.getMonth()]}` }
const vadaT = (v: any) => v.otgan_kun > 0 ? `${v.otgan_kun} kun o'tdi` : v.otgan_kun === 0 ? 'bugun' : kun(v.vada)
const davrNom = computed(() => ({ today: "so'nggi 7 kun", week: "so'nggi 7 kun", month: 'shu oy', year: "so'nggi 12 oy" } as Record<string, string>)[props.period])
const maksSabab = computed(() => Math.max(1, ...(d.value?.sabablar || []).map((x: any) => x.soni)))
const hisobot = () => router.push('/hisobot/reyting')
const mijozga = (id: number) => router.push(`/mijozlar/oldi-berdi?mijoz=${id}`)
</script>

<template>
  <section class="mr-row">
    <!-- Chap: umumiy holat -->
    <article class="mr-card">
      <div class="mr-hd">
        <h2 class="mr-t">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Mijozlar reytingi
        </h2>
        <span class="mr-sub" v-if="d">{{ d.holat.jami }} faol mijoz · {{ davrNom }}</span>
        <button class="mr-link" @click="hisobot">Batafsil hisobot</button>
      </div>

      <div v-if="!d && !xato" class="mr-skel"/>
      <div v-else-if="xato" class="mr-bosh">Reyting ma'lumoti yuklanmadi</div>
      <template v-else>
        <div class="mr-top">
          <div class="mr-ring" :style="{ '--r': dr.rang }">
            <svg viewBox="0 0 110 110" aria-hidden="true">
              <circle cx="55" cy="55" :r="R" class="mr-ring-bg"/>
              <circle cx="55" cy="55" :r="R" class="mr-ring-fg" :stroke-dasharray="dash" transform="rotate(-90 55 55)"/>
            </svg>
            <div class="mr-ring-c"><b>{{ String(d.holat.ortacha).replace('.', ',') }}</b><span>o'rtacha</span></div>
          </div>
          <div class="mr-ring-yon">
            <span class="mr-daraja" :style="{ color: dr.rang, background: dr.fon }">{{ dr.nom }}</span>
            <span class="mr-farq" :class="farq > 0 ? 'ok' : farq < 0 ? 'err' : ''">{{ ishora(farq) }} ball {{ davrNom }}</span>
          </div>
          <div class="mr-stats">
            <button class="mr-stat" :class="{ 'mr-stat--err': d.holat.diqqat }" @click="tab = 'xavfli'">
              <b>{{ d.holat.diqqat }}</b><span>Diqqat talab</span>
            </button>
            <button class="mr-stat" :class="{ 'mr-stat--warn': d.holat.vada_otgan }" @click="tab = 'vada'">
              <b>{{ d.holat.vada_otgan }}</b><span>Va'da o'tgan</span>
            </button>
            <button class="mr-stat" @click="tab = 'vada'">
              <b>{{ d.holat.vada_bugun }}</b><span>Bugun to'laydi</span>
            </button>
            <button class="mr-stat" @click="tab = 'sabab'">
              <b>{{ h('rad_etildi').soni }}</b><span>Rad etish</span>
            </button>
          </div>
        </div>

        <div class="mr-dist">
          <div class="mr-dist-bar">
            <span v-for="x in d.darajalar.filter((y: any) => y.soni)" :key="x.kod" :style="{ flex: x.soni, background: darajaKod(x.kod).rang }" :title="`${x.nom}: ${x.soni}`"/>
          </div>
          <div class="mr-dist-leg">
            <span v-for="x in d.darajalar" :key="x.kod" :class="{ nol: !x.soni }"><i :style="{ background: darajaKod(x.kod).rang }"/>{{ x.nom }} <b>{{ x.soni }}</b><em v-if="jamiTaqsimot">{{ Math.round(x.soni / jamiTaqsimot * 100) }}%</em></span>
          </div>
        </div>

        <ReytingChiziq :data="d.trend" :guruh="d.davr.guruh" :balandlik="130"/>
      </template>
    </article>

    <!-- O'ng: diqqat talab -->
    <article class="mr-card">
      <div class="mr-hd">
        <h2 class="mr-t mr-t--crit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Diqqat talab qiladi
        </h2>
      </div>
      <div class="mr-tabs">
        <button :class="{ on: tab === 'xavfli' }" @click="tab = 'xavfli'">Xavfli<i v-if="d">{{ d.diqqat.length }}</i></button>
        <button :class="{ on: tab === 'vada' }" @click="tab = 'vada'">Va'dalar<i v-if="d">{{ d.vadalar.length }}</i></button>
        <button :class="{ on: tab === 'sabab' }" @click="tab = 'sabab'">Rad sabablari</button>
      </div>

      <div v-if="!d" class="mr-skel mr-skel--sm"/>
      <template v-else>
        <ul v-if="tab === 'xavfli' && d.diqqat.length" class="mr-list">
          <li v-for="m in d.diqqat.slice(0, 6)" :key="m.id" @click="mijozga(m.id)">
            <span class="mr-score" :style="{ color: darajaOl(m.reyting).rang, background: darajaOl(m.reyting).fon }">{{ m.reyting }}</span>
            <span class="mr-list-n"><b>{{ m.nomi }}</b><small>{{ m.agent || '—' }}<template v-if="m.rad_ketma_ket"> · {{ m.rad_ketma_ket }} marta ketma-ket rad</template></small></span>
            <span class="mr-list-v" v-if="m.qarz">{{ qisqa(m.qarz) }}</span>
          </li>
        </ul>
        <ul v-else-if="tab === 'vada' && d.vadalar.length" class="mr-list">
          <li v-for="v in d.vadalar.slice(0, 6)" :key="v.id" @click="mijozga(v.id)">
            <span class="mr-tag" :class="v.otgan_kun > 0 ? 'err' : v.otgan_kun === 0 ? 'warn' : ''">{{ vadaT(v) }}</span>
            <span class="mr-list-n"><b>{{ v.nomi }}</b><small>{{ v.agent || '—' }}</small></span>
            <span class="mr-list-v">{{ qisqa(v.qarz) }}</span>
          </li>
        </ul>
        <div v-else-if="tab === 'sabab' && d.sabablar.length" class="mr-sab">
          <div v-for="s in d.sabablar.slice(0, 6)" :key="s.nom" class="mr-sab-r">
            <div class="mr-sab-t"><span>{{ s.nom }}</span><b>{{ s.soni }}</b></div>
            <div class="mr-sab-bar"><i :style="{ width: (s.soni / maksSabab * 100) + '%', background: s.neytral ? 'var(--neutral-mark, #94a3b8)' : 'var(--critical, #be123c)' }"/></div>
          </div>
        </div>
        <div v-else class="mr-bosh">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          {{ tab === 'xavfli' ? "Past yoki Kritik darajadagi mijoz yo'q" : tab === 'vada' ? "Kutilayotgan to'lov va'dasi yo'q" : "Bu davrda rad etish qayd etilmagan" }}
        </div>
      </template>
      <button class="mr-link mr-link--ft" @click="hisobot">Barcha ro'yxat</button>
    </article>
  </section>
</template>

<style scoped>
.mr-row { display:grid; gap:12px; grid-template-columns:minmax(0,1.85fr) minmax(0,1fr); }
@media (max-width: 1100px) { .mr-row { grid-template-columns:minmax(0,1fr); } }
.mr-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r, 14px); padding:16px; display:flex; flex-direction:column; gap:13px;
  box-shadow:var(--shadow); transition:box-shadow .2s, border-color .2s; min-width:0; }
.mr-card:hover { box-shadow:var(--shadow-lift); border-color:color-mix(in oklab, var(--accent) 18%, var(--border)); }
.mr-hd { display:flex; align-items:center; gap:9px; flex-wrap:wrap; min-height:26px; }
.mr-t { display:flex; align-items:center; gap:9px; font-size:13.5px; font-weight:800; color:var(--ink); margin:0; letter-spacing:-.01em; }
.mr-t > svg { width:26px; height:26px; padding:6px; box-sizing:border-box; border-radius:8px; background:var(--accent-wash); color:var(--accent); flex-shrink:0; }
.mr-t--crit > svg { background:var(--critical-wash); color:var(--critical); }
.mr-sub { font-size:11px; color:var(--ink-muted); white-space:nowrap; }
.mr-link { margin-left:auto; border:none; background:none; font-size:11.5px; font-weight:600; color:var(--accent); cursor:pointer; padding:4px 0; display:inline-flex; align-items:center; gap:3px; }
.mr-link::after { content:'→'; transition:transform .2s var(--ease); }
.mr-link:hover::after { transform:translateX(3px); }
.mr-link--ft { margin:auto 0 0 auto; }
.mr-skel { height:220px; border-radius:12px; background:linear-gradient(90deg, var(--surface-sunken) 25%, var(--grid, #e8edf3) 50%, var(--surface-sunken) 75%); background-size:200% 100%; animation:mr-sh 1.4s ease infinite; }
.mr-skel--sm { height:180px; }
@keyframes mr-sh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.mr-bosh { display:flex; align-items:center; gap:8px; padding:16px 12px; font-size:12.5px; color:var(--ink-muted); background:var(--surface-sunken); border-radius:10px; }
.mr-bosh svg { width:18px; height:18px; color:var(--good, #047857); flex-shrink:0; }

/* Halqa va sonlar */
.mr-top { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.mr-ring { position:relative; width:110px; height:110px; flex-shrink:0; }
.mr-ring svg { width:110px; height:110px; display:block; }
.mr-ring-bg { fill:none; stroke:var(--surface-sunken); stroke-width:10; }
.mr-ring-fg { fill:none; stroke:var(--r); stroke-width:10; stroke-linecap:round; transition:stroke-dasharray .6s var(--ease); }
.mr-ring-c { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; line-height:1; }
.mr-ring-c b { font-size:26px; font-weight:800; color:var(--r); font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
.mr-ring-c span { font-size:10.5px; color:var(--ink-muted); margin-top:4px; font-weight:600; }
.mr-ring-yon { display:flex; flex-direction:column; align-items:flex-start; gap:6px; }
.mr-daraja { padding:3px 12px; border-radius:999px; font-size:13px; font-weight:800; }
.mr-farq { font-size:12px; font-weight:600; color:var(--ink-muted); white-space:nowrap; }
.mr-farq.ok { color:var(--good); } .mr-farq.err { color:var(--critical); }
.mr-stats { flex:1; min-width:260px; display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:8px; }
.mr-stat { display:flex; flex-direction:column; align-items:flex-start; gap:2px; padding:10px 12px; border-radius:11px; background:var(--surface-sunken); border:1px solid transparent; cursor:pointer; text-align:left; font:inherit; transition:border-color .15s; }
.mr-stat:hover { border-color:color-mix(in oklab, var(--accent) 30%, transparent); }
.mr-stat b { font-size:20px; font-weight:800; color:var(--ink); font-variant-numeric:tabular-nums; line-height:1.15; }
.mr-stat span { font-size:11px; color:var(--ink-muted); font-weight:600; white-space:nowrap; }
.mr-stat--err { background:var(--critical-wash); } .mr-stat--err b { color:var(--critical); }
.mr-stat--warn { background:var(--warning-wash); } .mr-stat--warn b { color:var(--warning); }

/* Taqsimot */
.mr-dist { display:flex; flex-direction:column; gap:8px; }
.mr-dist-bar { display:flex; gap:3px; height:9px; }
.mr-dist-bar span { border-radius:5px; min-width:6px; }
.mr-dist-leg { display:flex; gap:14px; flex-wrap:wrap; font-size:11.5px; color:var(--ink-secondary); font-weight:600; }
.mr-dist-leg span { display:inline-flex; align-items:center; gap:5px; }
.mr-dist-leg span.nol { opacity:.5; }
.mr-dist-leg i { width:8px; height:8px; border-radius:50%; }
.mr-dist-leg b { color:var(--ink); font-variant-numeric:tabular-nums; }
.mr-dist-leg em { font-style:normal; color:var(--ink-muted); font-weight:500; }

/* O'ng karta */
.mr-tabs { display:flex; background:var(--seg-track); box-shadow:inset 0 0 0 1px var(--seg-brd); border-radius:10px; padding:3px; gap:2px; }
.mr-tabs button { flex:1; display:inline-flex; align-items:center; justify-content:center; gap:6px; border:none; background:transparent; padding:6px 8px; border-radius:8px; font-size:12px; font-weight:600; color:var(--seg-ink); cursor:pointer; transition:color .15s; }
.mr-tabs button:hover:not(.on) { color:var(--seg-ink-h); }
.mr-tabs button.on { background:var(--seg-on-bg); color:var(--seg-on-ink); box-shadow:var(--seg-on-sh); }
.mr-tabs i { font-style:normal; font-size:10.5px; font-weight:800; padding:0 6px; border-radius:999px; background:var(--accent-wash); color:var(--accent); }
.mr-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; }
.mr-list li { display:flex; align-items:center; gap:10px; padding:8px 2px; border-bottom:1px solid var(--border); cursor:pointer; }
.mr-list li:last-child { border-bottom:none; }
.mr-list li:hover .mr-list-n b { color:var(--accent); }
.mr-score { min-width:34px; text-align:center; padding:3px 6px; border-radius:8px; font-size:12.5px; font-weight:800; font-variant-numeric:tabular-nums; }
.mr-list-n { flex:1; min-width:0; display:flex; flex-direction:column; }
.mr-list-n b { font-size:12.5px; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; transition:color .15s; }
.mr-list-n small { font-size:11px; color:var(--ink-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mr-list-v { font-size:12.5px; font-weight:700; color:var(--ink); font-variant-numeric:tabular-nums; white-space:nowrap; }
.mr-tag { flex-shrink:0; padding:3px 8px; border-radius:999px; font-size:11px; font-weight:700; background:var(--surface-sunken); color:var(--ink-secondary); white-space:nowrap; }
.mr-tag.err { background:var(--critical-wash); color:var(--critical); } .mr-tag.warn { background:var(--warning-wash); color:var(--warning); }
.mr-sab { display:flex; flex-direction:column; gap:10px; }
.mr-sab-t { display:flex; justify-content:space-between; gap:8px; font-size:12.5px; color:var(--ink-secondary); font-weight:600; }
.mr-sab-t b { color:var(--ink); font-variant-numeric:tabular-nums; }
.mr-sab-bar { height:6px; border-radius:3px; background:var(--surface-sunken); overflow:hidden; margin-top:4px; }
.mr-sab-bar i { display:block; height:100%; border-radius:3px; }
</style>
