<template>
  <div class="pg">

    <!-- ═══ HEADER ═══ -->
    <div class="pg-hd">
      <div>
        <h1 class="pg-title">Arizalar</h1>
        <p class="pg-sub">
          <span class="pg-sub-note" title="Won Sell (mashinadan) sotuvlari bu ro'yxatga kirmaydi — ular Won Sell → Sotuvlar sahifasida">Distributsiya buyurtmalari</span>
          <span class="pg-sub-badge pg-sub-badge--yangi">{{ stat.yangi || 0 }} yangi</span>
          <span class="pg-sub-badge pg-sub-badge--bekor">{{ stat.bekor || 0 }} bekor</span>
        </p>
      </div>
      <button class="pg-new-btn" @click="openCreate">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Yangi ariza
      </button>
    </div>

    <!-- ═══ TOOLBAR ═══ -->
    <div class="pg-bar">
      <div class="pg-search">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="search" @input="debouncedLoad" placeholder="Mijoz yoki raqam..." class="pg-si"/>
      </div>
      <select class="pg-sel" v-model="fAgent" @change="load">
        <option value="">Barcha agentlar</option>
        <option v-for="a in sprav.agentlar" :key="a.id" :value="a.id">{{ a.fullname }}</option>
      </select>
      <!-- Buyurtma yo'li — bosqichlar tartibida, har biri filtr -->
      <div class="pg-chips">
        <button class="pg-chip" :class="{ on: fHolat==='' }" @click="setTab('')">
          Barchasi <span>{{ stat.jami || 0 }}</span>
        </button>
        <template v-for="(b, i) in BOSQICHLAR" :key="b.k">
          <span v-if="i > 0 && b.k !== 'bekor'" class="pg-arrow" aria-hidden="true">›</span>
          <button class="pg-chip" :class="{ on: fHolat===b.k, 'pg-chip--bekor': b.k==='bekor' }" :style="fHolat===b.k ? { borderColor: b.c, color: b.c, background: b.bg } : {}" @click="setTab(b.k)" :title="b.izoh">
            <span class="dot" :style="{ background: b.c }"/>{{ b.nom }} <span>{{ stat.bosqich?.[b.k] ?? 0 }}</span>
          </button>
        </template>
      </div>
      <button class="pg-ref" @click="load" :disabled="loading">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" :class="loading && 'spin'"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.07-8.33"/></svg>
      </button>
    </div>

    <!-- ═══ LAYOUT ═══ -->
    <div class="pg-layout" :class="{ split: !!selected }">

      <!-- LIST -->
      <div class="pg-list-wrap">
        <div v-if="loading" class="pg-list">
          <div class="pg-skel" v-for="i in 6" :key="i"/>
        </div>
        <div v-else-if="!rows.length" class="pg-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <p>Ariza topilmadi</p>
          <button class="pg-new-btn pg-new-btn--sm" @click="openCreate">Yangi ariza</button>
        </div>
        <div v-else class="pg-list">
          <div
            v-for="row in rows" :key="row.id"
            class="pg-card" :class="{ on: selected?.id === row.id }"
            @click="selectRow(row)"
          >
            <div class="pg-card-av" :style="{ background: avatarColor(row.id) }">
              {{ (row.mijoz_nomi || '?')[0].toUpperCase() }}
            </div>
            <div class="pg-card-body">
              <div class="pg-card-name">
                {{ row.mijoz_nomi || '—' }}
                <span v-if="row.manba === 'mobil'" class="pg-manba-badge" title="Telefondan tushgan">📱</span>
              </div>
              <div class="pg-card-meta">
                <span class="pg-card-num">#{{ row.raqam }}</span>
                <span class="sep">·</span>
                <span>{{ row.agent_nomi || '—' }}</span>
                <span class="sep">·</span>
                <span>{{ fmtDate(row.jonatish_sana || row.createdAt) }}</span>
              </div>
              <div class="pg-card-tovs" v-if="row.qatorlar?.length">
                <span class="pg-ctov" v-for="q in row.qatorlar.slice(0,3)" :key="q.id">{{ q.tovar_nomi }}</span>
                <span class="pg-cmore" v-if="row.qatorlar.length > 3">+{{ row.qatorlar.length - 3 }}</span>
              </div>
            </div>
            <div class="pg-card-r">
              <span class="pg-status" :style="holatStil(row.holat)">{{ holatNom(row.holat) }}</span>
              <span class="pg-card-sum">{{ fmtShort(row.jami_summa) }}</span>
            </div>
          </div>
        </div>

        <div class="pg-pager" v-if="totalPages > 1">
          <button class="pg-pg" :disabled="page === 1" @click="page--; load()">‹</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button class="pg-pg" :disabled="page === totalPages" @click="page++; load()">›</button>
        </div>
      </div>

      <!-- DETAIL -->
      <transition name="slide-in">
        <div class="pg-detail" v-if="selected">
          <!-- Header -->
          <div class="pd-hd">
            <div class="pd-av" :style="{ background: avatarColor(selected.id) }">
              {{ (selected.mijoz_nomi || '?')[0].toUpperCase() }}
            </div>
            <div class="pd-hd-info">
              <div class="pd-name">{{ selected.mijoz_nomi }}</div>
              <div class="pd-meta">#{{ selected.raqam }} · {{ selected.agent_nomi || '—' }}</div>
              <!-- Buyurtma yo'lida keyingi qadam qayerda bajariladi -->
              <div class="pd-flow" v-if="keyingiQadam(selected)" :class="'pd-flow--' + selected.holat">
                <span>{{ keyingiQadam(selected)!.matn }}</span>
                <RouterLink v-if="keyingiQadam(selected)!.yol" :to="keyingiQadam(selected)!.yol!" class="pd-flow-link">{{ keyingiQadam(selected)!.tugma }} ›</RouterLink>
              </div>
            </div>
            <div class="pd-hd-right">
              <template v-if="selected.holat === 'yangi'">
                <button class="pd-bekor-btn" :disabled="holatChanging" @click="bekorModal = true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Bekor
                </button>
                <button class="pd-tasdiq-btn" :disabled="holatChanging" @click="openTasdiqModal()">
                  <svg v-if="holatChanging" class="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.07-8.33"/></svg>
                  <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {{ holatChanging ? '...' : 'Tasdiqlash' }}
                </button>
              </template>
              <span v-else class="pg-status" :style="holatStil(selected.holat)">{{ selected.holat === 'bekor' ? 'Bekor qilindi' : holatNom(selected.holat) }}</span>
              <button class="pd-close" @click="selected = null">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          <!-- Bekor sababi -->
          <div class="pd-bekor-banner" v-if="selected.holat === 'bekor'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            Bekor qilindi{{ selected.bekor_sababi ? ': ' + selected.bekor_sababi : '' }}
          </div>

          <!-- KPI -->
          <div class="pd-kpi">
            <div class="pd-kpi-i"><span class="pd-kv">{{ fmtSum(selected.jami_summa) }} so'm</span><span class="pd-kl">Summa</span></div>
            <div class="pd-kpi-sep"/>
            <div class="pd-kpi-i"><span class="pd-kv">{{ selected.qatorlar?.length || 0 }} xil</span><span class="pd-kl">Tovar</span></div>
            <div class="pd-kpi-sep"/>
            <div class="pd-kpi-i">
              <span class="pd-kv" :class="!selected.jonatish_sana && 'warn'">
                {{ selected.jonatish_sana || '—' }}
              </span>
              <span class="pd-kl">Yetkazish</span>
            </div>
            <div class="pd-kpi-sep"/>
            <div class="pd-kpi-i"><span class="pd-kv">{{ selected.tolov_turi || '—' }}</span><span class="pd-kl">To'lov</span></div>
            <template v-if="selected.tolov_sana">
              <div class="pd-kpi-sep"/>
              <div class="pd-kpi-i" title="Agent qarzga sotuvda belgilagan to'lov sanasi">
                <span class="pd-kv" :style="selected.tolov_sana < new Date().toISOString().slice(0, 10) ? 'color:#dc2626' : ''">{{ selected.tolov_sana }}</span>
                <span class="pd-kl">To'lov sanasi</span>
              </div>
            </template>
          </div>

          <!-- Body -->
          <div class="pd-body">
            <!-- Mijoz info -->
            <div class="pd-sec">
              <div class="pd-sec-hd">Mijoz</div>
              <div class="pd-grid">
                <div class="pd-kv-row"><span class="pk">Nomi</span><span class="pv">{{ selected.mijoz?.nomi || selected.mijoz_nomi }}</span></div>
                <div class="pd-kv-row"><span class="pk">Telefon</span><span class="pv">{{ selected.mijoz?.telefon || '—' }}</span></div>
                <div class="pd-kv-row"><span class="pk">Balans</span>
                  <span class="pv" :style="{ color: parseFloat(selected.mijoz?.balans||0) >= 0 ? '#10b981' : '#ef4444', fontWeight:700 }">
                    {{ fmtSum(parseFloat(selected.mijoz?.balans||0)) }} so'm
                  </span>
                </div>
                <div class="pd-kv-row"><span class="pk">Agent</span><span class="pv">{{ selected.agent?.fullname || selected.agent_nomi || '—' }}</span></div>
                <div class="pd-kv-row" v-if="selected.ekspeditor"><span class="pk">Ekspeditor</span><span class="pv">{{ selected.ekspeditor }}</span></div>
                <div class="pd-kv-row" v-if="selected.ombor"><span class="pk">Ombor</span><span class="pv">{{ selected.ombor }}</span></div>
              </div>
            </div>

            <!-- Tovarlar -->
            <div class="pd-sec">
              <div class="pd-sec-hd">Tovarlar <span class="pd-cnt">{{ selected.qatorlar?.length || 0 }}</span></div>
              <div class="pd-tov-table">
                <div class="pd-tov-head"><span>Nomi</span><span class="r">Miqdor</span><span class="r">Summa</span></div>
                <div v-for="(q, qi) in selected.qatorlar" :key="q.id" class="pd-tov-row">
                  <div class="pd-tov-name">
                    <span class="pd-tov-n">{{ (qi as number) + 1 }}</span>
                    <div><span class="pd-tn">{{ q.tovar_nomi }}</span><span class="pd-tk">{{ q.turkum }}</span></div>
                  </div>
                  <span class="r"><span class="pd-pill pd-pill--g">{{ fmtMiqdor(q.jami_dona) }} kg</span></span>
                  <span class="r pd-tsum">{{ fmtShort(q.summa) }}</span>
                </div>
                <div class="pd-tov-foot">
                  <span v-if="selected.chegirma_summa > 0" style="color:#ef4444">-{{ fmtShort(selected.chegirma_summa) }} chegirma</span>
                  <span style="margin-left:auto">Jami: <strong style="color:#6366f1;font-size:15px">{{ fmtSum(selected.jami_summa) }} so'm</strong></span>
                </div>
              </div>
            </div>

            <div class="pd-sec" v-if="selected.izoh">
              <div class="pd-sec-hd">Izoh</div>
              <p class="pd-izoh">{{ selected.izoh }}</p>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- ═══ MODAL: Yangi ariza ═══ -->
    <Teleport to="body">
      <Transition name="mfade">
        <div v-if="modalOpen" class="m-ov" @click.self="closeModal">
          <div class="m-box">

            <!-- Header -->
            <div class="m-hd">
              <div class="m-hd-ic">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div class="m-hd-info">
                <span class="m-hd-title">Yangi ariza</span>
                <div class="m-hd-steps">
                  <span class="m-step" :class="{ done: !!form.mijoz_id }">
                    <svg v-if="form.mijoz_id" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    {{ form.mijoz_nomi || 'Mijoz tanlang' }}
                  </span>
                  <span class="m-step-sep">›</span>
                  <span class="m-step" :class="{ done: !!form.agent_id }">{{ form.agent_nomi || 'Agent' }}</span>
                  <span class="m-step-sep">›</span>
                  <span class="m-step" :class="{ done: form.qatorlar.length > 0 }">{{ form.qatorlar.length ? form.qatorlar.length + ' tovar' : 'Tovarlar' }}</span>
                  <span class="m-step-sep">›</span>
                  <span class="m-step" :class="{ done: !!form.jonatish_sana }">{{ form.jonatish_sana || 'Sana *' }}</span>
                </div>
              </div>
              <div class="m-hd-err" v-if="formErr">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ formErr }}
              </div>
              <button class="m-hd-close" @click="closeModal">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <!-- Body: Chap | O'rta | O'ng -->
            <div class="m-body">

              <!-- ═ CHAP: Mijoz + Agent ═ -->
              <div class="m-left">

                <!-- Mijoz -->
                <div class="m-sec-title">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Mijoz
                  <span v-if="form.mijoz_nomi" class="m-picked">{{ form.mijoz_nomi }}</span>
                </div>
                <div class="m-srch">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input v-model="mijozQ" class="m-si" placeholder="Qidirish..." autofocus/>
                </div>
                <div class="m-list">
                  <div class="m-empty" v-if="!filteredMijozlar.length">Topilmadi</div>
                  <div v-for="mx in filteredMijozlar" :key="mx.id"
                    class="m-mrow" :class="{ on: form.mijoz_id === mx.id }"
                    @click="pickMijoz(mx)">
                    <div class="m-av" :style="{ background: avatarColor(mx.id) }">{{ mx.nomi[0] }}</div>
                    <div class="m-minfo">
                      <span class="m-mname">{{ mx.nomi }}</span>
                      <span class="m-mmeta">
                        {{ mx.telefon || '—' }}
                        <span v-if="mx.sinf" class="m-sinf" :style="{ background: sinfColor(mx.sinf)+'22', color: sinfColor(mx.sinf) }">{{ mx.sinf }}</span>
                        <span class="m-sinf" :class="mx.narx_turi === 'optom' ? 'm-narxturi--optom' : 'm-narxturi--chakana'">{{ mx.narx_turi === 'optom' ? 'Optom' : 'Chakana' }}</span>
                      </span>
                    </div>
                    <span class="m-bal" :class="parseFloat(mx.balans||0) >= 0 ? 'pos' : 'neg'">{{ fmtShort(parseFloat(mx.balans||0)) }}</span>
                    <svg v-if="form.mijoz_id === mx.id" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                </div>

                <!-- Agent -->
                <div class="m-sec-title m-sec-title--sub">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  Agent
                  <span v-if="form.agent_nomi" class="m-picked">{{ form.agent_nomi }}</span>
                </div>
                <div class="m-agent-chips">
                  <div v-for="a in sprav.agentlar" :key="a.id"
                    class="m-ach" :class="{ on: form.agent_id === a.id }"
                    @click="form.agent_id = a.id; form.agent_nomi = a.fullname">
                    <div class="m-av m-av--xs" :style="{ background: avatarColor(a.id) }">{{ a.fullname[0] }}</div>
                    {{ a.fullname }}
                    <svg v-if="form.agent_id === a.id" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                </div>
              </div>

              <!-- ═ O'RTA: Tovar jadvali (inline blok/dona) ═ -->
              <div class="m-center">
                <div class="m-center-top">
                  <div class="m-sec-title">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
                    Tovarlar
                    <span class="m-cnt-badge">{{ filteredTovarlar.length }} ta</span>
                    <span v-if="form.qatorlar.length" class="m-sel-badge">{{ form.qatorlar.length }} tanlandi</span>
                  </div>
                  <div class="m-srch m-srch--center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input v-model="tovarQ" class="m-si" placeholder="Tovar nomi yoki turkum..."/>
                    <button v-if="tovarQ" class="m-srch-x" @click="tovarQ = ''">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>

                <!-- Tovar jadvali -->
                <div class="m-tov-wrap">
                  <!-- Jadval sarlavha -->
                  <div class="m-tov-thead">
                    <span class="m-th-name">Tovar nomi</span>
                    <span class="m-th">Narx</span>
                    <span class="m-th">Mavjud</span>
                    <span class="m-th m-th--miqdor">Miqdor</span>
                    <span class="m-th m-th--sum">Summa</span>
                    <span class="m-th m-th--del"/>
                  </div>

                  <!-- Jadval qatorlar -->
                  <div class="m-tov-body">
                    <div v-if="!filteredTovarlar.length" class="m-tov-empty">Tovar topilmadi</div>
                    <div v-for="t in filteredTovarlar" :key="t.tovar_id"
                      class="m-tov-row" :class="{ selected: isInCart(t.tovar_id) }">

                      <!-- Nomi + tanlash -->
                      <div class="m-td-name" @click="toggleTovar(t)">
                        <div class="m-tov-dot" :class="{ active: isInCart(t.tovar_id) }">
                          <svg v-if="isInCart(t.tovar_id)" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <div class="m-tov-info">
                          <span class="m-tov-nomi">{{ t.tovar_nomi }}</span>
                          <span class="m-tov-turkum">{{ t.turkum }}</span>
                        </div>
                      </div>

                      <!-- Narx (mijoz narx turiga mos — optom yoki chakana) -->
                      <span class="m-td m-td--narx">{{ fmtShort(narxTovarUchun(t)) }}</span>

                      <!-- Mavjud -->
                      <span class="m-td" :class="t.mavjud > 0 ? 'm-td--ok' : 'm-td--no'">{{ fmtMiqdor(t.mavjud) }}<small class="m-td-unit">{{ t.olchov_birligi || 'kg' }}</small></span>

                      <!-- Miqdor (kg, kasr bo'lishi mumkin) -->
                      <div class="m-td m-td--input">
                        <template v-if="isInCart(t.tovar_id)">
                          <div class="m-inp-ctrl">
                            <button @click.stop="adjCart(t.tovar_id, -1)">−</button>
                            <input type="number" step="0.001"
                              :value="getQ(t.tovar_id)?.jami_dona ?? 0"
                              @change.stop="setCart(t.tovar_id, +($event.target as HTMLInputElement).value)"
                              min="0" @click.stop/>
                            <button @click.stop="adjCart(t.tovar_id, 1)">+</button>
                            <span class="m-inp-unit">{{ t.olchov_birligi || 'kg' }}</span>
                          </div>
                        </template>
                        <span class="m-td-empty" v-else @click="toggleTovar(t)">—</span>
                      </div>

                      <!-- Summa -->
                      <span class="m-td m-td--sum" v-if="isInCart(t.tovar_id)">
                        {{ fmtShort(getQ(t.tovar_id)?.summa ?? 0) }}
                      </span>
                      <span class="m-td m-td-muted" v-else @click="toggleTovar(t)">—</span>

                      <!-- O'chirish -->
                      <div class="m-td m-td--del">
                        <button v-if="isInCart(t.tovar_id)" class="m-del-btn" @click.stop="removeByTovarId(t.tovar_id)">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ═ O'NG: Jami + Tafsilotlar ═ -->
              <div class="m-right">

                <!-- Jami hisob -->
                <div class="m-summary">
                  <div class="m-sum-title">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    Buyurtma jami
                  </div>

                  <div v-if="!form.qatorlar.length" class="m-sum-empty">
                    Tovar tanlanmagan
                  </div>
                  <div v-else class="m-sum-rows">
                    <div class="m-sum-row" v-for="q in form.qatorlar" :key="q.tovar_id">
                      <span class="m-sum-name">{{ q.tovar_nomi }}</span>
                      <span class="m-sum-qty">{{ fmtMiqdor(q.jami_dona) }} {{ q.olchov }}</span>
                      <span class="m-sum-s">{{ fmtShort(q.summa) }}</span>
                    </div>
                  </div>

                  <div class="m-sum-footer" v-if="form.qatorlar.length">
                    <div class="m-chegirma">
                      <label>Chegirma %</label>
                      <input type="number" v-model.number="form.chegirma_foiz" min="0" max="100" placeholder="0"/>
                    </div>
                    <div class="m-total-line">
                      <span>Jami</span>
                      <strong>{{ fmtSum(formTotal * (1 - form.chegirma_foiz/100)) }} so'm</strong>
                    </div>
                  </div>
                </div>

                <!-- Tafsilotlar -->
                <div class="m-det">
                  <div class="m-sec-title m-sec-title--det">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Tafsilotlar
                  </div>

                  <div class="m-det-f m-det-f--req">
                    <label>Yetkazish sanasi <span class="m-req">*</span></label>
                    <input type="date" v-model="form.jonatish_sana" :class="['m-det-in', dateError && 'err']" :min="today"/>
                    <span class="m-det-err" v-if="dateError">Majburiy maydon</span>
                  </div>

                  <div class="m-det-grid">
                    <div class="m-det-f">
                      <label>To'lov turi</label>
                      <select v-model="form.tolov_turi" class="m-det-in">
                        <option value="">—</option>
                        <option value="naqt">Naqt</option>
                        <option value="naqtsiz">Naqtsiz</option>
                        <option value="muddatli">Muddatli</option>
                      </select>
                    </div>
                    <div class="m-det-f">
                      <label>Ekspeditor</label>
                      <input v-model="form.ekspeditor" class="m-det-in" placeholder="Ism..."/>
                    </div>
                    <div class="m-det-f">
                      <label>Ombor</label>
                      <select v-model="form.ombor" class="m-det-in">
                        <option v-for="o in sprav.omborlar" :key="o" :value="o">{{ o }}</option>
                      </select>
                    </div>
                    <div class="m-det-f">
                      <label>Izoh</label>
                      <input v-model="form.izoh" class="m-det-in" placeholder="Ixtiyoriy..."/>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <!-- Footer -->
            <div class="m-ft">
              <span class="m-ft-info">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Qator bosib tovar tanlang · miqdorni kg'da yozing (tarozi kasri saqlanadi: 1,234)
              </span>
              <div class="m-ft-btns">
                <button class="m-btn-cancel" @click="closeModal">Bekor qilish</button>
                <button class="m-btn-save" :disabled="saving || !canSubmit" @click="save">
                  <span v-if="saving" class="m-spin"/>
                  <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {{ saving ? 'Yuborilmoqda...' : 'Ariza yuborish' }}
                </button>
              </div>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Bekor qilish sababi -->
    <Teleport to="body">
      <Transition name="mfade">
        <div v-if="bekorModal" class="m-ov" @click.self="bekorModal = false">
          <div class="m-box m-box--sm">
            <div class="m-top" style="border-bottom:1px solid #f1f5f9">
              <div class="m-ic" style="background:#ef4444">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <span class="m-title" style="color:#ef4444">Bekor qilish</span>
              <button class="m-x" style="margin-left:auto" @click="bekorModal = false">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="m-bekor-pad">
              <label class="m-bekor-lbl">Sabab (ixtiyoriy)</label>
              <textarea v-model="bekorSababi" class="m-bekor-ta" rows="3" placeholder="Bekor qilish sababini kiriting..."/>
            </div>
            <div class="m-ft">
              <button class="m-cancel" @click="bekorModal = false">Orqaga</button>
              <button class="m-bekor-btn" :disabled="holatChanging" @click="doHolat('bekor')">
                <span v-if="holatChanging" class="m-spin"/>
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Tasdiqlash modali: ekspeditor tanlash -->
    <Teleport to="body">
      <Transition name="mfade">
        <div v-if="tasdiqModal" class="m-ov" @click.self="tasdiqModal = false">
          <div class="m-box m-box--sm">

            <!-- Header -->
            <div class="m-hd">
              <div class="m-hd-ic" style="background:linear-gradient(135deg,#10b981,#059669)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="m-hd-info">
                <span class="m-hd-title">Ariza tasdiqlash</span>
                <div class="m-hd-steps">
                  <span class="m-step done">{{ selected?.mijoz_nomi }}</span>
                  <span class="m-step-sep">·</span>
                  <span class="m-step done">{{ fmtSum(selected?.jami_summa) }} so'm</span>
                </div>
              </div>
              <button class="m-hd-close" @click="tasdiqModal = false">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <!-- Tanlash body -->
            <div class="td-body">

              <!-- Yetkazib berish sanasi info -->
              <div class="td-date-info" v-if="selected?.jonatish_sana">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Yetkazish sanasi: <strong>{{ fmtDate(selected.jonatish_sana) }}</strong>
              </div>

              <!-- Izoh ixtiyoriy -->
              <div class="td-section td-section--sm">
                <div class="td-sec-hd">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Izoh (ixtiyoriy)
                </div>
                <textarea v-model="tasdiqForm.izoh" class="td-ta" rows="2" placeholder="Qo'shimcha ma'lumot..."/>
              </div>
              <p class="td-hint">
                Dostavchi mahsulot tayyor bo'lgach, "Buyurtmalarni yig'ish" bo'limida tayinlanadi.
              </p>
            </div>

            <!-- Footer -->
            <div class="m-ft">
              <button class="m-btn-cancel" @click="tasdiqModal = false">Bekor qilish</button>
              <button
                class="td-tasdiq-btn"
                :disabled="holatChanging"
                @click="submitTasdiq"
              >
                <span v-if="holatChanging" class="m-spin"/>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {{ holatChanging ? 'Tasdiqlanmoqda...' : 'Tasdiqlash' }}
              </button>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toastShow" class="pg-toast" :class="toastType === 'error' ? 'err' : 'ok'">
          <svg v-if="toastType !== 'error'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          {{ toastMsg }}
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
// @ts-ignore
import { arizaApi, api } from '@/api/api'

const route = useRoute()

const toast = useToast()

// ── Helpers ───────────────────────────────────────────────
const COLORS = ['#4f46e5','#6366f1','#4338ca','#3730a3']
const SINFC: Record<string,string> = { A:'#10b981', B:'#4f46e5', C:'#f59e0b', D:'#ef4444' }
const avatarColor = (id: number) => COLORS[id % COLORS.length]
const sinfColor   = (s: string)  => SINFC[s] || '#94a3b8'
const today       = new Date().toISOString().split('T')[0]

// ── State ─────────────────────────────────────────────────
const rows    = ref<any[]>([])
const loading = ref(false)
const saving  = ref(false)
const total   = ref(0)
const page    = ref(1)
const LIMIT   = 30
const totalPages    = computed(() => Math.ceil(total.value / LIMIT))
const selected      = ref<any>(null)
const stat          = ref<any>({ jami:0, yangi:0, bekor:0 })
const sprav         = ref<any>({ mijozlar:[], agentlar:[], dostavchilar:[], tovarlar:[], omborlar:['Основной склад'] })
const search        = ref('')
const fHolat        = ref('')
/* Arizalar — faqat distributsiya (agent zakazi → tasdiq → yig'ish → dostavchik).
   Avtolavka sotuvlari (agent omboridan, darhol yetkazilgan) Avtolavka → Sotuvlar sahifasida. */
const KANAL         = 'distributsiya'
/* Buyurtma yo'li: agent zakazi → ofis tasdiqlaydi → ombor yig'adi → dostavchik yo'lga chiqadi → mijozga topshirildi */
const BOSQICHLAR = [
  { k: 'yangi',        nom: 'Yangi',        c: '#6366f1', bg: 'rgba(99,102,241,.08)', izoh: "Agent (telefondan) yoki ofis yaratdi — tasdiqlash kerak" },
  { k: 'tasdiqlangan', nom: 'Tasdiqlandi',  c: '#4338ca', bg: 'rgba(67,56,202,.08)',  izoh: "Ofis tasdiqladi — ombor yig'ish navbatida" },
  { k: 'yigilmoqda',   nom: "Yig'ilmoqda",  c: '#d97706', bg: 'rgba(217,119,6,.08)',  izoh: "Ombor tovarni yig'moqda" },
  { k: 'yolda',        nom: "Yo'lda",       c: '#b45309', bg: 'rgba(180,83,9,.08)',   izoh: "Dostavchikka berildi — tovar ombordan chiqdi" },
  { k: 'yetkazildi',   nom: 'Yetkazildi',   c: '#059669', bg: 'rgba(5,150,105,.08)',  izoh: "Mijozga topshirildi — naqd kassada, qolgani qarzda" },
  { k: 'bekor',        nom: 'Bekor',        c: '#ef4444', bg: 'rgba(239,68,68,.07)',  izoh: 'Bekor qilingan' },
]
const fAgent        = ref('')

const modalOpen     = ref(false)
const formErr       = ref('')
const dateError     = ref(false)
const mijozQ        = ref('')
const tovarQ        = ref('')
const bekorModal    = ref(false)
const bekorSababi   = ref('')
const holatChanging = ref(false)
const pendingHolat  = ref('')

// Tasdiqlash modal
const tasdiqModal    = ref(false)
const tasdiqForm     = reactive({ izoh: '' })

// Toast
const toastShow = ref(false)
const toastMsg  = ref('')
const toastType = ref('success')
let toastTimer: ReturnType<typeof setTimeout>
function showToast(msg: string, type = 'success') {
  clearTimeout(toastTimer)
  toastMsg.value = msg; toastType.value = type; toastShow.value = true
  toastTimer = setTimeout(() => { toastShow.value = false }, 2800)
}

// Form
const emptyForm = () => ({
  mijoz_id: null as number|null, mijoz_nomi: '',
  agent_id:  null as number|null, agent_nomi: '',
  ombor: 'Основной склад', ekspeditor: '', tolov_turi: '',
  jonatish_sana: '', chegirma_foiz: 0, izoh: '',
  qatorlar: [] as any[],
})
const form = reactive(emptyForm())

// ── Computed ──────────────────────────────────────────────
const canSubmit = computed(() =>
  !!form.mijoz_id && form.qatorlar.length > 0 && !!form.jonatish_sana
)
const filteredMijozlar = computed(() => {
  const q = mijozQ.value.toLowerCase()
  return sprav.value.mijozlar.filter((m: any) =>
    !q || m.nomi.toLowerCase().includes(q) || m.telefon?.includes(q)
  ).slice(0, 40)
})
const filteredTovarlar = computed(() => {
  const q = tovarQ.value.toLowerCase()
  return sprav.value.tovarlar.filter((t: any) =>
    !q || t.tovar_nomi.toLowerCase().includes(q) || t.turkum?.toLowerCase().includes(q)
  ).slice(0, 60)
})
const formTotal = computed(() =>
  form.qatorlar.reduce((s: number, q: any) => s + (q.summa || 0), 0)
)
const isInCart = (id: number) => !!form.qatorlar.find((q: any) => q.tovar_id === id)

// ── Load ──────────────────────────────────────────────────
let debT: ReturnType<typeof setTimeout>
const debouncedLoad = () => { clearTimeout(debT); debT = setTimeout(() => { page.value=1; load() }, 350) }

async function load() {
  loading.value = true
  try {
    const params: any = { page: page.value, limit: LIMIT }
    if (fHolat.value) params.holat  = fHolat.value
    if (fAgent.value) params.agent_id = fAgent.value
    params.kanal = KANAL
    if (search.value) params.search = search.value
    const [data, statData] = await Promise.all([
      arizaApi.getAll(params),
      arizaApi.statistika(KANAL),
    ])
    rows.value  = data.rows || data || []
    total.value = data.count || rows.value.length
    stat.value  = statData
  } catch (e: any) {
    showToast(e.message || 'Yuklash xatosi', 'error')
  } finally {
    loading.value = false
  }
}
async function loadSprav() {
  try {
    const d = await arizaApi.spravochnik()
    sprav.value = { ...d, omborlar: d.omborlar?.length ? d.omborlar : ['Основной склад'] }
  } catch {}
}

// ── Select / filter ───────────────────────────────────────
async function selectRow(row: any) {
  if (selected.value?.id === row.id) { selected.value = null; return }
  try   { selected.value = await arizaApi.getById(row.id) }
  catch { selected.value = row }
}
function setTab(key: string) { fHolat.value = key; page.value = 1; load() }
const holatNom  = (h: string) => BOSQICHLAR.find(b => b.k === h)?.nom || h
const holatStil = (h: string) => { const b = BOSQICHLAR.find(x => x.k === h); return b ? { color: b.c, background: b.bg } : {} }
/* Tanlangan buyurtma uchun keyingi qadam va u bajariladigan sahifa:
   yangi → shu yerda tasdiqlanadi; tasdiqlangan/yig'ilmoqda → Buyurtmalar (ombor yig'adi, dostavchik tayinlanadi);
   yo'lda → dostavchik ilovasida "Yetkazdim". */
function keyingiQadam(a: any): { matn: string; yol?: string; tugma?: string } | null {
  if (!a) return null
  switch (a.holat) {
    case 'yangi':        return { matn: a.manba === 'mobil' ? 'Agent telefondan yubordi — tasdiqlang, keyin ombor yig\'adi' : 'Tasdiqlang — keyin ombor yig\'adi' }
    case 'tasdiqlangan': return { matn: 'Tasdiqlandi — ombor yig\'ishni boshlaydi', yol: '/ombor/yigish', tugma: 'Yig\'ish navbati' }
    case 'yigilmoqda':   return { matn: 'Ombor yig\'moqda — tayyor bo\'lgach dostavchik tayinlab yo\'lga chiqaring', yol: '/sotuvlar/buyurtmalar', tugma: 'Dostavchik tayinlash' }
    case 'yolda':        return { matn: `Yo\'lda${a.dostavchi_nomi ? ' — ' + a.dostavchi_nomi : ''} · dostavchik ilovasida "Yetkazdim" bosilgach yakunlanadi`, yol: '/sotuvlar/dostavchilar', tugma: 'Yo\'ldagilar' }
    case 'yetkazildi':   return { matn: `Yetkazildi${a.dostavchi_nomi ? ' — ' + a.dostavchi_nomi : ''}${Number(a.jami_summa) - Number(a.tolangan_summa || 0) > 0.5 ? ' · qolgani mijoz qarzida' : ' · naqd kassada'}` }
    default: return null
  }
}

// ── Modal ─────────────────────────────────────────────────
function openCreate() {
  Object.assign(form, emptyForm())
  if (sprav.value.omborlar?.length) form.ombor = sprav.value.omborlar[0]
  formErr.value  = ''
  dateError.value = false
  mijozQ.value   = ''
  tovarQ.value   = ''
  modalOpen.value = true
}
function closeModal() { modalOpen.value = false }

// ── Tanlov ────────────────────────────────────────────────
// Tanlangan mijozning narx turi (optom/chakana) — tovar tanlaganda mos narx
// avtomatik ishlatiladi. Mijoz tanlanmagan bo'lsa standart "chakana".
const tanlanganNarxTuri = ref<'optom' | 'chakana'>('chakana')

// Tanlangan mijozga tovar narxlari (toifa narx ro'yxati → standart → eski narx)
const mijozNarxlari = ref<Record<number, number>>({})
async function mijozNarxlariniYukla(id: number) {
  mijozNarxlari.value = {}
  try {
    const d = await api.get(`/narx-ruyxatlar/mijoz/${id}`)
    mijozNarxlari.value = Object.fromEntries((d.narxlar || []).filter((x: any) => x.narx > 0).map((x: any) => [x.tovar_id, x.narx]))
  } catch { mijozNarxlari.value = {} }
}

function pickMijoz(m: any) {
  form.mijoz_id = m.id; form.mijoz_nomi = m.nomi
  if (m.agent) { form.agent_id = m.agent.id; form.agent_nomi = m.agent.fullname }
  tanlanganNarxTuri.value = m.narx_turi === 'optom' ? 'optom' : 'chakana'
  mijozNarxlariniYukla(m.id)
}
// Tovar narxi: mijozning narx ro'yxati bo'yicha; bo'lmasa mijoz turiga mos optom/chakana narx;
// ikkalasi ham 0 bo'lsa eski sotuv_narx'ga qaytadi (moslik uchun).
function narxTovarUchun(t: any) {
  const royxat = mijozNarxlari.value[t.tovar_id]
  if (royxat) return Number(royxat)
  const mos = tanlanganNarxTuri.value === 'optom' ? t.optom_narx : t.chakana_narx
  return Number(mos) || Number(t.sotuv_narx) || 0
}
function toggleTovar(t: any) {
  const idx = form.qatorlar.findIndex((q: any) => q.tovar_id === t.tovar_id)
  if (idx >= 0) { form.qatorlar.splice(idx, 1); return }
  const mavjud = Number(t.mavjud) || 0
  if (mavjud <= 0) {
    toast.warning('Tovar tugagan', `${t.tovar_nomi} omborda mavjud emas`)
    return
  }
  // Tovar kg'da (tarozida) sotiladi — blok/dona yo'q, miqdor bitta kasr son.
  // Boshlang'ich 1 kg (qoldiq undan kam bo'lsa — qoldiq). Backendga blok=0, dona=kg ketadi.
  const narx     = narxTovarUchun(t)
  const initDona = Math.min(1, mavjud)
  form.qatorlar.push({
    tovar_id:      t.tovar_id,
    tovar_nomi:    t.tovar_nomi,
    turkum:        t.turkum || '',
    olchov:        t.olchov_birligi || 'kg',
    narx,
    mavjud,
    blokdagi_soni: 1,
    blok:          0,
    dona:          initDona,
    jami_dona:     initDona,
    chegirma_foiz: 0,
    chegirma_summa: 0,
    summa:         Math.round(initDona * narx),
  })
}
function removeQ(i: number) { form.qatorlar.splice(i, 1) }
function removeByTovarId(id: number) {
  const idx = form.qatorlar.findIndex((q: any) => q.tovar_id === id)
  if (idx >= 0) form.qatorlar.splice(idx, 1)
}
function getQ(tovar_id: number) {
  return form.qatorlar.find((q: any) => q.tovar_id === tovar_id) ?? null
}
function recalc(q: any) {
  const blokdagi   = Number(q.blokdagi_soni) || 1
  q.jami_dona      = (q.blok||0) * blokdagi + (q.dona||0)
  const br         = q.jami_dona * (q.narx||0)
  q.chegirma_summa = br * ((q.chegirma_foiz||0)/100)
  q.summa          = Math.round(br - q.chegirma_summa)
}
// Kiritilgan miqdor qoldiqdan oshib ketsa — qoldiqqa tushiriladi va ogohlantiriladi
function clampToStock(q: any) {
  const mavjud = Number(q.mavjud) || 0
  if (q.dona > mavjud) {
    q.dona = mavjud
    toast.warning('Qoldiqdan ko\'p', `${q.tovar_nomi}: omborda ${fmtMiqdor(mavjud)} ${q.olchov} bor, undan ortiq kiritib bo'lmaydi`)
  }
}
function adjCart(tovar_id: number, delta: number) {
  const q = getQ(tovar_id)
  if (!q) return
  q.dona = Math.max(0, Math.round(((q.dona||0) + delta) * 1000) / 1000)
  if (delta > 0) clampToStock(q)
  recalc(q)
}
function setCart(tovar_id: number, val: number) {
  const q = getQ(tovar_id)
  if (!q) return
  q.dona = Math.max(0, isNaN(val) ? 0 : Math.round(val * 1000) / 1000)
  clampToStock(q)
  recalc(q)
}

// ── Save ──────────────────────────────────────────────────
async function save() {
  dateError.value = false
  if (!form.mijoz_id)        { formErr.value = 'Mijoz tanlang'; return }
  if (!form.qatorlar.length) { formErr.value = 'Kamida 1 ta tovar tanlang'; return }
  if (!form.jonatish_sana)   { formErr.value = 'Yetkazish sanasi majburiy'; dateError.value = true; return }
  formErr.value = ''
  saving.value  = true
  try {
    const body = {
      turi: 'sotish',
      mijoz_id:  form.mijoz_id,  mijoz_nomi:  form.mijoz_nomi,
      agent_id:  form.agent_id || null, agent_nomi: form.agent_nomi || null,
      jonatish_sana: form.jonatish_sana,
      ombor:     form.ombor,
      ekspeditor: form.ekspeditor || null,
      tolov_turi: form.tolov_turi || null,
      chegirma_foiz: form.chegirma_foiz || 0,
      izoh:      form.izoh || null,
      qatorlar:  form.qatorlar,
    }
    await arizaApi.create(body)
    showToast(`${form.mijoz_nomi} uchun ariza yuborildi · ${form.jonatish_sana}`)
    closeModal()
    await load()
    stat.value = await arizaApi.statistika(KANAL)
  } catch (e: any) {
    formErr.value = e.message || 'Xatolik'
    showToast(e.message || 'Xatolik', 'error')
  } finally {
    saving.value = false
  }
}

// ── Tasdiqlash modal ──────────────────────────────────────
function openTasdiqModal() {
  Object.assign(tasdiqForm, { izoh: '' })
  tasdiqModal.value = true
}
async function submitTasdiq() {
  await doHolat('tasdiqlangan', {
    izoh: tasdiqForm.izoh || null,
  })
  tasdiqModal.value = false
}

// ── Holat: tasdiqlash yoki bekor ─────────────────────────
async function doHolat(holat: string, extra: Record<string,any> = {}) {
  if (!selected.value) return
  holatChanging.value = true
  pendingHolat.value  = holat
  try {
    const body: any = { holat, ...extra }
    if (holat === 'bekor') body.bekor_sababi = bekorSababi.value || null
    const result = await arizaApi.changeHolat(selected.value.id, body)
    selected.value    = result
    bekorModal.value  = false
    bekorSababi.value = ''
    if (holat === 'tasdiqlangan') {
      rows.value = rows.value.filter((r: any) => r.id !== result.id)
      selected.value = null
      showToast(`✅ Buyurtma tasdiqlandi`)
    } else {
      const idx = rows.value.findIndex((r: any) => r.id === result.id)
      if (idx !== -1) rows.value[idx] = { ...rows.value[idx], holat: result.holat }
      showToast('Ariza bekor qilindi', 'error')
    }
    stat.value = await arizaApi.statistika(KANAL)
  } catch (e: any) {
    showToast(e.message || 'Xatolik', 'error')
  } finally {
    holatChanging.value = false
    pendingHolat.value  = ''
  }
}

// ── Formatters ────────────────────────────────────────────
function fmtSum(v: number)          { return v ? Math.round(v).toLocaleString('uz-UZ') : '0' }
function fmtShort(v: number|string) {
  const n = parseFloat(String(v||0))
  if (!n) return '0'
  if (n>=1e9) return (n/1e9).toFixed(1)+' mlrd'
  if (n>=1e6) return (n/1e6).toFixed(1)+' mln'
  if (n>=1e3) return (n/1e3).toFixed(0)+' ming'
  return n.toFixed(0)
}
// Miqdor tarozida 3 xonagacha (1,234 kg) — hech qachon yaxlitlanmaydi
function fmtMiqdor(v: number) { return Number(v || 0).toLocaleString('uz-UZ', { maximumFractionDigits: 3 }) }
function fmtDate(s: string) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('uz-UZ', { day:'2-digit', month:'2-digit', year:'2-digit' })
}

watch(search, () => debouncedLoad())
// Notifikatsiyadan ?doc=<id> bilan kelsa — o'sha zakazni avtomatik ochamiz
async function openDocFromQuery() {
  const docId = route.query.doc
  if (!docId) return
  try {
    const full = await arizaApi.getById(docId)
    if (full) {
      // Zakaz holati bo'yicha tegishli tabga o'tamiz (yangi bo'lsa "yangi")
      if (full.holat && fHolat.value !== full.holat) { fHolat.value = full.holat; await load() }
      selected.value = full
    }
  } catch { /* topilmasa e'tiborsiz */ }
}

onMounted(async () => {
  await Promise.all([load(), loadSprav()])
  await openDocFromQuery()
})

// Bir sahifada turib boshqa notif bosilsa ham ochilsin
watch(() => route.query.doc, () => openDocFromQuery())
</script>

<style scoped>
/* ══ PAGE ══ */
.pg { display:flex; flex-direction:column; gap:14px; height:100%; min-height:0; }

/* Header */
.pg-hd { display:flex; align-items:center; justify-content:space-between; }
.pg-title { font-size:20px; font-weight:900; color:#1e293b; margin:0 0 4px; }
.pg-sub   { display:flex; align-items:center; gap:6px; margin:0; }
.pg-sub-note { font-size:12px; color:#64748b; margin-right:6px; }
.shell.dark .pg-sub-note { color:var(--mut); }
.pg-sub-badge {
  display:inline-flex; align-items:center;
  font-size:11.5px; font-weight:700; padding:2px 8px; border-radius:20px;
}
.pg-sub-badge--yangi { background:rgba(99,102,241,.1); color:#6366f1; }
.pg-sub-badge--bekor { background:rgba(239,68,68,.08); color:#ef4444; }

.pg-new-btn {
  display:inline-flex; align-items:center; gap:6px;
  height:36px; padding:0 16px; border-radius:10px; border:none;
  background:linear-gradient(135deg,#6366f1,#6366f1); color:#fff;
  font-size:13px; font-weight:700; cursor:pointer;
  box-shadow:0 3px 12px rgba(99,102,241,.28); transition:.13s;
}
.pg-new-btn:hover { transform:translateY(-1px); box-shadow:0 5px 16px rgba(99,102,241,.38); }
.pg-new-btn--sm { height:32px; font-size:12.5px; }

/* Toolbar */
.pg-bar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; flex-shrink:0; }
.pg-search {
  display:flex; align-items:center; gap:7px;
  background:#fff; border:1.5px solid #e2e8f0; border-radius:10px;
  padding:0 11px; height:36px; flex:1; min-width:160px; transition:.12s;
}
.pg-search:focus-within { border-color:#6366f1; }
.pg-search svg { color:#94a3b8; flex-shrink:0; }
.pg-si { flex:1; border:none; outline:none; font-size:13px; color:#1e293b; background:transparent; }
.pg-si::placeholder { color:#cbd5e1; }
.pg-sel {
  height:36px; padding:0 10px; border:1.5px solid #e2e8f0; border-radius:10px;
  background:#fff; font-size:12.5px; color:#334155; outline:none; cursor:pointer;
}
.pg-chips { display:flex; gap:4px; flex-wrap:wrap; align-items:center; }
.pg-arrow { color:#cbd5e1; font-size:14px; font-weight:700; line-height:1; margin:0 -1px; }
.pg-chip {
  display:inline-flex; align-items:center; gap:5px;
  height:32px; padding:0 12px; border-radius:20px;
  border:1.5px solid #e2e8f0; background:#fff;
  font-size:12px; font-weight:500; color:#64748b; cursor:pointer; transition:.12s;
}
.pg-chip span:last-child {
  font-size:10.5px; font-weight:700; background:rgba(0,0,0,.06);
  padding:1px 5px; border-radius:8px;
}
.pg-chip.on               { border-color:#6366f1; background:#eef2ff; color:#6366f1; font-weight:700; }
.pg-chip--yangi.on        { border-color:#6366f1; background:rgba(99,102,241,.08); color:#6366f1; }
.pg-chip--bekor.on        { border-color:#ef4444; background:rgba(239,68,68,.07); color:#ef4444; }
.pg-chip:hover:not(.on)   { border-color:#c7d2fe; }
.dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
.pg-ref {
  width:36px; height:36px; border-radius:10px; border:1.5px solid #e2e8f0;
  background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center;
  color:#64748b; flex-shrink:0; transition:.12s;
}
.pg-ref:hover   { border-color:#6366f1; color:#6366f1; }
.pg-ref:disabled { opacity:.4; cursor:not-allowed; }
.spin { animation:rot .7s linear infinite; }
@keyframes rot { to { transform:rotate(360deg) } }

/* Layout */
.pg-layout { display:grid; grid-template-columns:1fr; gap:14px; flex:1; min-height:0; overflow:hidden; }
.pg-layout.split { grid-template-columns:380px 1fr; }
.pg-list-wrap { display:flex; flex-direction:column; gap:8px; overflow:hidden; }

/* List */
.pg-list { display:flex; flex-direction:column; gap:5px; overflow-y:auto; flex:1; }
.pg-list::-webkit-scrollbar { width:4px; }
.pg-list::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }
.pg-skel { height:82px; border-radius:13px; background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:shim 1.4s ease infinite; }
@keyframes shim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.pg-empty { display:flex; flex-direction:column; align-items:center; gap:10px; padding:60px 20px; color:#94a3b8; }
.pg-empty svg { opacity:.22; }
.pg-empty p { font-size:14px; font-weight:700; color:#64748b; margin:0; }

/* Card */
.pg-card {
  display:flex; align-items:flex-start; gap:10px;
  background:#fff; border:1.5px solid #e8ecf8; border-radius:14px;
  padding:12px 14px; cursor:pointer; transition:.13s;
}
.pg-card:hover { border-color:#c7d2fe; box-shadow:0 2px 10px rgba(99,102,241,.07); }
.pg-card.on    { border-color:#6366f1; background:#fafbff; box-shadow:0 3px 14px rgba(99,102,241,.12); }
.pg-card-av {
  width:36px; height:36px; border-radius:10px; flex-shrink:0;
  color:#fff; font-size:14px; font-weight:900;
  display:flex; align-items:center; justify-content:center;
}
.pg-card-body  { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; }
.pg-card-name  { font-size:13.5px; font-weight:800; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pg-manba-badge { font-size:12px; margin-left:2px; }
.pg-card-meta  { display:flex; align-items:center; gap:4px; font-size:11.5px; color:#94a3b8; }
.pg-card-num   { color:#6366f1; font-weight:700; }
.sep           { color:#e2e8f0; }
.pg-card-tovs  { display:flex; gap:4px; flex-wrap:wrap; }
.pg-ctov       { font-size:10.5px; color:#475569; background:#f1f5f9; padding:1px 7px; border-radius:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:90px; }
.pg-cmore      { font-size:10.5px; color:#94a3b8; }
.pg-card-r     { display:flex; flex-direction:column; align-items:flex-end; gap:5px; flex-shrink:0; }
.pg-card-sum   { font-size:12.5px; font-weight:800; color:#1e293b; }
.pg-status     { display:inline-flex; padding:2px 9px; border-radius:20px; font-size:10.5px; font-weight:700; }
.pg-status.indigo { background:rgba(99,102,241,.1); color:#6366f1; }
.pg-status.red    { background:rgba(239,68,68,.08); color:#ef4444; }

/* Pager */
.pg-pager { display:flex; align-items:center; justify-content:center; gap:8px; font-size:12.5px; color:#64748b; flex-shrink:0; }
.pg-pg { width:28px; height:28px; border-radius:8px; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; font-size:16px; color:#64748b; display:flex; align-items:center; justify-content:center; transition:.12s; }
.pg-pg:hover:not(:disabled) { border-color:#6366f1; color:#6366f1; }
.pg-pg:disabled { opacity:.35; cursor:not-allowed; }

/* ══ DETAIL ══ */
.pg-detail {
  background:#fff; border:1.5px solid #e8ecf8; border-radius:16px;
  display:flex; flex-direction:column; overflow:hidden;
}
.slide-in-enter-active, .slide-in-leave-active { transition:.2s; }
.slide-in-enter-from, .slide-in-leave-to { opacity:0; transform:translateX(16px); }

.pd-hd {
  display:flex; align-items:center; gap:10px;
  padding:14px 18px 12px; border-bottom:1px solid #f1f5f9; flex-shrink:0;
}
.pd-av {
  width:38px; height:38px; border-radius:11px; flex-shrink:0;
  color:#fff; font-size:15px; font-weight:900;
  display:flex; align-items:center; justify-content:center;
}
.pd-hd-info { flex:1; min-width:0; }
.pd-name    { font-size:14.5px; font-weight:800; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pd-meta    { font-size:11.5px; color:#94a3b8; margin-top:2px; }
.pd-flow    { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:7px; padding:7px 10px; border-radius:9px; font-size:12px; line-height:1.35; color:#334155; background:#f1f5f9; }
.pd-flow--yangi        { background:rgba(99,102,241,.08); color:#3730a3; }
.pd-flow--tasdiqlangan { background:rgba(67,56,202,.08);  color:#3730a3; }
.pd-flow--yigilmoqda   { background:rgba(217,119,6,.1);   color:#92400e; }
.pd-flow--yolda        { background:rgba(180,83,9,.1);    color:#7c2d12; }
.pd-flow--yetkazildi   { background:rgba(5,150,105,.09);  color:#065f46; }
.pd-flow-link { font-weight:700; color:#4f46e5; text-decoration:none; white-space:nowrap; }
.pd-flow-link:hover { text-decoration:underline; }
.pd-hd-right { display:flex; align-items:center; gap:7px; flex-shrink:0; }

.pd-bekor-btn {
  display:flex; align-items:center; gap:5px;
  padding:6px 12px; border-radius:9px;
  border:1.5px solid #fecaca; background:#fef2f2;
  color:#ef4444; font-size:12.5px; font-weight:700; cursor:pointer; transition:.12s;
}
.pd-bekor-btn:hover:not(:disabled) { background:#fee2e2; }
.pd-bekor-btn:disabled { opacity:.5; cursor:not-allowed; }
.pd-tasdiq-btn {
  display:flex; align-items:center; gap:6px;
  padding:6px 15px; border-radius:9px; border:none;
  background:linear-gradient(135deg,#10b981,#059669); color:#fff;
  font-size:12.5px; font-weight:700; cursor:pointer;
  box-shadow:0 2px 10px rgba(16,185,129,.25); transition:.12s;
}
.pd-tasdiq-btn:hover:not(:disabled) { filter:brightness(1.07); }
.pd-tasdiq-btn:disabled { opacity:.6; cursor:not-allowed; }
.pd-close {
  width:28px; height:28px; border-radius:8px; border:1.5px solid #e2e8f0;
  background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center;
  color:#64748b; transition:.12s;
}
.pd-close:hover { background:#fef2f2; color:#ef4444; border-color:#fecaca; }

.pd-bekor-banner {
  display:flex; align-items:center; gap:7px;
  padding:9px 18px; background:#fef2f2; border-bottom:1px solid #fecaca;
  color:#dc2626; font-size:12.5px; flex-shrink:0;
}
.pd-kpi { display:flex; align-items:center; padding:11px 18px; border-bottom:1px solid #f1f5f9; flex-shrink:0; }
.pd-kpi-i   { flex:1; text-align:center; }
.pd-kv      { display:block; font-size:13px; font-weight:800; color:#1e293b; }
.pd-kv.warn { color:#f59e0b; }
.pd-kl      { display:block; font-size:10px; color:#94a3b8; margin-top:1px; }
.pd-kpi-sep { width:1px; height:28px; background:#e2e8f0; flex-shrink:0; }

.pd-body { flex:1; overflow-y:auto; }
.pd-body::-webkit-scrollbar { width:4px; }
.pd-body::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }
.pd-sec { padding:13px 18px; border-bottom:1px solid #f1f5f9; }
.pd-sec:last-child { border-bottom:none; }
.pd-sec-hd {
  display:flex; align-items:center; gap:6px;
  font-size:10px; font-weight:800; color:#94a3b8;
  text-transform:uppercase; letter-spacing:.06em; margin-bottom:9px;
}
.pd-cnt { font-size:10px; background:#f1f5f9; color:#64748b; padding:1px 6px; border-radius:7px; font-weight:500; text-transform:none; letter-spacing:0; }
.pd-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
.pd-kv-row { display:flex; flex-direction:column; gap:2px; }
.pk { font-size:10.5px; color:#94a3b8; }
.pv { font-size:13px; font-weight:600; color:#1e293b; }

.pd-tov-table { border:1.5px solid #e2e8f0; border-radius:11px; overflow:hidden; }
.pd-tov-head {
  display:grid; grid-template-columns:1fr 90px 80px;
  padding:7px 12px; background:#f8fafc;
  font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase;
  border-bottom:1px solid #e2e8f0;
}
.pd-tov-head .r, .pd-tov-row .r { text-align:right; }
.pd-tov-row {
  display:grid; grid-template-columns:1fr 90px 80px;
  align-items:center; padding:8px 12px; border-bottom:1px solid #f1f5f9; transition:.11s;
}
.pd-tov-row:last-child { border-bottom:none; }
.pd-tov-row:hover { background:#f8fafc; }
.pd-tov-name { display:flex; align-items:center; gap:7px; min-width:0; }
.pd-tov-n   { width:16px; font-size:10.5px; color:#94a3b8; flex-shrink:0; text-align:center; }
.pd-tn      { display:block; font-size:12.5px; font-weight:600; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pd-tk      { display:block; font-size:10px; color:#94a3b8; }
.pd-pill    { display:inline-flex; justify-content:center; min-width:22px; padding:1px 4px; background:rgba(99,102,241,.09); color:#6366f1; border-radius:5px; font-size:11px; font-weight:700; }
.pd-pill--g { background:rgba(16,185,129,.09); color:#10b981; }
.nd         { color:#cbd5e1; }
.pd-tsum    { font-weight:700; color:#6366f1; font-size:12.5px; }
.pd-tov-foot {
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  padding:9px 12px; background:#f8fafc; border-top:1.5px solid #e2e8f0;
  font-size:12px; color:#64748b;
}
.pd-izoh { font-size:13px; color:#334155; background:#f8fafc; border:1px solid #e2e8f0; border-radius:9px; padding:10px 12px; margin:0; }

/* ══ MODAL ════════════════════════════════════════════════ */
.m-ov {
  position:fixed; inset:0; background:rgba(15,23,42,.55); backdrop-filter:blur(6px);
  z-index:1000; display:flex; align-items:center; justify-content:center; padding:12px;
}
.m-box {
  background:#fff; border-radius:18px;
  width:100%; max-width:1280px; height:92vh;
  display:flex; flex-direction:column;
  box-shadow:0 32px 90px rgba(0,0,0,.25); overflow:hidden;
}
.m-box--sm { max-width:420px; height:auto; max-height:90vh; }
.mfade-enter-active, .mfade-leave-active { transition:opacity .18s, transform .18s; }
.mfade-enter-from, .mfade-leave-to { opacity:0; transform:scale(.97) translateY(8px); }

/* ── MODAL HEADER ── */
.m-hd {
  display:flex; align-items:center; gap:12px;
  padding:12px 18px; border-bottom:1px solid #f1f5f9; flex-shrink:0;
  background:linear-gradient(to right,#fafbff,#fff);
}
.m-hd-ic {
  width:32px; height:32px; border-radius:9px; flex-shrink:0;
  background:linear-gradient(135deg,#6366f1,#6366f1);
  display:flex; align-items:center; justify-content:center;
}
.m-hd-info  { display:flex; flex-direction:column; gap:3px; flex:1; min-width:0; }
.m-hd-title { font-size:15px; font-weight:800; color:#1e293b; }
.m-hd-steps { display:flex; align-items:center; gap:5px; flex-wrap:wrap; }
.m-step {
  font-size:11.5px; color:#94a3b8; font-weight:500;
  background:#f1f5f9; padding:2px 8px; border-radius:20px;
  max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; transition:.15s;
}
.m-step.done { color:#10b981; background:rgba(16,185,129,.1); font-weight:700; }
.m-step-sep  { font-size:11px; color:#cbd5e1; }
.m-hd-err {
  display:flex; align-items:center; gap:5px;
  font-size:12px; color:#dc2626; background:#fef2f2;
  padding:4px 10px; border-radius:8px; white-space:nowrap; flex-shrink:0;
}
.m-hd-close {
  width:28px; height:28px; border-radius:7px; border:none; flex-shrink:0;
  background:#f1f5f9; cursor:pointer;
  display:flex; align-items:center; justify-content:center; color:#64748b; transition:.12s;
}
.m-hd-close:hover { background:#fee2e2; color:#ef4444; }

/* ── BODY: 3 panel ── */
.m-body {
  display:grid; grid-template-columns:220px 1fr 290px;
  flex:1; overflow:hidden; min-height:0;
}

/* Chap panel: Mijoz + Agent */
.m-left {
  display:flex; flex-direction:column; padding:12px 12px;
  border-right:1px solid #f1f5f9; overflow:hidden; min-height:0;
}
.m-sec-title {
  display:flex; align-items:center; gap:6px;
  font-size:10px; font-weight:800; color:#334155;
  text-transform:uppercase; letter-spacing:.06em;
  padding-bottom:7px; flex-shrink:0;
}
.m-sec-title svg { color:#6366f1; flex-shrink:0; }
.m-sec-title--sub { padding-top:10px; border-top:1px solid #f1f5f9; margin-top:10px; }
.m-sec-title--det { color:#94a3b8; }
.m-picked {
  margin-left:auto; font-size:10.5px; font-weight:700; color:#10b981;
  background:rgba(16,185,129,.1); padding:2px 7px; border-radius:20px;
  max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  text-transform:none; letter-spacing:0;
}

.m-srch {
  display:flex; align-items:center; gap:6px;
  padding:0 9px; height:32px; margin-bottom:6px;
  background:#fff; border:1.5px solid #e2e8f0; border-radius:8px;
  transition:border-color .12s; flex-shrink:0;
}
.m-srch:focus-within { border-color:#6366f1; }
.m-srch svg { color:#94a3b8; flex-shrink:0; }
.m-srch--center { margin-bottom:0; height:34px; flex:none; }
.m-srch-x {
  border:none; background:none; cursor:pointer; color:#94a3b8;
  display:flex; align-items:center; padding:2px; transition:color .12s;
}
.m-srch-x:hover { color:#ef4444; }
.m-si { flex:1; border:none; outline:none; font-size:12.5px; color:#1e293b; background:transparent; }
.m-si::placeholder { color:#94a3b8; }

.m-list { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:2px; }
.m-list::-webkit-scrollbar { width:3px; }
.m-list::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }
.m-empty { text-align:center; padding:16px 8px; font-size:12px; color:#94a3b8; }

/* Mijoz qator */
.m-mrow {
  display:flex; align-items:center; gap:8px;
  padding:6px 8px; border-radius:9px; cursor:pointer;
  border:1.5px solid transparent; transition:.11s;
}
.m-mrow:hover { background:#f8fafc; border-color:#e2e8f0; }
.m-mrow.on    { background:#eef2ff; border-color:#c7d2fe; }
.m-av {
  width:28px; height:28px; border-radius:7px; flex-shrink:0;
  color:#fff; font-size:10px; font-weight:800;
  display:flex; align-items:center; justify-content:center;
}
.m-av--xs { width:20px; height:20px; border-radius:5px; font-size:9px; }
.m-minfo   { flex:1; min-width:0; }
.m-mname   { display:block; font-size:12.5px; font-weight:600; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.m-mmeta   { display:flex; align-items:center; gap:4px; font-size:10.5px; color:#94a3b8; }
.m-sinf    { font-size:9.5px; font-weight:700; padding:1px 5px; border-radius:5px; }
.m-narxturi--optom   { background:rgba(99,102,241,.15); color:#6366f1; }
.m-narxturi--chakana { background:rgba(148,163,184,.15); color:#64748b; }
.m-bal     { font-size:11px; font-weight:700; flex-shrink:0; }
.m-bal.pos { color:#10b981; }
.m-bal.neg { color:#ef4444; }

/* Agent chips */
.m-agent-chips { display:flex; flex-direction:column; gap:3px; }
.m-ach {
  display:flex; align-items:center; gap:7px;
  padding:6px 8px; border-radius:8px; cursor:pointer;
  border:1.5px solid transparent; transition:.11s; font-size:12px; font-weight:600; color:#334155;
}
.m-ach:hover { background:#f8fafc; border-color:#e2e8f0; }
.m-ach.on    { background:#eef2ff; border-color:#c7d2fe; color:#6366f1; }

/* ── O'RTA PANEL: Tovar jadvali ── */
.m-center {
  display:flex; flex-direction:column;
  border-right:1px solid #f1f5f9; overflow:hidden; min-height:0;
}
.m-center-top {
  display:flex; align-items:center; gap:10px;
  padding:10px 14px 8px; flex-shrink:0;
  border-bottom:1px solid #f1f5f9; background:#fafbff;
}
.m-cnt-badge {
  font-size:10px; background:#f1f5f9; color:#64748b;
  padding:2px 6px; border-radius:6px; font-weight:600;
}
.m-sel-badge {
  font-size:10px; font-weight:700; color:#10b981;
  background:rgba(16,185,129,.1); padding:2px 7px; border-radius:20px;
}

/* Tovar wrap + thead + tbody */
.m-tov-wrap { flex:1; overflow:hidden; display:flex; flex-direction:column; }

.m-tov-thead {
  display:grid;
  grid-template-columns: minmax(140px,1fr) 80px 96px 170px 90px 32px;
  padding:6px 14px; background:#f8fafc;
  border-bottom:1.5px solid #e8ecf8; flex-shrink:0;
}
.m-th {
  font-size:10px; font-weight:700; color:#94a3b8;
  text-transform:uppercase; letter-spacing:.04em; text-align:center;
}
.m-th-name  { text-align:left; }
.m-th--miqdor { color:#10b981; }
.m-th--sum  { text-align:right; color:#6366f1; }
.m-th--del  { text-align:center; }

.m-tov-body {
  flex:1; overflow-y:auto;
}
.m-tov-body::-webkit-scrollbar { width:4px; }
.m-tov-body::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }

.m-tov-empty { padding:40px; text-align:center; font-size:13px; color:#94a3b8; }

/* Tovar qator */
.m-tov-row {
  display:grid;
  grid-template-columns: minmax(140px,1fr) 80px 96px 170px 90px 32px;
  align-items:center; padding:5px 14px;
  border-bottom:1px solid #f1f5f9; transition:background .1s;
  min-height:44px;
}
.m-tov-row:last-child  { border-bottom:none; }
.m-tov-row:hover       { background:#fafbff; }
.m-tov-row.selected    { background:#f0fdf4; }

/* Tovar nomi kolonnasi */
.m-td-name {
  display:flex; align-items:center; gap:8px;
  cursor:pointer; min-width:0; padding-right:8px;
}
.m-tov-dot {
  width:18px; height:18px; border-radius:50%; flex-shrink:0;
  border:1.5px solid #e2e8f0; background:#fff;
  display:flex; align-items:center; justify-content:center;
  transition:.11s; color:#fff;
}
.m-tov-dot.active { background:#10b981; border-color:#10b981; }
.m-tov-info   { flex:1; min-width:0; }
.m-tov-nomi   { display:block; font-size:12.5px; font-weight:600; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.m-tov-turkum { display:block; font-size:10.5px; color:#94a3b8; }
.m-blok-tag   {
  flex-shrink:0; font-size:9.5px; font-weight:700;
  color:#6366f1; background:rgba(99,102,241,.1);
  padding:1px 5px; border-radius:4px; white-space:nowrap;
}

/* Jadval hujayralari */
.m-td        { display:flex; align-items:center; justify-content:center; font-size:12px; }
.m-td--narx  { font-weight:700; color:#6366f1; font-size:12.5px; }
.m-td--ok    { color:#10b981; font-weight:600; font-size:12px; }
.m-td--no    { color:#ef4444; font-weight:600; font-size:12px; }
.m-td--jami  { font-weight:800; color:#1e293b; font-size:13px; }
.m-td--sum   { font-weight:800; color:#6366f1; font-size:13px; justify-content:flex-end; }
.m-td--del   { justify-content:center; }
.m-td--input { flex-direction:column; gap:2px; justify-content:center; align-items:center; }
.m-td-empty  { color:#cbd5e1; font-size:13px; cursor:pointer; }
.m-td-muted  { color:#cbd5e1; font-size:12px; cursor:pointer; }

/* Inline input control */
.m-inp-ctrl {
  display:flex; align-items:center;
  border:1.5px solid #e2e8f0; border-radius:7px; overflow:hidden; background:#fff;
}
.m-inp-ctrl--dona { border-color:#bbf7d0; }
.m-tov-row.selected .m-inp-ctrl { border-color:#c7d2fe; }
.m-tov-row.selected .m-inp-ctrl--dona { border-color:#86efac; }
.m-inp-ctrl button {
  width:24px; height:28px; border:none; background:#f8fafc;
  color:#64748b; font-size:15px; font-weight:700; cursor:pointer; flex-shrink:0; transition:.1s;
}
.m-inp-ctrl button:hover { background:#e0e7ff; color:#6366f1; }
.m-inp-ctrl--dona button:hover { background:#dcfce7; color:#16a34a; }
.m-inp-ctrl input {
  width:62px; height:28px; border:none;
  border-left:1.5px solid #e2e8f0; border-right:1.5px solid #e2e8f0;
  text-align:center; font-size:13px; font-weight:700; color:#1e293b; outline:none;
  background:transparent;
}
.m-inp-unit { font-size:10px; font-weight:700; color:#64748b; padding:0 7px; }
.m-td-unit  { font-size:9.5px; font-weight:600; color:#94a3b8; margin-left:3px; }

/* O'chirish tugmasi */
.m-del-btn {
  width:24px; height:24px; border-radius:6px; border:none;
  background:transparent; color:#cbd5e1; cursor:pointer;
  display:flex; align-items:center; justify-content:center; transition:.1s;
}
.m-del-btn:hover { background:#fee2e2; color:#ef4444; }

/* ── O'NG PANEL: Jami + Tafsilotlar ── */
.m-right {
  display:flex; flex-direction:column; padding:12px 14px;
  overflow-y:auto; min-height:0; gap:12px;
}
.m-right::-webkit-scrollbar { width:4px; }
.m-right::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }

/* Summary */
.m-summary {
  background:#f8fafc; border:1.5px solid #e8ecf8; border-radius:12px;
  padding:12px; display:flex; flex-direction:column; gap:8px; flex-shrink:0;
}
.m-sum-title {
  display:flex; align-items:center; gap:6px;
  font-size:10px; font-weight:800; color:#334155;
  text-transform:uppercase; letter-spacing:.06em;
}
.m-sum-title svg { color:#6366f1; }
.m-sum-empty { font-size:12px; color:#94a3b8; text-align:center; padding:8px 0; }
.m-sum-rows { display:flex; flex-direction:column; gap:4px; max-height:180px; overflow-y:auto; }
.m-sum-rows::-webkit-scrollbar { width:3px; }
.m-sum-rows::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }
.m-sum-row { display:flex; align-items:center; gap:6px; font-size:12px; }
.m-sum-name { flex:1; color:#334155; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.m-sum-qty  { color:#6366f1; font-weight:700; font-size:11px; flex-shrink:0; }
.m-sum-s    { font-weight:800; color:#1e293b; flex-shrink:0; text-align:right; min-width:52px; }

.m-sum-footer { border-top:1.5px solid #e2e8f0; padding-top:8px; display:flex; flex-direction:column; gap:7px; }
.m-chegirma { display:flex; align-items:center; justify-content:space-between; font-size:12px; color:#64748b; }
.m-chegirma label { font-weight:600; }
.m-chegirma input {
  width:52px; padding:3px 7px; border:1.5px solid #e2e8f0; border-radius:7px;
  font-size:12.5px; font-weight:700; color:#1e293b; outline:none; text-align:center;
}
.m-chegirma input:focus { border-color:#6366f1; }
.m-total-line {
  display:flex; justify-content:space-between; align-items:center;
  padding-top:6px; border-top:1px solid #f1f5f9;
}
.m-total-line span  { font-size:12.5px; font-weight:700; color:#64748b; }
.m-total-line strong { font-size:17px; font-weight:900; color:#6366f1; }

/* Tafsilotlar */
.m-det { display:flex; flex-direction:column; gap:8px; flex-shrink:0; }
.m-det-f { display:flex; flex-direction:column; gap:3px; }
.m-det-f label { font-size:10.5px; font-weight:600; color:#64748b; }
.m-det-f--req label { color:#1e293b; font-weight:800; }
.m-req { color:#ef4444; margin-left:2px; }
.m-det-in {
  height:31px; padding:0 9px; border:1.5px solid #e2e8f0; border-radius:8px;
  background:#fff; font-size:12.5px; color:#1e293b; outline:none; transition:.12s;
  width:100%; box-sizing:border-box;
}
.m-det-in:focus { border-color:#6366f1; }
.m-det-in.err   { border-color:#ef4444; }
.m-det-f--req .m-det-in { border-color:#6366f1; background:#fafbff; }
.m-det-err { font-size:10.5px; color:#ef4444; }
.m-det-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; }

/* Footer */
.m-ft {
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 18px; border-top:1px solid #f1f5f9;
  background:#f8fafc; flex-shrink:0;
}
.m-ft-info { display:flex; align-items:center; gap:5px; font-size:11.5px; color:#94a3b8; }
.m-ft-info svg { flex-shrink:0; }
.m-ft-btns { display:flex; gap:8px; }
.m-btn-cancel {
  padding:8px 16px; border-radius:9px;
  border:1.5px solid #e2e8f0; background:#fff;
  font-size:13px; font-weight:600; color:#334155; cursor:pointer; transition:.12s;
}
.m-btn-cancel:hover { background:#f1f5f9; }
.m-btn-save {
  display:inline-flex; align-items:center; gap:7px;
  padding:8px 22px; border-radius:9px; border:none;
  background:linear-gradient(135deg,#6366f1,#6366f1); color:#fff;
  font-size:13px; font-weight:700; cursor:pointer;
  box-shadow:0 3px 12px rgba(99,102,241,.28); transition:.13s;
}
.m-btn-save:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 5px 16px rgba(99,102,241,.38); }
.m-btn-save:disabled { opacity:.4; cursor:not-allowed; box-shadow:none; transform:none; }

/* Bekor modal */
.m-bekor-pad { padding:16px 20px; display:flex; flex-direction:column; gap:6px; }
.m-bekor-lbl { font-size:12.5px; font-weight:700; color:#334155; }
.m-bekor-ta  {
  padding:9px 11px; border:1.5px solid #e2e8f0; border-radius:10px;
  background:#fff; font-size:13px; color:#1e293b; resize:none; outline:none;
  font-family:inherit; line-height:1.5; width:100%; box-sizing:border-box;
}
.m-bekor-ta:focus { border-color:#ef4444; }
.m-bekor-btn {
  display:inline-flex; align-items:center; gap:6px;
  padding:8px 20px; border-radius:9px; border:none;
  background:#ef4444; color:#fff; font-size:13px; font-weight:700; cursor:pointer; transition:.12s;
}
.m-bekor-btn:hover:not(:disabled) { background:#dc2626; }
.m-bekor-btn:disabled { opacity:.6; cursor:not-allowed; }
.m-spin {
  width:13px; height:13px; border:2px solid rgba(255,255,255,.3);
  border-top-color:#fff; border-radius:50%; flex-shrink:0;
  animation:rot .6s linear infinite;
}

/* ══ TASDIQLASH MODAL ══════════════════════════════════════ */
.td-body {
  padding:16px 20px; display:flex; flex-direction:column; gap:14px;
  overflow-y:auto; flex:1;
}
.td-section { display:flex; flex-direction:column; gap:10px; }
.td-section--sm { gap:6px; }
.td-sec-hd {
  display:flex; align-items:center; gap:7px;
  font-size:11.5px; font-weight:800; color:#334155;
  text-transform:uppercase; letter-spacing:.05em;
}
.td-sec-hd svg { color:#10b981; flex-shrink:0; }
.td-req { color:#ef4444; margin-left:2px; }
.td-hint { font-size:12.5px; color:#94a3b8; margin:0; }

.td-srch {
  display:flex; align-items:center; gap:7px;
  padding:0 10px; height:36px;
  background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:9px;
  transition:border-color .12s;
}
.td-srch:focus-within { border-color:#10b981; background:#fff; }
.td-srch svg { color:#94a3b8; flex-shrink:0; }
.td-si { flex:1; border:none; outline:none; font-size:13px; color:#1e293b; background:transparent; }
.td-si::placeholder { color:#94a3b8; }

.td-list {
  display:flex; flex-direction:column; gap:3px;
  max-height:200px; overflow-y:auto;
}
.td-list::-webkit-scrollbar { width:4px; }
.td-list::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }
.td-empty {
  display:flex; flex-direction:column; align-items:center; gap:8px;
  padding:24px; color:#94a3b8;
}
.td-empty svg { opacity:.3; }
.td-empty span { font-size:13px; font-weight:600; color:#64748b; }
.td-empty-hint { font-size:11.5px; font-weight:400; color:#94a3b8; }

.td-date-info {
  display:flex; align-items:center; gap:7px;
  padding:9px 12px; background:#eef2ff; border:1.5px solid #c7d2fe; border-radius:9px;
  font-size:12.5px; color:#4f46e5; margin-bottom:2px;
}
.td-date-info svg { flex-shrink:0; }
.td-date-info strong { color:#3730a3; }
.td-transport { color:#6366f1; font-weight:600; }

.td-row {
  display:flex; align-items:center; gap:10px;
  padding:9px 12px; border-radius:10px; cursor:pointer;
  border:1.5px solid transparent; transition:.12s;
}
.td-row:hover { background:#f0fdf4; border-color:#bbf7d0; }
.td-row.on    { background:#f0fdf4; border-color:#10b981; }
.td-av {
  width:34px; height:34px; border-radius:10px; flex-shrink:0;
  color:#fff; font-size:13px; font-weight:800;
  display:flex; align-items:center; justify-content:center;
}
.td-info { flex:1; min-width:0; }
.td-name  { display:block; font-size:13px; font-weight:700; color:#1e293b; }
.td-phone { display:block; font-size:11.5px; color:#94a3b8; margin-top:1px; }

.td-selected {
  display:flex; align-items:center; gap:7px;
  padding:9px 12px; background:rgba(16,185,129,.08);
  border:1.5px solid rgba(16,185,129,.3); border-radius:9px;
  font-size:12.5px; font-weight:600; color:#059669;
}
.td-selected svg { flex-shrink:0; }

.td-ta {
  padding:8px 11px; border:1.5px solid #e2e8f0; border-radius:9px;
  background:#fff; font-size:13px; color:#1e293b; resize:none; outline:none;
  font-family:inherit; line-height:1.5; width:100%; box-sizing:border-box; transition:.12s;
}
.td-ta:focus { border-color:#6366f1; }

.td-tasdiq-btn {
  display:inline-flex; align-items:center; gap:7px;
  padding:8px 22px; border-radius:9px; border:none;
  background:linear-gradient(135deg,#10b981,#059669); color:#fff;
  font-size:13px; font-weight:700; cursor:pointer;
  box-shadow:0 3px 12px rgba(16,185,129,.3); transition:.13s;
}
.td-tasdiq-btn:hover:not(:disabled) { transform:translateY(-1px); filter:brightness(1.06); }
.td-tasdiq-btn:disabled { opacity:.4; cursor:not-allowed; box-shadow:none; transform:none; }

/* Toast */
.pg-toast {
  position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
  display:flex; align-items:center; gap:8px;
  padding:11px 20px; border-radius:12px; z-index:1100;
  font-size:13.5px; font-weight:600; color:#fff;
  box-shadow:0 8px 32px rgba(0,0,0,.15); pointer-events:none; white-space:nowrap;
}
.pg-toast.ok  { background:linear-gradient(135deg,#10b981,#059669); }
.pg-toast.err { background:linear-gradient(135deg,#ef4444,#dc2626); }
.toast-enter-active, .toast-leave-active { transition:opacity .22s, transform .22s; }
.toast-enter-from { opacity:0; transform:translateX(-50%) translateY(14px); }
.toast-leave-to   { opacity:0; transform:translateX(-50%) translateY(14px); }

/* ── Responsive ── */
@media(max-width:1100px) {
  .m-body { grid-template-columns:200px 1fr 270px; }
  .m-tov-thead, .m-tov-row {
    grid-template-columns: minmax(120px,1fr) 72px 86px 156px 80px 28px;
  }
}
@media(max-width:900px) {
  .pg-layout.split { grid-template-columns:1fr; }
  .m-body { grid-template-columns:190px 1fr 260px; }
}
@media(max-width:760px) {
  .m-body { grid-template-columns:1fr; grid-template-rows:auto 1fr auto; }
  .m-left   { border-right:none; border-bottom:1px solid #f1f5f9; max-height:240px; }
  .m-center { border-right:none; border-bottom:1px solid #f1f5f9; }
  .m-right  { max-height:280px; }
}
@media(max-width:540px) {
  .m-box { max-height:95vh; border-radius:16px 16px 0 0; }
  .m-ft-info { display:none; }
  .m-tov-thead, .m-tov-row {
    grid-template-columns: 1fr 100px 90px 50px 28px;
  }
  .m-th--narx, .m-td--narx,
  .m-th--ok, .m-td--ok,
  .m-th--no, .m-td--no,
  .m-th--jami, .m-td--jami { display:none; }
}
</style>
