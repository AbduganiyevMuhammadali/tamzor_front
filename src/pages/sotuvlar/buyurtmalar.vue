<template>
  <div class="bw-wrap">

    <!-- ═══ LEFT PANEL ═══ -->
    <div class="bw-left" :class="{ 'bw-left--hidden': selectedId !== null && isMobile }">

      <div class="bw-lhd">
        <div>
          <h2 class="bw-lhd-title">Buyurtmalar</h2>
          <p class="bw-lhd-sub">{{ filtered.length }} ta · {{ isToday ? 'bugun va ochiqlari' : fmtDate(jonatishSana) }}</p>
        </div>
        <button class="bw-new-btn" @click="goArizalar">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Yangi ariza
        </button>
      </div>

      <div class="bw-date-row">
        <button class="bw-date-nav" @click="shiftDate(-1)" title="Oldingi kun">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <input type="date" v-model="jonatishSana" class="bw-date-in" @change="load"/>
        <button class="bw-date-nav" @click="shiftDate(1)" title="Keyingi kun">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button v-if="!isToday" class="bw-date-today" @click="goToday">Bugun</button>
      </div>

      <div class="bw-search-row">
        <div class="bw-search-box">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="search" @input="debouncedLoad" placeholder="Mijoz yoki raqam..." class="bw-search-in"/>
        </div>
      </div>

      <!-- Holat filtri -->
      <div class="bw-hfilter">
        <button class="bw-hf" :class="{ on: subHolat === '' }" @click="setHolat('')">Barchasi</button>
        <button
          v-for="k in BUYURTMA_HOLAT" :key="k"
          class="bw-hf"
          :class="{ on: subHolat === k }"
          :style="subHolat === k ? { color: HOLAT_CFG[k].color, borderColor: HOLAT_CFG[k].color, background: HOLAT_CFG[k].bg } : {}"
          @click="setHolat(k)"
        >
          <span class="bw-hf-dot" :style="{ background: HOLAT_CFG[k].color }"/>
          {{ HOLAT_CFG[k].label }}
        </button>
      </div>

      <!-- Yig'ma: ro'yxatdagi zakazlar tovarlar bo'yicha jamlangan (modal) -->
      <button class="bw-yigma-bar" v-if="rows.length" @click="yigmaModal = true" :title="`${yigmaSarlavha}: tovarlar bo'yicha yig'ma ro'yxat`">
        <span class="bw-yigma-ic">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </span>
        <span class="bw-yigma-t">
          <b>{{ yigmaSarlavha }}</b>
          <small>{{ yigma.zakazlar }} zakaz · {{ yigma.tovarlar.length }} xil tovar · {{ fmtMiqdor(yigma.kg) }} kg</small>
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      <!-- LIST -->
      <div class="bw-list">
        <div v-if="loading" class="bw-list-empty">
          <svg class="bw-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.07-8.33"/></svg>
          <span>Yuklanmoqda...</span>
        </div>
        <div class="bw-list-empty" v-else-if="!filtered.length">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>Buyurtma yo'q</span>
        </div>

        <div
          v-for="row in filtered" :key="row.id"
          class="bw-card"
          :class="{ active: selectedId === row.id }"
          @click="selectRow(row)"
        >
          <div class="bw-card-row1">
            <div class="bw-card-av" :style="{ background: avatarColor(row.id) }">{{ (row.mijoz_nomi||'?').charAt(0).toUpperCase() }}</div>
            <div class="bw-card-info">
              <div class="bw-card-name">{{ row.mijoz_nomi || '—' }}</div>
              <div class="bw-card-sub">#{{ row.raqam }} · {{ row.agent_nomi || '—' }}</div>
            </div>
            <div class="bw-card-right">
              <span class="bw-chip"
                :style="{ background: HOLAT_CFG[row.holat]?.bg, color: HOLAT_CFG[row.holat]?.color }">
                <span class="bw-chip-dot" :style="{ background: HOLAT_CFG[row.holat]?.color }"/>
                {{ HOLAT_CFG[row.holat]?.label }}
              </span>
              <span class="bw-card-sum">{{ fmtShort(row.jami_summa) }}</span>
            </div>
          </div>
          <div class="bw-card-row2" v-if="row.qatorlar?.length">
            <span class="bw-card-tov" v-for="t in row.qatorlar.slice(0, 3)" :key="t.id">
              {{ t.tovar_nomi }}<span class="bw-tov-x"> {{ fmtMiqdor(t.jami_dona) }} kg</span>
            </span>
            <span class="bw-card-more" v-if="row.qatorlar.length > 3">+{{ row.qatorlar.length - 3 }}</span>
          </div>
          <div class="bw-card-row3">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {{ fmtDate(row.jonatish_sana) }}
            <template v-if="row.dostavchi_nomi"> · 🚚 {{ row.dostavchi_nomi }}</template>
            <button class="bw-card-chek" :class="{ busy: chekBusy.has(row.id) }" :disabled="chekBusy.has(row.id)"
              @click.stop="chekChopEt([row], true)" title="80 mm chek — chop etish">
              <span v-if="chekBusy.has(row.id)" class="bw-spin bw-spin--sm"/>
              <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Chek
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ RIGHT PANEL ═══ -->
    <div class="bw-right" :class="{ visible: selectedId !== null }">

      <div class="bw-nosel" v-if="!selected && !rows.length">
        <div class="bw-nosel-ic">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <p>{{ loading ? 'Yuklanmoqda…' : 'Bu kunda buyurtma yo\'q' }}</p>
      </div>

      <!-- Zakaz tanlanmagan: ro'yxatdagi zakazlar tovarlar bo'yicha yig'ma (omborchi nimani qancha tayyorlaydi) -->
      <div class="bw-yg" v-else-if="!selected">
        <div class="bw-yg-hd">
          <div class="bw-yg-ic">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </div>
          <div class="bw-yg-hdt">
            <div class="bw-yg-title">{{ yigmaSarlavha }} — yig'ma ro'yxat</div>
            <div class="bw-yg-sub">Ro'yxatdagi {{ yigma.zakazlar }} ta zakaz tovarlar bo'yicha jamlangan. Bitta zakazni ko'rish uchun chapdan tanlang.</div>
          </div>
          <button class="bw-chek-btn" @click="yigmaModal = true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            Batafsil
          </button>
        </div>
        <div class="bw-kpi-strip">
          <div class="bw-kpi-i"><span class="bw-kpi-v">{{ yigma.zakazlar }}</span><span class="bw-kpi-l">Zakaz</span></div>
          <div class="bw-kpi-sep"/>
          <div class="bw-kpi-i"><span class="bw-kpi-v">{{ yigma.mijozlar }}</span><span class="bw-kpi-l">Mijoz</span></div>
          <div class="bw-kpi-sep"/>
          <div class="bw-kpi-i"><span class="bw-kpi-v">{{ fmtMiqdor(yigma.kg) }}</span><span class="bw-kpi-l">kg jami</span></div>
          <div class="bw-kpi-sep"/>
          <div class="bw-kpi-i"><span class="bw-kpi-v">{{ fmtSum(yigma.summa) }}</span><span class="bw-kpi-l">Summa</span></div>
        </div>
        <div class="bw-scroll">
          <div class="bw-sec">
            <div class="bw-sec-hd">Tovarlar bo'yicha jami <span class="bw-sec-cnt">{{ yigma.tovarlar.length }}</span></div>
            <div class="bw-yg-list">
              <div class="bw-yg-row" v-for="t in yigma.tovarlar" :key="t.key" @click="yigmaOch(t.key)" title="Batafsil: kim qancha buyurtma qilgan">
                <div class="bw-yg-name">
                  <span class="bw-tn">{{ t.nomi }}</span>
                  <span class="bw-tk">{{ t.turkum || 'Turkumsiz' }} · {{ t.zakazlar }} zakaz<template v-if="t.holat.tasdiqlangan + t.holat.yigilmoqda > 0"> · tayyorlanadi {{ fmtMiqdor(t.holat.tasdiqlangan + t.holat.yigilmoqda) }} kg</template></span>
                </div>
                <div class="bw-yg-bar"><i :style="{ width: Math.max(3, t.kg / yigma.tovarlar[0].kg * 100) + '%' }"/></div>
                <b class="bw-yg-kg">{{ fmtMiqdor(t.kg) }} kg</b>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template v-else>
        <!-- Header -->
        <div class="bw-rh">
          <button class="bw-back-btn" @click="selectedId = null">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="bw-rh-av" :style="{ background: avatarColor(selected.id) }">{{ (selected.mijoz_nomi||'?').charAt(0).toUpperCase() }}</div>
          <div class="bw-rh-info">
            <div class="bw-rh-name">{{ selected.mijoz_nomi }}</div>
            <div class="bw-rh-meta">#{{ selected.raqam }} · {{ selected.agent_nomi || '—' }}</div>
          </div>
          <div class="bw-rh-right">
            <button class="bw-chek-btn" :disabled="chekBusy.has(selected.id)" @click="chekChopEt([selected], true)" title="80 mm chek (XP-80C) — chop etish">
              <span v-if="chekBusy.has(selected.id)" class="bw-spin bw-spin--sm"/>
              <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Chek chop etish
            </button>
            <div class="bw-hbadge" :style="{ background: HOLAT_CFG[selected.holat]?.bg, color: HOLAT_CFG[selected.holat]?.color }">
              <span class="bw-chip-dot" :style="{ background: HOLAT_CFG[selected.holat]?.color }"/>
              {{ HOLAT_CFG[selected.holat]?.label }}
            </div>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="bw-progress">
          <template v-for="(h, i) in HOLAT_ORDER" :key="h">
            <div class="bw-ps" :class="{ done: holatIdx(selected.holat) > i, active: selected.holat === h, bekor: selected.holat === 'bekor' }">
              <div class="bw-ps-dot" :style="selected.holat === h ? { background: HOLAT_CFG[h].color } : {}">
                <svg v-if="holatIdx(selected.holat) > i" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span class="bw-ps-lbl">{{ HOLAT_CFG[h].label }}</span>
            </div>
            <div v-if="i < HOLAT_ORDER.length - 1" class="bw-ps-line" :class="{ done: holatIdx(selected.holat) > i }"/>
          </template>
        </div>

        <!-- Bekor banner -->
        <div class="bw-bekor-banner" v-if="selected.holat === 'bekor'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          Bekor qilingan{{ selected.bekor_sababi ? ': ' + selected.bekor_sababi : '' }}
        </div>

        <!-- KPI strip -->
        <div class="bw-kpi-strip">
          <div class="bw-kpi-i"><span class="bw-kpi-v">{{ fmtSum(selected.jami_summa) }}</span><span class="bw-kpi-l">Summa</span></div>
          <div class="bw-kpi-sep"/>
          <div class="bw-kpi-i"><span class="bw-kpi-v">{{ selected.qatorlar?.length || 0 }} xil</span><span class="bw-kpi-l">Tovar</span></div>
          <div class="bw-kpi-sep"/>
          <div class="bw-kpi-i"><span class="bw-kpi-v">{{ fmtMiqdor(totalDona(selected)) }}</span><span class="bw-kpi-l">kg</span></div>
          <div class="bw-kpi-sep"/>
          <div class="bw-kpi-i"><span class="bw-kpi-v">{{ fmtDate(selected.jonatish_sana) }}</span><span class="bw-kpi-l">Yetkazish</span></div>
        </div>

        <!-- Detail scroll -->
        <div class="bw-scroll">

          <!-- Info -->
          <div class="bw-info-row">
            <div class="bw-info-cell">
              <span class="bw-ik">Agent</span>
              <span class="bw-iv">{{ selected.agent_nomi || selected.agent?.fullname || '—' }}</span>
            </div>
            <div class="bw-info-cell">
              <span class="bw-ik">To'lov</span>
              <span class="bw-iv">{{ selected.tolov_turi || '—' }}</span>
            </div>
            <div class="bw-info-cell" v-if="selected.tolov_sana">
              <span class="bw-ik">To'lov sanasi</span>
              <span class="bw-iv">{{ selected.tolov_sana }}</span>
            </div>
            <div class="bw-info-cell" v-if="selected.mijoz?.telefon">
              <span class="bw-ik">Telefon</span>
              <span class="bw-iv">{{ selected.mijoz.telefon }}</span>
            </div>
            <div class="bw-info-cell">
              <span class="bw-ik">Dostavchi</span>
              <span class="bw-iv bw-iv--green" v-if="selected.dostavchi_nomi">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                {{ selected.dostavchi_nomi }}
              </span>
              <span class="bw-iv bw-iv--empty" v-else>—</span>
            </div>
          </div>

          <!-- Tovarlar -->
          <div class="bw-sec">
            <div class="bw-sec-hd">Buyurtma tarkibi <span class="bw-sec-cnt">{{ selected.qatorlar?.length || 0 }}</span></div>
            <div class="bw-tov-table">
              <div class="bw-tov-head">
                <span>Tovar</span><span class="r">Miqdor</span><span class="r">Summa</span>
              </div>
              <div class="bw-tov-row" v-for="(t, i) in selected.qatorlar" :key="t.id">
                <div class="bw-tov-name">
                  <div class="bw-tav" :style="{ background: TOV_COLORS[i % TOV_COLORS.length] }">{{ (t.tovar_nomi||'?').charAt(0) }}</div>
                  <div><span class="bw-tn">{{ t.tovar_nomi }}</span><span class="bw-tk">{{ t.turkum }}</span></div>
                </div>
                <span class="r"><span class="bw-pill bw-pill--g">{{ fmtMiqdor(t.jami_dona) }} kg</span></span>
                <span class="r bw-tsum">{{ Number(t.summa).toLocaleString() }}</span>
              </div>
              <div class="bw-tov-foot">
                <span>Jami</span>
                <strong>{{ fmtSum(selected.jami_summa) }}</strong>
              </div>
            </div>
          </div>

          <!-- Keyingi holat amallari -->
          <div class="bw-sec" v-if="HOLAT_CFG[selected.holat]?.next?.length">
            <div class="bw-sec-hd">Jarayon amallari</div>
            <div class="bw-next-holat">
              <button
                v-for="next in HOLAT_CFG[selected.holat].next" :key="next"
                class="bw-nh-btn"
                :class="{ 'bw-nh-btn--main': next !== 'bekor' }"
                :style="{ background: HOLAT_CFG[next].bg, color: HOLAT_CFG[next].color, borderColor: HOLAT_CFG[next].color + '44' }"
                :disabled="changing"
                @click="next === 'bekor' ? (bekorModal = true) : (next === 'yolda' ? openDostavchiModal(selected) : doChangeHolat(selected.id, next))"
              >
                <span v-if="changing && pendingHolat === next" class="bw-spin bw-spin--sm"/>
                <span v-else class="bw-chip-dot" :style="{ background: HOLAT_CFG[next].color }"/>
                {{ HOLAT_ACTION[next] || HOLAT_CFG[next].label }}
              </button>
            </div>
            <p class="bw-flow-hint" v-if="selected.holat === 'tasdiqlangan'">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Yig'ishga berishda ombor zaxirasi tekshiriladi
            </p>
            <p class="bw-flow-hint" v-else-if="selected.holat === 'yigilmoqda'">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Yo'lga chiqarilganda tovarlar ombordan ayriladi
            </p>
          </div>

          <!-- Admin: yetkazilgan buyurtmani bekor qilish (takror / xato yozilgan) -->
          <div class="bw-sec" v-if="selected.holat === 'yetkazildi' && admin">
            <div class="bw-sec-hd">Admin amali</div>
            <div class="bw-next-holat">
              <button class="bw-nh-btn" :style="{ background: HOLAT_CFG.bekor.bg, color: HOLAT_CFG.bekor.color, borderColor: HOLAT_CFG.bekor.color + '44' }" :disabled="changing" @click="bekorModal = true">
                <span v-if="changing && pendingHolat === 'bekor'" class="bw-spin bw-spin--sm"/>
                <span v-else class="bw-chip-dot" :style="{ background: HOLAT_CFG.bekor.color }"/>
                Yetkazilgan buyurtmani bekor qilish
              </button>
            </div>
            <p class="bw-flow-hint">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Takror yoki xato yozilgan buyurtma uchun: tovar omborga qaytadi, naqd kassadan, qarz mijoz balansidan, bonus agentdan olib tashlanadi
            </p>
          </div>

        </div>
      </template>
    </div>

    <!-- Bekor modal -->
    <Teleport to="body">
      <Transition name="m-fade">
        <div v-if="bekorModal" class="m-overlay" @click.self="bekorModal = false">
          <div class="m-box m-box--sm">
            <div class="m-hd">
              <div class="m-hd-left">
                <div class="m-hd-ic" style="background:#ef4444">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                </div>
                <span class="m-hd-title" style="color:#ef4444">Buyurtmani bekor qilish</span>
              </div>
              <button class="m-close" @click="bekorModal = false">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style="padding:16px 20px;display:flex;flex-direction:column;gap:6px">
              <label style="font-size:12.5px;font-weight:700;color:#334155">{{ selected?.holat === 'yetkazildi' ? 'Sabab (majburiy)' : 'Sabab (ixtiyoriy)' }}</label>
              <textarea v-model="bekorSababi" rows="3" placeholder="Bekor qilish sababi..." style="padding:9px 11px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;resize:none;outline:none;font-family:inherit"/>
              <p class="bw-flow-hint" v-if="selected?.holat === 'yolda'" style="margin-top:4px">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Tovarlar ombordan chiqgan — bekor qilinsa qaytariladi
              </p>
              <p class="bw-flow-hint" v-else-if="selected?.holat === 'yetkazildi'" style="margin-top:4px">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Yetkazilgan buyurtma: tovar omborga qaytadi, kassa yozuvi o'chadi, mijoz qarzi va agent bonusi kamayadi. Sabab majburiy.
              </p>
            </div>
            <div class="m-ft">
              <div/>
              <div class="m-ft-right">
                <button class="m-btn-cancel" @click="bekorModal = false">Orqaga</button>
                <button class="m-btn-send" style="background:#ef4444;box-shadow:0 2px 10px rgba(239,68,68,.3)" :disabled="changing || (selected?.holat === 'yetkazildi' && bekorSababi.trim().length < 3)" @click="doChangeHolat(selected.id, 'bekor')">
                  <span v-if="changing" class="bw-spin bw-spin--sm"/>
                  Bekor qilish
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ═══ YIG'MA RO'YXAT MODAL ═══ -->
    <Teleport to="body">
      <Transition name="m-fade">
        <div v-if="yigmaModal" class="m-overlay" @click.self="yigmaModal = false">
          <div class="m-box m-box--yg">
            <div class="m-hd">
              <div class="m-hd-ic">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </div>
              <div class="bw-yg-hdt">
                <div class="m-hd-title">{{ yigmaSarlavha }} — tovarlar bo'yicha</div>
                <div class="bw-yg-sub">{{ fmtDate(jonatishSana) }}<template v-if="isToday"> · bugun va hali yetkazilmagan hammasi</template><template v-if="subHolat"> · filtr: {{ HOLAT_CFG[subHolat]?.label }}</template><template v-if="search"> · qidiruv: «{{ search }}»</template></div>
              </div>
              <div class="bw-yg-seg" role="group" aria-label="Holat">
                <button :class="{ on: yigmaHolat === '' }" @click="yigmaHolat = ''">Hammasi</button>
                <button :class="{ on: yigmaHolat === 'tayyor' }" @click="yigmaHolat = 'tayyor'" title="Tasdiqlangan + yig'ilmoqda — ombor hali tayyorlashi kerak">Tayyorlanadi</button>
                <button :class="{ on: yigmaHolat === 'yolda' }" @click="yigmaHolat = 'yolda'">Yo'lda</button>
                <button :class="{ on: yigmaHolat === 'yetkazildi' }" @click="yigmaHolat = 'yetkazildi'">Yetkazildi</button>
              </div>
              <button class="m-close" @click="yigmaModal = false">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div class="bw-kpi-strip">
              <div class="bw-kpi-i"><span class="bw-kpi-v">{{ yigmaModalData.zakazlar }}</span><span class="bw-kpi-l">Zakaz</span></div>
              <div class="bw-kpi-sep"/>
              <div class="bw-kpi-i"><span class="bw-kpi-v">{{ yigmaModalData.mijozlar }}</span><span class="bw-kpi-l">Mijoz</span></div>
              <div class="bw-kpi-sep"/>
              <div class="bw-kpi-i"><span class="bw-kpi-v">{{ yigmaModalData.tovarlar.length }} xil</span><span class="bw-kpi-l">Tovar</span></div>
              <div class="bw-kpi-sep"/>
              <div class="bw-kpi-i"><span class="bw-kpi-v">{{ fmtMiqdor(yigmaModalData.kg) }}</span><span class="bw-kpi-l">kg jami</span></div>
              <div class="bw-kpi-sep"/>
              <div class="bw-kpi-i"><span class="bw-kpi-v">{{ fmtSum(yigmaModalData.summa) }}</span><span class="bw-kpi-l">Summa</span></div>
            </div>

            <div class="bw-yg-body">
              <table class="bw-yg-t" v-if="yigmaModalData.tovarlar.length">
                <thead>
                  <tr>
                    <th>Tovar</th><th class="r">Zakaz</th><th class="r">Jami</th>
                    <th class="r h" :style="{ color: HOLAT_CFG.tasdiqlangan.color }">Tasdiqlangan</th>
                    <th class="r h" :style="{ color: HOLAT_CFG.yigilmoqda.color }">Yig'ilmoqda</th>
                    <th class="r h" :style="{ color: HOLAT_CFG.yolda.color }">Yo'lda</th>
                    <th class="r h" :style="{ color: HOLAT_CFG.yetkazildi.color }">Yetkazildi</th>
                    <th class="r">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="t in yigmaModalData.tovarlar" :key="t.key">
                    <tr class="bw-yg-tr" :class="{ on: yigmaOchiq.has(t.key) }" @click="yigmaToggle(t.key)">
                      <td>
                        <div class="bw-yg-name">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                          <span class="bw-tn">{{ t.nomi }}</span><span class="bw-tk" v-if="t.turkum">{{ t.turkum }}</span>
                        </div>
                      </td>
                      <td class="r">{{ t.zakazlar }}</td>
                      <td class="r"><b>{{ fmtMiqdor(t.kg) }} kg</b></td>
                      <td class="r h">{{ t.holat.tasdiqlangan ? fmtMiqdor(t.holat.tasdiqlangan) : '—' }}</td>
                      <td class="r h">{{ t.holat.yigilmoqda ? fmtMiqdor(t.holat.yigilmoqda) : '—' }}</td>
                      <td class="r h">{{ t.holat.yolda ? fmtMiqdor(t.holat.yolda) : '—' }}</td>
                      <td class="r h">{{ t.holat.yetkazildi ? fmtMiqdor(t.holat.yetkazildi) : '—' }}</td>
                      <td class="r">{{ fmtSum(t.summa) }}</td>
                    </tr>
                    <tr v-if="yigmaOchiq.has(t.key)" class="bw-yg-sub">
                      <td colspan="8">
                        <div class="bw-yg-mj">
                          <span v-for="m in t.mijozlar" :key="m.id + '-' + m.kg" class="bw-yg-mj-i" :title="`#${m.raqam} · ${HOLAT_CFG[m.holat]?.label}`">
                            <i :style="{ background: HOLAT_CFG[m.holat]?.color }"/>{{ m.mijoz }} <b>{{ fmtMiqdor(m.kg) }} kg</b><small>#{{ m.raqam }}</small>
                          </span>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
                <tfoot>
                  <tr>
                    <td>Jami · {{ yigmaModalData.tovarlar.length }} xil tovar</td>
                    <td class="r">{{ yigmaModalData.zakazlar }}</td>
                    <td class="r"><b>{{ fmtMiqdor(yigmaModalData.kg) }} kg</b></td>
                    <td class="r h">{{ yigmaJamiHolat.tasdiqlangan ? fmtMiqdor(yigmaJamiHolat.tasdiqlangan) : '—' }}</td>
                    <td class="r h">{{ yigmaJamiHolat.yigilmoqda ? fmtMiqdor(yigmaJamiHolat.yigilmoqda) : '—' }}</td>
                    <td class="r h">{{ yigmaJamiHolat.yolda ? fmtMiqdor(yigmaJamiHolat.yolda) : '—' }}</td>
                    <td class="r h">{{ yigmaJamiHolat.yetkazildi ? fmtMiqdor(yigmaJamiHolat.yetkazildi) : '—' }}</td>
                    <td class="r"><b>{{ fmtSum(yigmaModalData.summa) }}</b></td>
                  </tr>
                </tfoot>
              </table>
              <div v-else class="bw-list-empty" style="padding:40px"><span>Bu holatda zakaz yo'q</span></div>
            </div>

            <div class="m-ft">
              <div class="bw-yg-hint">Tovar qatorini bosing — qaysi mijoz qancha buyurtma qilgani ko'rinadi</div>
              <div class="m-ft-right">
                <button class="m-btn-cancel" @click="yigmaChop" title="A4 — omborchi uchun yig'ish ro'yxati">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Chop etish
                </button>
                <button class="m-btn-send" @click="yigmaModal = false">Yopish</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- TOAST -->
    <Teleport to="body">
      <Transition name="toast-slide">
        <div v-if="toast.show" class="bw-toast" :class="`bw-toast--${toast.type}`">
          <div class="bw-toast-ic">
            <svg v-if="toast.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <span>{{ toast.msg }}</span>
        </div>
      </Transition>
    </Teleport>

    <!-- ═══ DOSTAVCHI TAYINLASH MODAL ═══ -->
    <DostavchiTayinlashModal
      v-model:open="dmOpen"
      :ariza-id="dmArizaId"
      @assigned="onDostavchiAssigned"
      @error="(msg) => showToast(msg, 'error')"
    />

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
// @ts-ignore
import { arizaApi, sozlamaApi } from '@/api/api'
import DostavchiTayinlashModal from '@/components/DostavchiTayinlashModal.vue'
// @ts-ignore
import { chekChop } from '@/utils/chek'
import { authStore } from '@/stores/auth'

const router = useRouter()

const HOLAT_CFG = {
  tasdiqlangan: { label: 'Tasdiqlangan', color: '#5b21b6', bg: 'rgba(91,33,182,.1)',  next: ['yigilmoqda', 'bekor'] },
  yigilmoqda:   { label: "Yig'ilmoqda",  color: '#f59e0b', bg: 'rgba(245,158,11,.1)', next: ['yolda', 'bekor'] },
  yolda:        { label: "Yo'lda",        color: '#475569', bg: 'rgba(71,85,105,.1)', next: ['yetkazildi', 'bekor'] },
  yetkazildi:   { label: 'Yetkazildi',   color: '#10b981', bg: 'rgba(16,185,129,.1)', next: [] },
  bekor:        { label: 'Bekor',        color: '#ef4444', bg: 'rgba(239,68,68,.1)',   next: [] },
}
const HOLAT_ACTION = {
  yigilmoqda: "Yig'ishga berish",
  yolda:      "Yo'lga chiqarish",
  yetkazildi: 'Yetkazildi',
  bekor:      'Bekor qilish',
}
const HOLAT_ORDER    = ['tasdiqlangan', 'yigilmoqda', 'yolda', 'yetkazildi']
const BUYURTMA_HOLAT = ['tasdiqlangan', 'yigilmoqda', 'yolda', 'yetkazildi']
const TOV_COLORS = ['#7c3aed','#8b5cf6','#6d28d9','#5b21b6']
const COLORS = ['#7c3aed','#8b5cf6','#6d28d9','#5b21b6']
const avatarColor = (id) => COLORS[id % COLORS.length]

// ── State ────────────────────────────────────────────────
// Mahalliy sana (toISOString UTC beradi: Toshkentda 00:00–05:00 orasida kechagi kun,
// "keyingi kun" tugmasi esa joyida qolardi)
function sanaKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function todayStr() { return sanaKey(new Date()) }

const rows       = ref([])
const loading    = ref(false)
const search     = ref('')
const subHolat   = ref('')
const jonatishSana = ref(todayStr())
const selectedId = ref(null)
const selected   = computed(() => rows.value.find(r => r.id === selectedId.value) || null)
const isMobile   = ref(window.innerWidth < 768)
const isToday    = computed(() => jonatishSana.value === todayStr())
const changing   = ref(false)
const pendingHolat = ref('')
const bekorModal  = ref(false)
const bekorSababi = ref('')
// Yetkazilgan buyurtmani bekor qilish (takror / xato) — faqat Admin/Programmer (backend ham tekshiradi)
const admin = computed(() => authStore.isAdmin.value)

const toast = reactive({ show: false, msg: '', type: 'success' })
let toastTimer
function showToast(msg, type = 'success', ms = 2600) {
  clearTimeout(toastTimer)
  Object.assign(toast, { show: true, msg, type })
  toastTimer = setTimeout(() => { toast.show = false }, ms)
}

// ── Computed ─────────────────────────────────────────────
const filtered = computed(() => rows.value)

// ── Load ─────────────────────────────────────────────────
let debT
function debouncedLoad() { clearTimeout(debT); debT = setTimeout(load, 350) }

async function load() {
  loading.value = true
  try {
    const holat = subHolat.value || 'tasdiqlangan,yigilmoqda,yolda,yetkazildi'
    // Faqat distributsiya: avtolavka sotuvlari (mashinadan) Avtolavka → Sotuvlar sahifasida
    const params = { holat, all: 'true', kanal: 'distributsiya' }
    if (search.value) params.search = search.value
    if (jonatishSana.value) params.jonatish_sana = jonatishSana.value
    // Bugun: yetkazish sanasidan qat'i nazar hali yetkazilmagan hamma buyurtma ham
    // (mobil zakaz ertangi sana bilan keladi — tasdiqlangach shu yerda ko'rinsin)
    if (isToday.value) params.ochiq = 'true'
    const data = await arizaApi.getAll(params)
    rows.value = Array.isArray(data) ? data : (data.rows || [])
  } catch (e) {
    showToast(e.message || 'Yuklash xatosi', 'error')
  } finally {
    loading.value = false
  }
}

function setHolat(k) { subHolat.value = k; load() }

function shiftDate(delta) {
  const d = new Date(jonatishSana.value + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  jonatishSana.value = sanaKey(d)
  load()
}
function goToday() { jonatishSana.value = todayStr(); load() }

async function selectRow(row) {
  if (selectedId.value === row.id) { selectedId.value = null; return }
  selectedId.value = row.id
  // to'liq ma'lumot
  try {
    const full = await arizaApi.getById(row.id)
    const idx = rows.value.findIndex(r => r.id === row.id)
    if (idx !== -1) rows.value[idx] = full
  } catch {}
}

function holatIdx(h) { return HOLAT_ORDER.indexOf(h) }
function totalDona(row) { return (row.qatorlar || []).reduce((s, t) => s + Number(t.jami_dona || 0), 0) }

// ── Yig'ma ro'yxat: ro'yxatdagi zakazlar tovarlar bo'yicha jamlangan ─────────
// "Tovuq go'shti 3 kg dan 5 zakaz → jami 15 kg": omborchi nimani qancha tayyorlashini ko'radi.
// Ro'yxat API'si har zakaz bilan qatorlarni qaytaradi — qo'shimcha so'rov yo'q; filtr (holat,
// qidiruv, sana) ro'yxatga qanday ta'sir qilsa yig'maga ham shunday. Bekor qilinganlar kirmaydi.
const yigmaModal = ref(false)
const yigmaHolat = ref('')                 // '' | tayyor (tasdiqlangan+yig'ilmoqda) | yolda | yetkazildi
const yigmaOchiq = ref(new Set())          // modalda ochilgan tovar qatorlari (mijozlar ko'rinadi)
const YIGMA_FILTR = {
  '': () => true,
  tayyor: r => r.holat === 'tasdiqlangan' || r.holat === 'yigilmoqda',
  yolda: r => r.holat === 'yolda',
  yetkazildi: r => r.holat === 'yetkazildi',
}
function yigmaHisobla(filtr) {
  const map = new Map()
  const zakazlar = rows.value.filter(r => r.holat !== 'bekor' && filtr(r))
  const mijozlar = new Set()
  let summa = 0
  for (const r of zakazlar) {
    mijozlar.add(r.mijoz_id || r.mijoz_nomi)
    summa += Number(r.jami_summa || 0)
    for (const q of r.qatorlar || []) {
      const key = q.tovar_id || q.tovar_nomi
      const t = map.get(key) || { key, nomi: q.tovar_nomi, turkum: q.turkum || '', kg: 0, summa: 0, zakazlar: 0, holat: { tasdiqlangan: 0, yigilmoqda: 0, yolda: 0, yetkazildi: 0 }, mijozlar: [] }
      const kg = Number(q.jami_dona || 0)
      t.kg += kg; t.summa += Number(q.summa || 0); t.zakazlar += 1
      t.holat[r.holat] = (t.holat[r.holat] || 0) + kg
      t.mijozlar.push({ id: r.id, raqam: r.raqam, mijoz: r.mijoz_nomi || '—', kg, holat: r.holat })
      map.set(key, t)
    }
  }
  const tovarlar = [...map.values()].sort((a, b) => b.kg - a.kg)
  tovarlar.forEach(t => t.mijozlar.sort((a, b) => b.kg - a.kg))
  return { tovarlar, zakazlar: zakazlar.length, mijozlar: mijozlar.size, kg: tovarlar.reduce((s, t) => s + t.kg, 0), summa }
}
const yigma = computed(() => yigmaHisobla(YIGMA_FILTR['']))
const yigmaModalData = computed(() => yigmaHisobla(YIGMA_FILTR[yigmaHolat.value] || YIGMA_FILTR['']))
const yigmaJamiHolat = computed(() => yigmaModalData.value.tovarlar.reduce((j, t) => {
  for (const k of HOLAT_ORDER) j[k] += t.holat[k] || 0
  return j
}, { tasdiqlangan: 0, yigilmoqda: 0, yolda: 0, yetkazildi: 0 }))
const yigmaSarlavha = computed(() => (isToday.value ? 'Bugungi zakazlar' : `${fmtDate(jonatishSana.value)} zakazlari`))
function yigmaToggle(key) { const s = new Set(yigmaOchiq.value); s.has(key) ? s.delete(key) : s.add(key); yigmaOchiq.value = s }
function yigmaOch(key) { yigmaOchiq.value = new Set([key]); yigmaModal.value = true }

// A4 yig'ish ro'yxati — omborchi uchun (yashirin iframe, chek.js bilan bir usul)
function yigmaChop() {
  const d = yigmaModalData.value
  const esc = (v) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const kgYoki = (v) => (v ? fmtMiqdor(v) : '—')
  const holatNomi = (h) => HOLAT_CFG[h]?.label || h
  const qatorlar = d.tovarlar.map((t, i) => `<tr><td>${i + 1}</td><td><b>${esc(t.nomi)}</b>${t.turkum ? `<small>${esc(t.turkum)}</small>` : ''}</td><td class="r">${t.zakazlar}</td><td class="r"><b>${fmtMiqdor(t.kg)}</b></td><td class="r">${kgYoki(t.holat.tasdiqlangan)}</td><td class="r">${kgYoki(t.holat.yigilmoqda)}</td><td class="r">${kgYoki(t.holat.yolda)}</td><td class="r">${kgYoki(t.holat.yetkazildi)}</td><td class="r">${fmtSum(t.summa)}</td><td class="chk"></td></tr>
<tr class="sub"><td></td><td colspan="9">${t.mijozlar.map(m => `${esc(m.mijoz)} — <b>${fmtMiqdor(m.kg)} kg</b> (#${esc(m.raqam)}, ${esc(holatNomi(m.holat))})`).join(' · ')}</td></tr>`).join('')
  const holatMatn = { '': 'barcha holatlar', tayyor: "tayyorlanadigan (tasdiqlangan + yig'ilmoqda)", yolda: "yo'lda", yetkazildi: 'yetkazilgan' }[yigmaHolat.value]
  const html = `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>Yig'ma ro'yxat</title><style>
  @page { size: A4; margin: 12mm; } body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 3px; } p.s { margin: 0 0 10px; font-size: 12px; color: #333; }
  table { width: 100%; border-collapse: collapse; } th, td { border-bottom: 1px solid #999; padding: 5px 6px; text-align: left; vertical-align: top; }
  th { font-size: 10.5px; text-transform: uppercase; border-bottom: 2px solid #000; } td.r, th.r { text-align: right; white-space: nowrap; }
  td small { display: block; color: #555; font-size: 10.5px; } tr.sub td { border-bottom: 1px solid #ddd; font-size: 10.5px; color: #333; padding-top: 0; }
  td.chk { width: 18px; } td.chk::before { content: ''; display: inline-block; width: 12px; height: 12px; border: 1.5px solid #000; }
  tfoot td { font-weight: bold; border-top: 2px solid #000; border-bottom: 0; }
  .imzo { margin-top: 26px; display: flex; gap: 40px; } .imzo span { flex: 1; border-top: 1px solid #000; padding-top: 4px; font-size: 11px; }
  </style></head><body>
  <h1>Yig'ma ro'yxat — ${esc(yigmaSarlavha.value)}</h1>
  <p class="s">${esc(fmtDate(jonatishSana.value))} · ${holatMatn} · ${d.zakazlar} ta zakaz · ${d.mijozlar} ta mijoz · ${fmtMiqdor(d.kg)} kg · ${fmtSum(d.summa)} · chop etildi ${new Date().toLocaleString('ru-RU')}</p>
  <table><thead><tr><th>№</th><th>Tovar</th><th class="r">Zakaz</th><th class="r">Jami kg</th><th class="r">Tasdiq.</th><th class="r">Yig'il.</th><th class="r">Yo'lda</th><th class="r">Yetkaz.</th><th class="r">Summa</th><th></th></tr></thead>
  <tbody>${qatorlar}</tbody>
  <tfoot><tr><td></td><td>Jami · ${d.tovarlar.length} xil</td><td class="r">${d.zakazlar}</td><td class="r">${fmtMiqdor(d.kg)}</td><td class="r">${kgYoki(yigmaJamiHolat.value.tasdiqlangan)}</td><td class="r">${kgYoki(yigmaJamiHolat.value.yigilmoqda)}</td><td class="r">${kgYoki(yigmaJamiHolat.value.yolda)}</td><td class="r">${kgYoki(yigmaJamiHolat.value.yetkazildi)}</td><td class="r">${fmtSum(d.summa)}</td><td></td></tr></tfoot></table>
  <div class="imzo"><span>Omborchi</span><span>Yig'di</span><span>Tekshirdi</span></div>
  </body></html>`
  const f = document.createElement('iframe')
  f.setAttribute('aria-hidden', 'true')
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;'
  document.body.appendChild(f)
  const doc = f.contentDocument || f.contentWindow.document
  doc.open(); doc.write(html); doc.close()
  const w = f.contentWindow
  const tozala = () => setTimeout(() => f.remove(), 500)
  w.onafterprint = tozala
  setTimeout(() => { try { w.focus(); w.print() } catch { tozala() } }, 150)
  setTimeout(() => { if (document.body.contains(f)) f.remove() }, 60000)
}

// ── Holat o'zgartirish (real API) ────────────────────────
async function doChangeHolat(id, next) {
  changing.value = true
  pendingHolat.value = next
  try {
    const body = { holat: next }
    if (next === 'bekor') body.bekor_sababi = bekorSababi.value || null
    const result = await arizaApi.changeHolat(id, body)
    const idx = rows.value.findIndex(r => r.id === id)
    if (idx !== -1) rows.value[idx] = result
    bekorModal.value = false
    bekorSababi.value = ''

    if (next === 'yolda') showToast("Yo'lga chiqarildi — tovarlar ombordan ayrildi")
    else if (next === 'yetkazildi') showToast('Yetkazildi — mijoz balansiga yozildi')
    else if (next === 'bekor' && result._bekor) {
      // Yetkazilgan buyurtma teskari yozildi — nima qaytgani va ogohlantirishlar
      const b = result._bekor
      const q = []
      if (b.tovar?.length) q.push(`${b.tovar.map(t => `${fmtMiqdor(t.dona)} kg → ${t.ombor}`).join(', ')}`)
      if (b.naqd > 0) q.push(`${fmtSum(b.naqd)} naqd kassadan olindi`)
      if (b.qarz > 0) q.push(`${fmtSum(b.qarz)} qarz mijozdan olindi`)
      if (b.bonus > 0) q.push(`${fmtSum(b.bonus)} bonus olindi`)
      const ogoh = (b.ogohlantirishlar || []).join(' ')
      showToast(`Bekor qilindi: ${q.join(' · ')}${ogoh ? '. ' + ogoh : ''}`, ogoh ? 'error' : 'success', ogoh ? 12000 : 7000)
    }
    else if (next === 'bekor') showToast('Buyurtma bekor qilindi', 'error')
    else showToast(`Holat: ${HOLAT_CFG[next].label}`)

    // bekor/yetkazildi bo'lsa va filter ularni ko'rsatmasa — ro'yxatdan o'chadi
    if ((next === 'bekor') && subHolat.value && subHolat.value !== 'bekor') {
      rows.value = rows.value.filter(r => r.id !== id)
      selectedId.value = null
    }
  } catch (e) {
    showToast(e.message || 'Xatolik', 'error')
  } finally {
    changing.value = false
    pendingHolat.value = ''
  }
}

// ── Dostavchi tayinlash (yo'lga chiqarish bosqichida) ────
const dmOpen    = ref(false)
const dmArizaId = ref(null)

function openDostavchiModal(row) {
  dmArizaId.value = row.id
  dmOpen.value = true
}

// ── Chek (80 mm, XP-80C) ──────────────────────────────────
// Firma rekvizitlari Sozlamalar → Chek'dan; yo'lga chiqarilgan har bir buyurtma uchun
// alohida chek, bitta chop etish oynasida (dostavchik mijozga beradi, mijoz imzo qo'yadi)
const chekFirma = ref({})
async function chekFirmaYukla() { try { chekFirma.value = await sozlamaApi.getChek() } catch { /* standart sarlavha */ } }
onMounted(chekFirmaYukla)
// Har bir zakaz (holatidan qat'i nazar) ro'yxatdagi kartadan yoki detal sarlavhasidan chop etiladi.
// qolda=true — foydalanuvchi o'zi bosdi: xabar ko'rsatiladi; avtomatik (yo'lga chiqarishda) — jim.
const chekBusy = ref(new Set())
async function chekChopEt(arizalar, qolda = false) {
  const idlar = arizalar.map(a => a.id)
  chekBusy.value = new Set([...chekBusy.value, ...idlar])
  try {
    // To'liq ma'lumot (qatorlar, mijoz telefoni/balansi, dostavchik) kerak — ro'yxat qisqa bo'lishi mumkin
    const toliq = await Promise.all(arizalar.map(a => (a.qatorlar && a.mijoz) ? a : arizaApi.getById(a.id).catch(() => a)))
    chekChop(toliq, chekFirma.value)
    if (qolda) showToast(toliq.length === 1 ? `Chek chop etishga yuborildi — #${toliq[0].raqam || toliq[0].id}` : `${toliq.length} ta chek chop etishga yuborildi`)
  } catch (e) {
    showToast(e.message || 'Chek chop etilmadi', 'error')
  } finally {
    const s = new Set(chekBusy.value); idlar.forEach(id => s.delete(id)); chekBusy.value = s
  }
}

function onDostavchiAssigned({ result, yuborildi, xatolar, dostavchiNomi }) {
  // Bir vaqtda bir nechta ariza o'zgargani uchun ro'yxatni to'liq yangilaymiz
  load()
  // Yo'lga chiqqanlarga chek — dostavchik olib ketadi
  const idlar = (result?.muvaffaqiyat || []).map(x => x.ariza_id).filter(Boolean)
  if (idlar.length) chekChopEt(idlar.map(id => ({ id })))

  const kim = dostavchiNomi ? ' · ' + dostavchiNomi : ''
  if (xatolar?.length) {
    showToast(
      `${yuborildi} ta zakaz yo'lga chiqdi${kim}. ${xatolar.length} tasi o'tmadi: ${xatolar[0].xato}`,
      'error'
    )
  } else {
    showToast(`${yuborildi} ta zakaz yo'lga chiqarildi — tovarlar ombordan ayrildi${kim}`)
  }
}

function goArizalar() { router.push('/sotuvlar/arizalar') }

// ── Formatters ───────────────────────────────────────────
function fmtSum(v) { return v ? Math.round(v).toLocaleString('uz-UZ') + " so'm" : '0' }
function fmtMiqdor(v) { return Number(v || 0).toLocaleString('uz-UZ', { maximumFractionDigits: 3 }) }
function fmtShort(v) {
  const n = parseFloat(v || 0)
  if (!n) return '0'
  if (n >= 1e9) return (n/1e9).toFixed(1) + ' mlrd'
  if (n >= 1e6) return (n/1e6).toFixed(1) + ' mln'
  if (n >= 1e3) return (n/1e3).toFixed(0) + ' ming'
  return String(Math.round(n))
}
function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('uz-UZ', { day:'2-digit', month:'2-digit', year:'2-digit' })
}

onMounted(load)
</script>

<style scoped>
/* ── Wrap ── */
.bw-wrap {
  display: grid; grid-template-columns: 360px 1fr;
  height: calc(100vh - 64px); overflow: hidden; background: #f8fafc;
}

/* ── LEFT ── */
.bw-left {
  display: flex; flex-direction: column;
  background: #fff; border-right: 1px solid #e8ecf4; overflow: hidden;
}
.bw-lhd {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 16px 10px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0;
}
.bw-lhd-title { font-size: 16px; font-weight: 800; color: #1e293b; margin: 0 0 2px; }
.bw-lhd-sub   { font-size: 11px; color: #94a3b8; margin: 0; }

.bw-new-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 10px; border: none;
  background: #8b5cf6; color: #fff; font-size: 12.5px; font-weight: 700;
  cursor: pointer; box-shadow: 0 2px 8px rgba(139,92,246,.3); transition: .13s;
}
.bw-new-btn:hover { background: #7c3aed; transform: translateY(-1px); }

/* Date filter */
.bw-date-row { display: flex; align-items: center; gap: 6px; padding: 10px 14px 0; flex-shrink: 0; }
.bw-date-nav {
  width: 30px; height: 32px; border-radius: 8px; border: 1.5px solid #e2e8f0;
  background: #fff; color: #64748b; cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; transition: .12s;
}
.bw-date-nav:hover { border-color: #8b5cf6; color: #8b5cf6; }
.bw-date-in {
  flex: 1; height: 32px; padding: 0 8px; border-radius: 8px;
  border: 1.5px solid #e2e8f0; background: #fff; color: #1e293b;
  font-size: 12.5px; outline: none; transition: .12s; font-family: inherit;
}
.bw-date-in:focus { border-color: #8b5cf6; }
.bw-date-today {
  padding: 0 11px; height: 32px; border-radius: 8px; border: 1.5px solid #ddd6fe;
  background: #f5f3ff; color: #8b5cf6; font-size: 11.5px; font-weight: 700;
  cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: .12s;
}
.bw-date-today:hover { background: #ede9fe; }

.bw-search-row { padding: 10px 14px 0; flex-shrink: 0; }
.bw-search-box {
  display: flex; align-items: center; gap: 8px;
  padding: 0 11px; height: 36px;
  background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 9px;
  transition: border-color .13s;
}
.bw-search-box:focus-within { border-color: #8b5cf6; background: #fff; }
.bw-search-box svg { color: #94a3b8; flex-shrink: 0; }
.bw-search-in { flex: 1; border: none; outline: none; font-size: 13px; color: #1e293b; background: transparent; }
.bw-search-in::placeholder { color: #94a3b8; }

/* Tabs */
.bw-tabs { display: flex; gap: 6px; padding: 10px 14px 0; flex-shrink: 0; }
.bw-tab {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 7px 8px; border-radius: 9px; border: 1.5px solid #e2e8f0;
  background: #fff; font-size: 12.5px; font-weight: 600; color: var(--seg-ink); cursor: pointer; transition: .13s;
}
.bw-tab.on     { border-color:var(--chip-on-brd); background:var(--chip-on-bg); color:var(--chip-on-ink); }
.bw-tab:hover:not(.on) { border-color: var(--chip-on-brd); color: var(--seg-ink-h); }
.bw-tab-dot    { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.bw-tab-dot--a { background: #8b5cf6; }
.bw-tab-dot--b { background: #10b981; }
.bw-tab.on .bw-tab-cnt { background:var(--cnt-on-bg); color:var(--chip-on-ink); }
.bw-tab-cnt {
  font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 9px;
  background: rgba(0,0,0,.06);
}

/* Holat filter */
.bw-hfilter {
  display: flex; gap: 4px; flex-wrap: wrap;
  padding: 8px 14px 0; flex-shrink: 0;
}
.bw-hf {
  display: flex; align-items: center; gap: 4px;
  padding: 3px 9px; border-radius: 20px; border: 1.5px solid #e2e8f0;
  background: #fff; font-size: 10.5px; font-weight: 500; color: #64748b; cursor: pointer; transition: .12s; white-space: nowrap;
}
.bw-hf.on  { font-weight: 700; }
.bw-hf-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

/* List */
.bw-list { flex: 1; overflow-y: auto; padding: 8px 10px 16px; display: flex; flex-direction: column; gap: 5px; }
.bw-list-empty {
  display: flex; flex-direction: column; align-items: center; gap: 7px;
  padding: 40px; color: #94a3b8; font-size: 12.5px;
}

/* Card */
.bw-card {
  border: 1.5px solid #e2e8f0; border-radius: 13px; padding: 11px 12px;
  cursor: pointer; background: #fff; transition: .13s;
  display: flex; flex-direction: column; gap: 6px;
}
.bw-card:hover  { border-color: #ddd6fe; box-shadow: 0 2px 10px rgba(139,92,246,.07); }
.bw-card.active { border-color: #8b5cf6; box-shadow: 0 3px 14px rgba(139,92,246,.12); background: #fbfaff; }

.bw-card-row1 { display: flex; align-items: flex-start; gap: 9px; }
.bw-card-av {
  width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
  color: #fff; font-size: 13px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.bw-card-info  { flex: 1; min-width: 0; }
.bw-card-name  { font-size: 13px; font-weight: 700; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bw-card-sub   { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.bw-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.bw-card-sum   { font-size: 12px; font-weight: 800; color: #1e293b; }

.bw-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 20px; font-size: 10.5px; font-weight: 700; white-space: nowrap;
}
.bw-chip--ariza { background: rgba(139,92,246,.1); color: #8b5cf6; }
.bw-chip-dot    { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

.bw-card-row2 { display: flex; flex-wrap: wrap; gap: 3px; }
.bw-card-tov {
  background: #f8fafc; border: 1px solid #e2e8f0;
  padding: 1px 7px; border-radius: 5px; font-size: 10.5px; color: #334155;
}
.bw-tov-x    { color: #8b5cf6; font-weight: 700; }
.bw-card-more { font-size: 10.5px; color: #94a3b8; padding: 1px 3px; }

.bw-card-row3 {
  display: flex; align-items: center; gap: 5px;
  font-size: 10.5px; color: #94a3b8;
}
.bw-card-row3 svg { flex-shrink: 0; }

/* ── RIGHT ── */
.bw-right { display: flex; flex-direction: column; background: #fff; overflow: hidden; }
.bw-nosel {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; color: #94a3b8; text-align: center;
}
.bw-nosel-ic {
  width: 60px; height: 60px; border-radius: 16px; background: #f1f5f9;
  display: flex; align-items: center; justify-content: center; margin-bottom: 4px;
}
.bw-nosel-ic svg { opacity: .35; }
.bw-nosel p { font-size: 13px; color: #64748b; margin: 0; }

/* Right header */
.bw-rh {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 20px 12px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0;
}
.bw-back-btn {
  display: none; width: 28px; height: 28px; border-radius: 7px;
  border: 1.5px solid #e2e8f0; background: #fff; cursor: pointer;
  align-items: center; justify-content: center; color: #64748b; flex-shrink: 0;
}
.bw-rh-av {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  color: #fff; font-size: 14px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.bw-rh-info { flex: 1; min-width: 0; }
.bw-rh-name { font-size: 14.5px; font-weight: 800; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bw-rh-meta { font-size: 11.5px; color: #94a3b8; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bw-rh-right { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }

/* Ariza action btns */
.bw-btn-reject {
  display: flex; align-items: center; gap: 5px;
  padding: 7px 13px; border-radius: 9px;
  border: 1.5px solid #fecaca; background: #fef2f2;
  color: #ef4444; font-size: 12.5px; font-weight: 700; cursor: pointer; transition: .12s;
}
.bw-btn-reject:hover { background: #fee2e2; }
.bw-btn-approve {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 15px; border-radius: 9px; border: none;
  background: linear-gradient(135deg, #10b981, #059669); color: #fff;
  font-size: 12.5px; font-weight: 700; cursor: pointer;
  box-shadow: 0 2px 10px rgba(16,185,129,.28); transition: .12s;
}
.bw-btn-approve:hover:not(:disabled) { filter: brightness(1.07); }
.bw-btn-approve:disabled { opacity: .7; cursor: not-allowed; }
.bw-spin { animation: bw-rot .7s linear infinite; }
@keyframes bw-rot { to { transform: rotate(360deg) } }

.bw-hbadge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;
}

/* Progress */
.bw-progress {
  display: flex; align-items: center;
  padding: 10px 20px; border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0; background: #fbfaff;
}
.bw-ps { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.bw-ps-dot {
  width: 24px; height: 24px; border-radius: 50%; background: #e2e8f0;
  display: flex; align-items: center; justify-content: center; transition: .2s;
}
.bw-ps.done .bw-ps-dot   { background: #10b981; }
.bw-ps.active .bw-ps-dot { box-shadow: 0 0 0 4px rgba(0,0,0,.07); }
.bw-ps-lbl { font-size: 9.5px; color: #94a3b8; white-space: nowrap; font-weight: 500; }
.bw-ps.active .bw-ps-lbl { color: #1e293b; font-weight: 700; }
.bw-ps.done .bw-ps-lbl   { color: #10b981; }
.bw-ps-line { flex: 1; height: 2px; background: #e2e8f0; margin: 0 4px 14px; border-radius: 99px; transition: .3s; }
.bw-ps-line.done { background: #10b981; }

/* KPI strip */
.bw-kpi-strip {
  display: flex; align-items: center;
  padding: 11px 20px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0;
}
.bw-kpi-i   { flex: 1; text-align: center; }
.bw-kpi-v   { display: block; font-size: 13.5px; font-weight: 800; color: #1e293b; }
.bw-kpi-l   { display: block; font-size: 10px; color: #94a3b8; margin-top: 1px; }
.bw-kpi-sep { width: 1px; height: 30px; background: #e2e8f0; flex-shrink: 0; }

/* Scroll */
.bw-scroll { flex: 1; overflow-y: auto; padding: 14px 20px; display: flex; flex-direction: column; gap: 14px; }

/* Info row */
.bw-info-row {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 11px; padding: 12px;
}
.bw-info-cell { display: flex; flex-direction: column; gap: 2px; }
.bw-ik  { font-size: 10px; color: #94a3b8; font-weight: 500; }
.bw-iv        { font-size: 12.5px; font-weight: 600; color: #1e293b; }
.bw-iv--empty { color: #94a3b8; font-weight: 400; }
.bw-iv--green { display:flex; align-items:center; gap:5px; color:#059669; font-weight:700; }

/* Section */
.bw-sec { display: flex; flex-direction: column; gap: 8px; }
.bw-sec-hd {
  display: flex; align-items: center; gap: 7px;
  font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: .05em;
}
.bw-sec-cnt {
  font-size: 10px; background: #f1f5f9; color: #64748b;
  padding: 1px 6px; border-radius: 7px; font-weight: 500; text-transform: none; letter-spacing: 0;
}

/* Tovar table */
.bw-tov-table { border: 1.5px solid #e2e8f0; border-radius: 11px; overflow: hidden; }
.bw-tov-head {
  display: grid; grid-template-columns: 1fr 96px 88px;
  padding: 7px 12px; background: #f8fafc;
  font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;
  border-bottom: 1px solid #e2e8f0;
}
.bw-tov-head .r, .bw-tov-row .r { text-align: right; }
.bw-tov-row {
  display: grid; grid-template-columns: 1fr 96px 88px;
  align-items: center; padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9; transition: .12s;
}
.bw-tov-row:last-child { border-bottom: none; }
.bw-tov-row:hover { background: #f8fafc; }
.bw-tov-name { display: flex; align-items: center; gap: 8px; min-width: 0; }
.bw-tav {
  width: 26px; height: 26px; border-radius: 6px; flex-shrink: 0;
  color: #fff; font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.bw-tn   { display: block; font-size: 12.5px; font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bw-tk   { display: block; font-size: 10px; color: #94a3b8; }
.bw-pill { display: inline-flex; justify-content: center; min-width: 22px; padding: 1px 4px; background: rgba(139,92,246,.09); color: #8b5cf6; border-radius: 5px; font-size: 11px; font-weight: 700; }
.bw-pill--g { background: rgba(16,185,129,.09); color: #10b981; }
.bw-dash { color: #cbd5e1; font-size: 12px; }
.bw-tsum { font-weight: 700; color: #8b5cf6; font-size: 12.5px; }
.bw-tov-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 12px; background: #f8fafc; border-top: 1.5px solid #e2e8f0;
  font-size: 12px; color: #64748b;
}
.bw-tov-foot strong { font-size: 14px; font-weight: 800; color: #1e293b; }

/* Chek tugmalari — detal sarlavhasida va har bir kartada */
.bw-chek-btn { display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 12px; margin-right:8px; border:1px solid rgba(139,92,246,.35); border-radius:8px; background:rgba(139,92,246,.06); color:#7c3aed; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; transition:.12s; }
.bw-chek-btn:hover:not(:disabled) { background:#7c3aed; color:#fff; border-color:#7c3aed; }
.bw-chek-btn:disabled { opacity:.6; cursor:default; }
.bw-card-chek { display:inline-flex; align-items:center; gap:4px; margin-left:auto; height:22px; padding:0 8px; border:1px solid var(--line,#e2e8f0); border-radius:6px; background:var(--surface,#fff); color:#64748b; font-size:10.5px; font-weight:700; cursor:pointer; transition:.12s; }
.bw-card-chek:hover:not(:disabled) { border-color:#7c3aed; color:#7c3aed; background:rgba(139,92,246,.06); }
.bw-card-chek:disabled { opacity:.6; cursor:default; }
.bw-card.active .bw-card-chek { border-color:rgba(139,92,246,.4); color:#7c3aed; }
/* Next holat */
.bw-next-holat { display: flex; gap: 7px; flex-wrap: wrap; }
.bw-nh-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 9px; border: 1.5px solid;
  font-size: 12.5px; font-weight: 600; cursor: pointer; transition: .12s;
}
.bw-nh-btn:hover { filter: brightness(.93); }

/* Right footer */
.bw-rfoot {
  display: flex; align-items: center; gap: 7px;
  padding: 11px 20px; border-top: 1px solid #f1f5f9;
  flex-shrink: 0; background: #fbfaff;
}
.bw-rfbtn {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 8px;
  border: 1.5px solid #e2e8f0; background: #fff;
  color: #64748b; font-size: 12px; font-weight: 600; cursor: pointer; transition: .12s;
}
.bw-rfbtn:hover { border-color: #94a3b8; }
.bw-rfbtn--del { border-color: #fecaca; background: #fef2f2; color: #ef4444; }
.bw-rfbtn--del:hover { background: #fee2e2; }

/* ══════════ YIG'MA RO'YXAT ══════════ */
.bw-yigma-bar {
  display: flex; align-items: center; gap: 10px; margin: 0 10px 6px; padding: 9px 11px;
  border: 1px solid #ddd6fe; border-radius: 11px; background: linear-gradient(180deg, #faf7ff, #f5f3ff);
  cursor: pointer; text-align: left; font: inherit; width: calc(100% - 20px); transition: .12s; flex-shrink: 0;
}
.bw-yigma-bar:hover { border-color: #8b5cf6; box-shadow: 0 2px 10px rgba(139,92,246,.15); }
.bw-yigma-ic { width: 30px; height: 30px; border-radius: 8px; background: #7c3aed; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bw-yigma-t { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.bw-yigma-t b { font-size: 12.5px; font-weight: 700; color: #1e293b; }
.bw-yigma-t small { font-size: 10.5px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bw-yigma-bar > svg { color: #8b5cf6; flex-shrink: 0; }

.bw-yg { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.bw-yg-hd { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0; }
.bw-yg-hdt { min-width: 0; flex: 1; }
.bw-yg-ic { width: 38px; height: 38px; border-radius: 10px; background: rgba(139,92,246,.1); color: #7c3aed; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bw-yg-title { font-size: 14.5px; font-weight: 800; color: #1e293b; }
.bw-yg-sub { font-size: 11.5px; color: #64748b; margin-top: 2px; }
.bw-yg-hd .bw-chek-btn { margin-right: 0; flex-shrink: 0; }
.bw-yg-list { border: 1.5px solid #e2e8f0; border-radius: 11px; overflow: hidden; }
.bw-yg-row { display: grid; grid-template-columns: 1fr 120px 96px; align-items: center; gap: 12px; padding: 8px 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: .12s; }
.bw-yg-row:last-child { border-bottom: none; }
.bw-yg-row:hover { background: #f8fafc; }
.bw-yg-name { display: flex; flex-direction: column; min-width: 0; }
.bw-yg-bar { height: 6px; border-radius: 99px; background: #f5f3ff; overflow: hidden; }
.bw-yg-bar i { display: block; height: 100%; background: #8b5cf6; border-radius: 99px; }
.bw-yg-kg { text-align: right; font-size: 13px; font-weight: 800; color: #1e293b; font-variant-numeric: tabular-nums; white-space: nowrap; }

.m-box--yg { max-width: 980px; height: auto; max-height: 88vh; }
.m-box--yg .m-hd { gap: 10px; }
.m-box--yg .m-close { margin-left: 0; }
.bw-yg-seg { display: inline-flex; background: #f1f5f9; border-radius: 9px; padding: 3px; gap: 2px; margin-left: auto; flex-shrink: 0; }
.bw-yg-seg button { height: 28px; padding: 0 11px; border: 0; border-radius: 7px; background: transparent; color: #64748b; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.bw-yg-seg button.on { background: #fff; color: #7c3aed; box-shadow: 0 1px 3px rgba(15,23,42,.1); }
.bw-yg-body { flex: 1; overflow: auto; min-height: 0; }
.bw-yg-t { width: 100%; border-collapse: collapse; font-size: 13px; }
.bw-yg-t th { position: sticky; top: 0; z-index: 1; background: #f8fafc; padding: 8px 12px; font-size: 10.5px; font-weight: 700; color: #94a3b8; text-transform: uppercase; text-align: left; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.bw-yg-t td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; font-variant-numeric: tabular-nums; color: #334155; }
.bw-yg-t .r { text-align: right; white-space: nowrap; }
.bw-yg-t td b { color: #1e293b; font-weight: 800; }
.bw-yg-tr { cursor: pointer; }
.bw-yg-tr:hover { background: #f8fafc; }
.bw-yg-tr.on { background: rgba(139,92,246,.05); }
.bw-yg-tr .bw-yg-name { flex-direction: row; align-items: center; gap: 8px; }
.bw-yg-tr .bw-yg-name svg { color: #94a3b8; transition: .15s; flex-shrink: 0; }
.bw-yg-tr.on .bw-yg-name svg { transform: rotate(90deg); color: #7c3aed; }
.bw-yg-sub td { background: #fbfaff; padding: 4px 12px 10px 42px; }
.bw-yg-mj { display: flex; flex-wrap: wrap; gap: 6px; }
.bw-yg-mj-i { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; font-size: 12px; color: #334155; }
.bw-yg-mj-i i { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.bw-yg-mj-i b { font-weight: 700; color: #1e293b; }
.bw-yg-mj-i small { color: #94a3b8; font-size: 10.5px; }
.bw-yg-t tfoot td { background: #f8fafc; border-top: 1.5px solid #e2e8f0; border-bottom: none; font-weight: 700; color: #1e293b; }
.bw-yg-hint { font-size: 11.5px; color: #94a3b8; flex: 1; }
.m-box--yg .m-btn-cancel { display: inline-flex; align-items: center; gap: 6px; }
@media (max-width: 760px) { .bw-yg-t .h { display: none; } .bw-yg-seg { display: none; } .bw-yg-hint { display: none; } }

/* ══════════ MODAL ══════════ */
.m-overlay {
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, .5); backdrop-filter: blur(5px);
  z-index: 600; display: flex; align-items: center; justify-content: center; padding: 20px;
}
.m-box {
  background: #fff; border-radius: 20px;
  width: 100%; max-width: 1040px; height: 82vh;
  display: flex; flex-direction: column;
  box-shadow: 0 28px 80px rgba(0,0,0,.2); overflow: hidden;
}
.m-fade-enter-active, .m-fade-leave-active { transition: opacity .18s, transform .18s; }
.m-fade-enter-from, .m-fade-leave-to { opacity: 0; transform: scale(.97) translateY(8px); }

/* Modal header */
.m-hd {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0;
}
.m-hd-ic {
  width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
  background: rgba(139,92,246,.1); color: #8b5cf6;
  display: flex; align-items: center; justify-content: center;
}
.m-hd-title { font-size: 15px; font-weight: 800; color: #1e293b; }
.m-hd-sel   { display: flex; align-items: center; gap: 6px; margin-left: 4px; flex-wrap: wrap; }
.m-sel-tag  {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 600; color: #8b5cf6;
  background: rgba(139,92,246,.08); padding: 3px 9px; border-radius: 20px;
}
.m-sel-tag--ag { color: #8b5cf6; background: rgba(139,92,246,.08); }
.m-close {
  margin-left: auto; width: 28px; height: 28px; border-radius: 7px; border: none;
  background: #f1f5f9; cursor: pointer;
  display: flex; align-items: center; justify-content: center; color: #64748b; transition: .13s;
}
.m-close:hover { background: #fee2e2; color: #ef4444; }

/* Modal body: 3 panel */
.m-body {
  display: grid; grid-template-columns: 220px 220px 1fr;
  flex: 1; overflow: hidden; min-height: 0;
}

/* Col shared */
.m-col {
  display: flex; flex-direction: column; padding: 12px 12px;
  border-right: 1px solid #f1f5f9; overflow: hidden;
}
.m-col:last-child { border-right: none; }
.m-col--tovar { padding: 12px 14px; }

.m-col-hd {
  display: flex; align-items: center; gap: 6px;
  font-size: 11.5px; font-weight: 700; color: #334155; text-transform: uppercase;
  letter-spacing: .04em; padding-bottom: 8px; flex-shrink: 0;
}
.m-col-hd svg { color: #8b5cf6; flex-shrink: 0; }
.m-col-cnt {
  font-size: 10px; background: #f1f5f9; color: #64748b;
  padding: 1px 6px; border-radius: 7px; font-weight: 500; text-transform: none; letter-spacing: 0;
}
.m-savat-cnt {
  margin-left: auto; font-size: 10.5px; font-weight: 700;
  color: #10b981; background: rgba(16,185,129,.1); padding: 2px 7px; border-radius: 10px;
  text-transform: none; letter-spacing: 0;
}

.m-search {
  display: flex; align-items: center; gap: 7px;
  padding: 0 9px; height: 34px; margin-bottom: 8px;
  background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px;
  transition: border-color .13s; flex-shrink: 0;
}
.m-search:focus-within { border-color: #8b5cf6; background: #fff; }
.m-search svg { color: #94a3b8; flex-shrink: 0; }
.m-si { flex: 1; border: none; outline: none; font-size: 12.5px; color: #1e293b; background: transparent; }
.m-si::placeholder { color: #94a3b8; }

.m-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
.m-empty { text-align: center; padding: 20px 10px; font-size: 12px; color: #94a3b8; }

.m-item {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 9px; border-radius: 9px; cursor: pointer;
  border: 1.5px solid transparent; transition: .12s;
}
.m-item:hover { background: #f8fafc; border-color: #e2e8f0; }
.m-item.on    { background: #f5f3ff; border-color: #ddd6fe; }
.m-av {
  width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
  color: #fff; font-size: 11px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.m-av--sm { width: 26px; height: 26px; border-radius: 7px; font-size: 10px; }
.m-item-info { flex: 1; min-width: 0; }
.m-item-name { display: block; font-size: 12.5px; font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.m-item-sub  { display: block; font-size: 10.5px; color: #94a3b8; }

/* Tovar col split: katalog + savat */
.m-tov-split { display: flex; flex-direction: column; flex: 1; overflow: hidden; gap: 0; }

.m-catalog { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
.m-cat-item {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 9px; border-radius: 9px; cursor: pointer;
  border: 1.5px solid transparent; transition: .12s;
}
.m-cat-item:hover { background: #f8fafc; border-color: #e2e8f0; }
.m-cat-item.in    { background: #f0fdf4; border-color: #bbf7d0; }
.m-cat-act { flex-shrink: 0; }
.m-added {
  width: 24px; height: 24px; border-radius: 50%; background: #10b981; color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;
}
.m-add {
  width: 24px; height: 24px; border-radius: 50%; background: rgba(139,92,246,.1); color: #8b5cf6;
  display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 400; line-height: 1;
}

/* Savat (pastda) */
.m-cart {
  border-top: 1px solid #f1f5f9; margin-top: 8px; padding-top: 8px;
  display: flex; flex-direction: column; max-height: 48%; flex-shrink: 0;
}
.m-cart-hd {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: .04em;
  padding-bottom: 6px; flex-shrink: 0;
}
.m-cart-hd strong { font-size: 13px; font-weight: 800; color: #1e293b; text-transform: none; letter-spacing: 0; }
.m-cart-list { overflow-y: auto; display: flex; flex-direction: column; gap: 5px; }

.m-cart-item {
  display: flex; align-items: center; gap: 7px;
  padding: 7px 9px; background: #f8fafc; border: 1.5px solid #e2e8f0;
  border-radius: 9px;
}
.m-ci-info { min-width: 0; flex-shrink: 0; width: 80px; }
.m-ci-name  { display: block; font-size: 11px; font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.m-ci-price { display: block; font-size: 10px; color: #94a3b8; }
.m-ci-controls { display: flex; align-items: center; gap: 4px; flex: 1; }
.m-qty {
  display: flex; align-items: center;
  border: 1.5px solid #e2e8f0; border-radius: 7px; overflow: hidden; background: #fff;
}
.m-qty button {
  width: 20px; height: 22px; border: none; background: #f8fafc;
  color: #334155; font-size: 13px; font-weight: 700; cursor: pointer; transition: .1s;
}
.m-qty button:hover { background: #e2e8f0; }
.m-qty input {
  width: 28px; height: 22px; border: none;
  border-left: 1.5px solid #e2e8f0; border-right: 1.5px solid #e2e8f0;
  text-align: center; font-size: 11px; font-weight: 700; color: #1e293b; outline: none;
}
.m-qty-lbl { font-size: 9.5px; color: #94a3b8; flex-shrink: 0; }
.m-ci-right { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
.m-ci-sum  { font-size: 11.5px; font-weight: 800; color: #8b5cf6; white-space: nowrap; }
.m-ci-del  {
  width: 18px; height: 18px; border-radius: 4px; border: none;
  background: #fef2f2; color: #ef4444; cursor: pointer; font-size: 12px; line-height: 1;
  display: flex; align-items: center; justify-content: center; transition: .1s;
}
.m-ci-del:hover { background: #fee2e2; }

/* Modal footer */
.m-ft {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 12px 20px; border-top: 1px solid #f1f5f9;
  background: #f8fafc; flex-shrink: 0;
}
.m-ft-extra { display: flex; gap: 8px; flex: 1; }
.m-ft-in {
  flex: 1; padding: 7px 11px; border: 1.5px solid #e2e8f0; border-radius: 8px;
  font-size: 12.5px; color: #1e293b; background: #fff; outline: none; transition: .12s;
}
.m-ft-in:focus { border-color: #8b5cf6; }
.m-ft-in::placeholder { color: #94a3b8; }
.m-ft-right { display: flex; gap: 8px; flex-shrink: 0; }
.m-btn-cancel {
  padding: 8px 16px; border-radius: 9px;
  border: 1.5px solid #e2e8f0; background: #fff;
  font-size: 13px; font-weight: 600; color: #334155; cursor: pointer; transition: .12s;
}
.m-btn-cancel:hover { background: #f1f5f9; }
.m-btn-send {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 20px; border-radius: 9px; border: none;
  background: linear-gradient(135deg, #8b5cf6, #8b5cf6); color: #fff;
  font-size: 13px; font-weight: 700; cursor: pointer;
  box-shadow: 0 2px 12px rgba(139,92,246,.3); transition: .12s;
}
.m-btn-send:hover:not(:disabled) { filter: brightness(1.07); transform: translateY(-1px); }
.m-btn-send:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; transform: none; }

/* Toast */
.bw-toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px; border-radius: 12px; z-index: 800;
  font-size: 13.5px; font-weight: 600; color: #fff;
  box-shadow: 0 8px 32px rgba(0,0,0,.18); pointer-events: none;
}
.bw-toast--success { background: linear-gradient(135deg, #10b981, #059669); }
.bw-toast--error   { background: linear-gradient(135deg, #ef4444, #dc2626); }
.bw-toast-ic {
  width: 24px; height: 24px; border-radius: 50%; background: rgba(255,255,255,.2);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.toast-slide-enter-active, .toast-slide-leave-active { transition: opacity .22s, transform .22s; }
.toast-slide-enter-from { opacity: 0; transform: translateX(-50%) translateY(14px); }
.toast-slide-leave-to   { opacity: 0; transform: translateX(-50%) translateY(14px); }

/* ── Responsive ── */
@media (max-width: 1100px) { .m-body { grid-template-columns: 200px 200px 1fr; } }
@media (max-width: 900px) {
  .bw-wrap { grid-template-columns: 320px 1fr; }
  .m-body { grid-template-columns: 1fr 1fr; }
  .m-col--tovar { grid-column: span 2; border-top: 1px solid #f1f5f9; border-right: none; }
}
@media (max-width: 768px) {
  .bw-wrap { grid-template-columns: 1fr; }
  .bw-right { position: fixed; inset: 0; z-index: 100; display: none; }
  .bw-right.visible { display: flex; }
  .bw-back-btn { display: flex; }
}
@media (max-width: 640px) {
  .m-box { max-height: 95vh; border-radius: 18px 18px 0 0; }
  .m-body { grid-template-columns: 1fr; overflow-y: auto; }
  .m-col  { border-right: none; border-bottom: 1px solid #f1f5f9; }
  .m-col--tovar { grid-column: auto; }
  .m-ft-extra { display: none; }
}

/* ── Yangi: bekor banner, flow hint, spin ── */
.bw-bekor-banner {
  display:flex; align-items:center; gap:7px;
  margin:0 0 2px; padding:9px 16px;
  background:#fef2f2; border-bottom:1px solid #fecaca;
  color:#dc2626; font-size:12.5px; flex-shrink:0;
}
.bw-flow-hint {
  display:flex; align-items:center; gap:5px;
  font-size:11px; color:#94a3b8; margin:6px 0 0;
}
.bw-flow-hint svg { flex-shrink:0; }
.bw-spin { animation:bw-rot .7s linear infinite; color:#94a3b8; }
.bw-spin--sm { width:13px; height:13px; }
@keyframes bw-rot { to { transform:rotate(360deg) } }
.bw-iv--green { display:flex; align-items:center; gap:5px; color:#059669; font-weight:700; }
.bw-iv--empty { color:#94a3b8; font-weight:400; }
.bw-ps.bekor { opacity:.4; }
.bw-nh-btn { display:inline-flex; align-items:center; gap:6px; }
.bw-nh-btn--main { font-weight:700; }
.bw-nh-btn:disabled { opacity:.55; cursor:not-allowed; }
.m-box--sm { max-width:420px; }

</style>
