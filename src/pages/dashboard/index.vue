<template>
  <div class="db" :class="{ 'db--busy': loading && !birinchi }">
    <div v-if="loading && !birinchi" class="db-loadbar" aria-hidden="true"/>

    <!-- ══════════ HEADER ══════════ -->
    <header class="db-hd">
      <div class="db-hd-l">
        <p class="db-hd-eyebrow">{{ salom }}<template v-if="ism">, {{ ism }}</template></p>
        <h1 class="db-hd-title">Bosh sahifa</h1>
        <p class="db-hd-sub">
          {{ periodLabel }} · yangilangan {{ lastUpdated }}
          <span v-if="autoOn" class="db-auto"><span class="db-live-dot db-live-dot--sm"/>avto</span>
        </p>
      </div>

      <div class="db-hd-r">
        <!-- Davr tanlash — tanlangan tugma ostida "sirpanuvchi" fon -->
        <div class="db-seg" role="tablist" aria-label="Davr" :style="{ '--i': PERIODS.findIndex(p => p.key === period) }">
          <span class="db-seg-pill" aria-hidden="true"/>
          <button v-for="p in PERIODS" :key="p.key" class="db-seg-b"
            :class="{ on: period === p.key }" role="tab" :aria-selected="period === p.key"
            @click="changePeriod(p.key)">{{ p.label }}</button>
        </div>

        <button class="db-ib" :class="{ on: sozlashOchiq }" title="Bloklarni sozlash"
          @click="sozlashOchiq = !sozlashOchiq" aria-label="Bloklarni sozlash">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>
        </button>

        <button class="db-ib" :class="{ on: autoOn }" :title="autoOn ? 'Avto yangilanish yoqilgan' : 'Avto yangilanish o‘chirilgan'"
          @click="autoToggle" aria-label="Avto yangilanish">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 01-15 6.7L3 16"/></svg>
        </button>

        <button class="db-ib" :disabled="loading" title="Yangilash" @click="load()" aria-label="Yangilash">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'db-spin': loading }"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
        </button>
      </div>
    </header>

    <!-- ══════════ SOZLASH PANELI ══════════ -->
    <Transition name="db-drop">
      <div v-if="sozlashOchiq" class="db-cfg">
        <div class="db-cfg-hd">
          <span>Ko'rinadigan bloklar</span>
          <button class="db-cfg-reset" @click="sozlashniTiklash">Standart holatga</button>
        </div>
        <div class="db-cfg-list">
          <label v-for="b in BLOKLAR" :key="b.key" class="db-cfg-item" :class="{ on: korinadi(b.key) }">
            <input type="checkbox" :checked="korinadi(b.key)" @change="blokToggle(b.key)">
            <span>{{ b.label }}</span>
          </label>
        </div>
      </div>
    </Transition>

    <!-- ══════════ BOSH BANNER: BUGUN ══════════ -->
    <section v-if="!birinchi && korinadi('bugun')" v-reveal class="db-hero">
      <div class="db-hero-main">
        <div class="db-hero-bg" aria-hidden="true"><i/><i/><i/></div>

        <div class="db-hero-top">
          <span class="db-hero-badge"><span class="db-live-dot"/>Bugun · jonli</span>
          <span class="db-hero-date">{{ bugunOy }}, {{ bugunKun }}</span>
          <span class="db-hero-clock" aria-label="Joriy vaqt">{{ soatMatn }}</span>
        </div>

        <div class="db-hero-lbl">Bugungi savdo</div>
        <div class="db-hero-v">
          <AnimNum :value="heroJami" :format="fmtNum" :duration="1600"/><small>so'm</small>
        </div>
        <div class="db-hero-cmp">
          <span v-if="heroCmp" class="db-hero-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline v-if="heroCmp.up" points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline v-else points="23 18 13.5 8.5 8.5 13.5 1 6"/>
            </svg>{{ heroCmp.text }}
          </span>
          <span>{{ heroCmp ? `kechagi shu vaqtga nisbatan (${fmtShort(kechaShuVaqt)})` : 'kecha shu vaqtgacha savdo bo‘lmagan' }}</span>
        </div>

        <!-- Bugun va kecha — jamlanma (kumulyativ) savdo, soatlar bo'yicha -->
        <div class="db-hero-chart">
          <svg viewBox="0 0 240 64" preserveAspectRatio="none" role="img"
            :aria-label="`Bugungi jamlanma savdo ${fmtShort(heroJami)}, kecha shu vaqtgacha ${fmtShort(kechaShuVaqt)}`">
            <defs>
              <linearGradient id="dbHeroFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#fff" stop-opacity=".32"/>
                <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <line v-for="g in [16, 32, 48]" :key="g" x1="0" :y1="g" x2="240" :y2="g"
              stroke="#fff" stroke-opacity=".1" vector-effect="non-scaling-stroke"/>
            <path :d="heroGeo.kecha" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.5"
              stroke-dasharray="3 4" vector-effect="non-scaling-stroke" class="db-hero-kecha"/>
            <path :d="heroGeo.area" fill="url(#dbHeroFill)" class="db-hero-area"/>
            <path :d="heroGeo.line" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"
              stroke-linejoin="round" vector-effect="non-scaling-stroke" class="db-hero-line"/>
          </svg>
          <span class="db-hero-now" :style="{ left: heroGeo.nowX + '%', top: heroGeo.nowY + '%' }"/>
          <div class="db-hero-axis"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
        </div>
        <div class="db-hero-leg">
          <span><i class="l1"/>Bugun</span>
          <span><i class="l2"/>Kecha</span>
        </div>
      </div>

      <div class="db-hero-stats">
        <button v-for="(s, i) in bugunStats" :key="s.key" class="db-hs"
          :style="{ '--c': `var(${s.tone})`, animationDelay: 120 + i * 70 + 'ms' }"
          :title="s.hint" @click="oting(s.yol)">
          <span class="db-hs-top">
            <span class="db-hs-ic" v-html="s.icon" aria-hidden="true"/>
            <svg class="db-hs-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>
          </span>
          <span class="db-hs-v" :class="{ 'db-flash': s.key === flashKey }">
            <AnimNum v-if="s.num !== null" :value="s.num" :format="s.fmt"/>
            <template v-else>{{ s.val }}</template>
          </span>
          <span class="db-hs-l">{{ s.label }}</span>
          <span v-if="s.prog !== null" class="db-hs-prog"><i :style="{ width: s.prog + '%' }"/></span>
          <span v-else class="db-hs-s">{{ s.sub || ' ' }}</span>
        </button>
      </div>
    </section>

    <!-- ══════════ KPI KARTALAR ══════════ -->
    <section v-if="korinadi('kpi')" class="db-kpis">
      <template v-if="birinchi">
        <div class="db-skel db-skel--kpi" v-for="i in 6" :key="i"/>
      </template>
      <template v-else>
        <button v-for="(k, i) in kpiKartalar" :key="k.key"
          class="db-kpi" :class="[k.tone, { 'db-kpi--hero': k.hero }]"
          :style="{ animationDelay: i * 60 + 'ms' }"
          :title="k.hint" @click="oting(k.yol)">

          <svg v-if="k.spark && k.spark.length > 1" class="db-spark"
            :viewBox="`0 0 ${SPARK_W} ${SPARK_H}`" preserveAspectRatio="none" aria-hidden="true">
            <path :d="sparkPath(k.spark).area" :fill="`color-mix(in oklab, var(--tone) 22%, transparent)`"/>
            <polyline :points="sparkPath(k.spark).line" fill="none" stroke="var(--tone)"
              stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="db-spark-l"/>
          </svg>

          <span class="db-kpi-ic" v-html="k.icon" aria-hidden="true"/>
          <span v-if="k.osish !== null" class="db-trend" :class="k.osish >= 0 ? 'is-up' : 'is-down'"
            title="Oldingi davrga nisbatan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline v-if="k.osish >= 0" points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline v-else points="23 18 13.5 8.5 8.5 13.5 1 6"/>
            </svg>{{ Math.abs(k.osish) }}%
          </span>

          <span class="db-kpi-val" :class="{ 'db-flash': k.key === flashKey }">
            <AnimNum :value="k.num" :format="k.fmt"/>
          </span>
          <span class="db-kpi-lbl">{{ k.label }}</span>
          <span class="db-kpi-note">{{ k.note }}</span>
        </button>
      </template>
    </section>

    <!-- Birinchi yuklanishda karkas -->
    <template v-if="birinchi">
      <div class="db-skel db-skel--hero"/>
      <div class="db-skel db-skel--flow"/>
      <div class="db-row db-row--2">
        <div class="db-skel db-skel--card"/>
        <div class="db-skel db-skel--card"/>
      </div>
    </template>

    <!-- ═════════════════════════════════════════════
         01 · DISTRIBUTSIYA
         ═════════════════════════════════════════════ -->
    <div v-if="!birinchi && (korinadi('oqim') || korinadi('yetkazish'))" v-reveal class="db-sec">
      <span class="db-sec-n">01</span><span class="db-sec-t">Distributsiya</span><span class="db-sec-l"/>
    </div>

    <!-- ══════════ DISTRIBUTSIYA OQIMI (jonli pipeline) ══════════ -->
    <section v-if="!birinchi && korinadi('oqim')" v-reveal class="db-card db-flow">
      <div class="db-card-hd">
        <h2 class="db-card-t">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/><circle cx="4" cy="12" r="1.5"/></svg>
          Distributsiya oqimi
        </h2>
        <span class="db-live"><span class="db-live-dot db-live-dot--sm"/>Jonli</span>
        <span class="db-card-sub">buyurtmalarning hozirgi holati</span>
        <button class="db-link" @click="oting('/sotuvlar/buyurtmalar')">Buyurtmalar</button>
      </div>

      <div class="db-flow-steps">
        <button v-for="(b, i) in oqimBosqichlar" :key="b.holat" class="db-step"
          :class="{ on: oqimHover === i, 'db-step--done': b.holat === 'yetkazildi' }"
          :style="{ '--c': `var(${b.c})`, animationDelay: i * 80 + 'ms' }"
          @mouseenter="oqimHover = i" @mouseleave="oqimHover = null"
          @click="oting(b.yol)">
          <span class="db-step-top">
            <span class="db-step-ic" v-html="b.icon" aria-hidden="true"/>
            <span class="db-step-no">{{ i + 1 }}</span>
          </span>
          <span class="db-step-lbl">{{ b.label }}</span>
          <span class="db-step-v"><AnimNum :value="b.son"/></span>
          <span class="db-step-s"><AnimNum :value="b.summa" :format="fmtShort"/> so'm</span>
        </button>
      </div>

      <!-- Ochiq buyurtmalar taqsimoti: bosqichlar bo'yicha (tartibli shkala) -->
      <div class="db-flow-dist">
        <div class="db-flow-dist-hd">
          <span>Ochiq buyurtmalar</span>
          <b>{{ fmtNum(ochiqJami.son) }} ta · {{ fmtShort(ochiqJami.summa) }} so'm</b>
        </div>
        <div v-if="ochiqJami.son" class="db-flow-bar" role="img"
          :aria-label="`Ochiq buyurtmalar bosqichlar bo'yicha: ${ochiqTavsif}`">
          <span v-for="(b, i) in oqimBosqichlar.slice(0, 4)" :key="b.holat" v-show="b.son > 0"
            class="db-flow-seg" :class="{ dim: oqimHover !== null && oqimHover !== i }"
            :style="{ flexGrow: b.son, background: `var(${b.c})` }"
            :title="`${b.label}: ${b.son} ta · ${fmtShort(b.summa)} so'm`"
            @mouseenter="oqimHover = i" @mouseleave="oqimHover = null"/>
        </div>
        <div v-else class="db-flow-bar db-flow-bar--empty"/>
      </div>

      <div class="db-flow-ft">
        <button class="db-metric" :class="oqim.kechikkan.son ? 'is-crit' : 'is-ok'" @click="oting('/sotuvlar/buyurtmalar')"
          title="Jo'natish sanasi o'tgan, lekin hali yetkazilmagan buyurtmalar">
          <span class="db-metric-ic" v-html="IC.clock" aria-hidden="true"/>
          <span class="db-metric-b">
            <span class="db-metric-l">Kechikkan</span>
            <span class="db-metric-v">{{ oqim.kechikkan.son }} ta<small v-if="oqim.kechikkan.son"> · {{ fmtShort(oqim.kechikkan.summa) }}</small></span>
          </span>
        </button>
        <div class="db-metric" title="Davrdagi buyurtmalarning qanchasi yetkazib berilgan">
          <span class="db-metric-ic db-metric-ic--ring" aria-hidden="true">
            <svg viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="var(--grid)" stroke-width="4"/>
              <circle cx="18" cy="18" r="14" fill="none" stroke="var(--good)" stroke-width="4" stroke-linecap="round"
                transform="rotate(-90 18 18)" :stroke-dasharray="RING14" class="db-mring"
                :stroke-dashoffset="RING14 * (1 - Math.min(100, sotuv.yetkazish_foiz) / 100)"
                :style="{ '--full': RING14 + 'px' }"/>
            </svg>
          </span>
          <span class="db-metric-b">
            <span class="db-metric-l">Yetkazish darajasi</span>
            <span class="db-metric-v">{{ sotuv.yetkazish_foiz }}%<small> · {{ periodLabel.toLowerCase() }}</small></span>
          </span>
        </div>
        <div class="db-metric" title="Davrda bekor qilingan buyurtmalar">
          <span class="db-metric-ic" v-html="IC.x" aria-hidden="true"/>
          <span class="db-metric-b">
            <span class="db-metric-l">Bekor qilingan</span>
            <span class="db-metric-v">{{ sotuv.bekor_son }} ta</span>
          </span>
        </div>
        <button class="db-metric" @click="oting('/sotuvlar/qaytarish')" title="Qaytarish arizalari va yetkazishdagi qaytarish/brak">
          <span class="db-metric-ic" v-html="IC.ret" aria-hidden="true"/>
          <span class="db-metric-b">
            <span class="db-metric-l">Qaytarish</span>
            <span class="db-metric-v">{{ fmtShort(sotuv.qaytarish_summa) }}<small> · {{ sotuv.qaytarish_foiz }}%</small></span>
          </span>
        </button>
        <button class="db-metric" :class="{ 'is-warn': oqim.qabul_kutilmoqda }" @click="oting('/ombor/qaytarish-qabul')"
          title="Agent qaytargan tovar ombor tasdig'ini kutmoqda">
          <span class="db-metric-ic" v-html="IC.inbox" aria-hidden="true"/>
          <span class="db-metric-b">
            <span class="db-metric-l">Qabul kutmoqda</span>
            <span class="db-metric-v">{{ oqim.qabul_kutilmoqda }} ta</span>
          </span>
        </button>
      </div>
    </section>

    <!-- ══════════ DOSTAVCHILAR + SO'NGGI BUYURTMALAR ══════════ -->
    <section v-if="!birinchi && korinadi('yetkazish')" class="db-row db-row--2">
      <article v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            Dostavchilar
          </h2>
          <span class="db-card-sub">{{ dostavchiXulosa }}</span>
          <button class="db-link" @click="oting('/sotuvlar/trip-sheet')">Trip sheet</button>
        </div>
        <div v-if="!dostavchilar.length" class="db-empty db-empty--sm"><p>Faol dostavchi yo'q</p></div>
        <div v-else class="db-list">
          <button v-for="(d, i) in dostavchilar" :key="d.id" class="db-list-r db-list-r--in"
            :style="{ animationDelay: i * 60 + 'ms' }" @click="oting('/sotuvlar/dostavchilar')">
            <span class="db-av db-av--soft">
              {{ (d.ism || '?')[0] }}
              <span v-if="tripHolat(d).label === `Yo'lda`" class="db-av-live" title="Yo'lda"/>
            </span>
            <span class="db-list-b">
              <span class="db-list-t">{{ d.ism }}</span>
              <span class="db-list-s">{{ d.transport || 'Transport ko‘rsatilmagan' }}</span>
            </span>
            <span class="db-dv" :title="`Bugun yetkazildi: ${d.yetkazildi} · Kutilmoqda: ${d.kutilmoqda}`">
              <span class="db-mini-bar"><span class="db-mini-fill" :style="{ width: dvPct(d) }"/></span>
              <span class="db-dv-n">{{ d.yetkazildi }}/{{ d.yetkazildi + d.kutilmoqda }}</span>
            </span>
            <span class="db-chipdot" :style="{ '--c': `var(${tripHolat(d).c})` }"><i/>{{ tripHolat(d).label }}</span>
            <span class="db-list-vv">
              <span class="db-list-v">{{ fmtShort(d.kutilmoqda_summa) }}</span>
              <span class="db-list-cap">yukda</span>
            </span>
          </button>
        </div>
        <div v-if="dostavchilar.length" class="db-dv-ft">
          <div class="db-dv-ft-i">
            <span>Bugun yetkazildi</span>
            <b>{{ dvJami.yetkazildi }} ta · {{ fmtShort(dvJami.yetkazildiSumma) }}</b>
          </div>
          <div class="db-dv-ft-i">
            <span>Yukda / kutilmoqda</span>
            <b>{{ dvJami.kutilmoqda }} ta · {{ fmtShort(dvJami.kutilmoqdaSumma) }}</b>
          </div>
          <div class="db-dv-ft-i">
            <span>Bajarilish</span>
            <b><AnimNum :value="dvJami.foiz" :format="v => Math.round(v) + '%'"/></b>
          </div>
        </div>
      </article>

      <article v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
            So'nggi buyurtmalar
          </h2>
          <span class="db-live"><span class="db-live-dot db-live-dot--sm"/>Lenta</span>
          <button class="db-link" @click="oting('/sotuvlar/buyurtmalar')">Hammasi</button>
        </div>
        <div v-if="!oxirgiBuyurtmalar.length" class="db-empty db-empty--sm"><p>Buyurtma yo'q</p></div>
        <TransitionGroup v-else name="db-feed" tag="div" class="db-list db-feed">
          <button v-for="(b, i) in oxirgiBuyurtmalar" :key="b.id" class="db-list-r db-list-r--in"
            :style="{ animationDelay: i * 50 + 'ms' }" @click="oting('/sotuvlar/buyurtmalar')">
            <span class="db-feed-ic" :style="{ '--c': `var(${holatMeta(b.holat).c})` }"
              v-html="b.manba === 'mobil' ? IC.phone : IC.monitor" :title="b.manba === 'mobil' ? 'Mobil ilova' : 'Web'"/>
            <span class="db-list-b">
              <span class="db-list-t">{{ b.mijoz }}</span>
              <span class="db-list-s">{{ b.raqam }}<template v-if="b.agent"> · {{ b.agent }}</template> · {{ oldin(b.vaqt) }}</span>
            </span>
            <span class="db-chipdot" :style="{ '--c': `var(${holatMeta(b.holat).c})` }"><i/>{{ holatMeta(b.holat).label }}</span>
            <span class="db-list-v">{{ fmtShort(b.summa) }}</span>
          </button>
        </TransitionGroup>
      </article>
    </section>

    <!-- ═════════════════════════════════════════════
         02 · SAVDO
         ═════════════════════════════════════════════ -->
    <div v-if="!birinchi && (korinadi('grafik') || korinadi('savdo') || korinadi('reyting'))" v-reveal class="db-sec">
      <span class="db-sec-n">02</span><span class="db-sec-t">Savdo</span><span class="db-sec-l"/>
    </div>

    <!-- ══════════ GRAFIK + TURKUM ══════════ -->
    <section v-if="!birinchi && korinadi('grafik')" class="db-row db-row--main">
      <!-- Sotuv trendi: joriy va oldingi davr -->
      <article v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Sotuv trendi
          </h2>
          <span class="db-card-sub">{{ chartTitle }}</span>
          <div class="db-card-hd-r">
            <div class="db-chips">
              <button v-for="m in CHART_MODES" :key="m.key" class="db-chip"
                :class="{ on: chartMode === m.key }" @click="chartMode = (m.key as 'summa'|'dona')">{{ m.label }}</button>
            </div>
            <span v-if="trendChip" class="db-trend" :class="trendChip.cls" title="Oldingi davrga nisbatan">
              {{ trendChip.text }}
            </span>
          </div>
        </div>

        <div class="db-leg">
          <span class="db-leg-i"><i class="db-leg-cur"/>Joriy davr <b>{{ chartMode === 'summa' ? fmtShort(chartJami.cur) : fmtNum(chartJami.cur) }}</b></span>
          <span class="db-leg-i"><i class="db-leg-prev"/>Oldingi davr <b>{{ chartMode === 'summa' ? fmtShort(chartJami.prev) : fmtNum(chartJami.prev) }}</b></span>
        </div>

        <div v-if="trendBosh" class="db-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <p>Bu davrda sotuv qayd etilmagan</p>
        </div>

        <div v-else class="db-chart" ref="chartRef"
          @mousemove="chartMove" @mouseleave="hoverIdx = null" @touchmove.passive="chartTouch">
          <svg class="db-chart-svg" :viewBox="`0 0 ${CW} ${CH}`" preserveAspectRatio="none" role="img"
            :aria-label="`Sotuv trendi, ${chartTitle}: joriy ${fmtShort(chartJami.cur)}, oldingi ${fmtShort(chartJami.prev)}`">
            <defs>
              <linearGradient id="dbFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stop-color="var(--accent)" stop-opacity=".24"/>
                <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
              </linearGradient>
            </defs>

            <g v-for="(t, i) in yTicks" :key="'t' + i">
              <line :x1="PAD_L" :y1="t.y" :x2="CW - PAD_R" :y2="t.y" stroke="var(--grid)" stroke-width="1"
                vector-effect="non-scaling-stroke"/>
              <text :x="CW - PAD_R + 8" :y="t.y + 3.5" class="db-ax">{{ fmtTick(t.v) }}</text>
            </g>

            <!-- Oldingi davr — kulrang uzuq chiziq (identifikatsiya rangsiz ham ko'rinadi) -->
            <path :key="'p' + chartKey" :d="prevPath" fill="none" stroke="var(--neutral-mark)" stroke-width="1.6"
              stroke-dasharray="4 4" stroke-linecap="round" vector-effect="non-scaling-stroke" class="db-prev"/>
            <path :key="'a' + chartKey" :d="areaPath" fill="url(#dbFill)" class="db-area"/>
            <path :key="'l' + chartKey" :d="linePath" fill="none" stroke="var(--accent)" stroke-width="2.2"
              stroke-linecap="round" stroke-linejoin="round" class="db-line"
              vector-effect="non-scaling-stroke"/>

            <line v-if="hoverIdx !== null && chartPts[hoverIdx]"
              :x1="chartPts[hoverIdx]!.x" :y1="PAD_T" :x2="chartPts[hoverIdx]!.x" :y2="BASE"
              stroke="var(--ink-muted)" stroke-width="1" opacity=".45" vector-effect="non-scaling-stroke"/>

            <text v-for="(p, i) in chartPts" :key="'x' + i" v-show="showLabelAt(i)"
              :x="p.x" :y="CH - 5" text-anchor="middle" class="db-ax">{{ xLabel(i) }}</text>
          </svg>

          <!-- Nuqtalar HTML'da — SVG cho'zilganda doira ellipsga aylanmasligi uchun -->
          <template v-if="hoverIdx !== null && chartPts[hoverIdx]">
            <span class="db-dot-mk db-dot-mk--prev" :style="dotStyle({ x: chartPts[hoverIdx]!.x, y: prevPts[hoverIdx]?.y ?? BASE })"/>
            <span class="db-dot-mk" :style="dotStyle(chartPts[hoverIdx]!)"/>
          </template>
          <span v-else-if="lastPoint" class="db-dot-mk db-dot-mk--pulse" :style="dotStyle(lastPoint)"/>

          <div v-if="hoverIdx !== null && oylikTrend[hoverIdx]" class="db-tip" :style="tipStyle">
            <div class="db-tip-t">{{ xLabelFull(hoverIdx) }}</div>
            <div class="db-tip-r"><i style="background:var(--accent)"/>Joriy<b>{{ fmtNum(chartVals[hoverIdx] ?? 0) }}</b></div>
            <div class="db-tip-r"><i style="background:var(--neutral-mark)"/>Oldingi<b>{{ fmtNum(prevVals[hoverIdx] ?? 0) }}</b></div>
            <div v-if="tipFarq !== null" class="db-tip-r">O'zgarish
              <b :class="tipFarq >= 0 ? 'db-ok' : 'db-bad'">{{ tipFarq >= 0 ? '+' : '' }}{{ tipFarq }}%</b></div>
            <div class="db-tip-r">Buyurtma<b>{{ oylikTrend[hoverIdx]!.son }}</b></div>
          </div>
        </div>
      </article>

      <!-- Turkum ulushi -->
      <article v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/></svg>
            Turkum ulushi
          </h2>
          <span class="db-card-sub">jo'natilgan tovar</span>
        </div>

        <div v-if="!turkumStat.length" class="db-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="9"/></svg>
          <p>Sotuv qayd etilmagan</p>
        </div>

        <div v-else class="db-donut-wrap">
          <div class="db-donut">
            <svg viewBox="0 0 120 120" role="img" aria-label="Turkum ulushi">
              <defs>
                <mask id="dbDonutSweep">
                  <circle cx="60" cy="60" r="42" fill="none" stroke="#fff" stroke-width="26"
                    :stroke-dasharray="DONUT_C" :stroke-dashoffset="DONUT_C" transform="rotate(-90 60 60)"
                    class="db-sweep" :style="{ '--full': DONUT_C + 'px' }"/>
                </mask>
              </defs>
              <circle cx="60" cy="60" r="42" fill="none" stroke="var(--surface-sunken)" stroke-width="16"/>
              <g mask="url(#dbDonutSweep)">
                <circle v-for="(s, i) in donutSegs" :key="i"
                  cx="60" cy="60" r="42" fill="none" :stroke="`var(${s.color})`"
                  :stroke-width="donutHoverIdx === i ? 20 : 16"
                  :stroke-dasharray="`${s.len} ${DONUT_C - s.len}`" :stroke-dashoffset="-s.off"
                  transform="rotate(-90 60 60)" class="db-donut-seg"
                  :opacity="donutHoverIdx !== null && donutHoverIdx !== i ? .4 : 1"
                  @mouseenter="donutHoverIdx = i" @mouseleave="donutHoverIdx = null"/>
              </g>
            </svg>
            <div class="db-donut-c">
              <template v-if="donutHoverIdx !== null">
                <div class="db-donut-v">{{ donutSegs[donutHoverIdx]?.foiz }}%</div>
                <div class="db-donut-l">{{ donutSegs[donutHoverIdx]?.turkum }}</div>
              </template>
              <template v-else>
                <div class="db-donut-v"><AnimNum :value="turkumJami" :format="fmtShort"/></div>
                <div class="db-donut-l">so'm · {{ turkumStat.length }} turkum</div>
              </template>
            </div>
          </div>

          <div class="db-legend">
            <button v-for="(t, i) in turkumStat" :key="i" class="db-legend-r"
              :class="{ on: donutHoverIdx === i }"
              @mouseenter="donutHoverIdx = i" @mouseleave="donutHoverIdx = null"
              @click="oting('/hisobot/tovarlar')">
              <i :style="{ background: `var(${CAT[i % CAT.length]})` }"/>
              <span class="db-legend-n">{{ t.turkum || 'Turkumsiz' }}</span>
              <span class="db-legend-f">{{ t.foiz }}%</span>
            </button>
          </div>
        </div>
      </article>
    </section>

    <!-- ══════════ HUDUDLAR + TO'LOV TURLARI + SAVDO REJASI ══════════ -->
    <section v-if="!birinchi && korinadi('savdo')" class="db-row db-row--3">
      <article v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16M16 6v16"/></svg>
            Hududlar
          </h2>
          <button class="db-link" @click="oting('/mijozlar/xarita')">Xarita</button>
        </div>
        <div v-if="!hududStat.length" class="db-empty db-empty--sm"><p>Bu davrda sotuv yo'q</p></div>
        <div v-else class="db-bars">
          <button v-for="(h, i) in hududStat" :key="h.id ?? h.hudud" class="db-bars-r" @click="oting('/mijozlar/xarita')"
            :title="`${h.hudud}: ${fmtNum(h.summa)} so'm · ${h.son} buyurtma · ${h.mijoz} mijoz`">
            <span class="db-bars-top">
              <span class="db-bars-n">{{ h.hudud }}</span>
              <span class="db-bars-v">{{ fmtShort(h.summa) }}</span>
            </span>
            <span class="db-bars-track"><span class="db-bars-fill" :style="{ width: hududPct(h.summa), animationDelay: i * 90 + 'ms' }"/></span>
            <span class="db-bars-s">{{ h.son }} buyurtma · {{ h.mijoz }} mijoz · {{ h.foiz }}%</span>
          </button>
        </div>
      </article>

      <article v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12V8H6a2 2 0 010-4h12v4"/><path d="M4 6v12a2 2 0 002 2h14v-4"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg>
            To'lov turlari
          </h2>
        </div>
        <div v-if="!tolovGuruhlar.length" class="db-empty db-empty--sm"><p>Bu davrda sotuv yo'q</p></div>
        <div v-else class="db-pay">
          <div class="db-pay-main">
            <span class="db-pay-v"><AnimNum :value="sotuv.summa" :format="fmtShort"/></span>
            <span class="db-pay-l">so'm · {{ fmtNum(sotuv.son) }} buyurtma</span>
          </div>
          <div class="db-stack" role="img" :aria-label="`To'lov turlari: ${tolovTavsif}`">
            <span v-for="g in tolovGuruhlar" :key="g.key" class="db-stack-seg"
              :class="{ dim: tolovHover !== null && tolovHover !== g.key }"
              :style="{ flexGrow: g.summa || 0.0001, background: `var(${g.c})` }"
              :title="`${g.label}: ${fmtNum(g.summa)} so'm (${g.foiz}%)`"
              @mouseenter="tolovHover = g.key" @mouseleave="tolovHover = null"/>
          </div>
          <div class="db-pay-list">
            <div v-for="g in tolovGuruhlar" :key="g.key" class="db-pay-r" :class="{ on: tolovHover === g.key }"
              @mouseenter="tolovHover = g.key" @mouseleave="tolovHover = null">
              <i :style="{ background: `var(${g.c})` }"/>
              <span class="db-pay-n">{{ g.label }}<small>{{ g.son }} ta</small></span>
              <b>{{ fmtShort(g.summa) }}</b>
              <span class="db-legend-f">{{ g.foiz }}%</span>
            </div>
          </div>
        </div>
      </article>

      <article v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>
            Savdo rejasi
          </h2>
          <span class="db-card-sub">{{ REJA_NOMI[period] }}</span>
          <button class="db-link" @click="oting('/agentlar/plan')">Rejalar</button>
        </div>
        <div class="db-goal">
          <div class="db-goal-wrap">
            <svg viewBox="0 0 120 120" class="db-goal-ring" role="img" :aria-label="`Reja ${savdoRejasi.foiz}% bajarildi`">
              <circle cx="60" cy="60" r="48" fill="none" stroke="var(--surface-sunken)" stroke-width="11"/>
              <!-- Belgilar: 25/50/75% -->
              <line v-for="d in [90, 180, 270]" :key="d" x1="60" y1="7" x2="60" y2="16"
                stroke="var(--surface)" stroke-width="2" :transform="`rotate(${d} 60 60)`"/>
              <circle cx="60" cy="60" r="48" fill="none" :stroke="`var(${foizTone(savdoRejasi.foiz)})`"
                stroke-width="11" stroke-linecap="round" transform="rotate(-90 60 60)"
                :stroke-dasharray="GOAL_C" :stroke-dashoffset="GOAL_C - GOAL_C * Math.min(100, savdoRejasi.foiz) / 100"
                :style="{ '--full': GOAL_C + 'px' }" class="db-ring"/>
            </svg>
            <div class="db-goal-c">
              <b><AnimNum :value="savdoRejasi.foiz" :format="v => (Math.round(v * 10) / 10) + '%'"/></b>
              <span>bajarildi</span>
            </div>
          </div>
          <div class="db-goal-rows">
            <div class="db-goal-row"><span>Reja</span><b>{{ fmtShort(savdoRejasi.plan) }}</b></div>
            <div class="db-goal-row"><span>Fakt</span><b>{{ fmtShort(savdoRejasi.fakt) }}</b></div>
            <div class="db-goal-row"><span>Qoldi</span>
              <b :class="savdoRejasi.plan - savdoRejasi.fakt > 0 ? 'db-bad' : 'db-ok'">
                {{ fmtShort(Math.max(0, savdoRejasi.plan - savdoRejasi.fakt)) }}</b></div>
          </div>
        </div>
      </article>
    </section>

    <!-- ══════════ TOP TOVARLAR + AGENTLAR ══════════ -->
    <section v-if="!birinchi && korinadi('reyting')" class="db-row db-row--2">
      <article v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7l-8-4-8 4v10l8 4 8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/></svg>
            Top tovarlar
          </h2>
          <div class="db-chips db-chips--r">
            <button class="db-chip" :class="{ on: tovarSort === 'summa' }" @click="tovarSort = 'summa'">Summa</button>
            <button class="db-chip" :class="{ on: tovarSort === 'dona' }"  @click="tovarSort = 'dona'">Kg</button>
          </div>
        </div>
        <div v-if="!topTovarlar.length" class="db-empty db-empty--sm"><p>Ma'lumot yo'q</p></div>
        <TransitionGroup v-else name="db-sort" tag="div" class="db-list">
          <button v-for="(t, i) in tovarlarSaralangan" :key="t.tovar_id" class="db-list-r"
            @click="oting('/hisobot/tovarlar')">
            <span class="db-rank" :class="'db-rank--' + (i + 1)">{{ i + 1 }}</span>
            <span class="db-list-b">
              <span class="db-list-t">{{ t.tovar_nomi }}</span>
              <span class="db-list-s">{{ t.turkum || 'Turkumsiz' }}</span>
            </span>
            <span class="db-mini-bar db-mini-bar--w">
              <span class="db-mini-fill" :style="{ width: tovarPct(t) }"/>
            </span>
            <span class="db-list-v">{{ tovarSort === 'summa' ? fmtShort(t.summa) : fmtMiqdor(t.dona) }}</span>
          </button>
        </TransitionGroup>
      </article>

      <article v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg>
            Agentlar rejasi
          </h2>
          <span class="db-card-sub">{{ (REJA_NOMI[period] ?? '').toLowerCase() }} bajarilishi</span>
          <button class="db-link" @click="oting('/agentlar/plan')">Batafsil</button>
        </div>
        <div v-if="!topAgentlar.length" class="db-empty db-empty--sm"><p>Ma'lumot yo'q</p></div>
        <AgentHalqalar v-else :agentlar="topAgentlar"/>
      </article>
    </section>

    <!-- ═════════════════════════════════════════════
         03 · TAHLIL
         ═════════════════════════════════════════════ -->
    <div v-if="!birinchi && korinadi('tahlil')" v-reveal class="db-sec">
      <span class="db-sec-n">03</span><span class="db-sec-t">Tahlil</span><span class="db-sec-l"/>
    </div>

    <section v-if="!birinchi && korinadi('tahlil')" class="db-row db-row--main">
      <article v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Faollik xaritasi
          </h2>
          <span class="db-card-sub">buyurtmalar qachon tushadi</span>
        </div>
        <FaollikXaritasi :rows="faollik"/>
      </article>

      <article v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/></svg>
            Mijozlar bazasi
          </h2>
          <span class="db-card-sub">{{ mijozHolati.jami }} faol mijoz</span>
          <button class="db-link" @click="oting('/mijozlar')">Mijozlar</button>
        </div>
        <MijozSalomatligi :holat="mijozHolati"/>
      </article>
    </section>

    <!-- ═════════════════════════════════════════════
         05 · MOLIYA VA OMBOR
         ═════════════════════════════════════════════ -->
    <!-- ═════════════════════════════════════════════
         04 · MIJOZLAR REYTINGI (components/MijozReytingi.vue, /tahlil/reyting)
         ═════════════════════════════════════════════ -->
    <div v-if="!birinchi && korinadi('mreyting')" v-reveal class="db-sec">
      <span class="db-sec-n">04</span><span class="db-sec-t">Mijozlar reytingi</span><span class="db-sec-l"/>
    </div>
    <MijozReytingi v-if="!birinchi && korinadi('mreyting')" v-reveal :period="period"/>

    <div v-if="!birinchi && (korinadi('moliya') || (korinadi('ogoh') && ogohBlokBor))" v-reveal class="db-sec">
      <span class="db-sec-n">05</span><span class="db-sec-t">Moliya va ombor</span><span class="db-sec-l"/>
    </div>

    <!-- ══════════ KASSA OQIMI + KASSA HOLATI ══════════ -->
    <section v-if="!birinchi && korinadi('moliya')" class="db-row db-row--main">
      <article v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
            Kassa oqimi
          </h2>
          <span class="db-card-sub">so'nggi 14 kun · kirim va chiqim</span>
          <button class="db-link" @click="oting('/moliya')">Moliya</button>
        </div>
        <KassaOqimi :kunlar="kassaKunlik"/>
      </article>

      <article v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
            Kassa holati
          </h2>
        </div>
        <div class="db-cash">
          <div class="db-cash-main">
            <span class="db-cash-v"><AnimNum :value="moliya.jami" :format="fmtNum" :duration="1300"/></span>
            <span class="db-cash-l">jami qoldiq (so'm)</span>
          </div>
          <div class="db-stack db-stack--lg">
            <span class="db-stack-seg" :style="{ flexGrow: Math.abs(moliya.naqd) || 1, background: 'var(--c1)' }"
              :title="`Naqd: ${fmtNum(moliya.naqd)} so'm`"/>
            <span class="db-stack-seg" :style="{ flexGrow: Math.abs(moliya.bank) || 1, background: 'var(--c3)' }"
              :title="`Bank / karta: ${fmtNum(moliya.bank)} so'm`"/>
          </div>
          <div class="db-cash-split">
            <div class="db-cash-item">
              <span class="db-dot" style="background:var(--c1)"/>
              <span>Naqd</span><b>{{ fmtShort(moliya.naqd) }}</b>
              <em>{{ ulush(moliya.naqd) }}%</em>
            </div>
            <div class="db-cash-item">
              <span class="db-dot" style="background:var(--c3)"/>
              <span>Bank / karta</span><b>{{ fmtShort(moliya.bank) }}</b>
              <em>{{ ulush(moliya.bank) }}%</em>
            </div>
          </div>
          <div class="db-cash-ft">
            <span>Sof oqim · {{ periodLabel.toLowerCase() }}</span>
            <b :class="foyda.sof_kassa_oqimi >= 0 ? 'db-ok' : 'db-bad'">
              {{ foyda.sof_kassa_oqimi >= 0 ? '+' : '' }}{{ fmtShort(foyda.sof_kassa_oqimi) }}</b>
          </div>
          <div class="db-cash-ft">
            <span>Bugungi mijoz to'lovlari</span>
            <b class="db-ok">+{{ fmtShort(bugun.tolov_summa) }}</b>
          </div>
        </div>
      </article>
    </section>

    <!-- ══════════ DEBITORLIK + OMBOR HOLATI ══════════ -->
    <section v-if="!birinchi && korinadi('moliya')" class="db-row db-row--2">
      <article v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            Debitorlik
          </h2>
          <button class="db-link" @click="oting('/mijozlar/oldi-berdi')">Oldi-berdi</button>
        </div>
        <div class="db-debt">
          <div class="db-debt-main">
            <div class="db-debt-v"><AnimNum :value="debitorlik.jami_qarz" :format="fmtShort"/></div>
            <div class="db-debt-l">jami qarz · {{ debitorlik.qarzdor_soni }} mijoz</div>
          </div>
          <div class="db-debt-bar" role="img" :aria-label="`Muddati o'tgan ulushi ${muddatiOtganPct}`">
            <div class="db-debt-fill" :style="{ width: muddatiOtganPct }"/>
          </div>
          <div class="db-debt-note">
            <span class="db-dot db-dot--crit"/>
            Muddati o'tgan: <b>{{ fmtShort(debitorlik.muddati_otgan) }}</b>
            <span class="db-debt-pct">{{ muddatiOtganPct }}</span>
          </div>
          <div v-if="topQarzdorlar.length" class="db-debt-top">
            <div class="db-debt-top-hd">Eng katta qarzdorlar</div>
            <button v-for="q in topQarzdorlar.slice(0, 3)" :key="q.id" class="db-debt-r" @click="oting('/mijozlar/oldi-berdi')">
              <span class="db-debt-r-n">{{ q.nomi }}</span>
              <span class="db-debt-r-bar"><i :style="{ width: (q.qarz / maxQarz) * 100 + '%' }"/></span>
              <b>{{ fmtShort(q.qarz) }}</b>
            </button>
          </div>
        </div>
      </article>

      <article v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/></svg>
            Ombor holati
          </h2>
          <button class="db-link" @click="oting('/ombor/qoldiqlar')">Qoldiqlar</button>
        </div>
        <div class="db-wh">
          <div>
            <div class="db-debt-v"><AnimNum :value="kpi.ombor_summa" :format="fmtShort"/></div>
            <div class="db-debt-l">qoldiq qiymati (tannarx) · {{ fmtMiqdor(kpi.ombor_dona) }} kg</div>
          </div>
          <div class="db-stack db-stack--lg" role="img"
            :aria-label="`Tovarlar: ${omborHolati.yetarli} yetarli, ${omborHolati.kam} kam, ${omborHolati.tugagan} tugagan`">
            <span v-for="s in omborSeg" :key="s.key" v-show="s.son > 0" class="db-stack-seg"
              :style="{ flexGrow: s.son, background: `var(${s.c})` }" :title="`${s.label}: ${s.son} tovar`"/>
          </div>
          <div class="db-wh-list">
            <button v-for="s in omborSeg" :key="s.key" class="db-wh-r" :style="{ '--c': `var(${s.c})` }"
              @click="oting('/ombor/qoldiqlar')">
              <span class="db-wh-ic" v-html="s.icon" aria-hidden="true"/>
              <span>{{ s.label }}</span>
              <b><AnimNum :value="s.son"/></b>
            </button>
          </div>
          <button class="db-cash-ft db-cash-ft--btn" @click="oting('/ombor/prixod')">
            <span>Kirim · {{ periodLabel.toLowerCase() }} · {{ kpi.prixod_son }} hujjat</span>
            <b>{{ fmtShort(kpi.kirim_summa) }}</b>
          </button>
        </div>
      </article>
    </section>

    <!-- ══════════ OGOHLANTIRISH + QARZDORLAR + KIRIMLAR ══════════ -->
    <section v-if="!birinchi && korinadi('ogoh') && ogohBlokBor" class="db-row db-row--3">
      <article v-if="alertSoni" v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t db-crit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
            Ogohlantirishlar
          </h2>
          <span class="db-badge db-badge--crit">{{ alertSoni }}</span>
        </div>
        <div class="db-alerts">
          <button v-if="oqim.kechikkan.son > 0" class="db-alert is-crit" @click="oting('/sotuvlar/buyurtmalar')">
            <span class="db-alert-ic" v-html="IC.clock"/>
            <span class="db-alert-b">
              <span class="db-alert-t">Kechikayotgan buyurtmalar</span>
              <span class="db-alert-s">Jo'natish sanasi o'tgan, hali yetkazilmagan</span>
            </span>
            <span class="db-alert-v">{{ oqim.kechikkan.son }} ta</span>
          </button>

          <button v-if="ogohlantirishlar.muddati_otgan_qarz > 0" class="db-alert is-crit" @click="oting('/moliya')">
            <span class="db-alert-ic" v-html="IC.money"/>
            <span class="db-alert-b">
              <span class="db-alert-t">Muddati o'tgan qarzlar</span>
              <span class="db-alert-s">To'lov muddati o'tgan mijoz qarzi</span>
            </span>
            <span class="db-alert-v">{{ fmtShort(ogohlantirishlar.muddati_otgan_qarz) }}</span>
          </button>

          <button v-if="oqim.qabul_kutilmoqda > 0" class="db-alert is-warn" @click="oting('/ombor/qaytarish-qabul')">
            <span class="db-alert-ic" v-html="IC.inbox"/>
            <span class="db-alert-b">
              <span class="db-alert-t">Qaytarishlar qabulni kutmoqda</span>
              <span class="db-alert-s">Ombor tasdig'i kerak</span>
            </span>
            <span class="db-alert-v">{{ oqim.qabul_kutilmoqda }} ta</span>
          </button>

          <button v-for="t in ogohlantirishlar.kam_qoldiq" :key="'k' + t.id"
            class="db-alert" :class="t.qoldiq <= 0 ? 'is-crit' : 'is-warn'" @click="oting('/ombor/qoldiqlar')">
            <span class="db-alert-ic" v-html="IC.box"/>
            <span class="db-alert-b">
              <span class="db-alert-t">{{ t.nomi }}</span>
              <span class="db-alert-s">{{ t.qoldiq <= 0 ? 'Tugadi — zudlik bilan buyurtma' : 'Ombor qoldig‘i kam' }}</span>
            </span>
            <span class="db-alert-v">{{ t.qoldiq }} kg</span>
          </button>

          <button v-for="(p, i) in ogohlantirishlar.muddati_yaqin" :key="'m' + i"
            class="db-alert is-warn" @click="oting('/ombor/partiya')">
            <span class="db-alert-ic" v-html="IC.clock"/>
            <span class="db-alert-b">
              <span class="db-alert-t">{{ p.tovar_nomi }}</span>
              <span class="db-alert-s">Yaroqlilik muddati tugayapti</span>
            </span>
            <span class="db-alert-v">{{ p.qolgan_kun }} kun</span>
          </button>
        </div>
      </article>

      <article v-if="topQarzdorlar.length" v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            Top qarzdorlar
          </h2>
          <button class="db-link" @click="oting('/mijozlar')">Hammasi</button>
        </div>
        <div class="db-list">
          <button v-for="(q, i) in topQarzdorlar" :key="q.id" class="db-list-r db-list-r--in"
            :style="{ animationDelay: i * 60 + 'ms' }" @click="oting('/mijozlar')">
            <span class="db-rank" :class="'db-rank--' + (i + 1)">{{ i + 1 }}</span>
            <span class="db-list-b">
              <span class="db-list-t">{{ q.nomi }}</span>
              <span class="db-list-s">{{ q.telefon || '—' }}</span>
            </span>
            <span class="db-tag" :class="qarzDaraja(q.qarz).cls">{{ qarzDaraja(q.qarz).label }}</span>
            <span class="db-list-v">{{ fmtShort(q.qarz) }}</span>
          </button>
        </div>
      </article>

      <article v-if="oxirgiPrixodlar.length" v-reveal class="db-card">
        <div class="db-card-hd">
          <h2 class="db-card-t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
            So'nggi kirimlar
          </h2>
          <button class="db-link" @click="oting('/ombor/prixod')">Ombor</button>
        </div>
        <div class="db-list">
          <button v-for="(p, i) in oxirgiPrixodlar" :key="p.id" class="db-list-r db-list-r--in"
            :style="{ animationDelay: i * 60 + 'ms' }" @click="oting('/ombor/prixod')">
            <span class="db-list-b">
              <span class="db-list-t">{{ p.yetkazuvchi || 'Nomsiz' }}</span>
              <span class="db-list-s">{{ p.hujjat_raqam }} · {{ fmtDate(p.sana) }}</span>
            </span>
            <span class="db-list-v">{{ fmtShort(p.jami_summa) }}</span>
          </button>
        </div>
      </article>
    </section>

    <!-- Hech qanday blok tanlanmagan -->
    <div v-if="!birinchi && !hechBlokYoq" class="db-nothing">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>
      <p>Barcha bloklar yashirilgan</p>
      <button class="db-btn" @click="sozlashniTiklash">Standart holatga qaytarish</button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, type Directive } from 'vue'
import { useRouter } from 'vue-router'
// @ts-ignore
import { dashboardApi } from '@/api/api'
import { authStore } from '@/stores/auth'
import AnimNum from './components/AnimNum.vue'
import FaollikXaritasi from './components/FaollikXaritasi.vue'
import KassaOqimi from './components/KassaOqimi.vue'
import MijozSalomatligi from './components/MijozSalomatligi.vue'
import AgentHalqalar from './components/AgentHalqalar.vue'
import MijozReytingi from './components/MijozReytingi.vue'
import { fmtNum, fmtMiqdor, fmtShort, fmtTick, fmtDate, sanaUz, OYLAR, HAFTA, kamHarakat } from './format'

const router = useRouter()

/* ═══════════ DOIMIYLAR ═══════════ */
const PERIODS = [
  { key: 'today', label: 'Bugun' },
  { key: 'week',  label: 'Hafta' },
  { key: 'month', label: 'Oy' },
  { key: 'year',  label: 'Yil' },
]
const REJA_NOMI: Record<string, string> = {
  today: 'Kunlik reja', week: 'Haftalik reja', month: 'Oylik reja', year: 'Yillik reja',
}
const CHART_MODES = [
  { key: 'summa', label: "So'm" },
  { key: 'dona',  label: 'Kg' },
]
/* Kategoriyali palitra — rang-ko'rlik uchun tekshirilgan tartib (validator:
   qo'shni juftliklar CVD ΔE ≥ 8, oddiy ko'z ΔE ≥ 15, ikkala rejimda) */
const CAT = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6']

/* Buyurtma holatlari: ochiq bosqichlar tartibli (ordinal) teal shkalada,
   yakuniy holatlar — status ranglarida */
const HOLAT: Record<string, { label: string; c: string }> = {
  yangi:        { label: 'Yangi',        c: '--o1' },
  tasdiqlangan: { label: 'Tasdiqlangan', c: '--o2' },
  yigilmoqda:   { label: "Yig'ilmoqda",  c: '--o3' },
  yolda:        { label: "Yo'lda",       c: '--o4' },
  yetkazildi:   { label: 'Yetkazildi',   c: '--good' },
  bekor:        { label: 'Bekor',        c: '--critical' },
}
function holatMeta(h: string) { return HOLAT[h] ?? { label: h || '—', c: '--neutral-mark' } }

/* To'lov turlari — erkin matn sifatida keladi, 4 ta barqaror guruhga
   yig'iladi. Rang guruhga biriktirilgan (reytingga emas). */
const TOLOV_GURUH = [
  { key: 'naqd',    label: 'Naqd',            c: '--c1', mos: ['naqt', 'naqd'] },
  { key: 'naqdsiz', label: 'Plastik / bank',  c: '--c3', mos: ['naqtsiz', 'naqdsiz', 'plastik', 'karta', 'bank', 'perechisleniye'] },
  { key: 'nasiya',  label: 'Nasiya',          c: '--c2', mos: ['qarz', 'muddatli', 'nasiya'] },
  { key: 'boshqa',  label: "Ko'rsatilmagan",  c: '--neutral-mark', mos: [] as string[] },
]

/* Sozlanadigan bloklar */
const BLOKLAR = [
  { key: 'bugun',     label: 'Bugungi banner' },
  { key: 'kpi',       label: 'KPI kartalar' },
  { key: 'oqim',      label: 'Distributsiya oqimi' },
  { key: 'yetkazish', label: 'Dostavchilar va so‘nggi buyurtmalar' },
  { key: 'grafik',    label: 'Sotuv trendi va turkumlar' },
  { key: 'savdo',     label: 'Hududlar, to‘lov turlari, reja' },
  { key: 'reyting',   label: 'Top tovarlar va agentlar' },
  { key: 'tahlil',    label: 'Faollik xaritasi va mijozlar bazasi' },
  { key: 'mreyting',  label: 'Mijozlar reytingi' },
  { key: 'moliya',    label: 'Kassa, debitorlik, ombor' },
  { key: 'ogoh',      label: 'Ogohlantirishlar, qarzdorlar, kirimlar' },
]
const CFG_KEY = 'sellz_dashboard_bloklar'

/* Grafik geometriyasi */
const CW = 620, CH = 210
const PAD_L = 6, PAD_R = 54, PAD_T = 12, PAD_B = 24
const INNER_W = CW - PAD_L - PAD_R
const INNER_H = CH - PAD_T - PAD_B
const BASE = PAD_T + INNER_H
const SPARK_W = 96, SPARK_H = 34
const DONUT_C = 2 * Math.PI * 42
const GOAL_C  = 2 * Math.PI * 48
const RING14  = 2 * Math.PI * 14

/* ═══════════ HOLAT ═══════════ */
const period   = ref<'today'|'week'|'month'|'year'>('month')
const loading  = ref(true)
const birinchi = ref(true)   // birinchi yuklanish — karkas ko'rsatiladi
const autoOn   = ref(false)
const sozlashOchiq = ref(false)
const chartMode  = ref<'summa'|'dona'>('summa')
const tovarSort  = ref<'summa'|'dona'>('summa')
const hoverIdx   = ref<number | null>(null)
const donutHoverIdx = ref<number | null>(null)
const oqimHover  = ref<number | null>(null)
const tolovHover = ref<string | null>(null)
const flashKey   = ref<string | null>(null)
const lastUpdated = ref('—')
const chartRef = ref<HTMLElement | null>(null)
const hozir = ref(new Date())

const yashirilgan = ref<string[]>([])
let autoTimer: number | undefined
let soatTimer: number | undefined

/* ═══════════ MA'LUMOT ═══════════ */
interface KPI {
  kirim_summa: number; kirim_summa_osish: number
  prixod_son: number;  prixod_osish: number
  mijoz_son: number;   faol_mijoz: number
  agent_son: number;   yetkazuvchi_son: number
  ombor_dona: number;  ombor_summa: number
}
interface Sotuv {
  summa: number; son: number; osish: number | null; son_osish: number | null
  ortacha_chek: number; ortacha_chek_osish: number | null
  akb: number; akb_osish: number | null; qamrov: number
  yetkazilgan_summa: number; yetkazilgan_son: number; yetkazish_foiz: number
  bekor_son: number; qaytarish_summa: number; qaytarish_foiz: number
}
interface Bosqich    { holat: string; label: string; son: number; summa: number }
interface Oqim       { bosqichlar: Bosqich[]; kechikkan: { son: number; summa: number }; qabul_kutilmoqda: number }
interface Dostavchi  { id: number; ism: string; transport: string; yetkazildi: number; kutilmoqda: number;
                       yolda: number; yetkazildi_summa: number; kutilmoqda_summa: number; trip_holat: string | null }
interface Hudud      { id: number | null; hudud: string; son: number; summa: number; mijoz: number; foiz: number }
interface TolovTur   { tur: string; son: number; summa: number; foiz: number }
interface OmborHolat { jami: number; tugagan: number; kam: number; yetarli: number }
interface Buyurtma   { id: number; raqam: string; holat: string; manba: string; mijoz: string; agent: string;
                       dostavchi: string; summa: number; tolov_turi: string; vaqt: string }
interface TrendItem  { oy: string; summa: number; dona: number; son: number;
                       oldingi_summa: number; oldingi_dona: number; oldingi_son: number }
interface TurkumItem { turkum: string; summa: number; dona: number; foiz: number }
interface TopTovar   { tovar_id: number; tovar_nomi: string; turkum: string; summa: number; dona: number }
interface Prixod     { id: number; hujjat_raqam: string; sana: string; yetkazuvchi: string; jami_summa: number; holat: string }
interface Debitorlik { jami_qarz: number; qarzdor_soni: number; muddati_otgan: number }
interface SavdoRejasi{ plan: number; fakt: number; foiz: number }
interface TopAgent   { id: number; fullname: string; savdo: number; plan: number; foiz: number }
interface Moliya     { naqd: number; bank: number; jami: number }
interface Foyda      { yalpi_foyda: number; yalpi_foyda_osish: number | null; sof_kassa_oqimi: number }
interface Qarzdor    { id: number; nomi: string; telefon: string; qarz: number }
interface Bugun      { zakaz_soni: number; yetkazilgan: number; tolov_summa: number; faol_agentlar: number;
                       yangi_mijozlar: number; zakaz_summa: number; reja_tashrif: number; tashrif: number }
interface Soatlik    { bugun: number[]; kecha: number[]; soat: number }
interface FaollikQ   { dw: number; h: number; son: number; summa: number }
interface KassaKun   { sana: string; kirim: number; chiqim: number }
interface MijozHolat { jami: number; faol: number; sust: number; yoqotilgan: number; hech: number
                       qayta_jalb: { id: number; nomi: string; telefon: string; kun: number; jami: number }[] }

const kpi = ref<KPI>({ kirim_summa:0, kirim_summa_osish:0, prixod_son:0, prixod_osish:0,
  mijoz_son:0, faol_mijoz:0, agent_son:0, yetkazuvchi_son:0, ombor_dona:0, ombor_summa:0 })
const sotuv = ref<Sotuv>({ summa:0, son:0, osish:null, son_osish:null, ortacha_chek:0, ortacha_chek_osish:null,
  akb:0, akb_osish:null, qamrov:0, yetkazilgan_summa:0, yetkazilgan_son:0, yetkazish_foiz:0,
  bekor_son:0, qaytarish_summa:0, qaytarish_foiz:0 })
const oqim = ref<Oqim>({ bosqichlar: [], kechikkan: { son:0, summa:0 }, qabul_kutilmoqda: 0 })
const dostavchilar = ref<Dostavchi[]>([])
const hududStat    = ref<Hudud[]>([])
const tolovTurlari = ref<TolovTur[]>([])
const omborHolati  = ref<OmborHolat>({ jami:0, tugagan:0, kam:0, yetarli:0 })
const oxirgiBuyurtmalar = ref<Buyurtma[]>([])
const oylikTrend  = ref<TrendItem[]>([])
const turkumStat  = ref<TurkumItem[]>([])
const topTovarlar = ref<TopTovar[]>([])
const oxirgiPrixodlar = ref<Prixod[]>([])
const debitorlik  = ref<Debitorlik>({ jami_qarz:0, qarzdor_soni:0, muddati_otgan:0 })
const savdoRejasi = ref<SavdoRejasi>({ plan:0, fakt:0, foiz:0 })
const topAgentlar = ref<TopAgent[]>([])
const moliya = ref<Moliya>({ naqd:0, bank:0, jami:0 })
const foyda  = ref<Foyda>({ yalpi_foyda:0, yalpi_foyda_osish:null, sof_kassa_oqimi:0 })
const topQarzdorlar = ref<Qarzdor[]>([])
const bugun = ref<Bugun>({ zakaz_soni:0, yetkazilgan:0, tolov_summa:0, faol_agentlar:0,
  yangi_mijozlar:0, zakaz_summa:0, reja_tashrif:0, tashrif:0 })
const soatlik = ref<Soatlik>({ bugun: Array(24).fill(0), kecha: Array(24).fill(0), soat: new Date().getHours() })
const faollik = ref<FaollikQ[]>([])
const kassaKunlik = ref<KassaKun[]>([])
const mijozHolati = ref<MijozHolat>({ jami:0, faol:0, sust:0, yoqotilgan:0, hech:0, qayta_jalb: [] })
const ogohlantirishlar = ref<{ kam_qoldiq: { id: number; nomi: string; qoldiq: number }[];
  muddati_yaqin: { tovar_nomi: string; muddat: string; qolgan_kun: number }[]; muddati_otgan_qarz: number }>(
  { kam_qoldiq: [], muddati_yaqin: [], muddati_otgan_qarz: 0 })
const sparklines = ref<Record<string, number[]>>({})

/* ═══════════ SKROLLDA PAYDO BO'LISH ═══════════
   Karta ko'rinish maydoniga kirganda "is-in" oladi — ichidagi grafik
   animatsiyalari (chiziq chizilishi, ustunlar o'sishi) aynan shunda boshlanadi. */
const vReveal: Directive<HTMLElement & { _io?: IntersectionObserver }> = {
  mounted(el) {
    if (kamHarakat || !('IntersectionObserver' in window)) { el.classList.add('is-in'); return }
    el.classList.add('db-rv')
    const io = new IntersectionObserver(ents => {
      if (ents.some(e => e.isIntersecting)) { el.classList.add('is-in'); io.disconnect() }
    }, { threshold: 0.06 })
    io.observe(el)
    el._io = io
  },
  unmounted(el) { el._io?.disconnect() },
}

/* ═══════════ FORMATLASH ═══════════ */
function oldin(s: string) {
  const d = new Date(s)
  if (isNaN(+d)) return ''
  const daq = Math.floor((Date.now() - +d) / 60000)
  if (daq < 1)  return 'hozirgina'
  if (daq < 60) return `${daq} daq oldin`
  const soat = Math.floor(daq / 60)
  if (soat < 24) return `${soat} soat oldin`
  const kun = Math.floor(soat / 24)
  if (kun === 1) return 'kecha'
  if (kun < 7)   return `${kun} kun oldin`
  return fmtDate(s)
}

const periodLabel = computed(() => PERIODS.find(p => p.key === period.value)?.label ?? '')
const bugunKun = computed(() => sanaUz(hozir.value, true))
const bugunOy  = computed(() => {
  const k = HAFTA[hozir.value.getDay()] ?? ''
  return k.charAt(0).toUpperCase() + k.slice(1)
})
const soatMatn = computed(() => {
  const d = hozir.value, p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
})
const salom = computed(() => {
  const s = hozir.value.getHours()
  return s < 5 ? 'Xayrli tun' : s < 11 ? 'Xayrli tong' : s < 18 ? 'Xayrli kun' : 'Xayrli kech'
})
const ism = computed(() => {
  const u = authStore.user.value
  return (u?.fullname || u?.username || '').trim().split(/\s+/)[0] || ''
})

/* ═══════════ BLOK SOZLAMASI ═══════════ */
function korinadi(key: string) { return !yashirilgan.value.includes(key) }
function blokToggle(key: string) {
  yashirilgan.value = korinadi(key)
    ? [...yashirilgan.value, key]
    : yashirilgan.value.filter(k => k !== key)
  saqla()
}
function sozlashniTiklash() { yashirilgan.value = []; saqla() }
function saqla() {
  try { localStorage.setItem(CFG_KEY, JSON.stringify(yashirilgan.value)) } catch { /* xotira to'la */ }
}
function yukla() {
  try {
    const s = localStorage.getItem(CFG_KEY)
    if (s) { const a = JSON.parse(s); if (Array.isArray(a)) yashirilgan.value = a }
  } catch { /* buzuq qiymat — standart holat */ }
}
const hechBlokYoq = computed(() => BLOKLAR.some(b => korinadi(b.key)))

/* ═══════════ DRILL-DOWN ═══════════ */
function oting(yol?: string) { if (yol) router.push(yol) }

/* ═══════════ BOSH BANNER ═══════════ */
const heroJami = computed(() => soatlik.value.bugun.reduce((s, v) => s + v, 0))
function jamlanma(a: number[]) { let acc = 0; return a.map(v => (acc += v)) }
/* Kechaning "shu vaqtgacha" qiymati — joriy soat ichida chiziqli bo'linadi */
const kechaShuVaqt = computed(() => {
  const k = jamlanma(soatlik.value.kecha), h = hozir.value.getHours()
  const oldingi = h > 0 ? (k[h - 1] ?? 0) : 0
  return oldingi + (soatlik.value.kecha[h] ?? 0) * (hozir.value.getMinutes() / 60)
})
const heroCmp = computed(() => {
  const k = kechaShuVaqt.value
  if (k <= 0) return null
  const f = Math.round(((heroJami.value - k) / k) * 100)
  return { up: f >= 0, text: `${f >= 0 ? '+' : ''}${f}%` }
})
const heroGeo = computed(() => {
  const W = 240, H = 64, TOP = 6
  const kecha = jamlanma(soatlik.value.kecha)
  const bugunJ = jamlanma(soatlik.value.bugun)
  const h = hozir.value.getHours()
  const kasr = (h + hozir.value.getMinutes() / 60) / 24
  const max = Math.max(kecha[23] ?? 0, bugunJ[h] ?? 0, 1)
  const y = (v: number) => H - (v / max) * (H - TOP)
  const kechaPts = [[0, H], ...kecha.map((v, i) => [((i + 1) / 24) * W, y(v)])]
  const bugunPts = [[0, H], ...bugunJ.slice(0, h).map((v, i) => [((i + 1) / 24) * W, y(v)]), [kasr * W, y(bugunJ[h] ?? 0)]]
  const d = (pts: number[][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${(p[0] ?? 0).toFixed(1)},${(p[1] ?? 0).toFixed(1)}`).join(' ')
  const oxirgi = bugunPts[bugunPts.length - 1] ?? [0, H]
  return {
    kecha: d(kechaPts),
    line: d(bugunPts),
    area: `${d(bugunPts)} L${(oxirgi[0] ?? 0).toFixed(1)},${H} Z`,
    nowX: ((oxirgi[0] ?? 0) / W) * 100,
    nowY: ((oxirgi[1] ?? H) / H) * 100,
  }
})

/* ═══════════ SPARKLINE ═══════════ */
function sparkPath(vals: number[]) {
  if (!vals || vals.length < 2) return { line: '', area: '' }
  const max = Math.max(...vals), min = Math.min(...vals)
  const span = (max - min) || 1
  const n = vals.length
  const pts = vals.map((v, i) => ({
    x: (i / (n - 1)) * SPARK_W,
    y: SPARK_H - 3 - ((v - min) / span) * (SPARK_H - 6),
  }))
  const line = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `M${pts[0]!.x},${pts[0]!.y} ` +
    pts.slice(1).map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L${SPARK_W},${SPARK_H} L0,${SPARK_H} Z`
  return { line, area }
}

/* ═══════════ DISTRIBUTSIYA OQIMI ═══════════ */
const BOSQICH_UI: Record<string, { icon: string; yol: string }> = {}
const oqimBosqichlar = computed(() => oqim.value.bosqichlar.map(b => ({
  ...b,
  c: holatMeta(b.holat).c,
  icon: BOSQICH_UI[b.holat]?.icon ?? '',
  yol: BOSQICH_UI[b.holat]?.yol ?? '/sotuvlar/buyurtmalar',
})))
const ochiqJami = computed(() => oqim.value.bosqichlar.slice(0, 4)
  .reduce((s, b) => ({ son: s.son + b.son, summa: s.summa + b.summa }), { son: 0, summa: 0 }))
const ochiqTavsif = computed(() => oqim.value.bosqichlar.slice(0, 4)
  .map(b => `${b.label} ${b.son}`).join(', '))

/* ═══════════ DOSTAVCHILAR ═══════════ */
function dvPct(d: Dostavchi) {
  const jami = d.yetkazildi + d.kutilmoqda
  return jami ? Math.max(4, (d.yetkazildi / jami) * 100) + '%' : '0%'
}
/* Reys holati trip sheet'dan, u bo'lmasa — buyurtmalar holatidan */
function tripHolat(d: Dostavchi) {
  if (d.trip_holat === 'yolda' || (!d.trip_holat && d.yolda > 0)) return { label: "Yo'lda",     c: '--o4' }
  if (d.trip_holat === 'yangi')      return { label: 'Reys tayyor', c: '--o2' }
  if (d.trip_holat === 'yakunlandi') return { label: 'Yakunladi',   c: '--good' }
  if (d.kutilmoqda > 0)              return { label: 'Yuklanmoqda', c: '--o1' }
  return { label: "Bo'sh", c: '--neutral-mark' }
}
const dvJami = computed(() => {
  const j = dostavchilar.value.reduce((s, d) => ({
    yetkazildi: s.yetkazildi + d.yetkazildi, kutilmoqda: s.kutilmoqda + d.kutilmoqda,
    yetkazildiSumma: s.yetkazildiSumma + d.yetkazildi_summa,
    kutilmoqdaSumma: s.kutilmoqdaSumma + d.kutilmoqda_summa,
  }), { yetkazildi: 0, kutilmoqda: 0, yetkazildiSumma: 0, kutilmoqdaSumma: 0 })
  const jami = j.yetkazildi + j.kutilmoqda
  return { ...j, foiz: jami ? Math.round((j.yetkazildi / jami) * 100) : 0 }
})
const dostavchiXulosa = computed(() => {
  const yolda = dostavchilar.value.filter(d => tripHolat(d).label === "Yo'lda").length
  return `${dostavchilar.value.length} faol · ${yolda} yo'lda`
})

/* ═══════════ HUDUD / TO'LOV / OMBOR / KASSA ═══════════ */
const hududMax = computed(() => Math.max(...hududStat.value.map(h => h.summa), 1))
function hududPct(v: number) { return Math.max(2, (v / hududMax.value) * 100) + '%' }

const tolovGuruhlar = computed(() => {
  const jami = tolovTurlari.value.reduce((s, t) => s + t.summa, 0)
  return TOLOV_GURUH.map(g => {
    const qatorlar = tolovTurlari.value.filter(t =>
      g.key === 'boshqa'
        ? !TOLOV_GURUH.some(x => x.mos.includes(t.tur))
        : g.mos.includes(t.tur))
    const summa = qatorlar.reduce((s, t) => s + t.summa, 0)
    const son   = qatorlar.reduce((s, t) => s + t.son, 0)
    return { key: g.key, label: g.label, c: g.c, son, summa,
             foiz: jami ? +((summa / jami) * 100).toFixed(1) : 0 }
  }).filter(g => g.son > 0)
})
const tolovTavsif = computed(() => tolovGuruhlar.value.map(g => `${g.label} ${g.foiz}%`).join(', '))

const omborSeg = computed(() => [
  { key: 'yetarli', label: 'Yetarli',    son: omborHolati.value.yetarli, c: '--good',     icon: IC.check },
  { key: 'kam',     label: 'Kam (< 20)', son: omborHolati.value.kam,     c: '--warning',  icon: IC.alert },
  { key: 'tugagan', label: 'Tugagan',    son: omborHolati.value.tugagan, c: '--critical', icon: IC.x },
])

function ulush(v: number) {
  const j = Math.abs(moliya.value.naqd) + Math.abs(moliya.value.bank)
  return j ? Math.round((Math.abs(v) / j) * 100) : 0
}

/* ═══════════ ASOSIY GRAFIK ═══════════ */
const chartTitle = computed(() =>
  period.value === 'today' ? 'bugun ↔ kecha, soatlar bo‘yicha'
  : period.value === 'week' ? "so'nggi 7 kun ↔ undan oldingi 7 kun"
  : period.value === 'year' ? "so'nggi 12 oy ↔ o'tgan yil"
  : "so'nggi 30 kun ↔ undan oldingi 30 kun")

const chartVals = computed(() =>
  oylikTrend.value.map(t => chartMode.value === 'summa' ? Number(t.summa || 0) : Number(t.dona || 0)))
const prevVals = computed(() =>
  oylikTrend.value.map(t => chartMode.value === 'summa' ? Number(t.oldingi_summa || 0) : Number(t.oldingi_dona || 0)))
const chartJami = computed(() => ({
  cur:  chartVals.value.reduce((s, v) => s + v, 0),
  prev: prevVals.value.reduce((s, v) => s + v, 0),
}))
const trendBosh = computed(() => !chartVals.value.some(v => v > 0) && !prevVals.value.some(v => v > 0))
/* Davr yoki rejim almashganda chiziq qaytadan "chiziladi" */
const chartKey = computed(() => `${period.value}-${chartMode.value}-${oylikTrend.value.length}`)

const trendChip = computed(() => {
  const o = sotuv.value.osish
  if (o === null || o === undefined) return null
  return { cls: o >= 0 ? 'is-up' : 'is-down', text: `${o >= 0 ? '+' : ''}${o}%` }
})

/* O'q yuqori chegarasi "yumaloq" songa keltiriladi — belgilar 0, 25, 50... kabi chiqadi */
function niceMax(v: number) {
  if (v <= 0) return 1
  const qadam = v / 4
  const mag = Math.pow(10, Math.floor(Math.log10(qadam)))
  const n = qadam / mag
  const yaxshi = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return yaxshi * mag * 4
}
const maxVal = computed(() => niceMax(Math.max(...chartVals.value, ...prevVals.value, 0)))

function px(i: number) {
  const n = chartVals.value.length
  return PAD_L + (n <= 1 ? INNER_W / 2 : (i / (n - 1)) * INNER_W)
}
function py(v: number) { return BASE - (v / maxVal.value) * INNER_H }
const chartPts  = computed(() => chartVals.value.map((v, i) => ({ x: px(i), y: py(v), v })))
const prevPts   = computed(() => prevVals.value.map((v, i) => ({ x: px(i), y: py(v), v })))
const lastPoint = computed(() => chartPts.value[chartPts.value.length - 1] ?? null)

function yol(pts: { x: number; y: number }[]) {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}
const linePath = computed(() => yol(chartPts.value))
const prevPath = computed(() => yol(prevPts.value))
const areaPath = computed(() => {
  const p = chartPts.value
  if (!p.length) return ''
  return `${linePath.value} L${p[p.length - 1]!.x.toFixed(1)},${BASE} L${p[0]!.x.toFixed(1)},${BASE} Z`
})
const yTicks = computed(() => Array.from({ length: 5 }, (_, i) => {
  const v = (maxVal.value / 4) * i
  return { v, y: py(v) }
}))
function dotStyle(p: { x: number; y: number }) {
  return { left: `${(p.x / CW) * 100}%`, top: `${(p.y / CH) * 100}%` }
}
const tipFarq = computed(() => {
  if (hoverIdx.value === null) return null
  const c = chartVals.value[hoverIdx.value] ?? 0, p = prevVals.value[hoverIdx.value] ?? 0
  return p > 0 ? Math.round(((c - p) / p) * 100) : null
})

/* X o'qi yorliqlari — nuqta ko'p bo'lsa siyraklashtiriladi */
function showLabelAt(i: number) {
  const n = chartPts.value.length
  if (n <= 8) return true
  const step = Math.ceil(n / 7)
  return i % step === 0 || i === n - 1
}
function xLabel(i: number) {
  const s = oylikTrend.value[i]?.oy ?? ''
  if (period.value === 'today') return String(s).slice(11, 16) || String(s).slice(-5)
  if (period.value === 'year')  return (OYLAR[Number(String(s).slice(5, 7)) - 1] ?? '').slice(0, 3)
  return `${String(s).slice(8, 10)}.${String(s).slice(5, 7)}`
}
function xLabelFull(i: number) {
  const s = oylikTrend.value[i]?.oy ?? ''
  if (period.value === 'today') return String(s).slice(11, 16)
  if (period.value === 'year') return `${String(s).slice(0, 4)}-yil, ${OYLAR[Number(String(s).slice(5, 7)) - 1] ?? ''}`
  return `${Number(String(s).slice(8, 10))}-${OYLAR[Number(String(s).slice(5, 7)) - 1] ?? ''}`
}

/* Hover — eng yaqin nuqtani topadi */
function nuqtaTop(clientX: number) {
  const el = chartRef.value
  if (!el || !chartPts.value.length) return
  const r = el.getBoundingClientRect()
  const x = ((clientX - r.left) / r.width) * CW
  let eng = 0, min = Infinity
  chartPts.value.forEach((p, i) => {
    const d = Math.abs(p.x - x)
    if (d < min) { min = d; eng = i }
  })
  hoverIdx.value = eng
}
function chartMove(e: MouseEvent) { nuqtaTop(e.clientX) }
function chartTouch(e: TouchEvent) { if (e.touches[0]) nuqtaTop(e.touches[0].clientX) }

const tipStyle = computed(() => {
  if (hoverIdx.value === null) return {}
  const p = chartPts.value[hoverIdx.value]
  if (!p) return {}
  const foiz = (p.x / CW) * 100
  return foiz > 55
    ? { right: `${Math.max(2, 100 - foiz + 2)}%` }
    : { left: `${Math.max(2, foiz + 2)}%` }
})

/* ═══════════ DONUT ═══════════ */
const turkumJami = computed(() => turkumStat.value.reduce((s, t) => s + Number(t.summa || 0), 0))
const donutSegs = computed(() => {
  const jami = turkumJami.value || 1
  const n = turkumStat.value.length
  let off = 0
  return turkumStat.value.map((t, i) => {
    const toliq = DONUT_C * (Number(t.summa || 0) / jami)
    // Segmentlar orasida 2px sirt bo'shlig'i — chegarasiz ajratish
    const bosh = n > 1 ? Math.min(2, toliq / 2) : 0
    const seg = { ...t, len: Math.max(0, toliq - bosh), off, color: CAT[i % CAT.length] }
    off += toliq
    return seg
  })
})

/* ═══════════ HISOBLANADIGAN ═══════════ */
const alertSoni = computed(() =>
  (ogohlantirishlar.value.kam_qoldiq?.length || 0) +
  (ogohlantirishlar.value.muddati_yaqin?.length || 0) +
  (ogohlantirishlar.value.muddati_otgan_qarz > 0 ? 1 : 0) +
  (oqim.value.kechikkan.son > 0 ? 1 : 0) +
  (oqim.value.qabul_kutilmoqda > 0 ? 1 : 0))
const ogohBlokBor = computed(() =>
  alertSoni.value > 0 || topQarzdorlar.value.length > 0 || oxirgiPrixodlar.value.length > 0)

const muddatiOtganPct = computed(() => {
  const j = debitorlik.value.jami_qarz
  if (!j) return '0%'
  return Math.min(100, Math.round((debitorlik.value.muddati_otgan / j) * 100)) + '%'
})

/* Top tovarlar — tanlangan ustun bo'yicha saralanadi (TransitionGroup qatorlarni siljitadi) */
const tovarlarSaralangan = computed(() =>
  [...topTovarlar.value].sort((a, b) =>
    tovarSort.value === 'summa' ? b.summa - a.summa : b.dona - a.dona))
function tovarPct(t: TopTovar) {
  const list = tovarlarSaralangan.value
  const max = tovarSort.value === 'summa'
    ? Math.max(...list.map(x => x.summa), 1)
    : Math.max(...list.map(x => x.dona), 1)
  const v = tovarSort.value === 'summa' ? t.summa : t.dona
  return Math.max(3, (v / max) * 100) + '%'
}

/* Daraja belgilari */
function foizTone(f: number) { return f >= 80 ? '--good' : f >= 50 ? '--warning' : '--critical' }
const maxQarz = computed(() => Math.max(...topQarzdorlar.value.map(q => q.qarz), 1))
function qarzDaraja(q: number) {
  const foiz = Math.round((q / maxQarz.value) * 100)
  if (foiz >= 66) return { label: 'Yuqori', cls: 'is-crit' }
  if (foiz >= 33) return { label: "O'rta",  cls: 'is-warn' }
  return { label: 'Past', cls: 'is-neutral' }
}

/* ═══════════ BELGILAR ═══════════ */
const IC = {
  money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
  card:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
  box:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7l-8-4-8 4v10l8 4 8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg>',
  wh:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/></svg>',
  cart:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  pin:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  plus:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  x:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>',
  ret:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>',
  pack:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16.5 9.4L7.5 4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/></svg>',
  home:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg>',
  file:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>',
  route: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15"/><circle cx="18" cy="5" r="3"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>',
  monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  receipt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
}

Object.assign(BOSQICH_UI, {
  yangi:        { icon: IC.file,  yol: '/sotuvlar/buyurtmalar' },
  tasdiqlangan: { icon: IC.check, yol: '/ombor/yigish' },
  yigilmoqda:   { icon: IC.pack,  yol: '/ombor/yigish' },
  yolda:        { icon: IC.truck, yol: '/sotuvlar/trip-sheet' },
  yetkazildi:   { icon: IC.home,  yol: '/sotuvlar/buyurtmalar' },
})

type Fmt = (n: number) => string
const bugunStats = computed(() => {
  const b = bugun.value
  const tashrifFoiz = b.reja_tashrif ? Math.min(100, Math.round((b.tashrif / b.reja_tashrif) * 100)) : null
  return [
    { key: 'zakaz',  label: 'Yangi zakaz', num: b.zakaz_soni as number | null, fmt: fmtNum as Fmt, val: '', prog: null as number | null,
      sub: b.zakaz_summa ? fmtShort(b.zakaz_summa) + " so'm" : '',
      tone: '--s1', icon: IC.cart,  yol: '/sotuvlar/buyurtmalar', hint: 'Bugun qabul qilingan buyurtmalar' },
    { key: 'yetkaz', label: 'Yetkazildi',  num: b.yetkazilgan, fmt: fmtNum, val: '', prog: null,
      sub: 'buyurtma', tone: '--good', icon: IC.truck, yol: '/sotuvlar/buyurtmalar', hint: 'Bugun yetkazib berilgan' },
    { key: 'tolov',  label: "To'lov",      num: b.tolov_summa, fmt: fmtShort, val: '', prog: null,
      sub: 'mijozlardan', tone: '--s3', icon: IC.card,  yol: '/moliya', hint: 'Bugungi mijoz to‘lovlari' },
    { key: 'tashrif', label: 'Tashrif', num: null, fmt: fmtNum,
      val: b.reja_tashrif ? `${b.tashrif}/${b.reja_tashrif}` : fmtNum(b.tashrif), prog: tashrifFoiz,
      sub: '', tone: '--s6', icon: IC.route, yol: '/agentlar/marshrut', hint: 'Bajarilgan / rejalashtirilgan tashriflar' },
    { key: 'agent',  label: 'Faol agent',  num: b.faol_agentlar, fmt: fmtNum, val: '', prog: null,
      sub: 'GPS signali', tone: '--s1', icon: IC.pin,   yol: '/agentlar/nazorat', hint: 'GPS signali kelgan agentlar' },
    { key: 'mijoz',  label: 'Yangi mijoz', num: b.yangi_mijozlar, fmt: fmtNum, val: '', prog: null,
      sub: 'bazaga qo‘shildi', tone: '--s2', icon: IC.plus, yol: '/mijozlar', hint: 'Bugun qo‘shilgan mijozlar' },
  ]
})

const kpiKartalar = computed(() => [
  { key: 'sotuv', hero: true, tone: 'db-t-2', label: 'Sotuv', note: `${fmtNum(sotuv.value.son)} buyurtma`,
    num: sotuv.value.summa, fmt: fmtShort as Fmt, osish: sotuv.value.osish,
    icon: IC.cart, spark: sparklines.value.sotuv_summa, yol: '/sotuvlar/buyurtmalar', hint: 'Davrdagi buyurtmalar summasi (bekorlardan tashqari)' },
  { key: 'foyda', hero: false, tone: 'db-t-1', label: 'Yalpi foyda', note: 'Sotuv − tannarx',
    num: foyda.value.yalpi_foyda, fmt: fmtShort, osish: foyda.value.yalpi_foyda_osish,
    icon: IC.money, spark: sparklines.value.yalpi_foyda, yol: '/sotuvlar/hisobot', hint: 'Yetkazilgan savdo foydasi' },
  { key: 'kassa', hero: false, tone: 'db-t-3', label: 'Sof kassa oqimi', note: 'Kirim − chiqim',
    num: foyda.value.sof_kassa_oqimi, fmt: fmtShort, osish: null as number | null,
    icon: IC.card, spark: sparklines.value.sof_kassa_oqimi, yol: '/moliya', hint: 'Kassa harakati' },
  { key: 'akb', hero: false, tone: 'db-t-5', label: 'Faol mijozlar (AKB)',
    note: `qamrov ${sotuv.value.qamrov}% · ${fmtNum(kpi.value.faol_mijoz)} dan`,
    num: sotuv.value.akb, fmt: fmtNum, osish: sotuv.value.akb_osish,
    icon: IC.users, spark: sparklines.value.akb, yol: '/mijozlar', hint: 'Davrda xarid qilgan mijozlar soni' },
  { key: 'chek', hero: false, tone: 'db-t-4', label: "O'rtacha chek", note: 'bir buyurtma summasi',
    num: sotuv.value.ortacha_chek, fmt: fmtShort, osish: sotuv.value.ortacha_chek_osish,
    icon: IC.receipt, spark: sparklines.value.ortacha_chek, yol: '/sotuvlar/hisobot', hint: 'Sotuv ÷ buyurtmalar soni' },
  { key: 'ombor', hero: false, tone: 'db-t-6', label: 'Ombor qiymati', note: `${fmtMiqdor(kpi.value.ombor_dona)} kg · tannarx`,
    num: kpi.value.ombor_summa, fmt: fmtShort, osish: null,
    icon: IC.wh, spark: sparklines.value.ombor_summa, yol: '/ombor/qoldiqlar', hint: 'Qoldiqning o‘rtacha kirim narxidagi qiymati' },
])

/* ═══════════ YUKLASH ═══════════ */
function flash(key: string) {
  flashKey.value = key
  window.setTimeout(() => { if (flashKey.value === key) flashKey.value = null }, 900)
}

async function load(jim = false) {
  if (!jim) loading.value = true
  try {
    const d = await dashboardApi.main(period.value)

    // Avto-yangilanishda o'zgargan raqamni yoritamiz
    const eskiZakaz = bugun.value.zakaz_soni
    const eskiSotuv = sotuv.value.summa

    kpi.value   = { ...kpi.value, ...(d.kpi || {}) }
    sotuv.value = { ...sotuv.value, ...(d.sotuv || {}) }
    oqim.value  = d.distributsiya_oqimi || oqim.value
    dostavchilar.value = d.dostavchilar || []
    hududStat.value    = d.hudud_stat || []
    tolovTurlari.value = d.tolov_turlari || []
    omborHolati.value  = d.ombor_holati || omborHolati.value
    oxirgiBuyurtmalar.value = d.oxirgi_buyurtmalar || []
    oylikTrend.value  = d.oylik_trend || []
    turkumStat.value  = d.turkum_stat || []
    topTovarlar.value = d.top_tovarlar || []
    oxirgiPrixodlar.value = d.oxirgi_prixodlar || []
    debitorlik.value  = d.debitorlik  || debitorlik.value
    savdoRejasi.value = d.savdo_rejasi || savdoRejasi.value
    topAgentlar.value = d.top_agentlar || []
    moliya.value      = d.moliya || moliya.value
    foyda.value       = d.foyda  || foyda.value
    topQarzdorlar.value = d.top_qarzdorlar || []
    bugun.value       = { ...bugun.value, ...(d.bugun || {}) }
    soatlik.value     = d.bugun_soatlik || soatlik.value
    faollik.value     = d.faollik || []
    kassaKunlik.value = d.kassa_kunlik || []
    mijozHolati.value = d.mijoz_holati || mijozHolati.value
    ogohlantirishlar.value = d.ogohlantirishlar || ogohlantirishlar.value
    sparklines.value  = d.sparklines || {}

    lastUpdated.value = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })

    if (jim) {
      if (bugun.value.zakaz_soni !== eskiZakaz) flash('zakaz')
      else if (sotuv.value.summa !== eskiSotuv) flash('sotuv')
    }
  } catch (e) {
    console.error('Dashboard yuklash xatosi:', e)
  } finally {
    loading.value = false
    birinchi.value = false
    hoverIdx.value = null
  }
}

function changePeriod(p: string) {
  if (period.value === p) return
  period.value = p as typeof period.value
  hoverIdx.value = null
  load()
}

/* ═══════════ AVTO-YANGILANISH ═══════════ */
const AUTO_KEY = 'sellz_dashboard_auto'
function autoBoshla() {
  autoToxtat()
  // 60 soniya — server yukini oshirmaydi, lekin sonlar "tirik" turadi
  autoTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible') load(true)
  }, 60000)
}
function autoToxtat() { if (autoTimer) { clearInterval(autoTimer); autoTimer = undefined } }
function autoToggle() {
  autoOn.value = !autoOn.value
  try { localStorage.setItem(AUTO_KEY, autoOn.value ? '1' : '0') } catch { /* xotira to'la */ }
  autoOn.value ? autoBoshla() : autoToxtat()
}

watch(chartMode, () => { hoverIdx.value = null })

onMounted(async () => {
  yukla()
  try { autoOn.value = localStorage.getItem(AUTO_KEY) === '1' } catch { /* o'qib bo'lmadi */ }
  soatTimer = window.setInterval(() => { hozir.value = new Date() }, 1000)
  await load()
  await nextTick()
  if (autoOn.value) autoBoshla()
})
onUnmounted(() => {
  autoToxtat()
  if (soatTimer) clearInterval(soatTimer)
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   RANG TIZIMI — brend: indigo (main.css --brand-*), bitta rang asosida
   Barcha matn ranglari WCAG AA (≥4.5:1) dan o'tgan, ikkala rejimda.
   ═══════════════════════════════════════════════════════════ */
.db {
  --surface:        #ffffff;
  --surface-sunken: #f1f5f9;
  --border:         rgba(15,23,42,.09);
  --shadow:         0 1px 2px rgba(15,23,42,.04), 0 2px 8px rgba(15,23,42,.05);
  --shadow-lift:    0 14px 34px rgba(15,23,42,.11);
  --grid:           #e8edf3;

  --ink:            #0f172a;   /* 17.85:1 */
  --ink-secondary:  #334155;   /* 10.35:1 */
  /* Izoh matni: oq fonda 5.42, --surface-sunken ustida 4.95 */
  --ink-muted:      #5d6b7f;

  --accent:         #4f46e5;   /*  6.29:1 — brend (indigo-600) */
  --accent-2:       #4338ca;   /*  7.94:1 */
  --accent-wash:    rgba(79,70,229,.08);

  /* Bezak ranglari — KPI kartalar urg'usi, avatarlar (ma'lumot kodlamaydi) */
  --s1: #4f46e5;  --s2: #4338ca;  --s3: #6366f1;
  --s4: #b45309;  --s5: #be123c;  --s6: #3730a3;

  /* Kategoriyali palitra — brend tuslari; c2 (nasiya/qarz) ataylab sariq signal.
     Och tuslar doim yozuvli legenda bilan chiqadi. */
  --c1: #4f46e5;  --c2: #d97706;  --c3: #818cf8;
  --c4: #312e81;  --c5: #c7d2fe;  --c6: #94a3b8;
  /* Tartibli (ordinal) brend shkalasi — buyurtma bosqichlari, och → to'q */
  --o1: #a5b4fc;  --o2: #6366f1;  --o3: #4f46e5;  --o4: #312e81;
  --neutral-mark: #94a0b2;

  --good:     #047857;
  --warning:  #b45309;
  --critical: #be123c;
  --good-wash:     rgba(4,120,87,.09);
  --warning-wash:  rgba(180,83,9,.09);
  --critical-wash: rgba(190,18,60,.09);

  --tinted-muted: #556072;
  --on-tone: #ffffff;

  --r:  14px;
  --r-lg: 18px;
  --ease: cubic-bezier(.22,1,.36,1);
  color-scheme: light;

  position:relative;
  display:flex; flex-direction:column; gap:14px; padding:2px 0 40px;
  color:var(--ink);
}

/* :global() bu yerda ishlatilmaydi — Vue butun selektorni ichidagi qism
   bilan almashtirib, ".db" ni tashlab yuboradi va tokenlar :root ga tushib
   .db ning yorug' qiymatlari ostida qolib ketadi. */
:root[data-theme="dark"] .db,
.shell.dark .db {
  --surface:        #212836;
  --surface-sunken: #181e29;
  --border:         rgba(255,255,255,.09);
  --shadow:         0 1px 2px rgba(0,0,0,.24), 0 2px 8px rgba(0,0,0,.28);
  --shadow-lift:    0 14px 34px rgba(0,0,0,.42);
  --grid:           #2d3548;

  --ink:            #e8eaf0;
  --ink-secondary:  #a8b0c0;
  --ink-muted:      #8b93a7;

  --accent:         #818cf8;
  --accent-2:       #a5b4fc;
  --accent-wash:    rgba(129,140,248,.14);

  --s1: #818cf8;  --s2: #a5b4fc;  --s3: #818cf8;
  --s4: #fbbf24;  --s5: #fb7185;  --s6: #c7d2fe;

  /* Xuddi shu ranglar qorong'i sirt uchun */
  --c1: #818cf8;  --c2: #fbbf24;  --c3: #4f46e5;
  --c4: #c7d2fe;  --c5: #3730a3;  --c6: #64748b;
  /* Ordinal shkala qorong'ida teskari: oldinga siljigan bosqich yorqinroq */
  --o1: #3730a3;  --o2: #4f46e5;  --o3: #818cf8;  --o4: #c7d2fe;
  --neutral-mark: #5f6a7e;

  --good:     #34d399;
  --warning:  #fbbf24;
  --critical: #fb7185;
  --good-wash:     rgba(52,211,153,.16);
  --warning-wash:  rgba(251,191,36,.16);
  --critical-wash: rgba(251,113,133,.16);

  --tinted-muted: #98a1b4;
  --on-tone: #0f172a;
  color-scheme: dark;
}

/* ═══ SKROLLDA PAYDO BO'LISH ═══ */
.db-rv { opacity:0; transform:translateY(22px) scale(.985); }
.db-rv.is-in { animation:db-rise .7s var(--ease) forwards; }
.db-row > .db-rv:nth-child(2).is-in { animation-delay:.08s; }
.db-row > .db-rv:nth-child(3).is-in { animation-delay:.16s; }
@keyframes db-rise { to { opacity:1; transform:none } }

/* ═══ YUKLANISH ═══ */
.db-loadbar { position:absolute; top:-6px; left:0; right:0; height:2px; overflow:hidden;
              border-radius:2px; z-index:10; }
.db-loadbar::after { content:''; position:absolute; top:0; bottom:0; width:30%;
                     background:linear-gradient(90deg, transparent, var(--accent), transparent);
                     animation:db-load 1.1s ease-in-out infinite; }
@keyframes db-load { from { left:-30% } to { left:100% } }
.db--busy .db-card, .db--busy .db-kpi, .db--busy .db-hero { opacity:.62; transition:opacity .2s; }

.db-skel { border-radius:var(--r); position:relative; overflow:hidden; background:var(--surface-sunken); }
.db-skel::after { content:''; position:absolute; inset:0;
                  background:linear-gradient(100deg, transparent 20%, color-mix(in oklab, var(--surface) 70%, transparent) 50%, transparent 80%);
                  animation:db-shimmer 1.3s ease-in-out infinite; transform:translateX(-100%); }
@keyframes db-shimmer { to { transform:translateX(100%) } }
.db-skel--kpi  { height:100px; }
.db-skel--hero { height:250px; border-radius:var(--r-lg); }
.db-skel--flow { height:228px; }
.db-skel--card { height:280px; }

/* ═══ HEADER ═══ */
.db-hd { display:flex; align-items:flex-end; gap:14px; flex-wrap:wrap; }
.db-hd-eyebrow { margin:0 0 2px; font-size:12px; font-weight:600; color:var(--accent); }
.db-hd-title { font-size:22px; font-weight:800; letter-spacing:-.025em; margin:0; color:var(--ink); line-height:1.15; }
.db-hd-sub { font-size:12px; color:var(--ink-muted); margin:4px 0 0;
             display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.db-auto { display:inline-flex; align-items:center; gap:5px; font-weight:600; color:var(--good); }
.db-hd-r { margin-left:auto; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

/* Davr tanlagich: oq "tabletka" tanlangan tugma ostiga sirpanadi */
.db-seg { position:relative; display:grid; grid-template-columns:repeat(4, 1fr); background:var(--surface-sunken);
          border-radius:11px; padding:3px; border:1px solid var(--border); }
.db-seg-pill { position:absolute; top:3px; bottom:3px; left:3px; width:calc((100% - 6px) / 4);
               border-radius:8px; background:var(--surface); box-shadow:var(--shadow);
               transform:translateX(calc(var(--i) * 100%)); transition:transform .35s var(--ease); }
.db-seg-b { position:relative; z-index:1; padding:6px 14px; border:none; background:none; border-radius:8px;
            font-size:12.5px; font-weight:600; color:var(--ink-muted); cursor:pointer; transition:color .2s; }
.db-seg-b:hover { color:var(--ink-secondary); }
.db-seg-b.on { color:var(--accent); }

.db-ib { width:36px; height:36px; border-radius:11px; border:1px solid var(--border);
         background:var(--surface); color:var(--ink-secondary); cursor:pointer;
         display:flex; align-items:center; justify-content:center; transition:.15s; }
.db-ib svg { width:16px; height:16px; }
.db-ib:hover:not(:disabled) { border-color:var(--accent); color:var(--accent); transform:translateY(-1px); }
.db-ib.on { background:var(--accent-wash); border-color:var(--accent); color:var(--accent); }
.db-ib:disabled { opacity:.5; cursor:not-allowed; }
.db-spin { animation:db-rot 1s linear infinite; }
@keyframes db-rot { to { transform:rotate(360deg) } }

/* ═══ SOZLASH PANELI ═══ */
.db-cfg { background:var(--surface); border:1px solid var(--border); border-radius:var(--r); padding:14px; }
.db-cfg-hd { display:flex; align-items:center; justify-content:space-between;
             font-size:12.5px; font-weight:700; color:var(--ink-secondary); margin-bottom:10px; }
.db-cfg-reset { border:none; background:none; font-size:12px; font-weight:600;
                color:var(--accent); cursor:pointer; }
.db-cfg-reset:hover { text-decoration:underline; }
.db-cfg-list { display:flex; flex-wrap:wrap; gap:8px; }
.db-cfg-item { display:inline-flex; align-items:center; gap:7px; padding:7px 12px;
               border:1px solid var(--border); border-radius:20px; font-size:12.5px;
               color:var(--ink-muted); cursor:pointer; transition:.15s; user-select:none; }
.db-cfg-item:hover { border-color:var(--accent); }
.db-cfg-item.on { background:var(--accent-wash); border-color:var(--accent); color:var(--accent); font-weight:600; }
.db-cfg-item input { width:14px; height:14px; accent-color:var(--accent); cursor:pointer; }
.db-drop-enter-active, .db-drop-leave-active { transition:opacity .2s, transform .2s; }
.db-drop-enter-from, .db-drop-leave-to { opacity:0; transform:translateY(-8px); }

/* ═══ BO'LIM SARLAVHASI ═══ */
.db-sec { display:flex; align-items:center; gap:10px; margin:10px 0 -2px; }
.db-sec-n { font-size:10px; font-weight:800; color:var(--accent); font-variant-numeric:tabular-nums;
            padding:2px 7px; border-radius:6px; background:var(--accent-wash); }
.db-sec-t { font-size:11.5px; font-weight:800; letter-spacing:.08em; text-transform:uppercase;
            color:var(--ink-secondary); white-space:nowrap; }
.db-sec-l { flex:1; height:1px; background:linear-gradient(90deg, var(--border), transparent);
            transform-origin:left; }
.db-sec.is-in .db-sec-l { animation:db-line-in .9s var(--ease) both .15s; }
@keyframes db-line-in { from { transform:scaleX(0) } }

/* ═══ BOSH BANNER ═══ */
.db-hero { display:grid; grid-template-columns:minmax(0,1.3fr) minmax(0,1fr); gap:12px; }
.db-hero-main { position:relative; overflow:hidden; isolation:isolate; border-radius:var(--r-lg);
                padding:18px 22px 14px; color:#fff; display:flex; flex-direction:column; min-height:250px;
                background:linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #3730a3 100%);
                box-shadow:0 18px 40px -18px rgba(55,48,163,.6); }
/* Nozik nuqtali to'r */
.db-hero-main::before { content:''; position:absolute; inset:0; z-index:-1; pointer-events:none;
  background-image:radial-gradient(rgba(255,255,255,.13) 1px, transparent 1.2px); background-size:18px 18px;
  -webkit-mask-image:linear-gradient(110deg, transparent 30%, #000 85%); mask-image:linear-gradient(110deg, transparent 30%, #000 85%); }
/* Harakatlanuvchi yumshoq dog'lar */
.db-hero-bg { position:absolute; inset:0; z-index:-2; pointer-events:none; }
.db-hero-bg i { position:absolute; border-radius:50%; filter:blur(46px); }
.db-hero-bg i:nth-child(1) { width:300px; height:300px; right:-80px; bottom:-150px; background:#6366f1; opacity:.45;
                             animation:db-blob-a 16s ease-in-out infinite alternate; }
.db-hero-bg i:nth-child(2) { width:220px; height:220px; left:35%; bottom:-140px; background:#818cf8; opacity:.28;
                             animation:db-blob-b 20s ease-in-out infinite alternate; }
.db-hero-bg i:nth-child(3) { width:180px; height:180px; left:-70px; top:-90px; background:#a5b4fc; opacity:.16;
                             animation:db-blob-c 18s ease-in-out infinite alternate; }
@keyframes db-blob-a { to { transform:translate(-70px,-40px) scale(1.15) } }
@keyframes db-blob-b { to { transform:translate(60px,-30px) scale(.9) } }
@keyframes db-blob-c { to { transform:translate(40px,30px) scale(1.2) } }

.db-hero-top { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.db-hero-badge { display:inline-flex; align-items:center; gap:7px; padding:3px 10px 3px 8px; border-radius:20px;
                 font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.07em;
                 background:rgba(255,255,255,.16); backdrop-filter:blur(6px); }
.db-hero-badge .db-live-dot { background:#6ee7b7; }
.db-hero-badge .db-live-dot::after { border-color:rgba(110,231,183,.6); }
.db-hero-date { font-size:12px; color:rgba(255,255,255,.88); }
.db-hero-clock { margin-left:auto; font-size:13px; font-weight:700; letter-spacing:.04em;
                 font-variant-numeric:tabular-nums; padding:3px 9px; border-radius:8px;
                 background:rgba(0,0,0,.18); }
.db-hero-lbl { margin-top:14px; font-size:12px; font-weight:600; color:rgba(255,255,255,.88); }
.db-hero-v { display:flex; align-items:baseline; gap:8px; font-size:clamp(28px,3vw,38px); font-weight:800;
             letter-spacing:-.03em; line-height:1.1; }
.db-hero-v small { font-size:14px; font-weight:600; color:rgba(255,255,255,.85); letter-spacing:0; }
.db-hero-cmp { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:6px;
               font-size:11.5px; color:rgba(255,255,255,.88); }
.db-hero-pill { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:20px;
                font-weight:800; font-variant-numeric:tabular-nums; background:#fff; color:#312e81; }
.db-hero-pill svg { width:11px; height:11px; }

.db-hero-chart { position:relative; margin-top:auto; padding-top:12px; }
.db-hero-chart svg { display:block; width:100%; height:66px; overflow:visible; }
.db-hero.is-in .db-hero-line { animation:db-wipe 1.6s var(--ease) backwards .2s; }
.db-hero.is-in .db-hero-area { animation:db-fadein 1s ease both .7s; }
.db-hero.is-in .db-hero-kecha { animation:db-fadein .8s ease both .1s; }
.db-hero-now { position:absolute; width:10px; height:10px; margin:-5px 0 0 -5px; border-radius:50%;
               background:#fff; box-shadow:0 0 0 3px rgba(255,255,255,.3); }
.db-hero-now::after { content:''; position:absolute; inset:-6px; border-radius:50%; border:2px solid #fff;
                      animation:db-ping 1.8s ease-out infinite; }
.db-hero-chart .db-hero-now { top:0; }
.db-hero-axis { display:flex; justify-content:space-between; margin-top:4px;
                font-size:9.5px; color:rgba(255,255,255,.75); font-variant-numeric:tabular-nums; }
.db-hero-leg { display:flex; gap:14px; margin-top:6px; font-size:10.5px; color:rgba(255,255,255,.88); }
.db-hero-leg span { display:inline-flex; align-items:center; gap:6px; }
.db-hero-leg i { width:14px; height:0; border-top:2.4px solid #fff; }
.db-hero-leg i.l2 { border-top:1.6px dashed rgba(255,255,255,.7); }

.db-hero-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.db-hs { position:relative; overflow:hidden; display:flex; flex-direction:column; gap:3px; min-width:0;
         padding:12px 13px; border:1px solid var(--border); border-radius:var(--r); background:var(--surface);
         box-shadow:var(--shadow); cursor:pointer; font:inherit; text-align:left;
         transition:transform .2s var(--ease), box-shadow .2s, border-color .2s; }
.db-hero.is-in .db-hs { animation:db-up .55s var(--ease) both; }
.db-hs::before { content:''; position:absolute; inset:auto -30% -60% auto; width:110px; height:110px; border-radius:50%;
                 background:var(--c); opacity:.07; transition:transform .4s var(--ease), opacity .3s; }
.db-hs:hover { transform:translateY(-3px); box-shadow:var(--shadow-lift);
               border-color:color-mix(in oklab, var(--c) 40%, var(--border)); }
.db-hs:hover::before { transform:scale(1.5); opacity:.12; }
.db-hs-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:5px; }
.db-hs-ic { width:30px; height:30px; border-radius:10px; display:flex; align-items:center; justify-content:center;
            background:color-mix(in oklab, var(--c) 14%, transparent); color:var(--c); }
.db-hs-ic :deep(svg) { width:15px; height:15px; }
.db-hs-go { width:14px; height:14px; color:var(--ink-muted); opacity:0; transform:translate(-4px,4px);
            transition:opacity .2s, transform .2s var(--ease); }
.db-hs:hover .db-hs-go { opacity:1; transform:none; }
.db-hs-v { font-size:19px; font-weight:800; color:var(--ink); line-height:1.1; letter-spacing:-.02em;
           font-variant-numeric:tabular-nums; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.db-hs-l { font-size:11.5px; font-weight:600; color:var(--ink-secondary); }
.db-hs-s { font-size:10px; color:var(--ink-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.db-hs-prog { display:block; height:4px; margin-top:4px; border-radius:2px; background:var(--surface-sunken); overflow:hidden; }
.db-hs-prog i { display:block; height:100%; border-radius:0 2px 2px 0; background:var(--c); transition:width .8s var(--ease); }

/* ═══ KPI KARTALAR ═══ */
.db-kpis { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:10px; }
.db-kpi { position:relative; overflow:hidden; display:flex; flex-direction:column; gap:2px;
          padding:13px 14px 12px; border:1px solid var(--border); border-radius:var(--r);
          background:var(--surface); box-shadow:var(--shadow); cursor:pointer;
          text-align:left; font:inherit; --tone:var(--accent);
          --ink-muted:var(--tinted-muted);
          animation:db-up .5s var(--ease) both;
          transition:transform .2s var(--ease), box-shadow .2s, border-color .2s; }
.db-kpi:hover { transform:translateY(-4px); box-shadow:var(--shadow-lift);
                border-color:color-mix(in oklab, var(--tone) 42%, var(--border)); }
.db-kpi::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px;
                  background:var(--tone); opacity:.85; }
/* Hover'da kartadan yorug'lik o'tadi */
.db-kpi::after { content:''; position:absolute; top:0; bottom:0; left:-60%; width:40%; z-index:4; pointer-events:none;
                 background:linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent);
                 transform:skewX(-18deg); opacity:0; }
.db-kpi:hover::after { animation:db-shine .8s ease; }
@keyframes db-shine { 0% { left:-60%; opacity:1 } 100% { left:130%; opacity:1 } }
.db-kpi--hero { border-color:color-mix(in oklab, var(--tone) 30%, var(--border)); }
.db-kpi--hero::before { width:4px; }
.db-kpi--hero .db-kpi-val { font-size:clamp(21px,1.75vw,26px); }

.db-t-1 { --tone:var(--good);     background:linear-gradient(155deg, color-mix(in oklab, var(--good) 7%, var(--surface)), var(--surface) 68%); }
.db-t-2 { --tone:var(--accent);   background:linear-gradient(155deg, color-mix(in oklab, var(--accent) 12%, var(--surface)), var(--surface) 72%); }
.db-t-3 { --tone:var(--s2);       background:linear-gradient(155deg, color-mix(in oklab, var(--s2) 7%, var(--surface)), var(--surface) 68%); }
.db-t-4 { --tone:var(--s6);       background:linear-gradient(155deg, color-mix(in oklab, var(--s6) 7%, var(--surface)), var(--surface) 68%); }
.db-t-5 { --tone:var(--s3);       background:linear-gradient(155deg, color-mix(in oklab, var(--s3) 7%, var(--surface)), var(--surface) 68%); }
.db-t-6 { --tone:var(--s6);       background:linear-gradient(155deg, color-mix(in oklab, var(--s6) 7%, var(--surface)), var(--surface) 68%); }

.db-kpi-ic { position:relative; z-index:3; margin-bottom:7px;
             width:28px; height:28px; border-radius:9px; display:flex;
             align-items:center; justify-content:center;
             background:color-mix(in oklab, var(--tone) 14%, transparent); color:var(--tone);
             transition:transform .3s var(--ease); }
.db-kpi:hover .db-kpi-ic { transform:rotate(-8deg) scale(1.08); }
.db-kpi-ic :deep(svg) { width:15px; height:15px; }
.db-kpi .db-trend { position:absolute; right:11px; top:13px; z-index:3;
                    font-size:10px; padding:2px 6px; }
.db-kpi-val { font-size:clamp(19px,1.5vw,23px); font-weight:800; color:var(--ink);
              line-height:1.1; letter-spacing:-.022em; font-variant-numeric:tabular-nums;
              position:relative; z-index:2;
              overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.db-kpi-lbl { font-size:11.5px; font-weight:600; color:var(--ink-secondary);
              position:relative; z-index:2; white-space:nowrap;
              overflow:hidden; text-overflow:ellipsis; }
.db-kpi-note { font-size:10px; color:var(--ink-muted); position:relative; z-index:2;
               line-height:1.3; white-space:nowrap;
               overflow:hidden; text-overflow:ellipsis; }
.db-spark { position:absolute; left:0; right:0; bottom:0; z-index:1;
            width:100%; height:30px; opacity:.34; pointer-events:none;
            -webkit-mask-image:linear-gradient(180deg, transparent 0%, transparent 42%, #000 100%);
                    mask-image:linear-gradient(180deg, transparent 0%, transparent 42%, #000 100%); }
.db-spark-l { animation:db-wipe 1.4s var(--ease) backwards .3s; }
@keyframes db-up { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }

/* ═══ UMUMIY ELEMENTLAR ═══ */
.db-row { display:grid; gap:12px; }
.db-row--main { grid-template-columns:minmax(0,1.85fr) minmax(0,1fr); }
.db-row--2 { grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); }
.db-row--3 { grid-template-columns:repeat(auto-fit,minmax(290px,1fr)); }

.db-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r);
           padding:16px; display:flex; flex-direction:column; gap:13px;
           box-shadow:var(--shadow); transition:box-shadow .2s, border-color .2s, opacity .2s; min-width:0; }
.db-card:hover { box-shadow:var(--shadow-lift); border-color:color-mix(in oklab, var(--accent) 18%, var(--border)); }

.db-card-hd { display:flex; align-items:center; gap:9px; flex-wrap:wrap; min-height:26px; }
.db-card-t { display:flex; align-items:center; gap:9px; font-size:13.5px; font-weight:800;
             color:var(--ink); margin:0; letter-spacing:-.01em; }
.db-card-t > svg { width:26px; height:26px; padding:6px; box-sizing:border-box; border-radius:8px;
                   background:var(--accent-wash); color:var(--accent); flex-shrink:0;
                   transition:transform .35s var(--ease); }
.db-card:hover .db-card-t > svg { transform:rotate(-6deg) scale(1.06); }
.db-card-t.db-crit > svg { background:var(--critical-wash); color:var(--critical); }
.db-card-sub { font-size:11px; color:var(--ink-muted); white-space:nowrap; }
.db-card-hd-r { margin-left:auto; display:flex; align-items:center; gap:8px; }
.db-link { margin-left:auto; border:none; background:none; font-size:11.5px; font-weight:600;
           color:var(--accent); cursor:pointer; padding:4px 0; display:inline-flex; align-items:center; gap:3px; }
.db-link::after { content:'→'; transition:transform .2s var(--ease); }
.db-link:hover::after { transform:translateX(3px); }

.db-live { display:inline-flex; align-items:center; gap:6px; font-size:10px; font-weight:800;
           text-transform:uppercase; letter-spacing:.06em; color:var(--good);
           padding:3px 8px 3px 7px; border-radius:20px; background:var(--good-wash); }

.db-chips { display:flex; gap:3px; background:var(--surface-sunken); border-radius:8px; padding:2px; }
.db-chips--r { margin-left:auto; }
.db-chip { padding:4px 10px; border:none; background:none; border-radius:6px;
           font-size:11px; font-weight:600; color:var(--ink-muted); cursor:pointer; transition:.14s; }
.db-chip.on { background:var(--surface); color:var(--accent); box-shadow:var(--shadow); }

.db-trend { display:inline-flex; align-items:center; gap:3px; font-size:11px; font-weight:700;
            padding:3px 8px; border-radius:20px; font-variant-numeric:tabular-nums; }
.db-trend svg { width:10px; height:10px; }
.db-trend.is-up   { background:var(--good-wash);     color:var(--good); }
.db-trend.is-down { background:var(--critical-wash); color:var(--critical); }

.db-badge { font-size:10.5px; font-weight:800; padding:2px 8px; border-radius:20px; margin-left:auto; }
.db-badge--crit { background:var(--critical-wash); color:var(--critical); animation:db-throb 2.4s ease-in-out infinite; }
@keyframes db-throb { 50% { box-shadow:0 0 0 4px var(--critical-wash) } }

.db-tag { font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; white-space:nowrap; }
.db-tag.is-ok      { background:var(--good-wash);     color:var(--good); }
.db-tag.is-warn    { background:var(--warning-wash);  color:var(--warning); }
.db-tag.is-crit    { background:var(--critical-wash); color:var(--critical); }
.db-tag.is-neutral { background:var(--surface-sunken); color:var(--ink-muted); }

/* Holat belgisi: rang nuqtada, matn — matn rangida */
.db-chipdot { display:inline-flex; align-items:center; gap:6px; flex-shrink:0;
              font-size:10.5px; font-weight:700; color:var(--ink-secondary);
              padding:2px 8px 2px 7px; border-radius:20px; white-space:nowrap;
              background:var(--surface-sunken); }
.db-chipdot i { width:7px; height:7px; border-radius:50%; background:var(--c); flex-shrink:0; }

.db-ok   { color:var(--good) !important; }
.db-bad  { color:var(--critical) !important; }
.db-dot  { width:8px; height:8px; border-radius:50%; flex-shrink:0; display:inline-block; }
.db-dot--crit { background:var(--critical); }

.db-live-dot { width:7px; height:7px; border-radius:50%; background:var(--good);
               position:relative; flex-shrink:0; display:inline-block; }
.db-live-dot::after { content:''; position:absolute; inset:-4px; border-radius:50%;
                      border:2px solid var(--good-wash); animation:db-ping 1.7s ease-out infinite; }
.db-live-dot--sm { width:6px; height:6px; }
@keyframes db-ping { 0% { transform:scale(.7); opacity:1 } 100% { transform:scale(1.6); opacity:0 } }

.db-flash { animation:db-flash 900ms ease; }
@keyframes db-flash { 0%,100% { color:var(--ink) } 25% { color:var(--accent) } }

.db-empty { display:flex; flex-direction:column; align-items:center; justify-content:center;
            gap:9px; padding:38px 16px; color:var(--ink-muted); font-size:12.5px; text-align:center; flex:1; }
.db-empty svg { width:28px; height:28px; opacity:.5; }
.db-empty p { margin:0; }
.db-empty--sm { padding:24px 12px; }

.db-nothing { display:flex; flex-direction:column; align-items:center; gap:12px;
              padding:60px 20px; color:var(--ink-muted); font-size:13px; }
.db-nothing svg { width:34px; height:34px; opacity:.5; }
.db-btn { padding:8px 18px; border:1px solid var(--border); border-radius:9px;
          background:var(--surface); font-size:12.5px; font-weight:600;
          color:var(--accent); cursor:pointer; }
.db-btn:hover { background:var(--accent-wash); border-color:var(--accent); }

/* ═══ DISTRIBUTSIYA OQIMI ═══ */
.db-flow { gap:16px; }
.db-flow-steps { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:18px; }
.db-step { position:relative; display:flex; flex-direction:column; gap:3px; min-width:0;
           padding:13px 14px 12px; border:1px solid var(--border); border-radius:12px;
           background:linear-gradient(180deg, color-mix(in oklab, var(--c) 10%, var(--surface)), var(--surface) 72%);
           cursor:pointer; font:inherit; text-align:left; overflow:visible;
           transition:transform .2s var(--ease), box-shadow .2s, border-color .2s; }
.db-flow.is-in .db-step { animation:db-up .55s var(--ease) both; }
.db-step::before { content:''; position:absolute; left:12px; right:12px; top:-1px; height:3px;
                   border-radius:0 0 3px 3px; background:var(--c); transform-origin:left; }
.db-flow.is-in .db-step::before { animation:db-line-in .7s var(--ease) both .3s; }
.db-step:hover, .db-step.on { transform:translateY(-3px); box-shadow:var(--shadow-lift);
                              border-color:color-mix(in oklab, var(--c) 45%, var(--border)); }
/* Bosqichlar orasidagi "oqim" — harakatlanuvchi nuqtalar va strelka */
.db-step + .db-step::after { content:''; position:absolute; top:50%; left:-17px; width:16px; height:2px;
  background:radial-gradient(circle, var(--accent) 1px, transparent 1.5px) 0 50% / 5px 2px repeat-x;
  opacity:.7; animation:db-oqim .7s linear infinite; pointer-events:none; }
@keyframes db-oqim { to { background-position:5px 50% } }
.db-step-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
.db-step-ic { width:30px; height:30px; border-radius:10px; display:flex; align-items:center; justify-content:center;
              background:color-mix(in oklab, var(--c) 18%, transparent); color:var(--ink-secondary);
              transition:transform .3s var(--ease); }
.db-step:hover .db-step-ic { transform:scale(1.1) rotate(-6deg); }
.db-step-ic :deep(svg) { width:15px; height:15px; }
.db-step-no { font-size:10px; font-weight:800; color:var(--ink-muted); font-variant-numeric:tabular-nums; }
.db-step-lbl { font-size:11.5px; font-weight:600; color:var(--ink-secondary);
               white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.db-step-v { font-size:24px; font-weight:800; color:var(--ink); line-height:1.1;
             letter-spacing:-.025em; font-variant-numeric:tabular-nums; }
.db-step-s { font-size:11px; color:var(--ink-muted); font-variant-numeric:tabular-nums;
             white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.db-step--done .db-step-ic { color:var(--good); }
/* "Yo'lda" bosqichida yuk mashinasi yengil chayqaladi */
.db-step:nth-child(4) .db-step-ic :deep(svg) { animation:db-bob 1.6s ease-in-out infinite; }
@keyframes db-bob { 50% { transform:translateX(2px) translateY(-1px) } }

.db-flow-dist { display:flex; flex-direction:column; gap:7px; }
.db-flow-dist-hd { display:flex; align-items:center; justify-content:space-between; gap:10px;
                   font-size:11.5px; color:var(--ink-muted); }
.db-flow-dist-hd b { color:var(--ink); font-variant-numeric:tabular-nums; }
.db-flow-bar { position:relative; display:flex; gap:2px; height:10px; overflow:hidden; border-radius:4px; }
/* Oqim bo'ylab o'tadigan yorug'lik — "harakat" hissi */
.db-flow-bar::after { content:''; position:absolute; top:0; bottom:0; left:-30%; width:30%; pointer-events:none;
                      background:linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent);
                      animation:db-flow-glint 2.8s ease-in-out infinite 1s; }
@keyframes db-flow-glint { to { left:110% } }
.db-flow-bar--empty { background:var(--surface-sunken); }
.db-flow-bar--empty::after { display:none; }
.db-flow-seg { display:block; min-width:4px; height:100%; border-radius:2px; cursor:pointer;
               transition:opacity .15s, flex-grow .6s var(--ease); transform-origin:left; }
.db-flow.is-in .db-flow-seg { animation:db-grow-x .9s var(--ease) both .2s; }
.db-flow-seg:first-child { border-radius:4px 2px 2px 4px; }
.db-flow-seg:last-child  { border-radius:2px 4px 4px 2px; }
.db-flow-seg.dim { opacity:.3; }

.db-flow-ft { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; }
.db-metric { display:flex; align-items:center; gap:10px; padding:9px 11px; min-width:0;
             border-radius:10px; background:var(--surface-sunken); border:1px solid transparent;
             font:inherit; text-align:left; color:inherit; }
button.db-metric { cursor:pointer; transition:border-color .15s, background .15s, transform .2s var(--ease); }
button.db-metric:hover { border-color:var(--border); transform:translateY(-1px);
                         background:color-mix(in oklab, var(--surface-sunken) 60%, var(--surface)); }
.db-metric-ic { width:30px; height:30px; border-radius:9px; flex-shrink:0; display:flex;
                align-items:center; justify-content:center; background:var(--surface); color:var(--ink-muted); }
.db-metric-ic :deep(svg) { width:14px; height:14px; }
.db-metric-ic--ring { background:none; }
.db-metric-ic--ring svg { width:30px; height:30px; }
.db-mring { transition:stroke-dashoffset .8s var(--ease); }
.db-flow.is-in .db-mring { animation:db-ring-in 1.3s var(--ease) both .4s; }
.db-metric.is-crit .db-metric-ic { background:var(--critical-wash); color:var(--critical); }
.db-metric.is-warn .db-metric-ic { background:var(--warning-wash);  color:var(--warning); }
.db-metric.is-ok   .db-metric-ic { background:var(--good-wash);     color:var(--good); }
.db-metric-b { min-width:0; display:block; }
.db-metric-l { display:block; font-size:10.5px; color:var(--ink-muted); white-space:nowrap;
               overflow:hidden; text-overflow:ellipsis; }
.db-metric-v { display:block; font-size:13.5px; font-weight:800; color:var(--ink);
               font-variant-numeric:tabular-nums; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.db-metric-v small { font-size:11px; font-weight:600; color:var(--ink-muted); }
.db-metric.is-crit .db-metric-v { color:var(--critical); }

/* ═══ GRAFIK ═══ */
.db-leg { display:flex; gap:16px; flex-wrap:wrap; margin-top:-4px; }
.db-leg-i { display:inline-flex; align-items:center; gap:7px; font-size:11px; color:var(--ink-muted); }
.db-leg-i b { color:var(--ink); font-variant-numeric:tabular-nums; }
.db-leg-cur  { width:16px; height:0; border-top:2.4px solid var(--accent); border-radius:2px; }
.db-leg-prev { width:16px; height:0; border-top:1.6px dashed var(--neutral-mark); }

.db-chart { position:relative; }
.db-chart-svg { width:100%; height:220px; display:block; overflow:visible; }
.db-ax { font-size:9px; fill:var(--ink-muted); font-variant-numeric:tabular-nums; }
/* Chiziq chapdan o'ngga "artib" ochiladi. pathLength + stroke-dasharray
   usuli vector-effect="non-scaling-stroke" bilan Chrome'da chiziqni
   oxirigacha chizmaydi, shuning uchun clip-path ishlatiladi. */
.is-in .db-line { animation:db-wipe 1.4s var(--ease) backwards; }
@keyframes db-wipe {
  from { clip-path:inset(-12px 100% -12px -12px) }
  to   { clip-path:inset(-12px -12px -12px -12px) }
}
.is-in .db-area { animation:db-fadein .9s ease both .5s; }
.is-in .db-prev { animation:db-fadein .9s ease both .2s; }
@keyframes db-fadein { from { opacity:0 } to { opacity:1 } }
.db-dot-mk { position:absolute; width:10px; height:10px; margin:-5px 0 0 -5px; border-radius:50%;
             background:var(--accent); box-shadow:0 0 0 2px var(--surface); pointer-events:none; }
.db-dot-mk--prev { width:8px; height:8px; margin:-4px 0 0 -4px; background:var(--neutral-mark); }
.db-dot-mk--pulse::after { content:''; position:absolute; inset:-5px; border-radius:50%;
                           border:2px solid var(--accent); animation:db-ping 1.8s ease-out infinite; }

.db-tip { position:absolute; top:6px; background:var(--surface); border:1px solid var(--border);
          border-radius:10px; padding:9px 11px; box-shadow:var(--shadow-lift);
          font-size:11.5px; pointer-events:none; z-index:5; min-width:170px;
          animation:db-tip-in .15s ease; }
@keyframes db-tip-in { from { opacity:0; transform:translateY(4px) } }
.db-tip-t { font-weight:800; color:var(--ink); margin-bottom:6px; font-size:12px; }
.db-tip-r { display:flex; align-items:center; gap:7px; color:var(--ink-muted); padding:2px 0; }
.db-tip-r i { width:8px; height:8px; border-radius:2px; flex-shrink:0; }
.db-tip-r b { margin-left:auto; color:var(--ink); font-variant-numeric:tabular-nums; }

/* ═══ DONUT ═══ */
.db-donut-wrap { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.db-donut { position:relative; width:146px; height:146px; flex-shrink:0; }
.db-donut svg { width:100%; height:100%; }
.db-donut-seg { cursor:pointer; transition:stroke-width .18s, opacity .18s; }
.db-sweep { stroke-dashoffset:0; }
.is-in .db-sweep { animation:db-ring-in 1.3s cubic-bezier(.65,0,.35,1) both .15s; }
@keyframes db-ring-in { from { stroke-dashoffset:var(--full) } }
.db-donut-c { position:absolute; inset:24px; display:flex; flex-direction:column;
              align-items:center; justify-content:center; pointer-events:none; text-align:center; }
.db-donut-v { font-size:15px; font-weight:800; color:var(--ink); line-height:1.1; white-space:nowrap;
              letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.db-donut-l { font-size:9.5px; color:var(--ink-muted); margin-top:2px; text-align:center;
              overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%; }

.db-legend { flex:1; min-width:150px; display:flex; flex-direction:column; gap:2px; }
.db-legend-r { display:flex; align-items:center; gap:8px; padding:5px 7px; border-radius:7px;
               border:none; background:none; cursor:pointer; font:inherit;
               font-size:12px; color:var(--ink-secondary); transition:background .14s; text-align:left; }
.db-legend-r:hover, .db-legend-r.on { background:var(--surface-sunken); }
.db-legend-r i { width:9px; height:9px; border-radius:3px; flex-shrink:0; transition:transform .2s var(--ease); }
.db-legend-r.on i { transform:scale(1.35); }
.db-legend-n { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.db-legend-f { font-size:10.5px; font-weight:800; color:var(--ink-muted);
               background:var(--surface-sunken); border-radius:6px; padding:2px 7px;
               font-variant-numeric:tabular-nums; }
.db-legend-r.on .db-legend-f { background:var(--accent-wash); color:var(--accent); }

/* ═══ GORIZONTAL USTUNLAR (hududlar) ═══ */
.db-bars { display:flex; flex-direction:column; gap:4px; }
.db-bars-r { display:flex; flex-direction:column; gap:5px; padding:7px 8px; border-radius:9px;
             border:none; background:none; cursor:pointer; font:inherit; text-align:left;
             transition:background .14s; }
.db-bars-r:hover { background:var(--surface-sunken); }
.db-bars-top { display:flex; align-items:baseline; gap:10px; }
.db-bars-n { flex:1; min-width:0; font-size:12.5px; font-weight:600; color:var(--ink);
             overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.db-bars-v { font-size:12.5px; font-weight:800; color:var(--ink); font-variant-numeric:tabular-nums; }
.db-bars-track { height:7px; border-radius:4px; background:var(--surface-sunken); overflow:hidden; }
.db-bars-fill { display:block; height:100%; border-radius:0 4px 4px 0; transform-origin:left;
                background:linear-gradient(90deg, color-mix(in oklab, var(--accent) 70%, var(--surface)), var(--accent));
                transition:width .6s var(--ease); }
.is-in .db-bars-fill { animation:db-grow-x .9s var(--ease) both; }
.db-bars-s { font-size:10.5px; color:var(--ink-muted); }

/* ═══ STACKED BAR (to'lov, kassa, ombor) ═══ */
.db-stack { display:flex; gap:2px; height:10px; }
.db-stack--lg { height:12px; }
.db-stack-seg { display:block; min-width:4px; height:100%; border-radius:2px;
                transition:opacity .15s, flex-grow .6s var(--ease); transform-origin:left; }
.is-in .db-stack-seg { animation:db-grow-x .9s var(--ease) both .15s; }
.db-stack-seg:first-child { border-radius:4px 2px 2px 4px; }
.db-stack-seg:last-child  { border-radius:2px 4px 4px 2px; }
.db-stack-seg:only-child  { border-radius:4px; }
.db-stack-seg.dim { opacity:.3; }
@keyframes db-grow-x { from { transform:scaleX(0) } }

.db-pay { display:flex; flex-direction:column; gap:12px; }
.db-pay-v { font-size:23px; font-weight:800; color:var(--ink); line-height:1.1;
            letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.db-pay-l { display:block; font-size:11px; color:var(--ink-muted); margin-top:2px; }
.db-pay-list { display:flex; flex-direction:column; gap:2px; }
.db-pay-r { display:flex; align-items:center; gap:9px; padding:6px 7px; border-radius:7px;
            font-size:12px; color:var(--ink-secondary); transition:background .14s; }
.db-pay-r.on { background:var(--surface-sunken); }
.db-pay-r i { width:9px; height:9px; border-radius:3px; flex-shrink:0; }
.db-pay-n { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.db-pay-n small { margin-left:6px; font-size:10.5px; color:var(--ink-muted); }
.db-pay-r b { color:var(--ink); font-variant-numeric:tabular-nums; }

/* ═══ SAVDO REJASI ═══ */
.db-goal { display:flex; align-items:center; gap:16px; flex-wrap:wrap; flex:1; }
.db-goal-wrap { position:relative; width:128px; height:128px; flex-shrink:0; }
.db-goal-ring { width:100%; height:100%; }
.db-ring { transition:stroke-dashoffset .9s var(--ease), stroke .3s; }
.is-in .db-ring { animation:db-ring-in 1.5s var(--ease) both .2s; }
.db-goal-c { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center;
             justify-content:center; pointer-events:none; }
.db-goal-c b { font-size:21px; font-weight:800; color:var(--ink); letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.db-goal-c > span { font-size:9.5px; color:var(--ink-muted); }
.db-goal-rows { flex:1; min-width:120px; display:flex; flex-direction:column; gap:8px; }
.db-goal-row { display:flex; align-items:center; justify-content:space-between;
               font-size:12px; color:var(--ink-muted); padding-bottom:7px;
               border-bottom:1px solid var(--border); }
.db-goal-row:last-child { border-bottom:none; padding-bottom:0; }
.db-goal-row b { color:var(--ink); font-variant-numeric:tabular-nums; }

/* ═══ DEBITORLIK / OMBOR ═══ */
.db-debt, .db-wh { display:flex; flex-direction:column; gap:12px; }
.db-debt-v { font-size:23px; font-weight:800; color:var(--ink); line-height:1.1;
             letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.db-debt-l { font-size:11px; color:var(--ink-muted); margin-top:2px; }
.db-debt-bar { height:8px; background:var(--surface-sunken); border-radius:4px; overflow:hidden; }
.db-debt-fill { height:100%; background:var(--critical); border-radius:0 4px 4px 0; transform-origin:left;
                transition:width .6s var(--ease); }
.is-in .db-debt-fill { animation:db-grow-x 1s var(--ease) both .2s; }
.db-debt-note { display:flex; align-items:center; gap:7px; font-size:11.5px; color:var(--ink-muted); }
.db-debt-note b { color:var(--critical); }
.db-debt-pct { margin-left:auto; font-weight:800; color:var(--critical); }
.db-debt-top { display:flex; flex-direction:column; gap:2px; border-top:1px solid var(--border); padding-top:10px; }
.db-debt-top-hd { font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.06em;
                  color:var(--ink-muted); margin-bottom:4px; }
.db-debt-r { display:grid; grid-template-columns:minmax(0,1fr) 90px auto; align-items:center; gap:10px;
             padding:6px 6px; border-radius:8px; border:none; background:none; cursor:pointer; font:inherit;
             text-align:left; transition:background .14s; }
.db-debt-r:hover { background:var(--surface-sunken); }
.db-debt-r-n { font-size:12px; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.db-debt-r-bar { height:5px; border-radius:3px; background:var(--surface-sunken); overflow:hidden; }
.db-debt-r-bar i { display:block; height:100%; border-radius:0 3px 3px 0; background:var(--critical); opacity:.75;
                   transform-origin:left; }
.is-in .db-debt-r-bar i { animation:db-grow-x .9s var(--ease) both .35s; }
.db-debt-r b { font-size:12px; color:var(--ink); font-variant-numeric:tabular-nums; }

.db-wh-list { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; }
.db-wh-r { display:flex; flex-direction:column; align-items:flex-start; gap:3px; padding:8px 9px;
           border-radius:9px; border:1px solid var(--border); background:var(--surface);
           cursor:pointer; font:inherit; font-size:10.5px; color:var(--ink-muted); text-align:left;
           transition:border-color .15s, transform .2s var(--ease); min-width:0; }
.db-wh-r:hover { border-color:color-mix(in oklab, var(--c) 45%, var(--border)); transform:translateY(-2px); }
.db-wh-r b { font-size:16px; font-weight:800; color:var(--ink); font-variant-numeric:tabular-nums; }
.db-wh-ic { color:var(--c); display:flex; }
.db-wh-ic :deep(svg) { width:14px; height:14px; }

/* ═══ OGOHLANTIRISH ═══ */
.db-alerts { display:flex; flex-direction:column; gap:7px; max-height:300px; overflow-y:auto; }
.db-alert { display:flex; align-items:center; gap:10px; padding:10px 12px;
            border:1px solid var(--border); border-radius:10px; background:var(--surface);
            cursor:pointer; font:inherit; text-align:left; transition:transform .2s var(--ease), box-shadow .15s; }
.is-in .db-alert { animation:db-slide .5s var(--ease) both; }
.is-in .db-alert:nth-child(2) { animation-delay:.06s; } .is-in .db-alert:nth-child(3) { animation-delay:.12s; }
.is-in .db-alert:nth-child(4) { animation-delay:.18s; } .is-in .db-alert:nth-child(5) { animation-delay:.24s; }
@keyframes db-slide { from { opacity:0; transform:translateX(-12px) } }
.db-alert:hover { transform:translateX(3px); box-shadow:var(--shadow); }
.db-alert.is-crit { border-color:color-mix(in oklab,var(--critical) 34%,var(--border));
                    background:color-mix(in oklab,var(--critical) 4%,var(--surface)); }
.db-alert.is-warn { border-color:color-mix(in oklab,var(--warning) 34%,var(--border));
                    background:color-mix(in oklab,var(--warning) 4%,var(--surface)); }
.db-alert-ic { width:30px; height:30px; border-radius:9px; flex-shrink:0; display:flex;
               align-items:center; justify-content:center;
               background:var(--surface-sunken); color:var(--ink-muted); }
.db-alert-ic :deep(svg) { width:15px; height:15px; }
.db-alert.is-crit .db-alert-ic { background:var(--critical-wash); color:var(--critical); }
.db-alert.is-warn .db-alert-ic { background:var(--warning-wash);  color:var(--warning); }
.db-alert-b { flex:1; min-width:0; display:block; }
.db-alert-t { display:block; font-size:12.5px; font-weight:700; color:var(--ink);
              overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.db-alert-s { display:block; font-size:10.5px; color:var(--ink-muted); margin-top:1px;
              overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.db-alert-v { font-size:12.5px; font-weight:800; color:var(--ink); white-space:nowrap;
              font-variant-numeric:tabular-nums; }
.db-alert.is-crit .db-alert-v { color:var(--critical); }

/* ═══ RO'YXAT ═══ */
.db-list { display:flex; flex-direction:column; gap:1px; }
.db-list-r { display:flex; align-items:center; gap:10px; padding:8px 8px; border-radius:9px;
             border:none; background:none; cursor:pointer; font:inherit; text-align:left;
             transition:background .14s, transform .2s var(--ease); min-width:0; }
.db-list-r:hover { background:var(--surface-sunken); transform:translateX(2px); }
.is-in .db-list-r--in { animation:db-slide .5s var(--ease) both; }
.db-list-b { flex:1; min-width:0; display:block; }
.db-list-t { display:block; font-size:12.5px; font-weight:600; color:var(--ink);
             overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.db-list-s { display:block; font-size:10.5px; color:var(--ink-muted); margin-top:1px;
             overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.db-list-v { font-size:12.5px; font-weight:800; color:var(--ink); white-space:nowrap;
             font-variant-numeric:tabular-nums; }
.db-list-vv { display:flex; flex-direction:column; align-items:flex-end; min-width:54px; }
.db-list-cap { font-size:9.5px; color:var(--ink-muted); }

/* Ro'yxat qayta saralanganda qatorlar silliq siljiydi */
.db-sort-move { transition:transform .45s var(--ease); }
.db-feed-enter-active { transition:opacity .4s, transform .4s var(--ease); }
.db-feed-enter-from { opacity:0; transform:translateY(-10px); }
.db-feed-move { transition:transform .4s var(--ease); }
.db-feed-leave-active { display:none; }

.db-rank { width:20px; height:20px; border-radius:6px; flex-shrink:0;
           display:flex; align-items:center; justify-content:center;
           font-size:10.5px; font-weight:800;
           background:var(--surface-sunken); color:var(--ink-muted); }
.db-rank--1 { background:var(--warning-wash);  color:var(--warning); }
.db-rank--2 { background:var(--surface-sunken); color:var(--ink-secondary); }
.db-rank--3 { background:color-mix(in oklab,var(--s4) 14%,transparent); color:var(--s4); }

.db-av { position:relative; width:30px; height:30px; border-radius:10px; flex-shrink:0; color:var(--on-tone);
         font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; }
.db-av--soft { background:var(--accent-wash); color:var(--accent); }
.db-av-live { position:absolute; right:-2px; top:-2px; width:9px; height:9px; border-radius:50%;
              background:var(--o4); box-shadow:0 0 0 2px var(--surface); }
.db-av-live::after { content:''; position:absolute; inset:-3px; border-radius:50%; border:2px solid var(--o3);
                     animation:db-ping 1.8s ease-out infinite; }

.db-feed-ic { width:30px; height:30px; border-radius:10px; flex-shrink:0; position:relative;
              display:flex; align-items:center; justify-content:center;
              background:var(--surface-sunken); color:var(--ink-muted); }
.db-feed-ic :deep(svg) { width:14px; height:14px; }
.db-feed-ic::after { content:''; position:absolute; right:-2px; bottom:-2px; width:9px; height:9px;
                     border-radius:50%; background:var(--c); box-shadow:0 0 0 2px var(--surface); }

.db-dv { display:flex; align-items:center; gap:7px; flex-shrink:0; }
.db-dv-n { font-size:11px; font-weight:700; color:var(--ink-secondary); min-width:30px;
           font-variant-numeric:tabular-nums; }
.db-dv-ft { margin-top:auto; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1px;
            border-radius:10px; overflow:hidden; background:var(--border); border:1px solid var(--border); }
.db-dv-ft-i { display:flex; flex-direction:column; gap:2px; padding:9px 11px; background:var(--surface-sunken);
              font-size:10.5px; color:var(--ink-muted); min-width:0; }
.db-dv-ft-i b { font-size:12.5px; color:var(--ink); font-variant-numeric:tabular-nums;
                white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.db-mini-bar { width:56px; height:6px; background:var(--surface-sunken); border-radius:3px;
               overflow:hidden; flex-shrink:0; }
.db-mini-bar--w { width:72px; }
.db-mini-fill { display:block; height:100%; background:var(--accent); border-radius:0 3px 3px 0;
                transform-origin:left; transition:width .6s var(--ease); }
.is-in .db-mini-fill { animation:db-grow-x .9s var(--ease) both .2s; }

/* ═══ KASSA ═══ */
.db-cash { display:flex; flex-direction:column; gap:12px; flex:1; }
.db-cash-v { font-size:23px; font-weight:800; color:var(--ink); line-height:1.1;
             letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.db-cash-l { display:block; font-size:11px; color:var(--ink-muted); margin-top:2px; }
.db-cash-split { display:flex; flex-direction:column; gap:6px; }
.db-cash-item { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--ink-muted); }
.db-cash-item b { margin-left:auto; color:var(--ink); font-variant-numeric:tabular-nums; }
.db-cash-item em { font-style:normal; font-size:10.5px; font-weight:800; min-width:34px; text-align:right;
                   color:var(--ink-muted); font-variant-numeric:tabular-nums; }
.db-cash-ft { display:flex; align-items:center; justify-content:space-between; gap:10px;
              padding:9px 11px; border-radius:9px; background:var(--surface-sunken);
              font-size:11.5px; color:var(--ink-muted); border:1px solid transparent; font-family:inherit; }
.db-cash-split + .db-cash-ft { margin-top:auto; }
.db-cash-ft b { color:var(--ink); font-size:12.5px; font-variant-numeric:tabular-nums; }
.db-cash-ft--btn { cursor:pointer; text-align:left; transition:border-color .15s; width:100%; margin-top:auto; }
.db-cash-ft--btn:hover { border-color:var(--border); }

/* ═══ MOSLASHUV ═══ */
@media (max-width:1180px) {
  .db-hero { grid-template-columns:minmax(0,1fr); }
  .db-kpis { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .db-flow-ft { grid-template-columns:repeat(3,minmax(0,1fr)); }
}
@media (max-width:1080px) { .db-row--main { grid-template-columns:minmax(0,1fr); } }
@media (max-width:960px) {
  .db-flow-steps { grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
  .db-step + .db-step::after { display:none; }
}
@media (max-width:760px) {
  .db-hd-r { width:100%; }
  .db-seg { flex:1; }
  .db-card-sub { display:none; }
}
@media (max-width:620px) {
  .db-kpis, .db-hero-stats { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .db-flow-steps, .db-flow-ft { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .db-row--2, .db-row--3 { grid-template-columns:minmax(0,1fr); }
  .db-dv .db-mini-bar { display:none; }
}

@media (prefers-reduced-motion: reduce) {
  .db-rv { opacity:1; transform:none; }
  .db *, .db *::before, .db *::after { animation:none !important; transition-duration:.01ms !important; }
}
</style>
