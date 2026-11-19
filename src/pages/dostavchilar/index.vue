<template>
  <div class="dp">

    <!-- ═══ HEADER ═══ -->
    <div class="dp-hd">
      <div>
        <h1 class="dp-title">Dostavchilar</h1>
        <p class="dp-sub">Buyurtma yetkazuvchi haydovchilar, marshrut va zakazlar tarixi</p>
      </div>
      <button class="dp-new-btn" @click="openCreate()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Yangi dostavchi
      </button>
    </div>

    <!-- ═══ LAYOUT ═══ -->
    <div class="dp-layout" :class="{ split: !!selected }">

      <!-- LIST -->
      <div class="dp-list-wrap">
        <div class="dp-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="search" placeholder="Dostavchi qidirish..." class="dp-si"/>
        </div>

        <div v-if="loading" class="dp-list">
          <div class="dp-skel" v-for="i in 4" :key="i"/>
        </div>
        <div v-else-if="!filtered.length" class="dp-empty">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          <p>Dostavchi yo'q</p>
          <button class="dp-new-btn dp-new-btn--sm" @click="openCreate()">Birinchi dostavchini qo'shing</button>
        </div>
        <div v-else class="dp-list">
          <div
            v-for="d in filtered" :key="d.id"
            class="dp-card" :class="{ on: selected?.id === d.id, off: !d.faol }"
            @click="selectRow(d)"
          >
            <div class="dp-card-av" :style="{ background: avatarColor(d.id) }">{{ d.ism[0].toUpperCase() }}</div>
            <div class="dp-card-body">
              <div class="dp-card-name">
                {{ d.ism }}
                <span v-if="!d.faol" class="dp-off-tag">Nofaol</span>
              </div>
              <div class="dp-card-meta">
                <span>{{ d.telefon || '—' }}</span>
                <span v-if="d.transport" class="dp-sep">·</span>
                <span v-if="d.transport" class="dp-transport">{{ d.transport }}{{ d.mashina_raqam ? ' ' + d.mashina_raqam : '' }}</span>
              </div>
            </div>
            <div class="dp-card-r">
              <span class="dp-aktiv" :class="d.aktiv_buyurtma > 0 ? 'has' : 'none'">{{ d.aktiv_buyurtma || 0 }}</span>
              <span class="dp-aktiv-l">aktiv</span>
            </div>
          </div>
        </div>
      </div>

      <!-- DETAIL -->
      <transition name="slide-in">
        <div class="dp-detail" v-if="selected">

          <!-- Header -->
          <div class="dd-hd">
            <div class="dd-av" :style="{ background: avatarColor(selected.id) }">{{ selected.ism[0].toUpperCase() }}</div>
            <div class="dd-info">
              <div class="dd-name">{{ selected.ism }}</div>
              <div class="dd-meta">
                {{ selected.telefon || '—' }}
                <span v-if="selected.transport"> · {{ selected.transport }}{{ selected.mashina_raqam ? ' ' + selected.mashina_raqam : '' }}</span>
              </div>
            </div>
            <div class="dd-hd-right">
              <button class="dd-btn" @click="openEdit(selected)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Tahrirlash
              </button>
              <button class="dd-close" @click="selected = null">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          <!-- KPI strip -->
          <div class="dd-kpi">
            <div class="dd-kpi-i">
              <span class="dd-kpi-v" style="color:#8b5cf6">{{ stat.aktiv ?? '—' }}</span>
              <span class="dd-kpi-l">Aktiv</span>
            </div>
            <div class="dd-kpi-sep"/>
            <div class="dd-kpi-i">
              <span class="dd-kpi-v" style="color:#10b981">{{ stat.yetkazildi ?? '—' }}</span>
              <span class="dd-kpi-l">Yetkazilgan</span>
            </div>
            <div class="dd-kpi-sep"/>
            <div class="dd-kpi-i">
              <span class="dd-kpi-v" style="color:#ef4444">{{ stat.bekor ?? '—' }}</span>
              <span class="dd-kpi-l">Bekor</span>
            </div>
            <div class="dd-kpi-sep"/>
            <div class="dd-kpi-i">
              <span class="dd-kpi-v">{{ fmtShort(stat.jami_summa || 0) }}</span>
              <span class="dd-kpi-l">Yetkazildi summa</span>
            </div>
          </div>

          <!-- Tabs -->
          <div class="dd-tabs">
            <button class="dd-tab" :class="{ on: tab === 'reja' }" @click="switchTab('reja')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Reja
              <span v-if="rejaArizalar.length" class="dd-tab-cnt">{{ rejaArizalar.length }}</span>
            </button>
            <button class="dd-tab" :class="{ on: tab === 'marshrut' }" @click="switchTab('marshrut')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
              Marshrut
            </button>
            <button class="dd-tab" :class="{ on: tab === 'kassa' }" @click="switchTab('kassa')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>
              Kassa
              <span v-if="kassa && kassa.kerak > 0" class="dd-tab-cnt dd-tab-cnt--warn">{{ fmtShort(kassa.kerak) }}</span>
            </button>
            <button class="dd-tab" :class="{ on: tab === 'tarix' }" @click="switchTab('tarix')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Tarix
              <span v-if="tarixArizalar.length" class="dd-tab-cnt">{{ tarixArizalar.length }}</span>
            </button>
          </div>

          <!-- ═══ TAB: REJA ═══ -->
          <div class="dd-body" v-show="tab === 'reja'">
            <div class="dd-toolbar">
              <span class="dd-tool-lbl">Yetkaziladigan buyurtmalar</span>
              <div class="dd-date-filter">
                <input type="date" v-model="rejaSana" class="dd-date-in" @change="loadReja"/>
                <button v-if="rejaSana" class="dd-date-clear" @click="rejaSana = ''; loadReja()">Hammasi</button>
              </div>
            </div>

            <div v-if="rejaLoading" class="dd-load">
              <svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.07-8.33"/></svg>
              Yuklanmoqda...
            </div>
            <div v-else-if="!rejaArizalar.length" class="dd-tab-empty">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <p>Yetkaziladigan buyurtma yo'q</p>
              <span>Tasdiqlangan buyurtmalar bu yerda paydo bo'ladi</span>
            </div>
            <div v-else class="dd-reja-list">
              <div v-for="grp in rejaByDate" :key="grp.sana" class="dd-grp">
                <div class="dd-grp-hd">
                  <div class="dd-grp-date">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {{ fmtRejaDate(grp.sana) }}
                  </div>
                  <span class="dd-grp-cnt">{{ grp.items.length }} manzil</span>
                  <span class="dd-grp-sum">{{ fmtSum(grp.items.reduce((s, a) => s + Number(a.jami_summa || 0), 0)) }} so'm</span>
                </div>
                <div class="dd-grp-items">
                  <div v-for="(a, i) in grp.items" :key="a.id" class="dd-stop">
                    <div class="dd-stop-n">{{ i + 1 }}</div>
                    <div class="dd-stop-body">
                      <div class="dd-stop-top">
                        <span class="dd-stop-mijoz">{{ a.mijoz_nomi || a.mijoz?.nomi || '—' }}</span>
                        <span class="dd-stop-holat" :style="{ background: H[a.holat]?.bg, color: H[a.holat]?.color }">{{ H[a.holat]?.label || a.holat }}</span>
                      </div>
                      <div class="dd-stop-meta">
                        <span class="dd-stop-num">#{{ a.raqam }}</span>
                        <span v-if="a.mijoz?.telefon">· {{ a.mijoz.telefon }}</span>
                        <span v-if="a.mijoz?.manzil" class="dd-stop-addr">· {{ a.mijoz.manzil }}</span>
                      </div>
                      <div class="dd-stop-tovs" v-if="a.qatorlar?.length">
                        <span class="dd-tov" v-for="q in a.qatorlar.slice(0, 4)" :key="q.id">{{ q.tovar_nomi }} <b>×{{ q.jami_dona }}</b></span>
                        <span v-if="a.qatorlar.length > 4" class="dd-tov-more">+{{ a.qatorlar.length - 4 }}</span>
                      </div>
                    </div>
                    <div class="dd-stop-sum">{{ fmtShort(a.jami_summa) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ═══ TAB: MARSHRUT (xarita) ═══ -->
          <div class="dd-body dd-body--map" v-show="tab === 'marshrut'">

            <!-- Kun bo'yicha sana tanlash -->
            <div class="mp-days" v-if="marshrutSanalar.length">
              <span class="mp-days-lbl">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Kun:
              </span>
              <button
                v-for="s in marshrutSanalar" :key="s"
                class="mp-day-chip" :class="{ on: marshrutSana === s }"
                @click="selectMarshrutSana(s)"
              >
                {{ fmtDayChip(s) }}
                <span class="mp-day-cnt">{{ dayCount(s) }}</span>
              </button>
            </div>

            <!-- Stats -->
            <div class="mp-top">
              <div class="mp-stats">
                <div class="mp-stat">
                  <div class="mp-stat-ic" style="background:rgba(139,92,246,.1);color:#8b5cf6">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div><div class="mp-stat-val">{{ routePoints.length }}</div><div class="mp-stat-lbl">Manzil</div></div>
                </div>
                <div class="mp-stat-div"/>
                <div class="mp-stat">
                  <div class="mp-stat-ic" style="background:rgba(16,185,129,.1);color:#10b981">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                  <div><div class="mp-stat-val">{{ routeTotalKm }} km</div><div class="mp-stat-lbl">Masofa</div></div>
                </div>
                <div class="mp-stat-div"/>
                <div class="mp-stat">
                  <div class="mp-stat-ic" style="background:rgba(245,158,11,.1);color:#f59e0b">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div><div class="mp-stat-val">{{ routeEstTime }}</div><div class="mp-stat-lbl">Vaqt</div></div>
                </div>
              </div>
              <div class="mp-btns">
                <button class="mp-btn" @click="getMyLocation" :disabled="geoLoading">
                  <svg v-if="!geoLoading" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>
                  <span v-else class="spin-sm"/>
                  Joylashuvim
                </button>
                <button class="mp-btn mp-btn--primary" @click="rebuildRoute" :disabled="routePoints.length < 2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  Optimal marshrut
                </button>
              </div>
            </div>

            <!-- No location -->
            <div v-if="!routePoints.length" class="mp-no-loc">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/><line x1="2" y1="2" x2="22" y2="22" stroke-width="2"/></svg>
              <div class="mp-no-loc-t" v-if="!marshrutSanalar.length">Marshrut uchun buyurtma yo'q</div>
              <div class="mp-no-loc-t" v-else>Bu kunda lokatsiyali buyurtma yo'q</div>
              <div class="mp-no-loc-s" v-if="!marshrutSanalar.length">Yetkaziladigan mijozlarda GPS koordinatasi kiritilmagan</div>
              <div class="mp-no-loc-s" v-else>Yuqoridan boshqa kunni tanlang</div>
            </div>

            <!-- Map + sidebar -->
            <div class="mp-body" v-else>
              <div class="mp-sidebar">
                <div class="mp-sb-head">
                  <span>Bekatlar tartibi</span>
                  <span class="mp-sb-cnt">{{ orderedStops.length }}</span>
                </div>
                <div class="mp-stops">
                  <div class="mp-stop mp-stop--start" v-if="userLocation">
                    <div class="mp-stop-num mp-stop-num--start">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
                    </div>
                    <div class="mp-stop-info">
                      <div class="mp-stop-name">Siz turgan joy</div>
                      <div class="mp-stop-addr">Boshlash nuqtasi</div>
                    </div>
                  </div>
                  <div v-for="(a, i) in orderedStops" :key="a.id" class="mp-stop"
                    :class="activeStop === a.id && 'on'" @click="focusStop(a)">
                    <div class="mp-stop-num">{{ i + 1 }}</div>
                    <div class="mp-stop-info">
                      <div class="mp-stop-name">{{ a.mijoz?.nomi || a.mijoz_nomi }}</div>
                      <div class="mp-stop-addr">{{ a.mijoz?.manzil || '#' + a.raqam }}</div>
                      <div class="mp-stop-dist" v-if="segDists[i]">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        {{ segDists[i].toFixed(1) }} km
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="mp-map-wrap">
                <div :id="'dp-map-' + selected.id" class="mp-map"/>
                <transition name="mp-fade">
                  <div v-if="routeLoading" class="mp-load-ov">
                    <div class="mp-load-card"><div class="mp-load-spin"/><span>Yo'l hisoblanmoqda...</span></div>
                  </div>
                </transition>
              </div>
            </div>
          </div>

          <!-- ═══ TAB: KASSA (dostavchik qo'lidagi naqd) ═══ -->
          <div class="dd-body" v-show="tab === 'kassa'">
            <div class="dd-toolbar">
              <span class="dd-tool-lbl">Dostavchik qo'lidagi naqd</span>
              <div class="dd-date-filter">
                <input type="date" v-model="kassaSana" class="dd-date-in" @change="loadKassa"/>
              </div>
            </div>
            <div v-if="kassaLoading" class="dd-load">
              <svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.07-8.33"/></svg>
              Yuklanmoqda...
            </div>
            <template v-else-if="kassa">
              <div class="dk-grid">
                <div class="dk-card">
                  <span class="dk-l">Yig'ildi</span>
                  <b class="dk-v">{{ fmtSum(kassa.yigildi) }}</b>
                  <span class="dk-s">yetkazish {{ fmtShort(kassa.yetkazish) }} · qarz undirish {{ fmtShort(kassa.qarz_undirish) }}</span>
                </div>
                <div class="dk-card">
                  <span class="dk-l">Kassaga topshirdi</span>
                  <b class="dk-v" style="color:#10b981">{{ fmtSum(kassa.topshirildi) }}</b>
                  <span class="dk-s">{{ kassa.topshirish_vaqt ? fmtVaqt(kassa.topshirish_vaqt) : 'hali topshirmagan' }}</span>
                </div>
                <div class="dk-card" :class="{ 'dk-card--warn': kassa.kerak > 0 }">
                  <span class="dk-l">Qo'lida qoldi</span>
                  <b class="dk-v" :style="{ color: kassa.kerak > 0 ? '#d97706' : '#10b981' }">{{ fmtSum(kassa.kerak) }}</b>
                  <span class="dk-s" v-if="kassa.naqd_elon != null">o'zi sanagan: {{ fmtSum(kassa.naqd_elon) }}<template v-if="Math.abs(kassa.naqd_elon - kassa.yigildi) > 500"> · farq {{ kassa.naqd_elon > kassa.yigildi ? '+' : '−' }}{{ fmtSum(Math.abs(kassa.naqd_elon - kassa.yigildi)) }}</template></span>
                  <span class="dk-s" v-else>{{ kassa.trip ? 'reys: ' + (kassa.trip.holat === 'yakunlandi' ? 'yakunlangan' : kassa.trip.holat) : 'reys yo‘q' }}</span>
                </div>
              </div>

              <div v-if="kassa.kerak > 0" class="dk-qabul">
                <div class="dk-qabul-t">Naqdni qabul qilish</div>
                <div class="dk-qabul-row">
                  <NumberInput v-model="kassaSumma" :bosh="null" css-class="dm-in" :placeholder="fmtSum(kassa.kerak)"/>
                  <button class="dp-new-btn dp-new-btn--sm" :disabled="kassaSaving" @click="kassaQabul">
                    {{ kassaSaving ? '...' : 'Qabul qilish' }}
                  </button>
                </div>
                <div class="dk-qabul-s" v-if="kassaSumma != null && kassaSumma < kassa.kerak - 0.5">
                  Kamomad: <b>{{ fmtSum(kassa.kerak - kassaSumma) }}</b> so'm — dostavchik hisobiga yoziladi
                </div>
              </div>

              <div v-if="kassa.tolovlar.length" class="dd-grp">
                <div class="dd-grp-hd"><div class="dd-grp-date">Bugungi tushumlar</div><span class="dd-grp-cnt">{{ kassa.tolovlar.length }} ta</span></div>
                <div class="dd-grp-items">
                  <div v-for="t in kassa.tolovlar" :key="t.id" class="dd-stop">
                    <div class="dd-stop-body">
                      <div class="dd-stop-top"><span class="dd-stop-mijoz">{{ t.mijoz_nomi || '—' }}</span>
                        <span class="dd-stop-holat" :style="t.manba_tur === 'dostavchik' ? { background: 'rgba(16,185,129,.1)', color: '#10b981' } : { background: 'rgba(139,92,246,.1)', color: '#8b5cf6' }">{{ t.manba_tur === 'dostavchik' ? 'yetkazish' : 'qarz undirish' }}</span></div>
                      <div class="dd-stop-meta"><span>{{ fmtVaqt(t.sana) }}</span><span v-if="t.izoh">· {{ t.izoh }}</span></div>
                    </div>
                    <div class="dd-stop-sum">{{ fmtShort(t.summa) }}</div>
                  </div>
                </div>
              </div>
              <div v-else class="dd-tab-empty"><p>Bu kuni tushum yo'q</p></div>
            </template>
          </div>

          <!-- ═══ TAB: TARIX ═══ -->
          <div class="dd-body" v-show="tab === 'tarix'">
            <div v-if="tarixLoading" class="dd-load">
              <svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.07-8.33"/></svg>
              Yuklanmoqda...
            </div>
            <div v-else-if="!tarixArizalar.length" class="dd-tab-empty">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <p>Tarix bo'sh</p>
              <span>Yetkazilgan yoki bekor qilingan buyurtmalar bu yerda</span>
            </div>
            <div v-else class="dd-tarix-list">
              <div v-for="a in tarixArizalar" :key="a.id" class="dd-tx">
                <div class="dd-tx-ic" :style="{ background: H[a.holat]?.bg, color: H[a.holat]?.color }">
                  <svg v-if="a.holat === 'yetkazildi'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </div>
                <div class="dd-tx-body">
                  <div class="dd-tx-top">
                    <span class="dd-tx-mijoz">{{ a.mijoz_nomi || a.mijoz?.nomi }}</span>
                    <span class="dd-tx-holat" :style="{ color: H[a.holat]?.color }">{{ H[a.holat]?.label }}</span>
                  </div>
                  <div class="dd-tx-meta">
                    <span class="dd-tx-num">#{{ a.raqam }}</span>
                    <span>· {{ fmtRejaDate(a.jonatish_sana) }}</span>
                    <span v-if="a.qatorlar?.length">· {{ a.qatorlar.length }} tovar</span>
                  </div>
                </div>
                <div class="dd-tx-sum">{{ fmtShort(a.jami_summa) }}</div>
              </div>
            </div>
          </div>

        </div>
      </transition>
    </div>

    <!-- ═══ CREATE/EDIT MODAL ═══ -->
    <Teleport to="body">
      <Transition name="mfade">
        <div v-if="modalOpen" class="dm-ov" @click.self="modalOpen = false">
          <div class="dm-box">
            <div class="dm-hd">
              <div class="dm-ic">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </div>
              <span class="dm-title">{{ editId ? 'Dostavchini tahrirlash' : 'Yangi dostavchi' }}</span>
              <button class="dm-close" @click="modalOpen = false">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="dm-body">
              <div class="dm-field">
                <label>Ism <span class="dm-req">*</span></label>
                <input v-model="form.ism" v-maydon:ism="f" class="dm-in" placeholder="To'liq ism..."/>
              </div>
              <div class="dm-grid2">
                <div class="dm-field">
                  <label>Telefon</label>
                  <input v-model="form.telefon" v-maydon:telefon="f" class="dm-in" placeholder="+998..."/>
                </div>
                <div class="dm-field">
                  <label>Transport</label>
                  <select v-model="form.transport" class="dm-in">
                    <option value="">—</option>
                    <option value="Avto">Avtomobil</option>
                    <option value="Moto">Mototsikl</option>
                    <option value="Velosiped">Velosiped</option>
                    <option value="Piyoda">Piyoda</option>
                  </select>
                </div>
              </div>
              <div class="dm-field">
                <label>Mashina raqami</label>
                <input v-model="form.mashina_raqam" v-maydon:mashina_raqam="f" class="dm-in" placeholder="01 A 123 BC"/>
              </div>
              <div class="dm-field">
                <label>Izoh</label>
                <textarea v-model="form.izoh" v-maydon:izoh="f" class="dm-ta" rows="2" placeholder="Ixtiyoriy..."/>
              </div>
              <div class="dm-sec-hd">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Mobil ilova kirishi
              </div>
              <div class="dm-grid2">
                <div class="dm-field">
                  <label>Login</label>
                  <input v-model="form.login" v-maydon:login="f" class="dm-in" placeholder="masalan: dostavchi2" autocomplete="off"/>
                </div>
                <div class="dm-field">
                  <label>Parol {{ editId ? '(o\'zgartirish uchun)' : '' }}</label>
                  <input v-model="form.parol" v-maydon:parol="f" type="password" class="dm-in" placeholder="••••••" autocomplete="new-password"/>
                </div>
              </div>
              <p class="dm-hint" v-if="editId">Parolni bo'sh qoldirsangiz, eskisi saqlanib qoladi.</p>
              <label class="dm-faol" v-if="editId">
                <input type="checkbox" v-model="form.faol"/>
                <span>Faol (yangi buyurtma tayinlanishi mumkin)</span>
              </label>
              <div class="dm-err" v-if="modalErr">{{ modalErr }}</div>
            </div>
            <div class="dm-ft">
              <button class="dm-cancel" @click="modalOpen = false">Bekor qilish</button>
              <button class="dm-save" :disabled="saving || !form.ism" @click="save">
                <span v-if="saving" class="spin-sm"/>
                {{ saving ? 'Saqlanmoqda...' : (editId ? 'Saqlash' : 'Qo\'shish') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toastShow" class="dp-toast" :class="toastType">{{ toastMsg }}</div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import NumberInput from '@/components/NumberInput.vue'
// @ts-ignore
import { dostavchiApi } from '@/api/api'
import { useForma } from '@/validation/useForma'
import { tozala, qiymatXato } from '@/validation/qoidalar'
import * as sx from '@/validation/sxemalar'
import { fonQatlam } from '@/utils/xarita'

// ── Helpers ───────────────────────────────────────────────
const COLORS = ['#7c3aed','#8b5cf6','#6d28d9','#5b21b6']
const avatarColor = (id: number): string => COLORS[id % COLORS.length] || '#8b5cf6'
const H: Record<string, any> = {
  tasdiqlangan: { label: 'Tasdiqlangan', color: '#5b21b6', bg: 'rgba(91,33,182,.1)' },
  yigilmoqda:   { label: "Yig'ilmoqda",  color: '#f59e0b', bg: 'rgba(245,158,11,.1)' },
  yolda:        { label: "Yo'lda",        color: '#475569', bg: 'rgba(71,85,105,.1)' },
  yetkazildi:   { label: 'Yetkazildi',   color: '#10b981', bg: 'rgba(16,185,129,.1)' },
  bekor:        { label: 'Bekor',        color: '#ef4444', bg: 'rgba(239,68,68,.1)' },
}
const OSRM_PROFILE: Record<string, string> = {
  Avto: 'driving', Moto: 'driving', Velosiped: 'cycling', Piyoda: 'walking',
}

// ── State ─────────────────────────────────────────────────
const rows    = ref<any[]>([])
const loading = ref(false)
const search  = ref('')
const selected = ref<any>(null)
const tab     = ref('reja')

const stat = ref<any>({})

const rejaArizalar = ref<any[]>([])
const rejaLoading  = ref(false)
const rejaSana     = ref('')
const marshrutSana = ref('')  // marshrut qaysi KUN uchun chiziladi

const tarixArizalar = ref<any[]>([])
const tarixLoading  = ref(false)

const kassa        = ref<any>(null)
const kassaLoading = ref(false)
const kassaSana    = ref(new Date().toISOString().slice(0, 10))
const kassaSumma   = ref<number | null>(null)
const kassaSaving  = ref(false)

const modalOpen = ref(false)
const editId    = ref<number|null>(null)
const saving    = ref(false)
const modalErr  = ref('')
const form = reactive({ ism: '', telefon: '', transport: '', mashina_raqam: '', izoh: '', faol: true, login: '', parol: '' })
const f = useForma(sx.dostavchi, () => form)

// Map state
let L: any = null
let map: any = null
let markersLayer: any = null
let roadLayer: any = null
let userMarker: any = null
const routeLoading = ref(false)
const geoLoading   = ref(false)
const userLocation = ref<any>(null)
const orderedStops = ref<any[]>([])
const segDists     = ref<number[]>([])
const segTimes     = ref<number[]>([])
const activeStop   = ref<number|null>(null)

// Toast
const toastShow = ref(false)
const toastMsg  = ref('')
const toastType = ref('ok')
let toastTimer: ReturnType<typeof setTimeout>
function showToast(msg: string, type = 'ok') {
  clearTimeout(toastTimer)
  toastMsg.value = msg; toastType.value = type; toastShow.value = true
  toastTimer = setTimeout(() => { toastShow.value = false }, 2600)
}

// ── Computed ──────────────────────────────────────────────
const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return q ? rows.value.filter(d => d.ism.toLowerCase().includes(q) || d.telefon?.includes(q)) : rows.value
})
const rejaByDate = computed(() => {
  const map2: Record<string, any[]> = {}
  for (const a of rejaArizalar.value) {
    const key = a.jonatish_sana || 'belgilanmagan'
    if (!map2[key]) map2[key] = []
    map2[key].push(a)
  }
  return Object.entries(map2)
    .sort(([a], [b]) => {
      if (a === 'belgilanmagan') return 1
      if (b === 'belgilanmagan') return -1
      return new Date(a).getTime() - new Date(b).getTime()
    })
    .map(([sana, items]) => ({ sana, items }))
})
// Marshrutdagi sanalar ro'yxati (faqat lokatsiyali buyurtmasi bor kunlar)
const marshrutSanalar = computed(() => {
  const set = new Set<string>()
  for (const a of rejaArizalar.value) {
    if (a.mijoz?.lat && a.mijoz?.lng && a.jonatish_sana) set.add(a.jonatish_sana)
  }
  return [...set].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
})
// Faqat tanlangan KUN dagi lokatsiyali buyurtmalar marshrutga chiziladi
const routePoints = computed(() =>
  rejaArizalar.value.filter(a =>
    a.mijoz?.lat && a.mijoz?.lng && a.jonatish_sana === marshrutSana.value
  )
)
const routeProfile = computed(() => OSRM_PROFILE[selected.value?.transport] || 'driving')
const routeTotalKm = computed(() => {
  const d = segDists.value.reduce((s, v) => s + v, 0)
  return d > 0 ? d.toFixed(1) : '—'
})
const routeEstTime = computed(() => {
  const t = segTimes.value.reduce((s, v) => s + v, 0)
  if (!t) return '—'
  if (t < 60) return Math.round(t) + ' min'
  return Math.floor(t / 60) + 'h ' + Math.round(t % 60) + 'm'
})

// ── Load ──────────────────────────────────────────────────
async function load() {
  loading.value = true
  try { rows.value = await dostavchiApi.getAll() }
  catch (e: any) { showToast(e.message || 'Yuklash xatosi', 'err') }
  finally { loading.value = false }
}

async function selectRow(d: any) {
  if (selected.value?.id === d.id) { selected.value = null; return }
  selected.value = d
  tab.value = 'reja'
  rejaSana.value = ''
  marshrutSana.value = ''
  stat.value = {}
  tarixArizalar.value = []
  kassa.value = null
  await Promise.all([loadReja(), loadStat(), loadKassa()])
}

async function loadStat() {
  if (!selected.value) return
  try { stat.value = await dostavchiApi.statistika(selected.value.id) }
  catch { stat.value = {} }
}

async function loadReja() {
  if (!selected.value) return
  rejaLoading.value = true
  try {
    const params: any = { turi: 'aktiv' }
    if (rejaSana.value) params.sana = rejaSana.value
    const res = await dostavchiApi.reja(selected.value.id, params)
    rejaArizalar.value = res.arizalar || []
  } catch (e: any) {
    rejaArizalar.value = []
    showToast(e.message || 'Reja yuklanmadi', 'err')
  } finally {
    rejaLoading.value = false
  }
}

async function loadTarix() {
  if (!selected.value) return
  tarixLoading.value = true
  try {
    const res = await dostavchiApi.reja(selected.value.id, { turi: 'tarix' })
    tarixArizalar.value = res.arizalar || []
  } catch { tarixArizalar.value = [] }
  finally { tarixLoading.value = false }
}

async function loadKassa() {
  if (!selected.value) return
  kassaLoading.value = true
  try { kassa.value = await dostavchiApi.kassa(selected.value.id, kassaSana.value); kassaSumma.value = null }
  catch (e: any) { kassa.value = null; showToast(e.message || 'Kassa yuklanmadi', 'err') }
  finally { kassaLoading.value = false }
}
async function kassaQabul() {
  if (!selected.value || !kassa.value || kassaSaving.value) return
  const summa = kassaSumma.value ?? kassa.value.kerak
  const sx_xato = qiymatXato(sx.dostavchiKassaQabul.summa!, summa)
  if (sx_xato) { showToast(sx_xato, 'err'); return }
  if (summa < kassa.value.kerak - 0.5 && !confirm(`${fmtSum(kassa.value.kerak - summa)} so'm kamomad qayd etiladi. Davom etasizmi?`)) return
  kassaSaving.value = true
  try {
    // kutilgan_topshirilgan — sahifada ko'rinib turgan "topshirildi": boshqa kassir parallel qabul
    // qilgan bo'lsa backend 409 qaytaradi va summa ikki marta qo'shilmaydi
    await dostavchiApi.kassaQabul(selected.value.id, {
      sana: kassaSana.value, summa, izoh: summa < kassa.value.kerak - 0.5 ? 'Kamomad bilan qabul' : '',
      kutilgan_topshirilgan: Number(kassa.value.topshirildi) || 0,
    })
    showToast(`${fmtSum(summa)} so'm kassaga qabul qilindi`)
    await loadKassa()
  } catch (e: any) {
    if (e.status === 409) { await loadKassa(); showToast(`${e.message || "Ma'lumot o'zgargan"} — kassa qayta yuklandi, summani tekshirib qayta urining`, 'err') }
    else showToast(e.message || 'Xato', 'err')
  }
  finally { kassaSaving.value = false }
}
function fmtVaqt(s: string) { const d = new Date(s); return isNaN(+d) ? '' : d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }

function switchTab(t: string) {
  tab.value = t
  if (t === 'kassa') loadKassa()
  if (t === 'tarix' && !tarixArizalar.value.length) loadTarix()
  if (t === 'marshrut') {
    // marshrut sanasi tanlanmagan bo'lsa — birinchi (eng yaqin) kunni tanlaymiz
    if (!marshrutSana.value || !marshrutSanalar.value.includes(marshrutSana.value)) {
      marshrutSana.value = marshrutSanalar.value[0] || ''
    }
    nextTick(() => initMap())
  }
}

// Marshrut sanasi o'zgarganda xaritani qayta quramiz
function selectMarshrutSana(s: string) {
  if (marshrutSana.value === s) return
  marshrutSana.value = s
  activeStop.value = null
  nextTick(() => initMap())
}

// ── MAP ───────────────────────────────────────────────────
async function initMap() {
  if (!routePoints.value.length) return
  L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')
  await nextTick()

  const el = document.getElementById(`dp-map-${selected.value.id}`)
  if (!el) return
  if (map) { map.remove(); map = null }

  map = L.map(el, { zoomControl: false }).setView([41.2995, 69.2401], 12)
  fonQatlam(L).addTo(map)
  L.control.zoom({ position: 'bottomright' }).addTo(map)

  markersLayer = L.layerGroup().addTo(map)
  roadLayer    = L.layerGroup().addTo(map)
  await buildRoute()
}

async function buildRoute() {
  if (!map || !L) return
  markersLayer.clearLayers()
  roadLayer.clearLayers()
  if (userMarker) { userMarker.remove(); userMarker = null }

  const pts = routePoints.value
  if (!pts.length) return

  const color = avatarColor(selected.value.id)
  const start = userLocation.value
  const waypts = pts.map(a => ({ lat: +a.mijoz.lat, lng: +a.mijoz.lng, _ref: a }))
  const all = start ? [start, ...waypts] : waypts

  // dastlabki tartib
  orderedStops.value = waypts.map(w => w._ref)
  drawMarkers(start, orderedStops.value, color)
  fitBounds()

  routeLoading.value = true
  try {
    const coords = all.map(p => `${p.lng},${p.lat}`).join(';')
    const url = `https://router.project-osrm.org/trip/v1/${routeProfile.value}/${coords}` +
      `?overview=full&geometries=geojson&roundtrip=false&source=first&destination=last`
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
    const data = await res.json()
    if (data.code === 'Ok' && data.trips?.[0]) {
      // optimal tartib
      const wp = data.waypoints
      const ordered: any[] = []
      const offset = start ? 1 : 0
      wp.forEach((w: any, idx: number) => {
        if (idx < offset) return
        const ref = all[idx]._ref
        if (ref) ordered[w.waypoint_index - offset] = ref
      })
      orderedStops.value = ordered.filter(Boolean)
      // yo'l chizish
      const line = data.trips[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]])
      L.polyline(line, { color, weight: 4, opacity: .8 }).addTo(roadLayer)
      // segmentlar
      segDists.value = (data.trips[0].legs || []).map((l: any) => l.distance / 1000)
      segTimes.value = (data.trips[0].legs || []).map((l: any) => l.duration / 60)
      drawMarkers(start, orderedStops.value, color)
      fitBounds()
    }
  } catch {
    showToast('Yo\'l hisoblab bo\'lmadi (OSRM)', 'err')
  } finally {
    routeLoading.value = false
  }
}

function drawMarkers(start: any, stops: any[], color: string) {
  markersLayer.clearLayers()
  if (start) {
    userMarker = L.marker([start.lat, start.lng], {
      icon: L.divIcon({ className: '', html: `<div style="width:18px;height:18px;border-radius:50%;background:#10b981;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`, iconSize: [18,18], iconAnchor: [9,9] }),
    }).addTo(map)
  }
  stops.forEach((a, i) => {
    const lat = +a.mijoz.lat, lng = +a.mijoz.lng
    const mk = L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};color:#fff;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">${i+1}</div>`,
        iconSize: [26,26], iconAnchor: [13,13],
      }),
    }).addTo(markersLayer)
    mk.bindPopup(`<b>${a.mijoz?.nomi || a.mijoz_nomi}</b><br>#${a.raqam}<br>${a.mijoz?.manzil || ''}`)
    mk.on('click', () => { activeStop.value = a.id })
  })
}

function fitBounds() {
  const pts = routePoints.value.map(a => [+a.mijoz.lat, +a.mijoz.lng])
  if (userLocation.value) pts.push([userLocation.value.lat, userLocation.value.lng])
  if (pts.length) map.fitBounds(pts, { padding: [40, 40] })
}

function focusStop(a: any) {
  if (!map) return
  activeStop.value = a.id
  map.setView([+a.mijoz.lat, +a.mijoz.lng], 16, { animate: true })
}

function rebuildRoute() { buildRoute() }

function getMyLocation() {
  if (!navigator.geolocation) { showToast('Geolokatsiya qo\'llab-quvvatlanmaydi', 'err'); return }
  geoLoading.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLocation.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      geoLoading.value = false
      buildRoute()
    },
    () => { geoLoading.value = false; showToast('Joylashuv aniqlanmadi', 'err') },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

// ── CRUD ──────────────────────────────────────────────────
function openCreate() {
  Object.assign(form, { ism: '', telefon: '', transport: '', mashina_raqam: '', izoh: '', faol: true, login: '', parol: '' })
  editId.value = null; modalErr.value = ''; f.tozala(); modalOpen.value = true
}
function openEdit(d: any) {
  Object.assign(form, {
    ism: d.ism, telefon: d.telefon || '', transport: d.transport || '',
    mashina_raqam: d.mashina_raqam || '', izoh: d.izoh || '', faol: d.faol,
    login: d.login || '', parol: '',
  })
  editId.value = d.id; modalErr.value = ''; f.tozala(); modalOpen.value = true
}
async function save() {
  if (saving.value) return
  modalErr.value = ''
  if (!f.tekshir()) return
  saving.value = true
  try {
    const body: any = tozala(sx.dostavchi, {
      ism: form.ism,
      telefon: form.telefon,
      transport: form.transport,
      mashina_raqam: form.mashina_raqam,
      izoh: form.izoh,
      faol: form.faol,
      login: form.login,
    })
    if (form.parol) body.parol = form.parol
    if (editId.value) {
      const upd = await dostavchiApi.update(editId.value, body)
      if (selected.value?.id === editId.value) Object.assign(selected.value, upd)
      showToast('Saqlandi')
    } else {
      await dostavchiApi.create(body)
      showToast('Dostavchi qo\'shildi')
    }
    modalOpen.value = false
    await load()
  } catch (e: any) {
    modalErr.value = f.server(e)
  } finally {
    saving.value = false
  }
}

// ── Formatters ────────────────────────────────────────────
function fmtSum(v: number) { return v ? Math.round(v).toLocaleString('uz-UZ') : '0' }
function fmtShort(v: number|string) {
  const n = parseFloat(String(v||0))
  if (!n) return '0'
  if (n >= 1e9) return (n/1e9).toFixed(1)+' mlrd'
  if (n >= 1e6) return (n/1e6).toFixed(1)+' mln'
  if (n >= 1e3) return (n/1e3).toFixed(0)+' ming'
  return n.toFixed(0)
}
function fmtRejaDate(s: string) {
  if (!s || s === 'belgilanmagan') return 'Sana belgilanmagan'
  const d = new Date(s)
  const kun = ['Yak','Du','Se','Ch','Pa','Ju','Sh'][d.getDay()]
  const oy  = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'][d.getMonth()]
  return `${kun}, ${d.getDate()} ${oy} ${d.getFullYear()}`
}
// Kun chip: "Bugun", "Ertaga" yoki "12 Iyn"
function fmtDayChip(s: string) {
  const d = new Date(s)
  const t = new Date(); t.setHours(0,0,0,0)
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000)
  if (diff === 0) return 'Bugun'
  if (diff === 1) return 'Ertaga'
  if (diff === -1) return 'Kecha'
  const oy = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'][d.getMonth()]
  return `${d.getDate()} ${oy}`
}
// Shu kundagi lokatsiyali buyurtmalar soni
function dayCount(s: string) {
  return rejaArizalar.value.filter(a => a.jonatish_sana === s && a.mijoz?.lat && a.mijoz?.lng).length
}

onMounted(load)
</script>

<style scoped>
.dp { display:flex; flex-direction:column; gap:14px; height:100%; min-height:0; }

/* Header */
.dp-hd { display:flex; align-items:center; justify-content:space-between; }
.dp-title { font-size:20px; font-weight:900; color:#1e293b; margin:0 0 3px; }
.dp-sub   { font-size:12.5px; color:#94a3b8; margin:0; }
.dp-new-btn { display:inline-flex; align-items:center; gap:6px; height:36px; padding:0 16px; border-radius:10px; border:none; background:linear-gradient(135deg,#8b5cf6,#8b5cf6); color:#fff; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 3px 12px rgba(139,92,246,.28); transition:.13s; }
.dp-new-btn:hover { transform:translateY(-1px); box-shadow:0 5px 16px rgba(139,92,246,.38); }
.dp-new-btn--sm { height:32px; font-size:12.5px; margin-top:6px; }

/* Layout */
.dp-layout { display:grid; grid-template-columns:1fr; gap:14px; flex:1; min-height:0; overflow:hidden; }
.dp-layout.split { grid-template-columns:330px 1fr; }
.dp-list-wrap { display:flex; flex-direction:column; gap:8px; overflow:hidden; }
.dp-search { display:flex; align-items:center; gap:7px; background:#fff; border:1.5px solid #e2e8f0; border-radius:10px; padding:0 11px; height:36px; flex-shrink:0; transition:.12s; }
.dp-search:focus-within { border-color:#8b5cf6; }
.dp-search svg { color:#94a3b8; flex-shrink:0; }
.dp-si { flex:1; border:none; outline:none; font-size:13px; color:#1e293b; background:transparent; }
.dp-si::placeholder { color:#cbd5e1; }
.dp-list { display:flex; flex-direction:column; gap:5px; overflow-y:auto; flex:1; }
.dp-list::-webkit-scrollbar { width:4px; }
.dp-list::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }
.dp-skel { height:64px; border-radius:13px; background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:shim 1.4s ease infinite; }
@keyframes shim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.dp-empty { display:flex; flex-direction:column; align-items:center; gap:9px; padding:50px 20px; color:#94a3b8; }
.dp-empty svg { opacity:.22; }
.dp-empty p { font-size:14px; font-weight:700; color:#64748b; margin:0; }

/* Card */
.dp-card { display:flex; align-items:center; gap:10px; background:#fff; border:1.5px solid #e8ecf8; border-radius:13px; padding:11px 13px; cursor:pointer; transition:.13s; }
.dp-card:hover { border-color:#ddd6fe; box-shadow:0 2px 10px rgba(139,92,246,.07); }
.dp-card.on    { border-color:#8b5cf6; background:#fbfaff; box-shadow:0 3px 14px rgba(139,92,246,.12); }
.dp-card.off   { opacity:.6; }
.dp-card-av { width:38px; height:38px; border-radius:11px; flex-shrink:0; color:#fff; font-size:15px; font-weight:900; display:flex; align-items:center; justify-content:center; }
.dp-card-body { flex:1; min-width:0; }
.dp-card-name { display:flex; align-items:center; gap:6px; font-size:13.5px; font-weight:800; color:#1e293b; }
.dp-off-tag { font-size:9.5px; font-weight:700; color:#94a3b8; background:#f1f5f9; padding:1px 6px; border-radius:5px; }
.dp-card-meta { display:flex; align-items:center; gap:5px; font-size:11.5px; color:#94a3b8; margin-top:2px; }
.dp-sep { color:#cbd5e1; }
.dp-transport { color:#8b5cf6; font-weight:600; }
.dp-card-r { display:flex; flex-direction:column; align-items:center; flex-shrink:0; }
.dp-aktiv { font-size:17px; font-weight:900; line-height:1; }
.dp-aktiv.has  { color:#8b5cf6; }
.dp-aktiv.none { color:#cbd5e1; }
.dp-aktiv-l { font-size:9.5px; color:#94a3b8; margin-top:2px; }

/* Detail */
.dp-detail { background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; display:flex; flex-direction:column; overflow:hidden; }
.slide-in-enter-active, .slide-in-leave-active { transition:.2s; }
.slide-in-enter-from, .slide-in-leave-to { opacity:0; transform:translateX(16px); }

.dd-hd { display:flex; align-items:center; gap:10px; padding:14px 18px 12px; border-bottom:1px solid #f1f5f9; flex-shrink:0; }
.dd-av { width:40px; height:40px; border-radius:12px; flex-shrink:0; color:#fff; font-size:16px; font-weight:900; display:flex; align-items:center; justify-content:center; }
.dd-info { flex:1; min-width:0; }
.dd-name { font-size:15px; font-weight:800; color:#1e293b; }
.dd-meta { font-size:12px; color:#94a3b8; margin-top:2px; }
.dd-hd-right { display:flex; align-items:center; gap:7px; flex-shrink:0; }
.dd-btn { display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:9px; border:1.5px solid #ede9fe; background:#f8f9ff; color:#8b5cf6; font-size:12px; font-weight:600; cursor:pointer; transition:.12s; }
.dd-btn:hover { background:#ede9fe; }
.dd-close { width:30px; height:30px; border-radius:8px; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; transition:.12s; }
.dd-close:hover { background:#fef2f2; color:#ef4444; border-color:#fecaca; }

/* KPI */
.dd-kpi { display:flex; align-items:center; padding:11px 18px; border-bottom:1px solid #f1f5f9; flex-shrink:0; }
.dd-kpi-i { flex:1; text-align:center; }
.dd-kpi-v { display:block; font-size:16px; font-weight:900; color:#1e293b; }
.dd-kpi-l { display:block; font-size:10px; color:#94a3b8; margin-top:1px; }
.dd-kpi-sep { width:1px; height:28px; background:#e2e8f0; flex-shrink:0; }

/* Tabs */
.dd-tabs { display:flex; gap:4px; padding:10px 14px 0; border-bottom:1px solid #f1f5f9; flex-shrink:0; }
.dd-tab { display:flex; align-items:center; gap:6px; padding:8px 14px; border:none; background:transparent; border-bottom:2.5px solid transparent; font-size:13px; font-weight:600; color:var(--seg-ink); cursor:pointer; transition:.13s; margin-bottom:-1px; }
.dd-tab:hover { color:var(--seg-ink-h); }
.dd-tab.on { color:var(--tab-on-ink); border-bottom-color:var(--tab-line); font-weight:600; }
.dd-tab-cnt { font-size:10.5px; font-weight:700; background:#f1f5f9; color:#64748b; padding:1px 6px; border-radius:8px; }
.dd-tab.on .dd-tab-cnt { background:var(--cnt-on-bg); color:var(--chip-on-ink); }
.dd-tab-cnt--warn { background:rgba(217,119,6,.12) !important; color:#d97706 !important; }
.dk-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.dk-card { background:#fff; border:1.5px solid #e8ecf8; border-radius:12px; padding:12px 14px; display:flex; flex-direction:column; gap:3px; }
.dk-card--warn { border-color:rgba(217,119,6,.35); background:rgba(217,119,6,.04); }
.dk-l { font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:.04em; }
.dk-v { font-size:20px; font-weight:800; color:#1e293b; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.dk-s { font-size:11.5px; color:#94a3b8; }
.dk-qabul { margin-top:12px; padding:12px 14px; border:1.5px dashed rgba(139,92,246,.35); border-radius:12px; background:#f8f9ff; display:flex; flex-direction:column; gap:8px; }
.dk-qabul-t { font-size:13px; font-weight:700; color:#1e293b; }
.dk-qabul-row { display:flex; gap:8px; align-items:center; }
.dk-qabul-row .dm-in { flex:1; }
.dk-qabul-s { font-size:12px; color:#d97706; }
.shell.dark .dk-card { background:#1e293b; border-color:#334155; }
.shell.dark .dk-v { color:#f1f5f9; }
.shell.dark .dk-qabul { background:#1e293b; }
.shell.dark .dk-qabul-t { color:#f1f5f9; }

/* Body */
.dd-body { flex:1; overflow-y:auto; padding:14px 18px; min-height:0; }
.dd-body::-webkit-scrollbar { width:4px; }
.dd-body::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }
.dd-body--map { padding:0; display:flex; flex-direction:column; overflow:hidden; }
.spin { animation:rot .7s linear infinite; }
.spin-sm { width:13px; height:13px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:rot .6s linear infinite; display:inline-block; }
@keyframes rot { to { transform:rotate(360deg) } }
.dd-load { display:flex; align-items:center; justify-content:center; gap:10px; padding:50px; color:#94a3b8; font-size:13px; }
.dd-load svg { color:#8b5cf6; }
.dd-tab-empty { display:flex; flex-direction:column; align-items:center; gap:8px; padding:50px 20px; color:#94a3b8; text-align:center; }
.dd-tab-empty svg { opacity:.2; }
.dd-tab-empty p { font-size:14px; font-weight:700; color:#64748b; margin:0; }
.dd-tab-empty span { font-size:12.5px; }

.dd-toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.dd-tool-lbl { font-size:12px; font-weight:700; color:#334155; }
.dd-date-filter { display:flex; align-items:center; gap:6px; }
.dd-date-in { height:30px; padding:0 9px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:12px; color:#1e293b; outline:none; }
.dd-date-in:focus { border-color:#8b5cf6; }
.dd-date-clear { padding:5px 10px; border:none; background:#f1f5f9; border-radius:7px; font-size:11.5px; font-weight:600; color:#64748b; cursor:pointer; }

/* Reja */
.dd-reja-list { display:flex; flex-direction:column; gap:16px; }
.dd-grp { display:flex; flex-direction:column; gap:7px; }
.dd-grp-hd { display:flex; align-items:center; gap:8px; padding:7px 12px; background:linear-gradient(135deg,#f8fafc,#f1f5f9); border:1px solid #e2e8f0; border-radius:10px; }
.dd-grp-date { display:flex; align-items:center; gap:6px; font-size:13px; font-weight:800; color:#1e293b; flex:1; }
.dd-grp-date svg { color:#8b5cf6; }
.dd-grp-cnt { font-size:11.5px; font-weight:600; color:#8b5cf6; background:rgba(139,92,246,.1); padding:2px 8px; border-radius:20px; }
.dd-grp-sum { font-size:12.5px; font-weight:800; color:#10b981; }
.dd-grp-items { display:flex; flex-direction:column; gap:5px; padding-left:6px; }
.dd-stop { display:flex; align-items:flex-start; gap:10px; background:#fff; border:1.5px solid #e8ecf8; border-radius:12px; padding:11px 13px; transition:.13s; }
.dd-stop:hover { border-color:#ddd6fe; box-shadow:0 2px 10px rgba(139,92,246,.06); }
.dd-stop-n { width:24px; height:24px; border-radius:50%; flex-shrink:0; background:#f5f3ff; color:#8b5cf6; font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; margin-top:1px; }
.dd-stop-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; }
.dd-stop-top { display:flex; align-items:center; gap:8px; }
.dd-stop-mijoz { font-size:13px; font-weight:700; color:#1e293b; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dd-stop-holat { font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; flex-shrink:0; }
.dd-stop-meta { display:flex; align-items:center; gap:4px; font-size:11px; color:#94a3b8; flex-wrap:wrap; }
.dd-stop-num { color:#8b5cf6; font-weight:600; }
.dd-stop-addr { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dd-stop-tovs { display:flex; flex-wrap:wrap; gap:4px; margin-top:2px; }
.dd-tov { font-size:10.5px; color:#334155; background:#f8fafc; border:1px solid #e2e8f0; padding:2px 7px; border-radius:5px; }
.dd-tov b { color:#8b5cf6; }
.dd-tov-more { font-size:10.5px; color:#94a3b8; align-self:center; }
.dd-stop-sum { font-size:13px; font-weight:800; color:#1e293b; flex-shrink:0; }

/* Tarix */
.dd-tarix-list { display:flex; flex-direction:column; gap:6px; }
.dd-tx { display:flex; align-items:center; gap:11px; background:#fff; border:1.5px solid #e8ecf8; border-radius:12px; padding:11px 13px; }
.dd-tx-ic { width:32px; height:32px; border-radius:9px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.dd-tx-body { flex:1; min-width:0; }
.dd-tx-top { display:flex; align-items:center; gap:8px; }
.dd-tx-mijoz { font-size:13px; font-weight:700; color:#1e293b; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dd-tx-holat { font-size:11px; font-weight:700; flex-shrink:0; }
.dd-tx-meta { display:flex; align-items:center; gap:4px; font-size:11px; color:#94a3b8; margin-top:2px; flex-wrap:wrap; }
.dd-tx-num { color:#8b5cf6; font-weight:600; }
.dd-tx-sum { font-size:13px; font-weight:800; color:#1e293b; flex-shrink:0; }

/* ── MARSHRUT / XARITA ── */
/* Kun chiplari */
.mp-days { display:flex; align-items:center; gap:6px; padding:10px 16px; border-bottom:1px solid #f1f5f9; flex-shrink:0; flex-wrap:wrap; background:#fff; }
.mp-days-lbl { display:flex; align-items:center; gap:5px; font-size:11.5px; font-weight:700; color:#64748b; margin-right:2px; }
.mp-days-lbl svg { color:#8b5cf6; }
.mp-day-chip { display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 12px; border-radius:20px; border:1.5px solid #e2e8f0; background:#fff; font-size:12px; font-weight:600; color:#334155; cursor:pointer; transition:.12s; }
.mp-day-chip:hover { border-color:#ddd6fe; }
.mp-day-chip.on { border-color:#8b5cf6; background:#f5f3ff; color:#8b5cf6; }
.mp-day-cnt { font-size:10.5px; font-weight:700; background:rgba(0,0,0,.06); padding:1px 6px; border-radius:8px; }
.mp-day-chip.on .mp-day-cnt { background:rgba(139,92,246,.15); color:#8b5cf6; }

.mp-top { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; border-bottom:1px solid #f1f5f9; flex-shrink:0; flex-wrap:wrap; background:#fbfaff; }
.mp-stats { display:flex; align-items:center; gap:14px; }
.mp-stat { display:flex; align-items:center; gap:8px; }
.mp-stat-ic { width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.mp-stat-val { font-size:14px; font-weight:800; color:#1e293b; }
.mp-stat-lbl { font-size:10px; color:#94a3b8; }
.mp-stat-div { width:1px; height:26px; background:#e2e8f0; }
.mp-btns { display:flex; gap:7px; }
.mp-btn { display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 13px; border-radius:9px; border:1.5px solid #e2e8f0; background:#fff; font-size:12px; font-weight:600; color:#334155; cursor:pointer; transition:.12s; }
.mp-btn:hover:not(:disabled) { border-color:#ddd6fe; color:#8b5cf6; }
.mp-btn:disabled { opacity:.5; cursor:not-allowed; }
.mp-btn--primary { background:linear-gradient(135deg,#8b5cf6,#8b5cf6); color:#fff; border-color:transparent; }
.mp-btn--primary:hover:not(:disabled) { color:#fff; filter:brightness(1.06); }

.mp-no-loc { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; color:#94a3b8; text-align:center; padding:40px; }
.mp-no-loc svg { opacity:.25; }
.mp-no-loc-t { font-size:14px; font-weight:700; color:#64748b; }
.mp-no-loc-s { font-size:12.5px; }

.mp-body { flex:1; display:grid; grid-template-columns:240px 1fr; overflow:hidden; min-height:0; }
.mp-sidebar { border-right:1px solid #f1f5f9; display:flex; flex-direction:column; overflow:hidden; }
.mp-sb-head { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; font-size:11px; font-weight:800; color:#334155; text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid #f1f5f9; flex-shrink:0; }
.mp-sb-cnt { font-size:10px; background:#f1f5f9; color:#64748b; padding:1px 6px; border-radius:6px; }
.mp-stops { flex:1; overflow-y:auto; padding:8px; display:flex; flex-direction:column; gap:3px; }
.mp-stops::-webkit-scrollbar { width:3px; }
.mp-stops::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }
.mp-stop { display:flex; align-items:flex-start; gap:9px; padding:8px 9px; border-radius:9px; cursor:pointer; border:1.5px solid transparent; transition:.12s; }
.mp-stop:hover { background:#f8fafc; }
.mp-stop.on { background:#f5f3ff; border-color:#ddd6fe; }
.mp-stop-num { width:22px; height:22px; border-radius:50%; flex-shrink:0; background:#f5f3ff; color:#8b5cf6; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; }
.mp-stop-num--start { background:#dcfce7; color:#10b981; }
.mp-stop-info { flex:1; min-width:0; }
.mp-stop-name { font-size:12px; font-weight:700; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mp-stop-addr { font-size:10.5px; color:#94a3b8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mp-stop-dist { display:flex; align-items:center; gap:3px; font-size:10px; color:#8b5cf6; font-weight:600; margin-top:2px; }
.mp-map-wrap { position:relative; }
.mp-map { width:100%; height:100%; min-height:300px; }
.mp-load-ov { position:absolute; inset:0; background:rgba(255,255,255,.6); display:flex; align-items:center; justify-content:center; z-index:500; }
.mp-load-card { display:flex; align-items:center; gap:10px; background:#fff; padding:12px 18px; border-radius:12px; box-shadow:0 6px 24px rgba(0,0,0,.12); font-size:13px; font-weight:600; color:#334155; }
.mp-load-spin { width:18px; height:18px; border:2.5px solid #e2e8f0; border-top-color:#8b5cf6; border-radius:50%; animation:rot .7s linear infinite; }
.mp-fade-enter-active, .mp-fade-leave-active { transition:.2s; }
.mp-fade-enter-from, .mp-fade-leave-to { opacity:0; }

/* Modal */
.dm-ov { position:fixed; inset:0; background:rgba(15,23,42,.5); backdrop-filter:blur(5px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px; }
.dm-box { background:#fff; border-radius:18px; width:100%; max-width:460px; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 28px 80px rgba(0,0,0,.22); overflow:hidden; }
.mfade-enter-active, .mfade-leave-active { transition:opacity .18s, transform .18s; }
.mfade-enter-from, .mfade-leave-to { opacity:0; transform:scale(.97) translateY(8px); }
.dm-hd { display:flex; align-items:center; gap:10px; padding:14px 18px; border-bottom:1px solid #f1f5f9; }
.dm-ic { width:32px; height:32px; border-radius:9px; background:linear-gradient(135deg,#8b5cf6,#8b5cf6); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.dm-title { font-size:15px; font-weight:800; color:#1e293b; flex:1; }
.dm-close { width:28px; height:28px; border-radius:7px; border:none; background:#f1f5f9; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; transition:.12s; }
.dm-close:hover { background:#fee2e2; color:#ef4444; }
.dm-body { padding:16px 18px; display:flex; flex-direction:column; gap:12px; overflow-y:auto; }
.dm-field { display:flex; flex-direction:column; gap:5px; }
.dm-field label { font-size:11.5px; font-weight:700; color:#374151; }
.dm-req { color:#ef4444; }
.dm-in { height:36px; padding:0 11px; border:1.5px solid #e2e8f0; border-radius:9px; font-size:13.5px; color:#1e293b; outline:none; transition:.13s; box-sizing:border-box; }
.dm-in:focus { border-color:#8b5cf6; }
.dm-ta { padding:9px 11px; border:1.5px solid #e2e8f0; border-radius:9px; font-size:13.5px; color:#1e293b; outline:none; resize:none; font-family:inherit; line-height:1.5; transition:.13s; box-sizing:border-box; }
.dm-ta:focus { border-color:#8b5cf6; }
.dm-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.dm-sec-hd { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#8b5cf6; text-transform:uppercase; letter-spacing:.04em; margin-top:4px; padding-top:10px; border-top:1px solid #f1f5f9; }
.dm-hint { font-size:11px; color:#94a3b8; margin:-4px 0 0; }
.dm-faol { display:flex; align-items:center; gap:8px; font-size:12.5px; color:#334155; cursor:pointer; }
.dm-faol input { width:16px; height:16px; accent-color:#8b5cf6; cursor:pointer; }
.dm-err { font-size:12px; color:#dc2626; background:#fef2f2; padding:8px 11px; border-radius:8px; }
.dm-ft { display:flex; align-items:center; justify-content:space-between; padding:13px 18px; border-top:1px solid #f1f5f9; background:#f8fafc; }
.dm-cancel { padding:8px 16px; border-radius:9px; border:1.5px solid #e2e8f0; background:#fff; font-size:13px; font-weight:600; color:#334155; cursor:pointer; transition:.12s; }
.dm-cancel:hover { background:#f1f5f9; }
.dm-save { display:inline-flex; align-items:center; gap:7px; padding:8px 22px; border-radius:9px; border:none; background:linear-gradient(135deg,#8b5cf6,#8b5cf6); color:#fff; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 3px 12px rgba(139,92,246,.28); transition:.13s; }
.dm-save:hover:not(:disabled) { transform:translateY(-1px); }
.dm-save:disabled { opacity:.45; cursor:not-allowed; box-shadow:none; transform:none; }

/* Toast */
.dp-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); padding:11px 20px; border-radius:12px; z-index:1100; font-size:13.5px; font-weight:600; color:#fff; box-shadow:0 8px 32px rgba(0,0,0,.15); pointer-events:none; }
.dp-toast.ok  { background:linear-gradient(135deg,#10b981,#059669); }
.dp-toast.err { background:linear-gradient(135deg,#ef4444,#dc2626); }
.toast-enter-active, .toast-leave-active { transition:opacity .22s, transform .22s; }
.toast-enter-from { opacity:0; transform:translateX(-50%) translateY(14px); }
.toast-leave-to   { opacity:0; transform:translateX(-50%) translateY(14px); }

/* Leaflet zoom */
:deep(.leaflet-control-zoom) { border:none !important; box-shadow:0 2px 10px rgba(0,0,0,.1) !important; }
:deep(.leaflet-control-zoom a) { width:32px !important; height:32px !important; line-height:30px !important; }

/* Responsive */
@media(max-width:900px) { .dp-layout.split { grid-template-columns:1fr; } .mp-body { grid-template-columns:1fr; } .mp-sidebar { display:none; } }
</style>
