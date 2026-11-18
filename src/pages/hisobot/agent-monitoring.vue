<template>
  <div class="am-page">

    <!-- ═══ HEAD ═══ -->
    <div class="am-head">
      <div>
        <h2 class="am-title">Agent nazorati</h2>
        <p class="am-sub">
          {{ davrLabel }}
          <template v-if="d.kpi.agent_soni"> · {{ d.kpi.agent_soni }} ta agent</template>
        </p>
      </div>
      <div class="am-head-right">
        <select v-model="f.agent_id" class="am-sel" @change="load">
          <option value="">Barcha agentlar</option>
          <option v-for="a in d.agentlar" :key="a.id" :value="a.id">{{ a.fullname }}</option>
        </select>
        <div class="am-period">
          <button v-for="p in PERIODS" :key="p.key" class="am-pbtn"
            :class="{ on: period === p.key }" @click="setPeriod(p.key)">{{ p.label }}</button>
        </div>
        <input type="date" v-model="f.dan"   class="am-date" @change="period=''; load()">
        <input type="date" v-model="f.gacha" class="am-date" @change="period=''; load()">
      </div>
    </div>

    <!-- ═══ KPI KARTALARI (animatsion) ═══ -->
    <div class="am-kpis">
      <div v-for="(c, i) in kartalar" :key="c.key"
        class="am-kpi" :class="[{ 'am-kpi--alert': c.alert }, 'am-in']"
        :style="{ animationDelay: i * 60 + 'ms' }">

        <!-- Fon spark-chart -->
        <svg v-if="c.spark && c.spark.length > 1" class="am-kpi-spark" viewBox="0 0 100 32" preserveAspectRatio="none">
          <defs>
            <linearGradient :id="'kg' + i" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  :stop-color="c.color" stop-opacity=".28"/>
              <stop offset="100%" :stop-color="c.color" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path :d="sparkArea(c.spark)" :fill="'url(#kg' + i + ')'"/>
          <path :d="sparkLine(c.spark)" fill="none" :stroke="c.color" stroke-width="1.6"
                stroke-linecap="round" stroke-linejoin="round" class="am-spark-p"/>
        </svg>

        <div class="am-kpi-ic" :style="{ background: c.color + '1a', color: c.color }" v-html="c.icon"/>
        <div class="am-kpi-txt">
          <div class="am-kpi-v" :style="{ color: c.strong ? c.color : '' }">{{ c.val }}</div>
          <div class="am-kpi-l">{{ c.label }}</div>
        </div>

        <!-- Halqa ko'rsatkich (foizli kartalar uchun) -->
        <svg v-if="c.ring != null" class="am-kpi-ring" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="16" fill="none" stroke="#f1f5f9" stroke-width="4"/>
          <circle cx="20" cy="20" r="16" fill="none" :stroke="c.color" stroke-width="4"
            stroke-linecap="round" transform="rotate(-90 20 20)"
            :stroke-dasharray="RING"
            :stroke-dashoffset="RING - RING * Math.min(100, c.ring) / 100"
            class="am-ring-p"/>
        </svg>
      </div>
    </div>

    <!-- ═══ TABS ═══ -->
    <div class="am-tabs">
      <button v-for="t in TABS" :key="t.key" class="am-tab"
        :class="{ on: tab === t.key }" @click="tab = t.key">
        {{ t.label }}
        <span v-if="t.key === 'anomaliya' && d.anomaliyalar.length" class="am-tab-b">{{ d.anomaliyalar.length }}</span>
        <span v-else-if="t.key === 'jurnal' && d.jurnal.length" class="am-tab-b am-tab-b--n">{{ d.jurnal.length }}</span>
      </button>
    </div>

    <div v-if="loading" class="am-loading"><span class="am-spin"/> Yuklanmoqda...</div>

    <Transition v-else name="am-sw" mode="out-in">
    <div :key="tab">

      <!-- ══════════ BUGUNGI MARSHRUT ══════════ -->
      <AgentMarshrut v-if="tab === 'marshrut'" :agent-id="f.agent_id"/>

      <!-- ══════════ REJA-FAKT ══════════ -->
      <div v-else-if="tab === 'reja'">
        <div v-if="!d.reja_fakt.length" class="am-card">
          <BoshHolat turi="reja" sarlavha="Bu davrda ma'lumot yo'q"
            matn="Tanlangan sanalar oralig'ida reja ham, tashrif ham qayd etilmagan. Boshqa davrni tanlab ko'ring."
            amal="Oxirgi 30 kun" @amal="setPeriod('oy')"/>
        </div>

        <template v-else>
          <!-- Agent kartalari -->
          <div class="am-agrid">
            <div v-for="(r, i) in d.reja_fakt" :key="r.agent_id"
              class="am-acard am-in" :style="{ animationDelay: i * 70 + 'ms' }">

              <div class="am-acard-hd">
                <span class="am-av" :style="{ background: rang(r.agent_id) }">{{ r.agent_nomi[0] }}</span>
                <div class="am-acard-n">
                  <div class="am-acard-name">{{ r.agent_nomi }}</div>
                  <div class="am-acard-sub">{{ r.bajarildi }} / {{ r.reja }} tashrif</div>
                </div>
                <!-- Donut: bajarilish -->
                <svg class="am-donut" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="17" fill="none" stroke="#f1f5f9" stroke-width="5"/>
                  <circle cx="22" cy="22" r="17" fill="none" :stroke="foizRang(r.bajarilish_foiz)"
                    stroke-width="5" stroke-linecap="round" transform="rotate(-90 22 22)"
                    :stroke-dasharray="DONUT"
                    :stroke-dashoffset="DONUT - DONUT * Math.min(100, r.bajarilish_foiz) / 100"
                    class="am-ring-p"/>
                  <text x="22" y="26" text-anchor="middle" class="am-donut-t"
                    :fill="foizRang(r.bajarilish_foiz)">{{ r.bajarilish_foiz }}%</text>
                </svg>
              </div>

              <!-- Savdo / sotmaslik nisbati -->
              <div class="am-split">
                <div class="am-split-bar">
                  <div class="am-split-g" :style="{ width: nisbat(r.savdo, r.savdo + r.sotmaslik) }"/>
                  <div class="am-split-r" :style="{ width: nisbat(r.sotmaslik, r.savdo + r.sotmaslik) }"/>
                </div>
                <div class="am-split-l">
                  <span><i class="am-d am-d--g"/>{{ r.savdo }} savdo</span>
                  <span><i class="am-d am-d--r"/>{{ r.sotmaslik }} sotmaslik</span>
                </div>
              </div>

              <div class="am-acard-ft">
                <div class="am-mini">
                  <span class="am-mini-l">Qoldi</span>
                  <b :class="{ 'am-bad': r.qoldi > 0 }">{{ r.qoldi }}</b>
                </div>
                <div class="am-mini">
                  <span class="am-mini-l">Konversiya</span>
                  <b :style="{ color: foizRang(r.konversiya_foiz) }">{{ r.konversiya_foiz }}%</b>
                </div>
                <div class="am-mini">
                  <span class="am-mini-l">Savdo</span>
                  <b>{{ fmtShort(r.summa) }}</b>
                </div>
              </div>

              <div v-if="r.rejadan_tashqari" class="am-acard-warn">
                +{{ r.rejadan_tashqari }} ta rejasiz tashrif
              </div>
            </div>
          </div>

          <!-- Taqqoslash diagrammasi -->
          <div class="am-card am-in" style="animation-delay:300ms">
            <div class="am-card-t">Reja va bajarilish taqqoslashi</div>
            <div class="am-cmp">
              <div v-for="r in d.reja_fakt" :key="r.agent_id" class="am-cmp-row">
                <span class="am-cmp-n">{{ r.agent_nomi }}</span>
                <div class="am-cmp-track">
                  <div class="am-cmp-reja" :style="{ width: pct(r.reja, maxReja) }">
                    <span class="am-cmp-v">{{ r.reja }}</span>
                  </div>
                  <div class="am-cmp-fakt" :style="{ width: pct(r.bajarildi, maxReja), background: foizRang(r.bajarilish_foiz) }">
                    <span class="am-cmp-v am-cmp-v--in">{{ r.bajarildi }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="am-legend">
              <span><i style="background:#e2e8f0"/> Reja</span>
              <span><i style="background:#10b981"/> Bajarildi</span>
            </div>
          </div>
        </template>
      </div>

      <!-- ══════════ JURNAL ══════════ -->
      <div v-else-if="tab === 'jurnal'" class="am-card">
        <div class="am-toolbar">
          <input v-model="qidiruv" class="am-search" placeholder="Agent yoki mijoz qidirish...">
          <select v-model="natijaF" class="am-sel am-sel--sm">
            <option value="">Barcha natija</option>
            <option value="savdo">Savdo</option>
            <option value="sotmaslik">Sotmaslik</option>
            <option value="ochiq">Ochiq</option>
          </select>
          <span class="am-cnt">{{ jurnalF.length }} ta</span>
        </div>

        <BoshHolat v-if="!jurnalF.length" turi="qidiruv" sarlavha="Tashrif topilmadi"
          :matn="qidiruv || natijaF ? 'Qidiruv yoki filtr shartiga mos tashrif yo\'q.' : 'Bu davrda tashrif qayd etilmagan.'"
          :amal="qidiruv || natijaF ? 'Filtrni tozalash' : ''"
          @amal="qidiruv = ''; natijaF = ''"/>
        <table v-else class="am-tbl">
          <thead>
            <tr>
              <th>Sana</th><th>Vaqt</th><th>Agent</th><th>Mijoz</th>
              <th>Davomiylik</th><th>GPS</th><th>Natija</th><th class="am-r">Summa</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(t, i) in jurnalF.slice(0, 300)" :key="t.id"
              class="am-in-row" :class="{ 'am-tr-warn': t.belgilar.length }"
              :style="{ animationDelay: Math.min(i, 20) * 22 + 'ms' }">
              <td class="am-nowrap">{{ fmtDate(t.sana) }}</td>
              <td class="am-nowrap am-dim">{{ fmtTime(t.checkin_vaqt) }}<template v-if="t.checkout_vaqt"> → {{ fmtTime(t.checkout_vaqt) }}</template></td>
              <td>
                <div class="am-ag">
                  <span class="am-av am-av--sm" :style="{ background: rang(t.agent_id) }">{{ t.agent_nomi[0] }}</span>
                  <span>{{ t.agent_nomi }}</span>
                </div>
              </td>
              <td>
                {{ t.mijoz_nomi }}
                <span v-if="!t.rejada_bor" class="am-mini-b" title="Bu tashrif rejada yo'q edi">rejasiz</span>
              </td>
              <td>
                <template v-if="t.davomiylik_daq != null">
                  <div class="am-dur">
                    <div class="am-dur-b" :style="{ width: Math.min(100, t.davomiylik_daq / 60 * 100) + '%',
                      background: t.davomiylik_daq < 3 ? '#ef4444' : (t.davomiylik_daq > 90 ? '#8b5cf6' : '#a78bfa') }"/>
                  </div>
                  <span class="am-dur-t">{{ t.davomiylik_daq }} daq</span>
                </template>
                <span v-else class="am-dim">—</span>
              </td>
              <td>
                <span v-if="t.masofa_m != null" class="am-gps" :class="{ 'am-gps--bad': t.masofa_m > d.anomaliya_chegara.uzoq_m }">
                  {{ t.masofa_m }} m
                </span>
                <span v-else class="am-dim">—</span>
              </td>
              <td><span class="am-pill" :class="natijaClass(t.natija)">{{ natijaLabel(t.natija) }}</span></td>
              <td class="am-r">{{ t.summa ? fmtSum(t.summa) : '—' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="jurnalF.length > 300" class="am-note">
          Faqat birinchi 300 tasi ko'rsatildi ({{ jurnalF.length }} tadan)
        </div>
      </div>

      <!-- ══════════ KPI / DINAMIKA ══════════ -->
      <div v-else-if="tab === 'kpi'" class="am-grid2">

        <!-- Chiziqli dinamika -->
        <div class="am-card am-in">
          <div class="am-card-t">Kunlik dinamika</div>
          <div v-if="!d.dinamika.length" class="am-empty">Ma'lumot yo'q</div>
          <div v-else class="am-lchart">
            <svg :viewBox="`0 0 ${CW} ${CH}`" class="am-svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id="am-gt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#a78bfa" stop-opacity=".3"/>
                  <stop offset="100%" stop-color="#a78bfa" stop-opacity="0"/>
                </linearGradient>
                <linearGradient id="am-gs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#10b981" stop-opacity=".28"/>
                  <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
                </linearGradient>
              </defs>

              <!-- To'r -->
              <line v-for="n in 4" :key="'g'+n" x1="0" :y1="CH / 4 * n" :x2="CW" :y2="CH / 4 * n"
                stroke="#f1f5f9" stroke-width="1"/>

              <path :d="area(dinTashrif)" fill="url(#am-gt)" class="am-area"/>
              <path :d="line(dinTashrif)" fill="none" stroke="#a78bfa" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round" class="am-line"/>
              <path :d="area(dinSavdo)" fill="url(#am-gs)" class="am-area"/>
              <path :d="line(dinSavdo)" fill="none" stroke="#10b981" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round" class="am-line"/>

              <g v-for="(k, i) in d.dinamika" :key="'p'+i">
                <circle :cx="px(i)" :cy="py(k.tashrif)" r="3.5" fill="#fff" stroke="#a78bfa" stroke-width="2" class="am-dot"/>
                <circle :cx="px(i)" :cy="py(k.savdo)"   r="3.5" fill="#fff" stroke="#10b981" stroke-width="2" class="am-dot"/>
              </g>
            </svg>
            <div class="am-xaxis">
              <span v-for="k in d.dinamika" :key="'x'+k.sana">{{ fmtDay(k.sana) }}</span>
            </div>
          </div>
          <div class="am-legend">
            <span><i style="background:#a78bfa"/> Tashrif</span>
            <span><i style="background:#10b981"/> Savdo</span>
          </div>
        </div>

        <!-- Donut: natija taqsimoti -->
        <div class="am-card am-in" style="animation-delay:80ms">
          <div class="am-card-t">Tashrif natijalari</div>
          <div v-if="!d.kpi.tashrif_soni" class="am-empty">Ma'lumot yo'q</div>
          <div v-else class="am-pie-wrap">
            <svg viewBox="0 0 120 120" class="am-pie">
              <circle v-for="(s, i) in pieSegs" :key="i"
                cx="60" cy="60" r="42" fill="none" :stroke="s.color" stroke-width="17"
                :stroke-dasharray="`${s.len} ${PIE - s.len}`" :stroke-dashoffset="-s.off"
                transform="rotate(-90 60 60)" class="am-pie-seg"/>
              <text x="60" y="56" text-anchor="middle" class="am-pie-n">{{ d.kpi.tashrif_soni }}</text>
              <text x="60" y="71" text-anchor="middle" class="am-pie-l">tashrif</text>
            </svg>
            <div class="am-pie-leg">
              <div v-for="s in pieSegs" :key="s.nomi" class="am-pie-row">
                <i :style="{ background: s.color }"/>
                <span class="am-pie-nm">{{ s.nomi }}</span>
                <b>{{ s.val }}</b>
                <span class="am-pie-p">{{ Math.round(s.val / d.kpi.tashrif_soni * 100) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sotmaslik sabablari -->
        <div class="am-card am-in" style="animation-delay:160ms">
          <div class="am-card-t">Sotmaslik sabablari</div>
          <div v-if="!d.sabablar.length" class="am-empty">Sotmaslik qayd etilmagan</div>
          <div v-else class="am-sabab">
            <div v-for="(s, i) in d.sabablar" :key="s.nomi" class="am-sabab-row">
              <span class="am-sabab-n">{{ s.nomi }}</span>
              <div class="am-bar am-bar--thin">
                <div class="am-bar-in am-bar-in--red am-grow"
                  :style="{ width: (s.soni / d.sabablar[0].soni * 100) + '%', animationDelay: i * 80 + 'ms' }"/>
              </div>
              <b>{{ s.soni }}</b>
            </div>
          </div>
        </div>

        <!-- Agent reytingi -->
        <div class="am-card am-in" style="animation-delay:240ms">
          <div class="am-card-t">Agentlar reytingi · savdo summasi</div>
          <div v-if="!d.reja_fakt.length" class="am-empty">Ma'lumot yo'q</div>
          <div v-else class="am-rank">
            <div v-for="(r, i) in reyting" :key="r.agent_id" class="am-rank-row">
              <span class="am-rank-n" :class="'am-rank-n--' + (i + 1)">{{ i + 1 }}</span>
              <span class="am-av am-av--sm" :style="{ background: rang(r.agent_id) }">{{ r.agent_nomi[0] }}</span>
              <span class="am-rank-name">{{ r.agent_nomi }}</span>
              <div class="am-bar am-bar--thin">
                <div class="am-bar-in am-grow" :style="{ width: pct(r.summa, maxSumma), background: rang(r.agent_id),
                  animationDelay: i * 80 + 'ms' }"/>
              </div>
              <b class="am-rank-v">{{ fmtShort(r.summa) }}</b>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════ ANOMALIYALAR ══════════ -->
      <div v-else>
        <!-- Tur bo'yicha kartalar -->
        <div v-if="d.anomaliyalar.length" class="am-anom-cards">
          <div v-for="(a, i) in anomTurlar" :key="a.tur"
            class="am-anom-card am-in" :style="{ animationDelay: i * 70 + 'ms', borderColor: a.color + '55' }">
            <div class="am-anom-ic" :style="{ background: a.color + '18', color: a.color }" v-html="a.icon"/>
            <div>
              <div class="am-anom-cv" :style="{ color: a.color }">{{ a.soni }}</div>
              <div class="am-anom-cl">{{ a.label }}</div>
            </div>
          </div>
        </div>

        <div class="am-card">
          <div class="am-card-t">
            Shubhali holatlar
            <span class="am-card-hint">
              check-in {{ d.anomaliya_chegara.uzoq_m }}m dan uzoq ·
              tashrif {{ d.anomaliya_chegara.qisqa_daq }} daqiqadan qisqa ·
              {{ d.anomaliya_chegara.uzun_soat }} soatdan uzun · check-out yo'q
            </span>
          </div>

          <BoshHolat v-if="!d.anomaliyalar.length" turi="ok"
            sarlavha="Shubhali holat topilmadi"
            matn="Bu davrdagi barcha tashriflar belgilangan me'yorlar ichida — GPS masofasi, davomiyligi va check-out'i joyida."/>

          <div v-else class="am-anom">
            <div v-for="(a, i) in d.anomaliyalar" :key="a.tashrif_id"
              class="am-anom-row am-in" :class="'am-anom--' + a.ogirlik"
              :style="{ animationDelay: Math.min(i, 15) * 45 + 'ms' }">
              <div class="am-anom-l">
                <div class="am-ag">
                  <span class="am-av am-av--sm" :style="{ background: rang(a.agent_id) }">{{ a.agent_nomi[0] }}</span>
                  <div>
                    <div class="am-anom-ag">{{ a.agent_nomi }}</div>
                    <div class="am-anom-mj">{{ a.mijoz_nomi }} · {{ fmtDate(a.sana) }} {{ fmtTime(a.checkin_vaqt) }}</div>
                  </div>
                </div>
              </div>
              <div class="am-anom-r">
                <span v-for="(b, bi) in a.belgilar" :key="bi" class="am-anom-b" :class="'am-anom-b--' + b.tur">{{ b.matn }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
// @ts-ignore
import { hisobotApi } from '@/api/api'
import BoshHolat from '@/components/BoshHolat.vue'
import AgentMarshrut from '@/components/AgentMarshrut.vue'

const TABS = [
  { key: 'marshrut',  label: 'Bugungi marshrut' },
  { key: 'reja',      label: 'Reja-fakt' },
  { key: 'jurnal',    label: 'Tashrif jurnali' },
  { key: 'kpi',       label: 'KPI / dinamika' },
  { key: 'anomaliya', label: 'Anomaliyalar' },
]
const PERIODS = [
  { key: 'bugun',  label: 'Bugun' },
  { key: 'hafta',  label: '7 kun' },
  { key: 'oy',     label: '30 kun' },
]
const COLORS = ['#7c3aed','#8b5cf6','#6d28d9','#5b21b6']
const rang = (id) => COLORS[id % COLORS.length]

// SVG doimiylari
const RING  = 2 * Math.PI * 16
const DONUT = 2 * Math.PI * 17
const PIE   = 2 * Math.PI * 42
const CW = 300, CH = 150   // chiziqli grafik koordinata tizimi

const tab     = ref('marshrut')
const loading = ref(false)
const period  = ref('hafta')
const qidiruv = ref('')
const natijaF = ref('')

const f = reactive({ dan: '', gacha: '', agent_id: '' })

const d = reactive({
  kpi: { tashrif_soni: 0, savdo_soni: 0, sotmaslik_soni: 0, konversiya_foiz: 0,
         ort_davomiylik_daq: 0, ort_chek: 0, jami_summa: 0, agent_soni: 0 },
  reja_fakt: [], jurnal: [], dinamika: [], sabablar: [], anomaliyalar: [],
  agentlar: [], anomaliya_chegara: { uzoq_m: 200, qisqa_daq: 3, uzun_soat: 1.5 },
})

const ICONS = {
  pin:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  money: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
  bolt:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
  warn:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
}

// ── KPI kartalari (spark-chart va halqa bilan) ──
const kartalar = computed(() => [
  { key: 'tashrif', label: 'Tashrif', val: d.kpi.tashrif_soni, color: '#8b5cf6',
    icon: ICONS.pin, spark: d.dinamika.map(k => k.tashrif) },
  { key: 'konv', label: 'Konversiya', val: d.kpi.konversiya_foiz + '%', color: '#8b5cf6',
    icon: ICONS.check, strong: true, ring: d.kpi.konversiya_foiz },
  { key: 'vaqt', label: "O'rt. tashrif", val: d.kpi.ort_davomiylik_daq + ' daq', color: '#7c3aed',
    icon: ICONS.clock },
  { key: 'chek', label: "O'rt. chek", val: fmtShort(d.kpi.ort_chek), color: '#8b5cf6',
    icon: ICONS.money },
  { key: 'summa', label: 'Jami savdo', val: fmtShort(d.kpi.jami_summa), color: '#8b5cf6',
    icon: ICONS.bolt, spark: d.dinamika.map(k => k.summa) },
  { key: 'anom', label: 'Anomaliya', val: d.anomaliyalar.length,
    color: d.anomaliyalar.length ? '#ef4444' : '#94a3b8',
    icon: ICONS.warn, alert: d.anomaliyalar.length > 0, strong: d.anomaliyalar.length > 0 },
])

// ── Anomaliya turlari bo'yicha yig'indi ──
const ANOM_META = {
  uzoq:  { label: 'Uzoqdan check-in', color: '#dc2626', icon: ICONS.pin },
  qisqa: { label: 'Juda qisqa',       color: '#d97706', icon: ICONS.clock },
  uzun:  { label: 'Juda uzun',        color: '#7c3aed', icon: ICONS.clock },
  ochiq: { label: 'Check-out yo\'q',  color: '#475569', icon: ICONS.warn },
}
const anomTurlar = computed(() => {
  const m = {}
  d.anomaliyalar.forEach(a => a.belgilar.forEach(b => { m[b.tur] = (m[b.tur] || 0) + 1 }))
  return Object.entries(m).map(([tur, soni]) => ({ tur, soni, ...(ANOM_META[tur] || ANOM_META.ochiq) }))
})

// ── Donut: natija taqsimoti ──
const pieSegs = computed(() => {
  const jami = d.kpi.tashrif_soni || 1
  const items = [
    { nomi: 'Savdo',     val: d.kpi.savdo_soni,     color: '#10b981' },
    { nomi: 'Sotmaslik', val: d.kpi.sotmaslik_soni, color: '#ef4444' },
    { nomi: 'Ochiq',     val: Math.max(0, d.kpi.tashrif_soni - d.kpi.savdo_soni - d.kpi.sotmaslik_soni), color: '#cbd5e1' },
  ].filter(x => x.val > 0)
  let off = 0
  return items.map(x => {
    const len = PIE * x.val / jami
    const seg = { ...x, len, off }
    off += len
    return seg
  })
})

const davrLabel   = computed(() => f.dan === f.gacha ? fmtDate(f.dan) : `${fmtDate(f.dan)} — ${fmtDate(f.gacha)}`)
const maxReja     = computed(() => Math.max(1, ...d.reja_fakt.map(r => r.reja)))
const maxSumma    = computed(() => Math.max(1, ...d.reja_fakt.map(r => r.summa)))
const reyting     = computed(() => [...d.reja_fakt].sort((a, b) => b.summa - a.summa))
const dinTashrif  = computed(() => d.dinamika.map(k => k.tashrif))
const dinSavdo    = computed(() => d.dinamika.map(k => k.savdo))
const dinMax      = computed(() => Math.max(1, ...dinTashrif.value))

const jurnalF = computed(() => {
  const q = qidiruv.value.trim().toLowerCase()
  return d.jurnal.filter(t => {
    if (natijaF.value && t.natija !== natijaF.value) return false
    if (!q) return true
    return (t.agent_nomi || '').toLowerCase().includes(q)
        || (t.mijoz_nomi || '').toLowerCase().includes(q)
  })
})

/* ── Chiziqli grafik geometriyasi ── */
function px(i) {
  const n = d.dinamika.length
  return n <= 1 ? CW / 2 : (i / (n - 1)) * CW
}
function py(v) {
  return CH - (v / dinMax.value) * (CH - 12) - 6
}
function line(vals) {
  if (!vals.length) return ''
  return vals.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ')
}
function area(vals) {
  if (!vals.length) return ''
  return `${line(vals)} L${px(vals.length - 1).toFixed(1)},${CH} L${px(0).toFixed(1)},${CH} Z`
}

/* ── KPI kartasidagi kichik spark-chart (100×32) ── */
function sparkPts(vals) {
  const mx = Math.max(1, ...vals)
  const n = vals.length
  return vals.map((v, i) => [
    n <= 1 ? 50 : (i / (n - 1)) * 100,
    30 - (v / mx) * 26,
  ])
}
function sparkLine(vals) {
  return sparkPts(vals).map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
}
function sparkArea(vals) {
  const p = sparkPts(vals)
  if (!p.length) return ''
  return `${sparkLine(vals)} L${p[p.length - 1][0].toFixed(1)},32 L${p[0][0].toFixed(1)},32 Z`
}

function setPeriod(p) {
  period.value = p
  const bugun = new Date()
  const iso = (dt) => dt.toISOString().slice(0, 10)
  if (p === 'bugun') { f.dan = iso(bugun); f.gacha = iso(bugun) }
  else {
    const kun = p === 'hafta' ? 6 : 29
    const orqa = new Date(bugun); orqa.setDate(bugun.getDate() - kun)
    f.dan = iso(orqa); f.gacha = iso(bugun)
  }
  load()
}

async function load() {
  loading.value = true
  try {
    const p = {}
    if (f.dan)      p.dan      = f.dan
    if (f.gacha)    p.gacha    = f.gacha
    if (f.agent_id) p.agent_id = f.agent_id

    const r = await hisobotApi.agentMonitoring(p)
    Object.assign(d, {
      kpi: r.kpi || d.kpi,
      reja_fakt: r.reja_fakt || [],
      jurnal: r.jurnal || [],
      dinamika: r.dinamika || [],
      sabablar: r.sabablar || [],
      anomaliyalar: r.anomaliyalar || [],
      agentlar: r.agentlar || [],
      anomaliya_chegara: r.anomaliya_chegara || d.anomaliya_chegara,
    })
  } catch (e) {
    console.error('Agent monitoring xatosi:', e)
  } finally {
    loading.value = false
  }
}

// ── Formatters / helpers ──
function fmtSum(v)   { return v ? Math.round(v).toLocaleString('uz-UZ') : '0' }
function fmtShort(v) {
  const n = Number(v || 0)
  if (n >= 1e9) return (n / 1e9).toFixed(1) + ' mlrd'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' mln'
  if (n >= 1e3) return Math.round(n / 1e3) + ' ming'
  return String(Math.round(n))
}
function fmtDate(s) {
  if (!s) return '—'
  const dt = new Date(s)
  return isNaN(dt) ? String(s) : dt.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' })
}
function fmtDay(s) {
  const dt = new Date(s)
  return isNaN(dt) ? String(s).slice(5) : dt.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' })
}
function fmtTime(s) {
  if (!s) return '—'
  const dt = new Date(s)
  return isNaN(dt) ? '—' : dt.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}
function pct(v, max)      { return Math.max(1, v / max * 100) + '%' }
function nisbat(v, jami)  { return (jami ? v / jami * 100 : 0) + '%' }
function foizRang(p)      { return p >= 80 ? '#10b981' : (p >= 50 ? '#f59e0b' : '#ef4444') }
function natijaClass(n)   { return n === 'savdo' ? 'g' : (n === 'sotmaslik' ? 'r' : 'y') }
function natijaLabel(n)   { return n === 'savdo' ? 'Savdo' : (n === 'sotmaslik' ? 'Sotmaslik' : 'Ochiq') }

onMounted(() => setPeriod('hafta'))
</script>

<style scoped>
.am-page { padding:20px; }

/* ── HEAD ── */
.am-head { display:flex; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom:16px; }
.am-title { font-size:19px; font-weight:800; color:#1e293b; margin:0; }
.am-sub { font-size:12.5px; color:#94a3b8; margin:3px 0 0; }
.am-head-right { margin-left:auto; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.am-sel { padding:7px 11px; border:1px solid #e2e8f0; border-radius:8px; font-size:12.5px; color:#334155; background:#fff; cursor:pointer; outline:none; }
.am-sel--sm { padding:6px 9px; font-size:12px; }
.am-date { padding:6px 9px; border:1px solid #e2e8f0; border-radius:8px; font-size:12px; color:#334155; background:#fff; outline:none; }
.am-period { display:flex; background:#f1f5f9; border-radius:9px; padding:2px; }
.am-pbtn { padding:6px 13px; border:none; background:none; border-radius:7px; font-size:12px; font-weight:600; color:#64748b; cursor:pointer; transition:.15s; }
.am-pbtn.on { background:#fff; color:#7c3aed; box-shadow:0 1px 3px rgba(0,0,0,.08); }

/* ── KPI KARTALARI ── */
.am-kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(158px,1fr)); gap:11px; margin-bottom:16px; }
.am-kpi { position:relative; display:flex; align-items:center; gap:11px; background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:14px 15px; overflow:hidden; transition:transform .18s, box-shadow .18s, border-color .18s; }
.am-kpi:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(15,23,42,.09); border-color:#ddd6fe; }
.am-kpi--alert { border-color:#fecaca; background:#fef2f2; }
.am-kpi-spark { position:absolute; left:0; right:0; bottom:0; width:100%; height:34px; opacity:.85; pointer-events:none; }
.am-kpi-ic { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; position:relative; z-index:1; }
.am-kpi-txt { position:relative; z-index:1; min-width:0; }
.am-kpi-v { font-size:18px; font-weight:800; color:#1e293b; line-height:1.1; white-space:nowrap; }
.am-kpi-l { font-size:11px; color:#94a3b8; margin-top:2px; }
.am-kpi-ring { width:38px; height:38px; margin-left:auto; position:relative; z-index:1; flex-shrink:0; }

/* ── TABS ── */
.am-tabs { display:flex; gap:6px; margin-bottom:14px; border-bottom:1px solid #e2e8f0; }
.am-tab { display:flex; align-items:center; gap:6px; padding:9px 15px; border:none; background:none; font-size:13px; font-weight:600; color:var(--seg-ink); cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px; transition:.15s; }
.am-tab:hover { color:var(--seg-ink-h); }
.am-tab.on { color:var(--tab-on-ink); border-bottom-color:var(--tab-line); font-weight:600; }
.am-tab-b { font-size:10px; font-weight:800; background:#ef4444; color:#fff; border-radius:8px; padding:1px 6px; }
.am-tab-b--n { background:#cbd5e1; color:#475569; }

/* ── KARTA / GRID ── */
.am-card { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:16px; }
.am-card-t { font-size:13.5px; font-weight:800; color:#1e293b; margin-bottom:14px; }
.am-card-hint { display:block; font-size:10.5px; font-weight:500; color:#94a3b8; margin-top:3px; }
.am-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }

/* ── AGENT KARTALARI ── */
.am-agrid { display:grid; grid-template-columns:repeat(auto-fit,minmax(270px,1fr)); gap:12px; margin-bottom:14px; }
.am-acard { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:14px; transition:transform .18s, box-shadow .18s, border-color .18s; }
.am-acard:hover { transform:translateY(-3px); box-shadow:0 10px 26px rgba(15,23,42,.1); border-color:#ddd6fe; }
.am-acard-hd { display:flex; align-items:center; gap:10px; }
.am-acard-n { flex:1; min-width:0; }
.am-acard-name { font-size:13.5px; font-weight:800; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.am-acard-sub { font-size:11px; color:#94a3b8; margin-top:2px; }
.am-donut { width:48px; height:48px; flex-shrink:0; }
.am-donut-t { font-size:11px; font-weight:800; }

.am-split { margin:13px 0 10px; }
.am-split-bar { display:flex; height:7px; border-radius:5px; overflow:hidden; background:#f1f5f9; }
.am-split-g { background:#10b981; transition:width .6s cubic-bezier(.4,0,.2,1); }
.am-split-r { background:#ef4444; transition:width .6s cubic-bezier(.4,0,.2,1); }
.am-split-l { display:flex; gap:14px; margin-top:7px; font-size:11px; color:#64748b; }
.am-d { display:inline-block; width:7px; height:7px; border-radius:50%; margin-right:5px; }
.am-d--g { background:#10b981; } .am-d--r { background:#ef4444; }

.am-acard-ft { display:flex; gap:8px; padding-top:11px; border-top:1px solid #f1f5f9; }
.am-mini { flex:1; }
.am-mini-l { display:block; font-size:10px; color:#94a3b8; margin-bottom:2px; }
.am-mini b { font-size:13px; color:#1e293b; }
.am-acard-warn { margin-top:10px; font-size:10.5px; color:#d97706; background:rgba(245,158,11,.09); padding:5px 9px; border-radius:7px; }

/* ── TAQQOSLASH ── */
.am-cmp { display:flex; flex-direction:column; gap:11px; }
.am-cmp-row { display:flex; align-items:center; gap:11px; }
.am-cmp-n { width:120px; flex-shrink:0; font-size:12.5px; font-weight:600; color:#475569; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.am-cmp-track { flex:1; position:relative; height:26px; }
.am-cmp-reja { position:absolute; inset:0 auto 0 0; background:#e2e8f0; border-radius:7px; display:flex; align-items:center; justify-content:flex-end; padding-right:8px; animation:am-w .6s cubic-bezier(.4,0,.2,1) both; }
.am-cmp-fakt { position:absolute; top:4px; bottom:4px; left:0; border-radius:6px; display:flex; align-items:center; justify-content:flex-end; padding-right:8px; animation:am-w .8s cubic-bezier(.4,0,.2,1) both .15s; }
.am-cmp-v { font-size:11px; font-weight:800; color:#64748b; }
.am-cmp-v--in { color:#fff; }

/* ── JADVAL ── */
.am-toolbar { display:flex; align-items:center; gap:9px; margin-bottom:12px; }
.am-search { flex:1; max-width:280px; padding:7px 11px; border:1px solid #e2e8f0; border-radius:8px; font-size:12.5px; outline:none; }
.am-search:focus { border-color:#8b5cf6; }
.am-cnt { margin-left:auto; font-size:12px; color:#94a3b8; }
.am-tbl { width:100%; border-collapse:collapse; font-size:12.5px; }
.am-tbl th { text-align:left; padding:9px 10px; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.03em; border-bottom:1px solid #f1f5f9; white-space:nowrap; }
.am-tbl td { padding:9px 10px; border-bottom:1px solid #f8fafc; color:#334155; }
.am-tbl tbody tr { transition:background .13s; }
.am-tbl tbody tr:hover { background:#f8fafc; }
.am-tr-warn { background:rgba(254,243,199,.35); }
.am-r { text-align:right; } .am-nowrap { white-space:nowrap; } .am-dim { color:#94a3b8; }
.am-dur { height:5px; background:#f1f5f9; border-radius:3px; overflow:hidden; width:70px; }
.am-dur-b { height:100%; border-radius:3px; transition:width .5s; }
.am-dur-t { font-size:10.5px; color:#64748b; }

.am-ag { display:flex; align-items:center; gap:8px; }
.am-av { width:32px; height:32px; border-radius:9px; color:#fff; font-size:13px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.am-av--sm { width:22px; height:22px; font-size:10px; border-radius:7px; }

.am-bar { height:6px; background:#f1f5f9; border-radius:4px; overflow:hidden; display:inline-block; vertical-align:middle; }
.am-bar--thin { height:6px; flex:1; }
.am-bar-in { height:100%; border-radius:4px; }
.am-bar-in--red { background:#f87171; }
.am-pill { display:inline-block; padding:2px 9px; border-radius:9px; font-size:11px; font-weight:700; }
.am-pill.g { background:rgba(16,185,129,.1); color:#10b981; }
.am-pill.y { background:rgba(245,158,11,.1); color:#d97706; }
.am-pill.r { background:rgba(239,68,68,.1); color:#ef4444; }
.am-bad { color:#ef4444 !important; }
.am-mini-b { font-size:9px; font-weight:800; color:#d97706; background:rgba(245,158,11,.13); padding:1px 5px; border-radius:6px; margin-left:5px; }
.am-gps { font-size:11.5px; font-weight:600; color:#64748b; }
.am-gps--bad { color:#ef4444; font-weight:800; }

/* ── CHIZIQLI GRAFIK ── */
.am-lchart { position:relative; }
.am-svg { width:100%; height:170px; display:block; overflow:visible; }
.am-xaxis { display:flex; justify-content:space-between; margin-top:6px; font-size:9.5px; color:#94a3b8; }
.am-legend { display:flex; gap:14px; margin-top:10px; font-size:11px; color:#64748b; }
.am-legend i { display:inline-block; width:9px; height:9px; border-radius:3px; margin-right:5px; }

/* ── DONUT ── */
.am-pie-wrap { display:flex; align-items:center; gap:18px; flex-wrap:wrap; }
.am-pie { width:135px; height:135px; flex-shrink:0; }
.am-pie-n { font-size:21px; font-weight:800; fill:#1e293b; }
.am-pie-l { font-size:9px; fill:#94a3b8; }
.am-pie-leg { flex:1; min-width:130px; display:flex; flex-direction:column; gap:8px; }
.am-pie-row { display:flex; align-items:center; gap:8px; font-size:12.5px; color:#475569; }
.am-pie-row i { width:9px; height:9px; border-radius:3px; flex-shrink:0; }
.am-pie-nm { flex:1; }
.am-pie-row b { color:#1e293b; }
.am-pie-p { font-size:11px; color:#94a3b8; width:34px; text-align:right; }

/* ── SABAB / REYTING ── */
.am-sabab, .am-rank { display:flex; flex-direction:column; gap:10px; }
.am-sabab-row { display:flex; align-items:center; gap:10px; font-size:12.5px; color:#475569; }
.am-sabab-n { width:115px; flex-shrink:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.am-sabab-row b { width:26px; text-align:right; color:#1e293b; }
.am-rank-row { display:flex; align-items:center; gap:9px; font-size:12.5px; }
.am-rank-n { width:19px; height:19px; border-radius:6px; background:#f1f5f9; color:#94a3b8; font-size:10.5px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.am-rank-n--1 { background:#fef3c7; color:#d97706; }
.am-rank-n--2 { background:#e2e8f0; color:#64748b; }
.am-rank-n--3 { background:#fed7aa; color:#c2410c; }
.am-rank-name { width:110px; flex-shrink:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#475569; }
.am-rank-v { width:64px; text-align:right; color:#1e293b; }

/* ── ANOMALIYA ── */
.am-anom-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:11px; margin-bottom:14px; }
.am-anom-card { display:flex; align-items:center; gap:11px; background:#fff; border:1px solid #e2e8f0; border-radius:13px; padding:13px 15px; transition:transform .18s, box-shadow .18s; }
.am-anom-card:hover { transform:translateY(-3px); box-shadow:0 8px 22px rgba(15,23,42,.09); }
.am-anom-ic { width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.am-anom-cv { font-size:19px; font-weight:800; line-height:1; }
.am-anom-cl { font-size:10.5px; color:#94a3b8; margin-top:3px; }

.am-anom { display:flex; flex-direction:column; gap:8px; }
.am-anom-row { display:flex; align-items:center; gap:14px; padding:11px 13px; border:1px solid #e2e8f0; border-radius:11px; flex-wrap:wrap; transition:transform .15s, box-shadow .15s; }
.am-anom-row:hover { transform:translateX(3px); box-shadow:0 4px 14px rgba(15,23,42,.07); }
.am-anom--3 { border-color:#fecaca; background:#fef2f2; }
.am-anom--2 { border-color:#fed7aa; background:#fff7ed; }
.am-anom-l { min-width:230px; }
.am-anom-ag { font-size:12.5px; font-weight:700; color:#1e293b; }
.am-anom-mj { font-size:11px; color:#94a3b8; margin-top:1px; }
.am-anom-r { display:flex; gap:6px; flex-wrap:wrap; margin-left:auto; }
.am-anom-b { font-size:11px; font-weight:600; padding:3px 9px; border-radius:8px; background:#f1f5f9; color:#475569; }
.am-anom-b--uzoq  { background:rgba(239,68,68,.1); color:#dc2626; }
.am-anom-b--qisqa { background:rgba(245,158,11,.12); color:#d97706; }
.am-anom-b--uzun  { background:rgba(139,92,246,.1); color:#7c3aed; }
.am-anom-b--ochiq { background:rgba(100,116,139,.1); color:#475569; }

.am-note { margin-top:11px; font-size:11.5px; color:#d97706; background:rgba(245,158,11,.07); padding:8px 12px; border-radius:9px; }
.am-empty { padding:36px 20px; text-align:center; color:#94a3b8; font-size:13px; display:flex; flex-direction:column; align-items:center; gap:10px; }
.am-empty--ok { color:#10b981; }
.am-loading { display:flex; align-items:center; justify-content:center; gap:10px; padding:50px; color:#94a3b8; font-size:13px; }
.am-spin { display:inline-block; width:18px; height:18px; border:2.5px solid rgba(0,0,0,.08); border-top-color:#8b5cf6; border-radius:50%; animation:am-rot .7s linear infinite; }

/* ══ ANIMATSIYALAR ══ */
@keyframes am-rot { to { transform:rotate(360deg) } }
@keyframes am-up   { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
@keyframes am-fade { from { opacity:0 } to { opacity:1 } }
@keyframes am-w    { from { width:0 } }
@keyframes am-grow { from { width:0 } }
@keyframes am-draw { from { stroke-dashoffset:var(--len) } }

.am-in     { animation:am-up .42s cubic-bezier(.22,1,.36,1) both; }
.am-in-row { animation:am-fade .3s ease both; }
.am-grow   { animation:am-grow .7s cubic-bezier(.4,0,.2,1) both; }

/* SVG chizish animatsiyasi */
.am-line { stroke-dasharray:1200; animation:am-dash 1.1s cubic-bezier(.4,0,.2,1) both; }
@keyframes am-dash { from { stroke-dashoffset:1200 } to { stroke-dashoffset:0 } }
.am-area { animation:am-fade .8s ease both .3s; }
.am-dot  { animation:am-fade .4s ease both .7s; }
.am-spark-p { stroke-dasharray:400; animation:am-dash 1.2s ease both; }
.am-ring-p  { transition:stroke-dashoffset .9s cubic-bezier(.4,0,.2,1); }
.am-pie-seg { transition:stroke-dasharray .8s cubic-bezier(.4,0,.2,1); }

/* Tab almashinuvi */
.am-sw-enter-active { transition:opacity .22s ease, transform .22s ease; }
.am-sw-leave-active { transition:opacity .14s ease, transform .14s ease; }
.am-sw-enter-from { opacity:0; transform:translateY(8px); }
.am-sw-leave-to   { opacity:0; transform:translateY(-6px); }

@media (prefers-reduced-motion: reduce) {
  .am-in, .am-in-row, .am-grow, .am-line, .am-area, .am-dot, .am-spark-p { animation:none; }
  .am-kpi:hover, .am-acard:hover, .am-anom-card:hover, .am-anom-row:hover { transform:none; }
}

@media(max-width:900px) {
  .am-grid2 { grid-template-columns:1fr; }
  .am-head-right { width:100%; }
}
</style>
